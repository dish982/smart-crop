import os

ML_SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(ML_SERVICE_DIR)
ML_DATA_DIR = os.path.join(PROJECT_ROOT, "ML", "data", "interim")

RESAMPLED_PATH = os.path.join(ML_DATA_DIR, "resampled_daily.csv")
MODEL_PATH = os.path.join(ML_SERVICE_DIR, "price_model_v1.pkl")

LAG_DAYS = [7, 14, 30, 90, 365]
ROLLING_WINDOWS = [7, 30]
FORECAST_DAYS = 15

LOG_TRANSFORM_TARGET = True

WAIT_GAIN_THRESHOLD_PCT = 5.0
FALL_LOSS_THRESHOLD_PCT = -5.0