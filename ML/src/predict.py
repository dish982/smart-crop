"""
Combines the trained model + live price to produce a
"sell now" or "wait" recommendation for the farmer.
"""

import numpy as np
import pandas as pd

from src import config
from src.features import FEATURE_COLUMNS
from src.api_client import get_live_price
from src.model_utils import predict_price

FORECAST_DAYS = 15
WAIT_GAIN_THRESHOLD_PCT = 5.0
FALL_LOSS_THRESHOLD_PCT = -5.0


def _build_feature_row(date, crop, mandi, state, working_series: pd.Series, actual_history: pd.Series) -> pd.DataFrame:
    def lag_from_working(days_back):
        target_date = date - pd.Timedelta(days=days_back)
        if target_date in working_series.index:
            return working_series.loc[target_date]
        earlier = working_series.loc[:target_date]
        return earlier.iloc[-1] if len(earlier) else working_series.mean()

    def rolling_mean_from_working(window):
        window_slice = working_series.loc[:date].iloc[-window:]
        return window_slice.mean()

    same_week_last_year_date = date - pd.Timedelta(days=365)
    if same_week_last_year_date in actual_history.index:
        same_week_last_year = actual_history.loc[same_week_last_year_date]
    else:
        earlier = actual_history.loc[:same_week_last_year_date]
        same_week_last_year = earlier.iloc[-1] if len(earlier) else actual_history.mean()

    row = {
        "month_sin": np.sin(2 * np.pi * date.month / 12),
        "month_cos": np.cos(2 * np.pi * date.month / 12),
        "week_of_year": date.isocalendar()[1],
        "price_lag_7": lag_from_working(7),
        "price_lag_14": lag_from_working(14),
        "price_lag_30": lag_from_working(30),
        "price_lag_90": lag_from_working(90),
        "price_lag_365": lag_from_working(365),
        "rolling_mean_7": rolling_mean_from_working(7),
        "rolling_mean_30": rolling_mean_from_working(30),
        "price_same_week_last_year": same_week_last_year,
        "crop": crop, "mandi": mandi, "state": state,
    }
    X = pd.DataFrame([row])
    for col in ["crop", "mandi", "state"]:
        X[col] = X[col].astype("category")
    return X[FEATURE_COLUMNS]


def forecast_prices(model, crop: str, mandi: str, state: str,
                     history_df: pd.DataFrame, days: int = FORECAST_DAYS) -> pd.DataFrame:
    actual_history = history_df.set_index("arrival_date")["modal_price"].sort_index()
    working_series = actual_history.copy()

    last_date = actual_history.index.max()
    future_dates = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=days, freq="D")

    predictions = []
    for date in future_dates:
        X = _build_feature_row(date, crop, mandi, state, working_series, actual_history)
        pred_price = float(predict_price(model,X)[0])
        working_series.loc[date] = pred_price
        predictions.append({"date": date, "predicted_price": pred_price})

    return pd.DataFrame(predictions)


def recommend(model, history_df: pd.DataFrame, crop: str, mandi: str, state: str) -> dict:
    current_price = get_live_price(state, mandi, crop)
    if current_price is None:
        current_price = float(history_df.sort_values("arrival_date")["modal_price"].iloc[-1])
        source = "last historical record (live API unavailable)"
    else:
        source = "live Agmarknet API"

    forecast_df = forecast_prices(model, crop, mandi, state, history_df)
    max_future_price = forecast_df["predicted_price"].max()
    best_date = forecast_df.loc[forecast_df["predicted_price"].idxmax(), "date"]
    gain_pct = ((max_future_price - current_price) / current_price) * 100

    if gain_pct > WAIT_GAIN_THRESHOLD_PCT:
        decision = "WAIT"
        message = (f"Price expected to rise to ~₹{max_future_price:.0f} "
                    f"around {best_date.date()} (+{gain_pct:.1f}%). Consider waiting.")
    elif gain_pct < FALL_LOSS_THRESHOLD_PCT:
        decision = "SELL_NOW"
        message = f"Price expected to fall {abs(gain_pct):.1f}% in the coming days. Sell now."
    else:
        decision = "SELL_NOW"
        message = "Price expected to stay roughly stable — no meaningful benefit to waiting."

    return {
        "crop": crop, "mandi": mandi, "state": state,
        "current_price": current_price,
        "current_price_source": source,
        "forecast": forecast_df,
        "decision": decision,
        "message": message,
    }


if __name__ == "__main__":
    import joblib
    model = joblib.load(config.MODEL_PATH)
    df = pd.read_csv(config.RESAMPLED_PATH, parse_dates=["arrival_date"])
    sample = df[(df["crop"] == "Tomato") & (df["mandi"] == "Pune")].sort_values("arrival_date")

    result = recommend(model, sample, crop="Tomato", mandi="Pune", state="Maharashtra")
    print(result["message"])
    print(result["forecast"])