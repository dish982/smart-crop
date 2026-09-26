"""
Feature engineering: seasonal (cyclical) encoding, lag features,
rolling averages, and year-over-year seasonal price.

Usage:
    from src.features import build_features
    df_featured = build_features(df_clean)
"""

import os
import numpy as np
import pandas as pd
from src import config


def build_features(df: pd.DataFrame, save: bool = True) -> pd.DataFrame:

    """
    IMPORTANT: `df` must already be on a regular daily calendar grid
    (i.e. the output of src.resample.resample_daily), NOT raw cleaned
    data with irregular trading-day gaps.
    """

    df = df.sort_values(["crop", "mandi", "arrival_date"]).copy()

    # ---- Time-based features ----
    df["month"] = df["arrival_date"].dt.month
    df["week_of_year"] = df["arrival_date"].dt.isocalendar().week.astype(int)
    df["day_of_year"] = df["arrival_date"].dt.dayofyear

    # Cyclical encoding so December is "close to" January
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

    # ---- Lag features ----
    grouped = df.groupby(["crop", "mandi"])["modal_price"]
    for lag in config.LAG_DAYS:
        df[f"price_lag_{lag}"] = grouped.shift(lag)

    # ---- Rolling averages ----
    for window in config.ROLLING_WINDOWS:
        df[f"rolling_mean_{window}"] = (
            df.groupby(["crop", "mandi"])["modal_price"]
            .transform(lambda x: x.rolling(window).mean())
        )

    # ---- Year-over-year same-week seasonal price ----
    df["price_same_week_last_year"] = (
        df.groupby(["crop", "mandi", "week_of_year"])["modal_price"].shift(1)
    )

    n_before = len(df)
    df = df.dropna(subset=[c for c in df.columns if c != "is_interpolated"]).reset_index(drop=True)
    print(f"Feature engineering: {n_before} -> {len(df)} rows after dropping rows "
          f"without enough lag history")

    if save:
        os.makedirs(config.PROCESSED_DATA_DIR, exist_ok=True)
        df.to_csv(config.FEATURED_PATH, index=False)
        print(f"Saved featured dataset -> {config.FEATURED_PATH}")

    return df


FEATURE_COLUMNS = (
    ["month_sin", "month_cos", "week_of_year"]
    + [f"price_lag_{lag}" for lag in config.LAG_DAYS]
    + [f"rolling_mean_{w}" for w in config.ROLLING_WINDOWS]
    + ["price_same_week_last_year", "crop", "mandi", "state"]
)


if __name__ == "__main__":
    from src.clean import clean_data
    import pandas as pd
    from src.resample import resample_daily

    cleaned = pd.read_csv(config.CLEANED_PATH, parse_dates=["arrival_date"])
    daily = resample_daily(cleaned)
    build_features(daily)
