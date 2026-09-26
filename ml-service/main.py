"""
FastAPI service: live price from the free Mandi Price API, forecast
from the trained model (using local historical data for features),
plus two display-only endpoints — price history and cross-mandi
comparison — both powered directly by the live API.
"""

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
from forecast import forecast_prices
import mandi_api_client as mandi_api
from shelf_life import get_shelf_life_days


app = FastAPI(title="Crop Price Advisory ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


MODEL = None
HISTORY_DF = None


@app.on_event("startup")
def load_model_and_data():
    global MODEL, HISTORY_DF

    MODEL = joblib.load(config.MODEL_PATH)

    HISTORY_DF = pd.read_csv(
        config.RESAMPLED_PATH,
        parse_dates=["arrival_date"]
    )

    print(
        f"Loaded model + {len(HISTORY_DF)} rows "
        f"({HISTORY_DF['crop'].nunique()} crops, "
        f"{HISTORY_DF['mandi'].nunique()} mandis)"
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/options")
def get_options():
    """Dropdowns come from what the MODEL actually knows."""

    crops = sorted(
        HISTORY_DF["crop"].unique().tolist()
    )

    mandis_by_crop = (
        HISTORY_DF.groupby("crop")["mandi"]
        .unique()
        .apply(lambda a: sorted(a.tolist()))
        .to_dict()
    )

    return {
        "states": sorted(
            HISTORY_DF["state"].unique().tolist()
        ),
        "crops": crops,
        "mandis_by_crop": mandis_by_crop,
    }


class PredictRequest(BaseModel):
    crop: str
    mandi: str
    state: str


@app.post("/predict")
def predict(req: PredictRequest):

    # ---------------------------------------------------------
    # 1. Get historical data for the trained model
    # ---------------------------------------------------------

    history = HISTORY_DF[
        (HISTORY_DF["crop"] == req.crop)
        & (HISTORY_DF["mandi"] == req.mandi)
        & (HISTORY_DF["state"] == req.state)
    ].sort_values("arrival_date")

    if history.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No trained data for {req.crop} in {req.mandi}"
        )

    # ---------------------------------------------------------
    # 2. Get latest/current price from live Mandi API
    # ---------------------------------------------------------

    live = mandi_api.get_today_price(
        req.state,
        req.crop,
        req.mandi
    )

    if live:
        current_price = float(live["modal_price"])

        price_source = (
            f"live (Mandi API, {live['arrival_date']})"
        )

        current_date = live["arrival_date"]

    else:
        current_price = float(
            history["modal_price"].iloc[-1]
        )

        price_source = (
            "last historical record "
            "(live API unavailable)"
        )

        current_date = (
            history["arrival_date"]
            .iloc[-1]
            .strftime("%Y-%m-%d")
        )

    # ---------------------------------------------------------
    # 3. Generate future forecast
    #
    # Model still uses the LOCAL historical dataset for its
    # learned features, but the forecast starts from the
    # LIVE API current price/date.
    # ---------------------------------------------------------

    forecast_df = forecast_prices(
        MODEL,
        req.crop,
        req.mandi,
        req.state,
        history,
        current_price=current_price,
        current_date=current_date,
    )

    forecast = forecast_df.to_dict(
        orient="records"
    )

    # ---------------------------------------------------------
    # 4. Find predicted peak
    # ---------------------------------------------------------

    peak = max(forecast, key=lambda r: r["predicted_price"])
    pct_change = round(((peak["predicted_price"] - current_price) / current_price) * 100, 2)

    # ---------------------------------------------------------
    # Shelf-life-aware advisory
    # ---------------------------------------------------------
    shelf_life_days = get_shelf_life_days(req.crop)

    current_date = (
    pd.Timestamp(live["arrival_date"])
    if live
    else pd.Timestamp(history["arrival_date"].iloc[-1])
)

    peak_date = pd.Timestamp(peak["date"])
    system_date = pd.Timestamp.today().normalize()
    days_until_peak = (peak_date - system_date).days

# Keep the original price-based advisory logic unchanged.
    if pct_change > config.WAIT_GAIN_THRESHOLD_PCT:
        decision, trend = "WAIT", "increasing"
    elif pct_change < config.FALL_LOSS_THRESHOLD_PCT:
        decision, trend = "SELL_NOW", "decreasing"
    else:
        decision, trend = "SELL_NOW", "stable"

    # Add shelf-life warning without changing the original
    # price-based decision logic.
    shelf_life_warning = None

    if shelf_life_days is not None and days_until_peak > shelf_life_days:
        shelf_life_warning = (
            f"The expected peak is {days_until_peak} days away, "
            f"while the typical shelf life of {req.crop} is about "
            f"{shelf_life_days} days. Holding the crop until the "
            f"predicted peak may increase spoilage risk."
        )

    # ---------------------------------------------------------
    # 6. Get live API history
    #
    # Used for:
    #   - Previous price
    #   - Actual historical graph
    # ---------------------------------------------------------

    api_history = mandi_api.get_price_history(
        req.state,
        req.crop,
        req.mandi
    )

    previous_price = None
    graph_history = []

    if live and api_history:

        live_date = live["arrival_date"]

        # -----------------------------------------------------
        # Previous price:
        # latest API record BEFORE the current/live date
        # -----------------------------------------------------

        previous_rows = [
            row
            for row in api_history
            if row["arrival_date"] < live_date
        ]

        if previous_rows:

            previous_rows.sort(
                key=lambda r: r["arrival_date"],
                reverse=True
            )

            previous_price = float(
                previous_rows[0]["modal_price"]
            )

        # -----------------------------------------------------
        # Actual graph history:
        # latest 7 LIVE API records up to current date
        # -----------------------------------------------------

        graph_history = [
            {
                "date": row["arrival_date"],
                "price": round(
                    float(row["modal_price"]),
                    2
                )
            }
            for row in api_history
            if row["arrival_date"] <= live_date
        ]

        graph_history = sorted(
            graph_history,
            key=lambda x: x["date"]
        )[-7:]

    # ---------------------------------------------------------
    # 7. Fallback if live API history is unavailable
    #
    # This prevents the endpoint from breaking.
    # ---------------------------------------------------------

    if not graph_history:

        graph_history = [
            {
                "date": row["arrival_date"].strftime(
                    "%Y-%m-%d"
                ),
                "price": round(
                    float(row["modal_price"]),
                    2
                )
            }
            for _, row in history.tail(7).iterrows()
        ]

    # ---------------------------------------------------------
    # 8. Return everything to the frontend
    # ---------------------------------------------------------

    return {
        "crop": req.crop,
        "mandi": req.mandi,
        "state": req.state,

        # Latest/current live price
        "current_price": round(
            current_price,
            2
        ),

        "current_price_source": price_source,

        "current_date": current_date,

        # Previous LIVE API price
        "previous_price": (
            round(previous_price, 2)
            if previous_price is not None
            else None
        ),

        # Actual LIVE API history for graph
        "actual_history": graph_history,

        # Future ML predictions
        "forecast": forecast,

        "peak_price": peak["predicted_price"],

        "peak_date": peak["date"],

        "pct_change_vs_current": pct_change,

        "trend": trend,

        "decision": decision,
        "shelf_life_days": shelf_life_days,
        "days_until_peak": days_until_peak,
        "shelf_life_warning": shelf_life_warning,
    }


@app.get("/price-history")
def price_history(
    state: str = Query(...),
    commodity: str = Query(...),
    market: str | None = Query(None),
    from_date: str | None = Query(None),
    to_date: str | None = Query(None)
):

    rows = mandi_api.get_price_history(
        state,
        commodity,
        market,
        from_date,
        to_date
    )

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="No history data available from live API"
        )

    return {
        "state": state,
        "commodity": commodity,
        "market": market,
        "data": rows,
    }


@app.get("/mandi-comparison")
def mandi_comparison(
    state: str = Query(...),
    commodity: str = Query(...)
):

    rows = mandi_api.get_crop_across_mandis(
        state,
        commodity
    )

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="No comparison data available from live API"
        )

    return {
        "state": state,
        "commodity": commodity,
        "data": rows,
    }