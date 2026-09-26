"""
Sanity-check your trained model:
1. Compare against a naive baseline (does the model add any value at all?)
2. Spot-check individual crop-mandi forecasts against real history
3. Check feature importance (is the model using sensible signals?)
4. Residual analysis (is the model systematically biased?)
"""

import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_percentage_error

from src.model_utils import predict_price
from src import config
from src.features import FEATURE_COLUMNS

# Force pandas to display all rows/columns cleanly in terminal
pd.set_option('display.max_rows', 50)
pd.set_option('display.max_columns', 10)
pd.set_option('display.width', 1000)


def baseline_naive_mape(df: pd.DataFrame) -> float:
    """
    Naive baseline: predict tomorrow's price = today's price (yesterday's actual value 
    via a 1-day shift for a fair test).
    """
    df = df.sort_values(["crop", "mandi", "arrival_date"]).copy()
    df["naive_pred"] = df.groupby(["crop", "mandi"])["modal_price"].shift(1)
    df = df.dropna(subset=["naive_pred"])

    mape = mean_absolute_percentage_error(df["modal_price"], df["naive_pred"]) * 100
    return mape


def check_mape_by_crop(model, df, date_col):
    """Calculates error per crop to highlight high-volatility commodities."""
    print("\n" + "=" * 60)
    print("3. PER-CROP MAPE BREAKDOWN (TOP 20 MOST VOLATILE / HIGH ERROR)")
    print("=" * 60)
    
    test = df[df[date_col] >= config.TEST_START_DATE].copy()
    for col in ["crop", "mandi", "state"]:
        test[col] = test[col].astype("category")
        
    preds = predict_price(model, test[FEATURE_COLUMNS])
    test["ape"] = abs(preds - test["modal_price"]) / test["modal_price"] * 100
    
    crop_stats = test.groupby("crop")["ape"].agg(["mean", "median", "count"]).rename(
        columns={"mean": "MAPE (%)", "median": "Median APE (%)", "count": "Test Samples"}
    ).sort_values("MAPE (%)", ascending=False)
    
    # Print the full table directly without truncation
    print(crop_stats.head(20).to_string())
    print("=" * 60)


def model_vs_baseline(model, df: pd.DataFrame):
    test = df[df["arrival_date"] >= config.TEST_START_DATE].copy()
    for col in ["crop", "mandi", "state"]:
        test[col] = test[col].astype("category")

    preds = predict_price(model, test[FEATURE_COLUMNS])
    model_mape = mean_absolute_percentage_error(test["modal_price"], preds) * 100

    baseline_mape = baseline_naive_mape(df[df["arrival_date"] >= config.TEST_START_DATE])

    print(f"Naive baseline MAPE (yesterday's price = today's prediction): {baseline_mape:.2f}%")
    print(f"Your model's MAPE:                                            {model_mape:.2f}%")

    if model_mape < baseline_mape:
        print(f"✅ Model beats the naive baseline by {baseline_mape - model_mape:.2f} percentage points.")
    else:
        print(f"⚠️ Model is WORSE than just assuming prices don't change. Needs work.")


def check_feature_importance(model):
    importances = pd.DataFrame({
        "feature": FEATURE_COLUMNS,
        "importance": model.feature_importances_
    }).sort_values("importance", ascending=False)
    print("\nFeature importance (higher = model relies on it more):")
    print(importances.to_string(index=False))


def spot_check(model, df: pd.DataFrame, crop: str, mandi: str, n_days: int = 10):
    """
    Pick a crop-mandi you know well, show the model's predictions next to
    real prices for the last n_days of the test set.
    """
    subset = df[(df["crop"] == crop) & (df["mandi"] == mandi)].copy()
    subset = subset[subset["arrival_date"] >= config.TEST_START_DATE].sort_values("arrival_date")

    if subset.empty:
        print(f"No test-period data found for {crop} / {mandi}. Try a different pair.")
        return

    for col in ["crop", "mandi", "state"]:
        subset[col] = subset[col].astype("category")

    subset["predicted_price"] = predict_price(model, subset[FEATURE_COLUMNS])
    subset["error_pct"] = abs(subset["predicted_price"] - subset["modal_price"]) / subset["modal_price"] * 100

    print(f"\nSpot check: {crop} in {mandi}")
    print(subset[["arrival_date", "modal_price", "predicted_price", "error_pct"]].tail(n_days).to_string(index=False))


def check_bias(model, df: pd.DataFrame):
    print("\n" + "=" * 60)
    print("4. RESIDUAL BIAS ANALYSIS")
    print("=" * 60)
    test = df[df["arrival_date"] >= config.TEST_START_DATE].copy()
    for col in ["crop", "mandi", "state"]:
        test[col] = test[col].astype("category")

    test["predicted"] = predict_price(model, test[FEATURE_COLUMNS])
    test["residual"] = test["predicted"] - test["modal_price"]  # positive = overprediction

    print(f"Mean residual: ₹{test['residual'].mean():.2f}  "
          f"(positive = model overshoots on average, negative = undershoots)")
    print(f"Residual std dev: ₹{test['residual'].std():.2f}")


if __name__ == "__main__":
    model = joblib.load(config.MODEL_PATH)
    df = pd.read_csv(config.FEATURED_PATH, parse_dates=["arrival_date"])

    print("=" * 60)
    print("1. MODEL vs NAIVE BASELINE")
    print("=" * 60)
    model_vs_baseline(model, df)

    print("\n" + "=" * 60)
    print("2. FEATURE IMPORTANCE")
    print("=" * 60)
    check_feature_importance(model)

    # 3. Per-Crop Breakdown
    check_mape_by_crop(model, df, "arrival_date")

    # 4. Residual Bias
    check_bias(model, df)

    print("\n" + "=" * 60)
    print("5. SPOT CHECK")
    print("=" * 60)
    spot_check(model, df, crop="Green Peas", mandi="Pune")