"""
Trains the LightGBM price forecasting model using a TIME-based
train/test split. Includes:
  - sample weighting to downweight interpolated (synthetic) rows
  - log-transformed target to dampen extreme price spikes
  - properly-passed categorical_feature (via fit(), not constructor,
    which is what caused the "categorical_feature ignored" warnings)
"""

import os
import numpy as np
import joblib
import lightgbm as lgb
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error

from src import config
from src.features import FEATURE_COLUMNS
from src.model_utils import transform_target, predict_price


def _prepare_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for col in ["crop", "mandi", "state"]:
        df[col] = df[col].astype("category")
    return df


def train_model(df: pd.DataFrame, save: bool = True):
    df = _prepare_categoricals(df)

    train = df[df["arrival_date"] < config.TEST_START_DATE]
    test = df[df["arrival_date"] >= config.TEST_START_DATE]

    print(f"Train rows: {len(train)} | Test rows: {len(test)}")

    X_train, y_train = train[FEATURE_COLUMNS], train["modal_price"]
    X_test, y_test = test[FEATURE_COLUMNS], test["modal_price"]

    # Sample weights: real observations get full weight, interpolated rows
    # (from resample.py) get reduced weight so the model doesn't learn
    # fake straight-line trends as if they were real price movements.
    if "is_interpolated" in train.columns:
        sample_weight = np.where(train["is_interpolated"], config.INTERPOLATED_SAMPLE_WEIGHT, 1.0)
    else:
        print("[!] 'is_interpolated' column not found — training with uniform weights. "
              "Make sure you're passing the output of resample_daily() through features.py.")
        sample_weight = None

    y_train_transformed = transform_target(y_train)
    y_test_transformed = transform_target(y_test)

    model = lgb.LGBMRegressor(**config.LGBM_PARAMS)

    model.fit(
        X_train, y_train_transformed,
        sample_weight=sample_weight,
        eval_set=[(X_test, y_test_transformed)],
        categorical_feature=["crop", "mandi", "state"],  # passed here, not in constructor
        callbacks=[lgb.early_stopping(30), lgb.log_evaluation(50)],
    )

    # Convert predictions back to real rupees before computing real-world metrics
    preds = predict_price(model, X_test)
    mae = mean_absolute_error(y_test, preds)
    mape = mean_absolute_percentage_error(y_test, preds) * 100

    print(f"\nTest MAE:  {mae:.2f}")
    print(f"Test MAPE: {mape:.2f}%")

    if save:
        os.makedirs(config.MODELS_DIR, exist_ok=True)
        joblib.dump(model, config.MODEL_PATH)
        print(f"Saved model -> {config.MODEL_PATH}")

    return model, X_test, y_test, preds


if __name__ == "__main__":
    df = pd.read_csv(config.FEATURED_PATH, parse_dates=["arrival_date"])
    train_model(df)