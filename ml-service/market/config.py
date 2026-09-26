import os

# NOTE: this file now lives at ml-service/market/config.py (one level deeper
# than before), so PROJECT_ROOT needs one extra os.path.dirname() to still
# find the repo root correctly.

MARKET_DIR = os.path.dirname(os.path.abspath(__file__))   # .../ml-service/market
ML_SERVICE_DIR = os.path.dirname(MARKET_DIR)               # .../ml-service
PROJECT_ROOT = os.path.dirname(ML_SERVICE_DIR)              # repo root
ML_DATA_DIR = os.path.join(PROJECT_ROOT, "ML", "data", "interim")

RESAMPLED_PATH = os.path.join(MARKET_DIR, "data", "resampled_daily.csv")
MODEL_PATH = os.path.join(MARKET_DIR, "price_model_v1.pkl")  # moves together with this file

LAG_DAYS = [7, 14, 30, 90, 365]
ROLLING_WINDOWS = [7, 30]
FORECAST_DAYS = 15

LOG_TRANSFORM_TARGET = True

WAIT_GAIN_THRESHOLD_PCT = 5.0
FALL_LOSS_THRESHOLD_PCT = -5.0