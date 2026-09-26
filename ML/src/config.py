"""
Central config — paths, constants, and column name mapping.
"""

import os

# ---------- Paths ----------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RAW_DATA_DIR = os.path.join(BASE_DIR, "data", "raw")
INTERIM_DATA_DIR = os.path.join(BASE_DIR, "data", "interim")
PROCESSED_DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
MODELS_DIR = os.path.join(BASE_DIR, "models")

MERGED_RAW_PATH = os.path.join(INTERIM_DATA_DIR, "merged_all_years.csv")
CLEANED_PATH = os.path.join(INTERIM_DATA_DIR, "cleaned.csv")
RESAMPLED_PATH = os.path.join(INTERIM_DATA_DIR, "resampled_daily.csv")
FEATURED_PATH = os.path.join(PROCESSED_DATA_DIR, "featured_dataset.csv")
MODEL_PATH = os.path.join(MODELS_DIR, "price_model_v1.pkl")
GROUP_MAPPING_PATH = os.path.join(INTERIM_DATA_DIR, "commodity_group_mapping.csv")

# ---------- Column mapping ----------
COLUMN_MAP = {
    "state": "State",
    "district": "District",
    "mandi": "Market",
    "crop": "Commodity",
    "variety": "Variety",
    "min_price": "Min_Price",
    "max_price": "Max_Price",
    "modal_price": "Modal_Price",
    "arrival_date": "Arrival_Date",
}

# ---------- Scope narrowing (NEW) ----------
# Focus training on one state and its highest-volume crops, so the model
# isn't diluted by thousands of thin, noisy crop-mandi pairs across all
# of India. Set FOCUS_STATE to None to disable and use all states.
FOCUS_STATE = "Maharashtra"
TOP_N_CROPS = 10   # picks the N crops with the most REAL records, within FOCUS_STATE

# ---------- Cleaning thresholds ----------
MIN_RECORDS_PER_CROP_MANDI = 500
OUTLIER_LOWER_QUANTILE = 0.01
OUTLIER_UPPER_QUANTILE = 0.99
EXCLUDED_COMMODITY_GROUPS = ["Flowers"]   # from commodity_group_mapping.csv, not a hardcoded crop list

# ---------- Resampling ----------
MAX_GAP_DAYS = 14

# ---------- Feature engineering ----------
LAG_DAYS = [7, 14, 30, 90, 365]
ROLLING_WINDOWS = [7, 30]

# ---------- Train/test split ----------
TEST_START_DATE = "2024-01-01"
BACKTEST_YEARS = [2022, 2023, 2024, 2025]

# ---------- Model ----------
LGBM_PARAMS = {
    "n_estimators": 1000,
    "learning_rate": 0.03,
    "max_depth": 8,
    "num_leaves": 31,
    "max_bin": 512,
    "cat_smooth": 10.0,
    "min_data_per_group": 100,
    "random_state": 42,
}

INTERPOLATED_SAMPLE_WEIGHT = 0.3
LOG_TRANSFORM_TARGET = True

# ---------- Agmarknet live API ----------
AGMARKNET_API_URL = "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24"
AGMARKNET_API_KEY = "579b464db66ec23bdd0000013684a9a340b74db34c093bb15ebed415"