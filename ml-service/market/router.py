import joblib
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import market.config as config
from market.forecast import forecast_prices
from market.mandi_api_client import (
    get_today_price,
    get_price_history,
    get_crop_across_mandis,
)
from market.shelf_life import get_shelf_life_days

router = APIRouter()

MODEL = None
HISTORY_DF = None


def init():
    global MODEL, HISTORY_DF
    MODEL = joblib.load(config.MODEL_PATH)
    HISTORY_DF = pd.read_csv(config.RESAMPLED_PATH, parse_dates=["arrival_date"])
    print(
        f"[market] Loaded {len(HISTORY_DF)} rows "
        f"({HISTORY_DF['crop'].nunique()} crops, {HISTORY_DF['mandi'].nunique()} mandis)"
    )


class MarketRequest(BaseModel):
    state: str
    crop: str
    mandi: str


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/options")
def get_options():
    crops = sorted(HISTORY_DF["crop"].unique().tolist())
    mandis_by_crop = (
        HISTORY_DF.groupby("crop")["mandi"]
        .unique()
        .apply(lambda a: sorted(a.tolist()))
        .to_dict()
    )
    return {
        "states": sorted(HISTORY_DF["state"].unique().tolist()),
        "crops": crops,
        "mandis_by_crop": mandis_by_crop,
    }


def _check_staleness(latest_date_ts: pd.Timestamp) -> tuple[bool, int]:
    """NEW helper — used by /predict, /price-history and /mandi-comparison."""
    today = pd.Timestamp.today().normalize()
    days_since = (today - latest_date_ts.normalize()).days
    return days_since > config.STALE_DATA_THRESHOLD_DAYS, days_since


@router.post("/predict")
def predict(req: MarketRequest):
    history = HISTORY_DF[
        (HISTORY_DF["crop"] == req.crop)
        & (HISTORY_DF["mandi"] == req.mandi)
        & (HISTORY_DF["state"] == req.state)
    ].sort_values("arrival_date")

    if history.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No trained data for {req.crop} in {req.mandi}",
        )

    # 1. Live price, with fallback to last known historical price — UNCHANGED
    live = get_today_price(req.state, req.crop, req.mandi)

    if live:
        current_price = float(live["modal_price"])
        current_date = live["arrival_date"]
    else:
        current_price = float(history["modal_price"].iloc[-1])
        current_date = history["arrival_date"].iloc[-1].strftime("%Y-%m-%d")

    current_date_ts = pd.Timestamp(current_date)
    today = pd.Timestamp.today().normalize()

    # 2. NEW — staleness check: is the latest recorded price actually recent?
    stale_data, days_since_last_record = _check_staleness(current_date_ts)
    stale_message = None

    if stale_data:
        stale_message = (
            f"Recent prices are not available for {req.crop} in {req.mandi}. "
            f"The latest recorded price is from {current_date_ts.strftime('%d %b %Y')} "
            f"({days_since_last_record} days ago). The forecast below is based on that "
            f"last available data and may not reflect current market conditions."
        )

    # Forecast must run whether data is stale or not
    forecast_df = forecast_prices(
        model=MODEL,
        crop=req.crop,
        mandi=req.mandi,
        state=req.state,
        history_df=history,
        current_price=current_price,
        current_date=current_date,
        days=config.FORECAST_DAYS,
    )

    forecast = forecast_df.to_dict(orient="records")

    forecast = forecast_df.to_dict(orient="records")

    # ---------------------------------------------------------
    # TODAY'S SYSTEM DATE
    # ---------------------------------------------------------
    today = pd.Timestamp.today().normalize()

    # ---------------------------------------------------------
    # FIND THE RELEVANT PEAK
    # ---------------------------------------------------------
    # First look at predictions from today onwards.
    upcoming_forecast = [
        row
        for row in forecast
        if pd.Timestamp(row["date"]).normalize() >= today
    ]

    if upcoming_forecast:
        peak = max(
            upcoming_forecast,
            key=lambda r: r["predicted_price"]
        )
    else:
        # Safe fallback if the complete forecast period has passed
        peak = max(
            forecast,
            key=lambda r: r["predicted_price"]
        )

    peak_date = pd.Timestamp(peak["date"]).normalize()

    # ---------------------------------------------------------
    # PEAK PRICE CHANGE
    # ---------------------------------------------------------
    pct_change = round(
        ((peak["predicted_price"] - current_price) / current_price) * 100,
        2
    )

    # ---------------------------------------------------------
    # CHECK PRICE TREND AFTER TODAY
    # ---------------------------------------------------------
    future_after_today = [
        row
        for row in forecast
        if pd.Timestamp(row["date"]).normalize() > today
    ]

    post_today_trend = "stable"

    if len(future_after_today) >= 2:
        first_future_price = float(
            future_after_today[0]["predicted_price"]
        )

        last_future_price = float(
            future_after_today[-1]["predicted_price"]
        )

        if last_future_price > first_future_price:
            post_today_trend = "increasing"

        elif last_future_price < first_future_price:
            post_today_trend = "decreasing"

    # ---------------------------------------------------------
    # SELL / WAIT DECISION
    # ---------------------------------------------------------
    # If prices are expected to decrease after today's date,
    # recommend selling now even if an earlier predicted peak
    # was higher than the current price.

    if post_today_trend == "decreasing":
        decision = "SELL_NOW"
        trend = "decreasing"

    elif pct_change >= config.WAIT_GAIN_THRESHOLD_PCT:
        decision = "WAIT"
        trend = "increasing"

    elif pct_change <= config.FALL_LOSS_THRESHOLD_PCT:
        decision = "SELL_NOW"
        trend = "decreasing"

    else:
        decision = "SELL_NOW"
        trend = "stable"

    trend_word = {
        "increasing": "increase",
        "decreasing": "decrease",
        "stable": "remain stable"
    }[trend]

    # ---------------------------------------------------------
    # PEAK TIMING
    # ---------------------------------------------------------
    days_until_peak = (
        peak_date - current_date_ts.normalize()
    ).days

    days_until_peak_from_today = (
        peak_date - today
    ).days

    # 4. NEW — peak_status handles BOTH "peak is upcoming" AND "peak already passed"
    if days_until_peak_from_today < 0:
        peak_status = "past"
        peak_message = (
            f"The predicted peak price occurred about "
            f"{abs(days_until_peak_from_today)} day(s) ago "
            f"(on {peak_date.strftime('%d %b')}). "
            f"Prices are now expected to decrease, so selling now is recommended."
        )

    elif post_today_trend == "decreasing":
        peak_status = "today"
        peak_message = (
            f"The predicted peak is around today ({peak_date.strftime('%d %b')}). "
            f"Prices are expected to decrease after today's peak, so selling now is recommended."
        )

    else:
        peak_status = "upcoming"
        peak_message = (
            f"The expected peak price is in about " 
            f"{days_until_peak_from_today} day(s) "
            f"(around {peak_date.strftime('%d %b')})."
    )

    # 5. Shelf-life-aware advisory — only meaningful when the peak is still upcoming
    shelf_life_days = get_shelf_life_days(req.crop)
    shelf_life_warning = None

    if shelf_life_days is not None and peak_status == "upcoming":

        if decision == "WAIT":
            if days_until_peak_from_today <= shelf_life_days:
                shelf_life_warning = (
                    f"The predicted peak is within the typical shelf life of {req.crop} "
                    f"({shelf_life_days} days), so waiting until the predicted peak "
                    f"is a reasonable option."
                )
            else:
                shelf_life_warning = (
                    f"The predicted peak is about {days_until_peak_from_today} day(s) away, "
                    f"but the typical shelf life of {req.crop} is only about "
                    f"{shelf_life_days} day(s). Holding the crop until the predicted peak "
                    f"may increase spoilage risk — consider selling within "
                    f"{shelf_life_days} day(s) instead."
                )

        elif decision == "SELL_NOW":
            shelf_life_warning = (
                f"Although the predicted peak is within the typical shelf life of "
                f"{req.crop} ({shelf_life_days} days), prices are expected to decrease "
                f"after the predicted peak. Selling now avoids waiting for a declining market."
            )

    # 6. Previous price + actual history graph — from live API, fallback to local history
    api_history = get_price_history(req.state, req.crop, req.mandi)

    previous_price = None
    graph_history = []

    if live and api_history:
        live_date = live["arrival_date"]

        previous_rows = sorted(
            [r for r in api_history if r["arrival_date"] < live_date],
            key=lambda r: r["arrival_date"],
            reverse=True,
        )
        if previous_rows:
            previous_price = float(previous_rows[0]["modal_price"])

        graph_history = sorted(
            [
                {"date": r["arrival_date"], "price": round(float(r["modal_price"]), 2)}
                for r in api_history
                if r["arrival_date"] <= live_date
            ],
            key=lambda x: x["date"],
        )[-7:]

    if not graph_history:
        graph_history = [
            {"date": row["arrival_date"].strftime("%Y-%m-%d"), "price": round(float(row["modal_price"]), 2)}
            for _, row in history.tail(7).iterrows()
        ]
        # NEW — fallback previous_price when live API had nothing at all
        if previous_price is None and len(history) >= 2:
            previous_price = float(history["modal_price"].iloc[-2])

    return {
    "current_price": round(current_price, 2),
    "current_date": current_date,
    "previous_price": round(previous_price, 2) if previous_price is not None else None,
    "actual_history": graph_history,
    "forecast": forecast,
    "trend": trend,
    "decision": decision,
    "pct_change_vs_current": pct_change,

    "peak_price": round(float(peak["predicted_price"]), 2),
    "peak_date": peak_date.strftime("%Y-%m-%d"),

    "days_until_peak": days_until_peak,
    "days_until_peak_from_today": days_until_peak_from_today,

    "post_today_trend": post_today_trend,

    "peak_status": peak_status,
    "peak_message": peak_message,
    "shelf_life_days": shelf_life_days,
    "shelf_life_warning": shelf_life_warning,
    "stale_data": stale_data,
    "days_since_last_record": days_since_last_record,
    "stale_message": stale_message,
}


@router.get("/price-history")
def price_history(state: str, commodity: str, market: str | None = None):
    rows = get_price_history(state, commodity, market)
    if not rows:
        raise HTTPException(status_code=404, detail="No history data available from live API")

    dates = [pd.Timestamp(r["arrival_date"]) for r in rows if r.get("arrival_date")]
    stale, days_since = _check_staleness(max(dates)) if dates else (True, None)

    return {
        "success": True,
        "data": rows,
        "stale_data": stale,               # NEW
        "days_since_last_record": days_since,   # NEW
    }


@router.get("/mandi-comparison")
def mandi_comparison(state: str, commodity: str):
    rows = get_crop_across_mandis(state, commodity)
    if not rows:
        raise HTTPException(status_code=404, detail="No comparison data available from live API")

    dates = [pd.Timestamp(r["arrival_date"]) for r in rows if r.get("arrival_date")]
    stale, days_since = _check_staleness(max(dates)) if dates else (True, None)

    return {
        "success": True,
        "data": rows,
        "stale_data": stale,               # NEW
        "days_since_last_record": days_since,   # NEW
    }