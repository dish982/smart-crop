"""
Autoregressive multi-day forecast starting from the live/current price date.

The trained model and feature definitions remain unchanged.
Local resampled_daily.csv is still used for historical lag/rolling features.
The live Mandi API price is used as the starting point for the forecast.
"""

import numpy as np
import pandas as pd

from market.features import FEATURE_COLUMNS   # <-- needs features.py to exist
from market.model_utils import predict_price  # <-- needs model_utils.py to exist
import market.config as config


def _build_feature_row(
    date,
    crop,
    mandi,
    state,
    working_series,
    actual_history
):
    def lag_from_working(days_back):
        target = date - pd.Timedelta(days=days_back)

        if target in working_series.index:
            return working_series.loc[target]

        earlier = working_series.loc[:target]

        if len(earlier):
            return earlier.iloc[-1]

        return working_series.mean()

    def rolling_mean(window):
        return working_series.loc[:date].iloc[-window:].mean()

    same_week_last_year_date = date - pd.Timedelta(days=365)

    if same_week_last_year_date in actual_history.index:
        same_week_last_year = actual_history.loc[same_week_last_year_date]
    else:
        earlier = actual_history.loc[:same_week_last_year_date]

        if len(earlier):
            same_week_last_year = earlier.iloc[-1]
        else:
            same_week_last_year = actual_history.mean()

    row = {
        "month_sin": np.sin(2 * np.pi * date.month / 12),
        "month_cos": np.cos(2 * np.pi * date.month / 12),
        "week_of_year": date.isocalendar()[1],

        "price_lag_7": lag_from_working(7),
        "price_lag_14": lag_from_working(14),
        "price_lag_30": lag_from_working(30),
        "price_lag_90": lag_from_working(90),
        "price_lag_365": lag_from_working(365),

        "rolling_mean_7": rolling_mean(7),
        "rolling_mean_30": rolling_mean(30),

        "price_same_week_last_year": same_week_last_year,

        "crop": crop,
        "mandi": mandi,
        "state": state,
    }

    X = pd.DataFrame([row])

    for col in ["crop", "mandi", "state"]:
        X[col] = X[col].astype("category")

    return X[FEATURE_COLUMNS]


def forecast_prices(
    model,
    crop: str,
    mandi: str,
    state: str,
    history_df: pd.DataFrame,
    current_price: float,
    current_date: str,
    days: int = config.FORECAST_DAYS,
) -> pd.DataFrame:

    actual_history = (
        history_df
        .set_index("arrival_date")["modal_price"]
        .sort_index()
    )

    start_date = actual_history.index.min()
    live_date = pd.Timestamp(current_date)

    full_dates = pd.date_range(
        start=start_date,
        end=live_date,
        freq="D"
    )

    working_series = actual_history.reindex(full_dates).ffill()

    working_series.loc[live_date] = float(current_price)

    future_dates = pd.date_range(
        start=live_date + pd.Timedelta(days=1),
        periods=days,
        freq="D"
    )

    rows = []

    for d in future_dates:

        X = _build_feature_row(
            d,
            crop,
            mandi,
            state,
            working_series,
            actual_history,
        )

        pred = float(predict_price(model, X)[0])

        working_series.loc[d] = pred

        rows.append({
            "date": d.strftime("%Y-%m-%d"),
            "predicted_price": round(pred, 2),
        })

    return pd.DataFrame(rows)