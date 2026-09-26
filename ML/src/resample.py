"""
Resamples each crop-mandi price series onto a REGULAR DAILY calendar grid.
This fixes a subtle bug: mandi data has irregular reporting (some mandis
report prices only 3-4 days/week). Without this, "price_lag_7" computed
via .shift(7) actually means "7 recorded rows ago", which can be anywhere
from 7 to 20+ real calendar days depending on gaps.
"""

import os
import pandas as pd
from src import config

MAX_GAP_DAYS = getattr(config, "MAX_GAP_DAYS", 14)


def _resample_one_group(group: pd.DataFrame) -> pd.DataFrame:
    group = group.set_index("arrival_date").sort_index()

    full_range = pd.date_range(group.index.min(), group.index.max(), freq="D")
    daily = group.reindex(full_range)

    is_original = daily["modal_price"].notna()

    daily["modal_price"] = daily["modal_price"].interpolate(
        method="linear", limit=MAX_GAP_DAYS, limit_area="inside"
    )

    for col in ["crop", "mandi", "state"]:
        if col in daily.columns:
            daily[col] = daily[col].ffill().bfill()

    daily = daily.dropna(subset=["modal_price"])
    daily["is_interpolated"] = ~is_original.reindex(daily.index).fillna(False)

    daily = daily.reset_index().rename(columns={"index": "arrival_date"})
    return daily


def resample_daily(df: pd.DataFrame, save: bool = True) -> pd.DataFrame:
    n_before = len(df)

    result = []
    for (crop, mandi), group in df.groupby(["crop", "mandi"]):
        resampled = _resample_one_group(group)
        result.append(resampled)

    daily_df = pd.concat(result, ignore_index=True)
    daily_df = daily_df.sort_values(["crop", "mandi", "arrival_date"]).reset_index(drop=True)

    pct_interpolated = daily_df["is_interpolated"].mean() * 100
    print(f"Resampling: {n_before} raw rows -> {len(daily_df)} daily rows "
          f"({pct_interpolated:.1f}% interpolated to fill small gaps)")

    if save:
        os.makedirs(config.INTERIM_DATA_DIR, exist_ok=True)
        daily_df.to_csv(config.RESAMPLED_PATH, index=False)
        print(f"Saved daily-resampled data -> {config.RESAMPLED_PATH}")

    return daily_df


if __name__ == "__main__":
    df = pd.read_csv(config.CLEANED_PATH, parse_dates=["arrival_date"])
    resample_daily(df)