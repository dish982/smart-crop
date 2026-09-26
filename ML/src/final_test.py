
"""
Comprehensive final test for the Maharashtra-focused, top-N-crop model.

Compares the trained model against a naive 1-day baseline:
    naive prediction = previous observed modal price

The baseline is calculated on the COMPLETE time series first,
so the first test-day observation can correctly use the final
pre-test observation as its previous-day value.

Usage:
    python -m src.final_test
"""

import joblib
import pandas as pd

from src import config
from src.features import FEATURE_COLUMNS
from src.model_utils import predict_price


def _naive_baseline_per_crop(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate naive baseline MAPE by crop.

    Important:
    The previous-day price is calculated BEFORE filtering to the
    test period, so the first test observation can use the
    previous available observation.
    """

    df = df.sort_values(
        ["crop", "mandi", "arrival_date"]
    ).copy()

    # Previous observed price for each crop-mandi series
    df["naive_pred"] = (
        df.groupby(["crop", "mandi"])["modal_price"]
        .shift(1)
    )

    # Keep only the actual test period
    test = df[
        df["arrival_date"] >= config.TEST_START_DATE
    ].copy()

    # Remove rows where no previous observation exists
    test = test.dropna(subset=["naive_pred"])

    # Absolute Percentage Error
    test["naive_ape"] = (
        abs(test["modal_price"] - test["naive_pred"])
        / test["modal_price"]
        * 100
    )

    return (
        test.groupby("crop")["naive_ape"]
        .mean()
        .rename("baseline_mape")
    )


def run_final_test():

    # ---------------------------------------------------------
    # 1. Load trained model
    # ---------------------------------------------------------
    model = joblib.load(config.MODEL_PATH)

    # ---------------------------------------------------------
    # 2. Load featured dataset
    # ---------------------------------------------------------
    df = pd.read_csv(
        config.FEATURED_PATH,
        parse_dates=["arrival_date"]
    )

    print("=" * 75)
    print(
        f"FINAL TEST — {config.FOCUS_STATE or 'All states'}, "
        f"{config.TOP_N_CROPS or 'all'} crops"
    )
    print("=" * 75)

    # ---------------------------------------------------------
    # 3. Create test set
    # ---------------------------------------------------------
    test = df[
        df["arrival_date"] >= config.TEST_START_DATE
    ].copy()

    print(f"Test rows: {len(test)}")

    # Match categorical columns used during training
    for col in ["crop", "mandi", "state"]:
        test[col] = test[col].astype("category")

    # ---------------------------------------------------------
    # 4. Model predictions
    # ---------------------------------------------------------
    test["predicted"] = predict_price(
        model,
        test[FEATURE_COLUMNS]
    )

    # ---------------------------------------------------------
    # 5. Model MAPE
    # ---------------------------------------------------------
    test["ape"] = (
        abs(test["predicted"] - test["modal_price"])
        / test["modal_price"]
        * 100
    )

    model_mape = (
        test.groupby("crop")["ape"]
        .mean()
        .rename("model_mape")
    )

    # ---------------------------------------------------------
    # 6. Naive baseline
    # ---------------------------------------------------------
    baseline_mape = _naive_baseline_per_crop(df)

    # ---------------------------------------------------------
    # 7. Number of test samples
    # ---------------------------------------------------------
    n_samples = (
        test.groupby("crop")
        .size()
        .rename("n_test_samples")
    )

    # ---------------------------------------------------------
    # 8. Combine results
    # ---------------------------------------------------------
    report = pd.concat(
        [
            model_mape,
            baseline_mape,
            n_samples
        ],
        axis=1
    ).dropna()

    # Positive = model is better than naive baseline
    report["improvement_pts"] = (
        report["baseline_mape"]
        - report["model_mape"]
    )

    # Percentage improvement relative to baseline
    report["improvement_pct"] = (
        report["improvement_pts"]
        / report["baseline_mape"]
        * 100
    )

    report = report.sort_values(
        "improvement_pts",
        ascending=False
    )

    # ---------------------------------------------------------
    # 9. Display per-crop results
    # ---------------------------------------------------------
    print("\nPer-crop comparison:")
    print("-" * 75)

    print(
        report[
            [
                "model_mape",
                "baseline_mape",
                "improvement_pts",
                "improvement_pct",
                "n_test_samples"
            ]
        ].round(2).to_string()
    )

    # ---------------------------------------------------------
    # 10. Overall results
    # ---------------------------------------------------------
    overall_model_mape = test["ape"].mean()

    # Calculate overall naive MAPE using the same test rows
    baseline_df = df.sort_values(
        ["crop", "mandi", "arrival_date"]
    ).copy()

    baseline_df["naive_pred"] = (
        baseline_df
        .groupby(["crop", "mandi"])["modal_price"]
        .shift(1)
    )

    baseline_test = baseline_df[
        baseline_df["arrival_date"] >= config.TEST_START_DATE
    ].dropna(subset=["naive_pred"]).copy()

    baseline_test["naive_ape"] = (
        abs(
            baseline_test["modal_price"]
            - baseline_test["naive_pred"]
        )
        / baseline_test["modal_price"]
        * 100
    )

    overall_baseline_mape = baseline_test["naive_ape"].mean()

    overall_improvement = (
        overall_baseline_mape
        - overall_model_mape
    )

    overall_improvement_pct = (
        overall_improvement
        / overall_baseline_mape
        * 100
    )

    print("\n" + "=" * 75)
    print("OVERALL RESULTS")
    print("=" * 75)

    print(f"Model MAPE:            {overall_model_mape:.2f}%")
    print(f"Naive baseline MAPE:   {overall_baseline_mape:.2f}%")
    print(f"Improvement:           {overall_improvement:.2f} percentage points")
    print(f"Relative improvement:  {overall_improvement_pct:.2f}%")

    print("=" * 75)

    return report


if __name__ == "__main__":
    run_final_test()