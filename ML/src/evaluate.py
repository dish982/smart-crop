"""
Two evaluation modes:
1. backtest() — 1-day-ahead sanity check (fast, optimistic).
2. backtest_multistep() — realistic evaluation using the SAME recursive
   forecast_prices() logic as production. Reports MAPE by forecast horizon.
"""

import random
import lightgbm as lgb
import pandas as pd
from sklearn.metrics import mean_absolute_percentage_error, mean_absolute_error

from src import config
from src.features import FEATURE_COLUMNS


def backtest(df: pd.DataFrame, years: list = None) -> pd.DataFrame:
    from src.model_utils import transform_target, predict_price
    import numpy as np

    years = years or config.BACKTEST_YEARS
    df = df.copy()
    for col in ["crop", "mandi", "state"]:
        df[col] = df[col].astype("category")

    results = []
    for year in years:
        train = df[df["arrival_date"] < f"{year}-01-01"]
        test = df[
            (df["arrival_date"] >= f"{year}-01-01")
            & (df["arrival_date"] < f"{year + 1}-01-01")
        ]
        if len(train) < 1000 or len(test) < 100:
            print(f"Skipping {year}: not enough data (train={len(train)}, test={len(test)})")
            continue

        sample_weight = None
        if "is_interpolated" in train.columns:
            sample_weight = np.where(train["is_interpolated"], config.INTERPOLATED_SAMPLE_WEIGHT, 1.0)

        model = lgb.LGBMRegressor(**config.LGBM_PARAMS)
        model.fit(
            train[FEATURE_COLUMNS], transform_target(train["modal_price"]),
            sample_weight=sample_weight,
            categorical_feature=["crop", "mandi", "state"],
        )
        preds = predict_price(model, test[FEATURE_COLUMNS])

        mape = mean_absolute_percentage_error(test["modal_price"], preds) * 100
        mae = mean_absolute_error(test["modal_price"], preds)
        results.append({"test_year": year, "mae": round(mae, 2), "mape_pct": round(mape, 2), "n_test": len(test)})
        print(f"[1-day-ahead] Year {year}: MAE={mae:.2f}  MAPE={mape:.2f}%  (n={len(test)})")

    return pd.DataFrame(results)


def backtest_multistep(model, daily_df: pd.DataFrame, n_cutoffs_per_pair: int = 3,
                        forecast_days: int = 15, max_pairs: int = 30,
                        random_seed: int = 42) -> pd.DataFrame:
    from src.predict import forecast_prices

    random.seed(random_seed)
    pairs = daily_df[["crop", "mandi", "state"]].drop_duplicates()
    if len(pairs) > max_pairs:
        pairs = pairs.sample(n=max_pairs, random_state=random_seed)

    horizon_errors = {h: [] for h in [1, 7, forecast_days]}
    row_records = []

    for _, pair_row in pairs.iterrows():
        crop, mandi, state = pair_row["crop"], pair_row["mandi"], pair_row["state"]
        series = daily_df[
            (daily_df["crop"] == crop) & (daily_df["mandi"] == mandi) & (daily_df["state"] == state)
        ].sort_values("arrival_date").reset_index(drop=True)

        min_history_days = 400
        usable_range = series.iloc[min_history_days: len(series) - forecast_days]
        if len(usable_range) < n_cutoffs_per_pair:
            continue

        cutoff_indices = random.sample(range(min_history_days, len(series) - forecast_days), n_cutoffs_per_pair)

        for cutoff_idx in cutoff_indices:
            history_slice = series.iloc[:cutoff_idx + 1]
            actual_future = series.iloc[cutoff_idx + 1: cutoff_idx + 1 + forecast_days]

            forecast_df = forecast_prices(model, crop, mandi, state, history_slice, days=forecast_days)

            merged = forecast_df.reset_index(drop=True)
            merged["actual_price"] = actual_future["modal_price"].values[:len(merged)]
            merged["horizon_day"] = range(1, len(merged) + 1)

            for _, r in merged.iterrows():
                err_pct = abs(r["predicted_price"] - r["actual_price"]) / r["actual_price"] * 100
                row_records.append({
                    "crop": crop, "mandi": mandi, "horizon_day": r["horizon_day"], "ape_pct": err_pct
                })
                if r["horizon_day"] in horizon_errors:
                    horizon_errors[r["horizon_day"]].append(err_pct)

    if not row_records:
        print("No crop-mandi pairs had enough history for multistep backtest. "
              "Lower min_history_days or MIN_RECORDS_PER_CROP_MANDI in config.py.")
        return pd.DataFrame()

    detail_df = pd.DataFrame(row_records)
    summary = detail_df.groupby("horizon_day")["ape_pct"].agg(["mean", "median", "count"]).reset_index()
    summary = summary.rename(columns={"mean": "mape_pct", "median": "median_ape_pct", "count": "n_samples"})

    print("\n[Multi-day-ahead] MAPE by forecast horizon:")
    for h in [1, 7, forecast_days]:
        if h in horizon_errors and horizon_errors[h]:
            avg = sum(horizon_errors[h]) / len(horizon_errors[h])
            print(f"  Day {h:>2}: MAPE = {avg:.2f}%  (n={len(horizon_errors[h])})")

    return summary


if __name__ == "__main__":
    df = pd.read_csv(config.FEATURED_PATH, parse_dates=["arrival_date"])
    backtest(df)