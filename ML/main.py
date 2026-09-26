"""
Runs the pipeline starting from your already-cleaned dataset:
    load cleaned.csv -> resample -> feature engineer -> train -> backtest

If you ever need to redo cleaning from scratch, run
`python -m src.clean` separately first.
"""

import os
import pandas as pd

from src import config
from src.resample import resample_daily
from src.features import build_features
from src.train import train_model
from src.evaluate import backtest, backtest_multistep


def main():
    if not os.path.exists(config.CLEANED_PATH):
        raise FileNotFoundError(
            f"{config.CLEANED_PATH} not found. Run `python -m src.clean` first."
        )

    print("=" * 60)
    print("STEP 1: Loading your already-cleaned dataset")
    print("=" * 60)
    clean_df = pd.read_csv(config.CLEANED_PATH, parse_dates=["arrival_date"])
    print(f"Loaded {len(clean_df)} cleaned rows")

    print("\n" + "=" * 60)
    print("STEP 2: Resampling to daily calendar grid")
    print("=" * 60)
    daily_df = resample_daily(clean_df)

    print("\n" + "=" * 60)
    print("STEP 3: Feature engineering")
    print("=" * 60)
    featured_df = build_features(daily_df)

    print("\n" + "=" * 60)
    print("STEP 4: Training model (time-based split)")
    print("=" * 60)
    model, X_test, y_test, preds = train_model(featured_df)

    print("\n" + "=" * 60)
    print("STEP 5: Backtesting (1-day-ahead, sanity check)")
    print("=" * 60)
    results = backtest(featured_df)
    print("\n1-day-ahead backtest summary:")
    print(results)

    print("\n" + "=" * 60)
    print("STEP 6: Backtesting (realistic multi-day recursive forecast)")
    print("=" * 60)
    multistep_results = backtest_multistep(model, daily_df)
    print("\nMulti-day-ahead backtest summary (this is the number that matters):")
    print(multistep_results)

    print("\nPipeline complete. Model saved in models/price_model_v1.pkl")


if __name__ == "__main__":
    main()