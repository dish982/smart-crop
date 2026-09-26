import time

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

# Loaded once at import time, same pattern as crop/router.py
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
    """Dropdowns come from what the MODEL actually knows — no live API call."""
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


@router.post("/predict")
def predict(req: MarketRequest):
    # 1. Historical data for this exact crop/mandi/state, from the trained dataset
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

    # 2. Live price, with fallback to last known historical price
    live = get_today_price(req.state, req.crop, req.mandi)

    if live:
        current_price = float(live["modal_price"])
        current_date = live["arrival_date"]
    else:
        current_price = float(history["modal_price"].iloc[-1])
        current_date = history["arrival_date"].iloc[-1].strftime("%Y-%m-%d")

    # 3. Forecast — model uses local history for features, starts from live/fallback price
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

    peak = max(forecast, key=lambda r: r["predicted_price"])
    pct_change = round(((peak["predicted_price"] - current_price) / current_price) * 100, 2)

    # 4. Trend / decision
    if pct_change >= config.WAIT_GAIN_THRESHOLD_PCT:
        decision, trend = "WAIT", "increasing"
    elif pct_change <= config.FALL_LOSS_THRESHOLD_PCT:
        decision, trend = "SELL_NOW", "decreasing"
    else:
        decision, trend = "SELL_NOW", "stable"

    # 5. Shelf-life-aware warning
    shelf_life_days = get_shelf_life_days(req.crop)
    peak_date = pd.Timestamp(peak["date"])
    days_until_peak = (peak_date - pd.Timestamp.today().normalize()).days

    shelf_life_warning = None
    if shelf_life_days is not None and days_until_peak > shelf_life_days:
        shelf_life_warning = (
            f"The expected peak is {days_until_peak} days away, while the typical "
            f"shelf life of {req.crop} is about {shelf_life_days} days. Holding the "
            f"crop until the predicted peak may increase spoilage risk."
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

    return {
        "current_price": round(current_price, 2),
        "current_date": current_date,
        "previous_price": round(previous_price, 2) if previous_price is not None else None,
        "actual_history": graph_history,
        "forecast": forecast,
        "trend": trend,
        "decision": decision,
        "pct_change_vs_current": pct_change,
        "days_until_peak": days_until_peak,
        "shelf_life_days": shelf_life_days,
        "shelf_life_warning": shelf_life_warning,
    }


@router.get("/price-history")
def price_history(state: str, commodity: str, market: str | None = None):
    rows = get_price_history(state, commodity, market)
    if not rows:
        raise HTTPException(status_code=404, detail="No history data available from live API")
    return {"success": True, "data": rows}


@router.get("/mandi-comparison")
def mandi_comparison(state: str, commodity: str):
    rows = get_crop_across_mandis(state, commodity)
    if not rows:
        raise HTTPException(status_code=404, detail="No comparison data available from live API")
    return {"success": True, "data": rows}