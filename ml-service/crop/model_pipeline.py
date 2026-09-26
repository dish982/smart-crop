"""
model_pipeline.py
===============================================================================
Smart Crop Advisory System — Module 1: Crop Recommendation

Features:
1. Loads the three cleaned datasets created by audit_crop.py.
2. Trains and evaluates Random Forest and Logistic Regression.
3. Saves new model artifacts separately from older model files.
4. Fetches current and historical weather automatically from Open-Meteo.
5. Accepts structured inputs for future FastAPI integration.
6. Supports interactive terminal recommendations.
7. Uses state, district, and season for historical evidence lookup.
8. Checks historical records before displaying recommendations.
9. Allows historical evidence to influence recommendation ranking.
10. Handles soil estimates, missing values, invalid inputs, and API errors.
11. NEW: If a farmer has NO soil values at all (no Soil Health Card AND no
    district-level soil estimate is available), the system no longer stops.
    It still calls Open-Meteo for that location's weather/climate, still
    looks up historical planting evidence for the farmer's state and
    district, and returns a clearly-labeled GENERAL recommendation driven
    mainly by location + weather + historical evidence instead of soil
    chemistry. State and district alone are enough to get a recommendation.

Run:
    python model_pipeline.py train
    python model_pipeline.py recommend
    python model_pipeline.py
===============================================================================
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import joblib

try:
    import requests
except ImportError:
    requests = None

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

from sklearn.model_selection import (
    train_test_split,
    cross_val_score,
    StratifiedKFold,
)
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)


# =============================================================================
# 1. PATHS AND CONSTANTS
# =============================================================================

BASE_DIR = Path(__file__).resolve().parent

CR_FILE = BASE_DIR / "cleaned_data" / "crop_recommendation_cleaned.csv"
AD_FILE = BASE_DIR / "cleaned_data" / "agriculture_cleaned.csv"
SOIL_PROFILE_FILE = (
    BASE_DIR / "cleaned_data" / "soil_district_profiles.csv"
)

# New artifact directory: keeps previously generated model files untouched.
ARTIFACT_DIR = BASE_DIR / "model_artifacts_v2"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = ARTIFACT_DIR / "crop_rf_model_v2.joblib"
SCALER_PATH = ARTIFACT_DIR / "crop_feature_scaler_v2.joblib"
METADATA_PATH = ARTIFACT_DIR / "crop_model_metadata_v2.json"

FEATURE_COLUMNS = [
    "N",
    "P",
    "K",
    "temperature",
    "humidity",
    "ph",
    "rainfall",
]

SOIL_COLUMNS = [
    "Nitrogen Value",
    "Phosphorous value",
    "Potassium value",
    "pH",
]

REQUEST_TIMEOUT_SECONDS = 10

# A small historical-evidence adjustment, not a replacement for the model.
# Historical absence does not penalize a crop.
HISTORICAL_MATCH_BONUS = 0.05

# A crop needs at least this many historical records before it earns any
# bonus at all. A single old record (sometimes decades old) is not enough
# evidence to let a crop the model scores near zero outrank a crop the
# model actually favors.
MIN_RECORDS_FOR_BONUS = 3

# Above MIN_RECORDS_FOR_BONUS, the bonus scales up with record count and
# reaches the full HISTORICAL_MATCH_BONUS once a crop has this many
# matching records. Crops between the minimum and this count get a
# partial bonus, so more evidence always counts for more.
FULL_BONUS_RECORD_COUNT = 20

# Historical evidence may only re-rank crops the model already considers
# plausible. Only the top HISTORICAL_SHORTLIST_SIZE crops by raw model
# probability are eligible for a historical bonus; a crop the model scores
# near zero can never be pulled into the results purely by old records,
# no matter how many records it has.
HISTORICAL_SHORTLIST_SIZE = 8

# -----------------------------------------------------------------------------
# NEW: GENERAL RECOMMENDATION MODE (no soil data available at all)
#
# A farmer may know only their state and district, with no Soil Health Card
# and no matching district soil profile. In that case the system still
# produces a recommendation instead of stopping:
#   - N, P, K, and pH are set to a NATIONWIDE AVERAGE (see
#     get_national_soil_estimate()), only so the Random Forest model can
#     still run on numeric inputs.
#   - Because soil chemistry is generic (not farm-specific) in this mode,
#     ranking is done by rank_crops_general_mode(), which makes historical
#     planting evidence for the farmer's exact state/district/season the
#     PRIMARY signal, and the Random Forest probability a secondary,
#     tie-breaking signal -- the opposite priority of the normal
#     apply_historical_evidence() path used when real soil data exists.
#   - The result is clearly marked as a GENERAL recommendation so it is
#     never confused with a soil-specific one.
#
# GENERAL_MODE_HISTORICAL_BONUS_MULTIPLIER below is kept for reference /
# alternate use with apply_historical_evidence(), but the active general-
# mode ranking path is rank_crops_general_mode(), not this multiplier.
# -----------------------------------------------------------------------------
GENERAL_MODE_HISTORICAL_BONUS_MULTIPLIER = 3.0

# Cache for the nationwide average soil profile so it is computed once.
NATIONAL_SOIL_ESTIMATE_CACHE = {"values": None}

if load_dotenv:
    load_dotenv(BASE_DIR / ".env")

OPEN_METEO_GEOCODE_URL = (
    "https://geocoding-api.open-meteo.com/v1/search"
)

OPEN_METEO_WEATHER_URL = (
    "https://api.open-meteo.com/v1/forecast"
)

OPEN_METEO_ARCHIVE_URL = (
    "https://archive-api.open-meteo.com/v1/archive"
)

# -----------------------------------------------------------------------------
# RAINFALL FEATURE DEFINITION (prediction time)
#
# The training column "rainfall" is documented only as "rainfall in mm".
# Its averaging period is NOT stated anywhere. Its value range (20-299 mm,
# median ~95 mm) is compatible with a MONTHLY-scale quantity. It is not
# compatible with hourly/current rain, a single day, or an annual/seasonal
# TOTAL. So the prediction-time feature is defined as:
#
#   mean monthly precipitation total (mm/month) for the selected calendar
#   season, averaged over CLIMATOLOGY_YEARS complete years, from
#   Open-Meteo's Historical Weather
#   API (ERA5 reanalysis).
#
# Two variants are supported because the data cannot tell them apart:
#   "season_mean_monthly_proxy": average over the calendar months of the
#                                selected season (SEASON_MONTHS)
#   "annual_mean_monthly": annual total / 12
#
# This is an ASSUMED definition. It must be confirmed by external validation
# (see dataset_validation.py) before it is presented as verified.
# -----------------------------------------------------------------------------
RAINFALL_FEATURE_MODE = "season_mean_monthly_proxy"
CLIMATOLOGY_YEARS = 10
CLIMATOLOGY_TIMEOUT_SECONDS = 30

# When True, temperature and humidity are also taken from the same historical
# window instead of the current instantaneous reading, so all three weather
# features are defined the same way. Current weather is still shown to the
# user as information.
USE_CLIMATE_TEMP_HUMIDITY = True

# Calendar-month convention for each season label in the agriculture dataset.
# ASSUMPTION: the dataset does not define these months. Confirm them with your
# agriculture department / data owner and edit here if they differ.
SEASON_MONTHS = {
    "kharif": [6, 7, 8, 9, 10],
    "rabi": [11, 12, 1, 2, 3],
    "summer": [4, 5, 6],
    "autumn": [9, 10, 11],
    "winter": [12, 1, 2],
    "whole year": list(range(1, 13)),
}


# =============================================================================
# 2. EXCEPTIONS
# =============================================================================

class RecommendationError(Exception):
    """Base exception for recommendation-related errors."""


class DatasetError(RecommendationError):
    """Raised when a required dataset is missing or invalid."""


class ModelArtifactError(RecommendationError):
    """Raised when model artifacts are missing or inconsistent."""


class InputValidationError(RecommendationError):
    """Raised when farmer input is invalid."""


class WeatherLookupError(RecommendationError):
    """Raised when weather lookup fails."""


# =============================================================================
# 3. CROP-NAME NORMALIZATION
# =============================================================================

CROP_RECOMMENDATION_LABEL_MAP = {
    "kidneybeans": "kidney beans",
    "pigeonpeas": "pigeon peas",
    "mothbeans": "moth beans",
    "mungbean": "mung bean",
    "blackgram": "black gram",
}

AGRICULTURE_CROP_MAP = {
    "blackgram": "black gram",
    "water melon": "watermelon",
    "pome granet": "pomegranate",
    "moong(green gram)": "mung bean",
    "masoor": "lentil",
    "cotton(lint)": "cotton",
    "gram": "chickpea",
    "rajmash kholar": "kidney beans",
    "moth": "moth beans",
    "arhar/tur": "pigeon peas",
}


def normalize_text(value):
    """Lowercase, trim, and collapse whitespace."""
    if pd.isna(value):
        return value

    return " ".join(str(value).strip().lower().split())


def normalize_crop_name(name, mapping=None):
    """Normalize a crop name using only documented exact mappings."""
    cleaned = normalize_text(name)

    if pd.isna(cleaned):
        return cleaned

    if mapping:
        cleaned = mapping.get(cleaned, cleaned)

    return cleaned


# =============================================================================
# 4. LOAD CLEANED CROP RECOMMENDATION DATA
# =============================================================================

def load_crop_recommendation_data():
    """
    Load the cleaned classifier dataset.

    The classifier is trained only on this dataset.
    Agriculture and soil datasets are not merged into its training rows.
    """
    if not CR_FILE.exists():
        raise DatasetError(
            f"Cleaned crop recommendation dataset not found:\n{CR_FILE}\n"
            "Run audit_crop.py first and ensure it saves the cleaned CSV."
        )

    df = pd.read_csv(CR_FILE)

    required_columns = FEATURE_COLUMNS + ["label"]
    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:
        raise DatasetError(
            f"Crop recommendation dataset is missing columns: {missing}"
        )

    for column in FEATURE_COLUMNS:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce",
        )

    df["label"] = df["label"].apply(
        lambda value: normalize_crop_name(
            value,
            CROP_RECOMMENDATION_LABEL_MAP,
        )
    )

    df = df.dropna(subset=required_columns)
    df = df.drop_duplicates().reset_index(drop=True)

    if df.empty:
        raise DatasetError(
            "No usable rows remain in the crop recommendation dataset."
        )

    if df["label"].nunique() < 2:
        raise DatasetError(
            "At least two crop classes are required to train the model."
        )

    return df


# =============================================================================
# 5. LOAD CLEANED AGRICULTURE DATA
# =============================================================================

def load_agriculture_data():
    """Load the cleaned agriculture dataset for historical evidence."""
    if not AD_FILE.exists():
        raise DatasetError(
            f"Cleaned agriculture dataset not found:\n{AD_FILE}\n"
            "Run audit_crop.py first and ensure it saves the cleaned CSV."
        )

    df = pd.read_csv(AD_FILE)

    required_columns = [
        "State_Name",
        "District_Name",
        "Crop_Year",
        "Season",
        "Crop",
        "Area",
        "Production",
    ]

    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:
        raise DatasetError(
            f"Agriculture dataset is missing columns: {missing}"
        )

    for column in ["Crop_Year", "Area", "Production"]:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce",
        )

    df["State_Name"] = df["State_Name"].apply(normalize_text)
    df["District_Name"] = df["District_Name"].apply(normalize_text)
    df["Season"] = df["Season"].apply(normalize_text)

    df["Crop"] = df["Crop"].apply(
        lambda value: normalize_crop_name(
            value,
            AGRICULTURE_CROP_MAP,
        )
    )

    if "Crop_original" not in df.columns:
        df["Crop_original"] = df["Crop"]

    return df


# =============================================================================
# 6. HISTORICAL DATA HELPERS
# =============================================================================

def get_available_states(ad_df):
    """Return available state names."""
    return sorted(
        ad_df["State_Name"].dropna().unique().tolist()
    )


def get_districts_for_state(ad_df, state):
    """Return districts available for the selected state."""
    state_n = normalize_text(state)

    subset = ad_df[
        ad_df["State_Name"] == state_n
    ]

    return sorted(
        subset["District_Name"].dropna().unique().tolist()
    )


def get_seasons_for_state_district(ad_df, state, district):
    """Return seasons recorded for a state and district."""
    state_n = normalize_text(state)
    district_n = normalize_text(district)

    subset = ad_df[
        (ad_df["State_Name"] == state_n)
        & (ad_df["District_Name"] == district_n)
    ]

    seasons = sorted(
        subset["Season"].dropna().unique().tolist()
    )

    if not seasons:
        seasons = sorted(
            ad_df["Season"].dropna().unique().tolist()
        )

    return seasons


def historical_crop_summary(
    ad_df,
    state,
    district,
    season,
    crop,
    strict_season=True,
):
    """
    Find historical records for one predicted crop.

    Returns None when no usable matching records exist.

    NEW: strict_season (default True -- preserves the exact original
    behavior for every existing caller). When False, and there are no
    records for the exact season, this retries using ALL seasons
    recorded for this state/district/crop instead of returning None --
    the same fallback already used by get_most_common_historical_crops().
    This is used by rank_crops_general_mode() so that a real (if
    season-sparse) planting history is not treated as "no evidence" in
    GENERAL (no-soil-data) mode.
    """
    state_n = normalize_text(state)
    district_n = normalize_text(district)
    season_n = normalize_text(season)
    crop_n = normalize_crop_name(crop)

    def _build_summary(raw_subset, season_matched):
        subset = raw_subset[
            (raw_subset["Area"] > 0)
            & raw_subset["Production"].notna()
            & raw_subset["Crop_Year"].notna()
        ].copy()

        if subset.empty:
            return None

        subset["Yield"] = (
            subset["Production"] / subset["Area"]
        )

        subset = subset.replace(
            [np.inf, -np.inf],
            np.nan,
        )

        subset = subset.dropna(subset=["Yield"])

        if subset.empty:
            return None

        subset = subset.sort_values("Crop_Year")

        return {
            "crop": crop_n,
            "state": state_n,
            "district": district_n,
            "season": season_n,
            "season_matched": season_matched,
            "records": int(len(subset)),
            "first_year": int(subset["Crop_Year"].min()),
            "last_year": int(subset["Crop_Year"].max()),
            "average_yield": float(subset["Yield"].mean()),
            "median_yield": float(subset["Yield"].median()),
            "minimum_yield": float(subset["Yield"].min()),
            "maximum_yield": float(subset["Yield"].max()),
            "recent_yield": float(subset["Yield"].iloc[-1]),
            "total_production": float(subset["Production"].sum()),
            "total_area": float(subset["Area"].sum()),
        }

    season_subset = ad_df[
        (ad_df["State_Name"] == state_n)
        & (ad_df["District_Name"] == district_n)
        & (ad_df["Season"] == season_n)
        & (ad_df["Crop"] == crop_n)
    ]

    result = _build_summary(season_subset, season_matched=True)

    if result is not None or strict_season:
        return result

    # NEW fallback (strict_season=False only): same state/district/crop,
    # any season -- a farmer's district may simply have very few records
    # for the exact selected season.
    any_season_subset = ad_df[
        (ad_df["State_Name"] == state_n)
        & (ad_df["District_Name"] == district_n)
        & (ad_df["Crop"] == crop_n)
    ]

    return _build_summary(any_season_subset, season_matched=False)


# -----------------------------------------------------------------------------
# NEW: MOST-PLANTED CROPS FOR A STATE/DISTRICT (used in general mode, and
# shown as extra context any time a recommendation is made)
# -----------------------------------------------------------------------------

def get_most_common_historical_crops(
    ad_df,
    state,
    district,
    season=None,
    top_n=3,
):
    """
    Return the crops most often recorded as grown in a state/district.

    This is purely descriptive historical evidence ("in this district,
    this crop was planted the most") and does not by itself change the
    Random Forest model's probabilities. It is used to give farmers who
    have no soil data extra, locally-grounded context, and is also
    attached to every recommendation for transparency.

    If records exist for the requested season they are preferred;
    otherwise all seasons for that state/district are used, since a
    farmer without soil data may still benefit from seeing what is
    commonly grown there at all.
    """
    state_n = normalize_text(state)
    district_n = normalize_text(district)

    subset = ad_df[
        (ad_df["State_Name"] == state_n)
        & (ad_df["District_Name"] == district_n)
    ]

    if season:
        season_n = normalize_text(season)
        season_subset = subset[subset["Season"] == season_n]

        if not season_subset.empty:
            subset = season_subset

    subset = subset[
        (subset["Area"] > 0)
        & subset["Production"].notna()
    ]

    if subset.empty:
        return []

    grouped = subset.groupby("Crop").agg(
        records=("Crop", "count"),
        total_area=("Area", "sum"),
    ).reset_index()

    grouped = grouped.sort_values(
        ["records", "total_area"],
        ascending=[False, False],
    )

    return [
        {
            "crop": row["Crop"],
            "records": int(row["records"]),
            "total_area": float(row["total_area"]),
        }
        for _, row in grouped.head(top_n).iterrows()
    ]


# =============================================================================
# 7. LOAD SOIL DISTRICT PROFILES
# =============================================================================

def load_soil_district_profiles():
    """
    Load the district median profiles produced by audit_crop.py.

    This dataset has no state column. A district-name match therefore
    cannot guarantee that the estimate belongs to the selected state.
    """
    if not SOIL_PROFILE_FILE.exists():
        raise DatasetError(
            f"Cleaned soil district profiles not found:\n"
            f"{SOIL_PROFILE_FILE}\n"
            "Run audit_crop.py first and ensure it saves the soil profiles."
        )

    df = pd.read_csv(SOIL_PROFILE_FILE)

    required_columns = [
        "District",
        "Nitrogen Value",
        "Phosphorous value",
        "Potassium value",
        "pH",
    ]

    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:
        raise DatasetError(
            f"Soil profile dataset is missing columns: {missing}"
        )

    for column in SOIL_COLUMNS:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce",
        )

    df["District"] = df["District"].apply(normalize_text)

    if "record_count" not in df.columns:
        df["record_count"] = 1

    df["record_count"] = pd.to_numeric(
        df["record_count"],
        errors="coerce",
    ).fillna(0)

    return df


def get_soil_estimate_for_district(
    soil_district_df,
    district,
):
    """Return an available district median profile or None."""
    district_n = normalize_text(district)

    match = soil_district_df[
        soil_district_df["District"] == district_n
    ]

    if match.empty:
        return None

    row = match.iloc[0]

    values = {
        "N": row["Nitrogen Value"],
        "P": row["Phosphorous value"],
        "K": row["Potassium value"],
        "ph": row["pH"],
    }

    # Do not use a profile with missing required values.
    if any(pd.isna(value) for value in values.values()):
        return None

    return {
        "district": district_n,
        "N": float(values["N"]),
        "P": float(values["P"]),
        "K": float(values["K"]),
        "ph": float(values["ph"]),
        "record_count": int(row["record_count"]),
        "state_disambiguated": False,
        "note": (
            "This is a district-name median estimate. The soil dataset "
            "does not contain a State column, so the estimate cannot "
            "be guaranteed to belong to the selected state's district."
        ),
    }


# -----------------------------------------------------------------------------
# NEW: NATIONWIDE FALLBACK SOIL ESTIMATE (last resort, general mode only)
# -----------------------------------------------------------------------------

def get_national_soil_estimate():
    """
    Compute a nationwide average soil profile (mean N, P, K, pH) from the
    cleaned crop-recommendation training dataset.

    This is used ONLY as a last resort: when a farmer has no Soil Health
    Card values AND no district-level soil estimate is available for their
    district. It is intentionally generic and is NOT specific to the
    farmer's field, or even to their state or district — it exists purely
    so the Random Forest model still has numeric N/P/K/pH inputs to run
    on, while the actual recommendation leans on location, weather, and
    historical planting evidence instead (see GENERAL_MODE_HISTORICAL_
    BONUS_MULTIPLIER). Cached after first computation.
    """
    if NATIONAL_SOIL_ESTIMATE_CACHE["values"] is not None:
        return NATIONAL_SOIL_ESTIMATE_CACHE["values"]

    df = load_crop_recommendation_data()

    estimate = {
        "N": float(df["N"].mean()),
        "P": float(df["P"].mean()),
        "K": float(df["K"].mean()),
        "ph": float(df["ph"].mean()),
        "source_rows": int(len(df)),
        "note": (
            "Nationwide average across the training dataset. Not "
            "specific to any farm, district, or state. Used only "
            "because no Soil Health Card values and no district soil "
            "estimate were available."
        ),
    }

    NATIONAL_SOIL_ESTIMATE_CACHE["values"] = estimate

    return estimate


# =============================================================================
# 8. MODEL TRAINING AND EVALUATION
# =============================================================================

def train_model():
    """Train, evaluate, and save the Random Forest model."""
    print("\n===== TRAINING CROP RECOMMENDATION MODEL =====")

    df = load_crop_recommendation_data()

    print(f"Usable training rows: {len(df)}")
    print(f"Crop classes: {df['label'].nunique()}")
    print(
        "Class names:",
        sorted(df["label"].unique().tolist()),
    )

    X = df[FEATURE_COLUMNS].to_numpy(dtype=float)
    y = df["label"].astype(str).to_numpy()

    classes = sorted(
        df["label"].unique().tolist()
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    # Fit the scaler only on the training split.
    scaler = StandardScaler()

    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Primary model.
    rf_model = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        random_state=42,
        n_jobs=-1,
    )

    rf_model.fit(
        X_train_scaled,
        y_train,
    )

    rf_pred = rf_model.predict(
        X_test_scaled,
    )

    print("\n===== RANDOM FOREST FEATURE IMPORTANCE (impurity) =====")
    feature_importances = {
        column: float(value)
        for column, value in zip(
            FEATURE_COLUMNS,
            rf_model.feature_importances_,
        )
    }
    for column, value in sorted(
        feature_importances.items(),
        key=lambda item: item[1],
        reverse=True,
    ):
        print(f"{column:12s} {value:.3f}")

    print(
        "\nNOTE: this dataset has 100 rows per crop, no duplicates, and "
        "narrow per-crop feature ranges. High scores here measure how well "
        "the model separates these 22 crop profiles, not field-level "
        "success. Run dataset_validation.py for the full diagnosis."
    )

    # Logistic Regression baseline.
    baseline_model = LogisticRegression(
        max_iter=2000,
    )

    baseline_model.fit(
        X_train_scaled,
        y_train,
    )

    baseline_pred = baseline_model.predict(
        X_test_scaled,
    )

    def summarize(name, y_true, y_pred):
        metrics = {
            "accuracy": float(
                accuracy_score(y_true, y_pred)
            ),
            "macro_precision": float(
                precision_score(
                    y_true,
                    y_pred,
                    average="macro",
                    zero_division=0,
                )
            ),
            "macro_recall": float(
                recall_score(
                    y_true,
                    y_pred,
                    average="macro",
                    zero_division=0,
                )
            ),
            "macro_f1": float(
                f1_score(
                    y_true,
                    y_pred,
                    average="macro",
                    zero_division=0,
                )
            ),
        }

        print(f"\n--- {name} ---")
        for key, value in metrics.items():
            print(f"{key}: {value:.4f}")

        return metrics

    print("\n===== MODEL COMPARISON =====")

    rf_metrics = summarize(
        "Random Forest",
        y_test,
        rf_pred,
    )

    baseline_metrics = summarize(
        "Logistic Regression",
        y_test,
        baseline_pred,
    )

    print("\n===== RANDOM FOREST CLASSIFICATION REPORT =====")
    print(
        classification_report(
            y_test,
            rf_pred,
            zero_division=0,
        )
    )

    print("\n===== RANDOM FOREST CONFUSION MATRIX =====")

    cm = confusion_matrix(
        y_test,
        rf_pred,
        labels=classes,
    )

    print(
        pd.DataFrame(
            cm,
            index=classes,
            columns=classes,
        )
    )

    print("\n===== 5-FOLD CROSS-VALIDATION =====")

    cv = StratifiedKFold(
        n_splits=5,
        shuffle=True,
        random_state=42,
    )

    # Each fold gets its own scaler fitted only on that fold's training data.
    cv_scores = []

    for train_indices, validation_indices in cv.split(X_train, y_train):
        fold_scaler = StandardScaler()

        X_fold_train = fold_scaler.fit_transform(
            X_train[train_indices]
        )

        X_fold_validation = fold_scaler.transform(
            X_train[validation_indices]
        )

        fold_model = RandomForestClassifier(
            n_estimators=300,
            max_depth=None,
            random_state=42,
            n_jobs=-1,
        )

        fold_model.fit(
            X_fold_train,
            y_train[train_indices],
        )

        fold_predictions = fold_model.predict(
            X_fold_validation
        )

        cv_scores.append(
            accuracy_score(
                y_train[validation_indices],
                fold_predictions,
            )
        )

    cv_scores = np.asarray(cv_scores)

    print(
        "Fold accuracies:",
        np.round(cv_scores, 4).tolist(),
    )

    print(
        f"Mean CV accuracy: {cv_scores.mean():.4f}"
        f" (+/- {cv_scores.std():.4f})"
    )

    # Save model and scaler as a matched artifact pair.
    joblib.dump(
        rf_model,
        MODEL_PATH,
    )

    joblib.dump(
        scaler,
        SCALER_PATH,
    )

    metadata = {
        "model_name": "RandomForestClassifier",
        "artifact_version": 2,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "feature_columns": FEATURE_COLUMNS,
        "classes": classes,
        "n_training_rows": int(len(df)),
        # FALLBACK ONLY: never a substitute for a real rainfall value.
        "rainfall_median": float(df["rainfall"].median()),
        "feature_ranges": {
            column: [
                float(df[column].min()),
                float(df[column].max()),
            ]
            for column in FEATURE_COLUMNS
        },
        "feature_importances": feature_importances,
        "rainfall_definition": {
            "training_column_documentation": "rainfall in mm (period not stated)",
            "training_range_mm": [
                float(df["rainfall"].min()),
                float(df["rainfall"].max()),
            ],
            "training_median_mm": float(df["rainfall"].median()),
            "assumed_meaning": "mean monthly precipitation total (mm/month)",
            "verified": False,
            "prediction_mode": RAINFALL_FEATURE_MODE,
            "climatology_years": CLIMATOLOGY_YEARS,
        },
        "n_train_rows": int(len(X_train)),
        "n_test_rows": int(len(X_test)),
        "test_metrics": rf_metrics,
        "baseline_model": "LogisticRegression",
        "baseline_test_metrics": baseline_metrics,
        "cv_fold_accuracies": [
            float(value)
            for value in cv_scores
        ],
        "cv_mean_accuracy": float(cv_scores.mean()),
        "cv_std_accuracy": float(cv_scores.std()),
        "model_file": MODEL_PATH.name,
        "scaler_file": SCALER_PATH.name,
    }

    with open(
        METADATA_PATH,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            metadata,
            file,
            indent=2,
        )

    print("\n===== SAVED ARTIFACTS =====")
    print(f"Model: {MODEL_PATH}")
    print(f"Scaler: {SCALER_PATH}")
    print(f"Metadata: {METADATA_PATH}")

    print(
        "\nTraining complete. Run "
        "'python model_pipeline.py recommend' to test."
    )

    return rf_model, scaler, metadata


# =============================================================================
# 9. LOAD AND VALIDATE MODEL ARTIFACTS
# =============================================================================

def load_model():
    """Load and verify the model, scaler, and metadata."""
    required_files = [
        MODEL_PATH,
        SCALER_PATH,
        METADATA_PATH,
    ]

    missing_files = [
        path.name
        for path in required_files
        if not path.exists()
    ]

    if missing_files:
        raise ModelArtifactError(
            "Required model artifacts are missing: "
            f"{missing_files}. Run 'python model_pipeline.py train' first."
        )

    try:
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)

        with open(
            METADATA_PATH,
            "r",
            encoding="utf-8",
        ) as file:
            metadata = json.load(file)

    except Exception as exc:
        raise ModelArtifactError(
            f"Could not load model artifacts: {exc}"
        ) from exc

    if not hasattr(model, "predict_proba"):
        raise ModelArtifactError(
            "Loaded model does not support predict_proba()."
        )

    if not hasattr(model, "classes_"):
        raise ModelArtifactError(
            "Loaded model does not contain learned classes."
        )

    metadata_features = metadata.get("feature_columns")

    if metadata_features != FEATURE_COLUMNS:
        raise ModelArtifactError(
            "Metadata feature columns do not match this pipeline."
        )

    model_classes = [
        str(value)
        for value in model.classes_
    ]

    metadata_classes = [
        str(value)
        for value in metadata.get("classes", [])
    ]

    if model_classes != metadata_classes:
        raise ModelArtifactError(
            "Model classes do not match metadata classes. "
            "Retrain the model using this file."
        )

    if not hasattr(scaler, "n_features_in_"):
        raise ModelArtifactError(
            "Loaded scaler does not expose its fitted feature count."
        )

    if scaler.n_features_in_ != len(FEATURE_COLUMNS):
        raise ModelArtifactError(
            "Scaler feature count does not match expected model inputs."
        )

    if hasattr(model, "n_features_in_"):
        if model.n_features_in_ != len(FEATURE_COLUMNS):
            raise ModelArtifactError(
                "Model feature count does not match expected inputs."
            )

    return model, scaler, metadata


# =============================================================================
# 10. INPUT VALIDATION
# =============================================================================

def validate_numeric_value(
    name,
    value,
    minimum=None,
    maximum=None,
):
    """Validate a single numeric input."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise InputValidationError(
            f"'{name}' must be a numeric value."
        )

    if not np.isfinite(number):
        raise InputValidationError(
            f"'{name}' must be a finite number."
        )

    if minimum is not None and number < minimum:
        raise InputValidationError(
            f"'{name}' must be at least {minimum}."
        )

    if maximum is not None and number > maximum:
        raise InputValidationError(
            f"'{name}' must be at most {maximum}."
        )

    return number


def validate_feature_values(feature_values):
    """Validate all seven features required by the classifier."""
    if not isinstance(feature_values, dict):
        raise InputValidationError(
            "feature_values must be a dictionary."
        )

    missing = [
        column
        for column in FEATURE_COLUMNS
        if column not in feature_values
    ]

    if missing:
        raise InputValidationError(
            f"Missing required model input(s): {missing}"
        )

    ranges = {
        "N": (0, None),
        "P": (0, None),
        "K": (0, None),
        "temperature": (-10, 60),
        "humidity": (0, 100),
        "ph": (0, 14),
        "rainfall": (0, None),
    }

    validated = {}

    for column in FEATURE_COLUMNS:
        minimum, maximum = ranges[column]

        validated[column] = validate_numeric_value(
            column,
            feature_values[column],
            minimum=minimum,
            maximum=maximum,
        )

    return validated


# =============================================================================
# 11. PREDICTION
# =============================================================================

def predict_all_crops(
    model,
    scaler,
    metadata,
    feature_values,
):
    """Return all model crop probabilities in descending order."""
    validated = validate_feature_values(
        feature_values
    )

    ordered_values = [
        validated[column]
        for column in metadata["feature_columns"]
    ]

    X = np.asarray(
        ordered_values,
        dtype=float,
    ).reshape(1, -1)

    X_scaled = scaler.transform(X)

    probabilities = model.predict_proba(
        X_scaled
    )[0]

    # Always use the model's learned class order.
    classes = [
        str(value)
        for value in model.classes_
    ]

    ranked = sorted(
        zip(classes, probabilities),
        key=lambda item: item[1],
        reverse=True,
    )

    return [
        {
            "crop": crop,
            "model_probability": float(probability),
        }
        for crop, probability in ranked
    ]


def predict_top_crops(
    model,
    scaler,
    metadata,
    feature_values,
    top_n=3,
):
    """Return the top N model predictions before historical adjustment."""
    if not isinstance(top_n, int) or top_n < 1:
        raise InputValidationError(
            "top_n must be a positive integer."
        )

    ranked = predict_all_crops(
        model,
        scaler,
        metadata,
        feature_values,
    )

    return ranked[:min(top_n, len(ranked))]


# =============================================================================
# 12. HISTORICAL CROSS-CHECK AND RANKING
# =============================================================================

def apply_historical_evidence(
    model_predictions,
    ad_df,
    state,
    district,
    season,
    bonus_multiplier=1.0,
):
    """
    Attach historical evidence to model predictions and adjust ranking.

    NEW: bonus_multiplier (default 1.0, i.e. unchanged behavior) scales
    HISTORICAL_MATCH_BONUS. This is used in GENERAL recommendation mode
    (no soil data available at all) to let historical planting evidence
    weigh more heavily, since soil chemistry is generic in that mode
    instead of farm-specific.

    Historical records can give a small ranking bonus, but only to a crop
    the model already considers plausible. Two conditions must both hold:
      - the crop is among the top HISTORICAL_SHORTLIST_SIZE crops by raw
        model probability (model_predictions is expected pre-sorted by
        probability, as predict_all_crops returns it). A crop the model
        scores near zero cannot be pulled into the results purely by old
        historical records, no matter how many records it has.
      - the crop has at least MIN_RECORDS_FOR_BONUS matching historical
        records. A single old record is not enough evidence on its own.

    When both hold, the bonus scales linearly with record count, from 0
    at MIN_RECORDS_FOR_BONUS records up to the full HISTORICAL_MATCH_BONUS
    at FULL_BONUS_RECORD_COUNT records or more.

    Crops without records, with too few records, or outside the model's
    shortlist are not rejected or penalized; they simply receive no bonus.

    Historical yield values are displayed as recorded; they are not used
    to compare profitability between different crops.
    """
    results = []

    for rank_by_model, item in enumerate(model_predictions):
        crop = item["crop"]
        probability = item["model_probability"]

        evidence = historical_crop_summary(
            ad_df,
            state,
            district,
            season,
            crop,
        )

        record_count = evidence["records"] if evidence is not None else 0

        in_shortlist = rank_by_model < HISTORICAL_SHORTLIST_SIZE
        has_enough_records = record_count >= MIN_RECORDS_FOR_BONUS
        bonus_eligible = in_shortlist and has_enough_records

        if bonus_eligible:
            strength = min(
                record_count / FULL_BONUS_RECORD_COUNT,
                1.0,
            )
            historical_bonus = (
                HISTORICAL_MATCH_BONUS * strength * bonus_multiplier
            )
        else:
            historical_bonus = 0.0

        adjusted_score = probability + historical_bonus

        results.append({
            "crop": crop,
            "model_probability": float(probability),
            "historical_bonus": float(historical_bonus),
            "adjusted_score": float(adjusted_score),
            "historical_evidence": evidence,
            "historical_match": evidence is not None,
            "historical_bonus_eligible": bonus_eligible,
        })

    # Model probability is the primary signal.
    # Historical evidence adds only the small defined bonus.
    results.sort(
        key=lambda item: item["adjusted_score"],
        reverse=True,
    )

    for rank, item in enumerate(results, start=1):
        item["rank"] = rank

    return results


# -----------------------------------------------------------------------------
# NEW: RANKING FOR GENERAL MODE (no soil data available) -- HISTORY FIRST
#
# Per farmer feedback: when there is no soil test to anchor the model at
# all, the crop that was historically planted the MOST in the farmer's
# state/district must be recommendation #1, the second-most-planted crop
# must be recommendation #2, and so on -- the "Crop Recommendations" list
# and the "Historically Most-Planted Crops" list must show the SAME
# order, not two different rankings. The Random Forest score (built from
# current weather/climate) only comes into play as a tie-breaker among
# crops that have no historical record at all.
#
# apply_historical_evidence() above is UNCHANGED and still used whenever
# real soil values are available (farmer-provided or a district
# estimate): there, the Random Forest score stays primary and history
# only nudges the ranking with a small bonus, as originally designed.
# -----------------------------------------------------------------------------

def rank_crops_general_mode(
    model_predictions,
    ad_df,
    state,
    district,
    season,
):
    """
    Rank crops purely by historical planting evidence, most-planted first.

    Used only in GENERAL recommendation mode (no Soil Health Card values
    and no district soil estimate available). Every crop the model knows
    about is considered here -- not just the model's own top shortlist --
    because in this mode local historical evidence is trusted more than
    the model's soil-less probability estimate.

    Ranking rule (in order):
      1. Number of historical planting records for this crop in the
         farmer's state and district -- descending. The crop planted the
         most times historically is #1, the crop planted the
         second-most is #2, and so on. Season-specific records are used
         when they exist; if there are none for the exact season,
         records from ANY season for that state/district are used
         instead (strict_season=False), so a real but season-sparse
         history still counts as evidence rather than being treated as
         zero. This is the SAME fallback used by
         get_most_common_historical_crops(), and there is NO minimum-
         record threshold here -- a single real historical record
         outranks a crop with none, so this list always matches the
         "Historically Most-Planted Crops" list shown to the farmer.
      2. Total historical area planted -- descending -- as a tie-breaker
         between crops with an equal record count.
      3. Random Forest probability (from current weather/climate) is
         used ONLY as the final tie-breaker, for crops with literally NO
         historical record at all (0 records, in any season) -- there,
         it is the only evidence left to rank by.
    """
    results = []

    for item in model_predictions:
        crop = item["crop"]
        probability = item["model_probability"]

        evidence = historical_crop_summary(
            ad_df,
            state,
            district,
            season,
            crop,
            strict_season=False,
        )

        record_count = evidence["records"] if evidence is not None else 0
        total_area = evidence["total_area"] if evidence is not None else 0.0

        results.append({
            "crop": crop,
            "model_probability": float(probability),
            "historical_records": int(record_count),
            "historical_total_area": float(total_area),
            # Kept under the same key names as apply_historical_evidence()
            # so existing display/consumer code that reads
            # "historical_bonus" / "adjusted_score" keeps working. This is
            # a 0-1 normalized view of record_count, for display only --
            # it does NOT drive the sort order below (record_count does).
            "historical_bonus": float(
                min(record_count / FULL_BONUS_RECORD_COUNT, 1.0)
            ),
            "adjusted_score": float(
                min(record_count / FULL_BONUS_RECORD_COUNT, 1.0)
                + probability
            ),
            "historical_evidence": evidence,
            "historical_match": evidence is not None,
            "historical_bonus_eligible": record_count > 0,
        })

    # HISTORY FIRST (raw record count, then area), Random Forest
    # probability only as the final tie-breaker.
    results.sort(
        key=lambda item: (
            item["historical_records"],
            item["historical_total_area"],
            item["model_probability"],
        ),
        reverse=True,
    )

    for rank, item in enumerate(results, start=1):
        item["rank"] = rank

    return results


# =============================================================================
# 13. OPEN-METEO INTEGRATION
# =============================================================================


def _require_requests():
    if requests is None:
        raise WeatherLookupError(
            "The requests package is not installed. "
            "Install it with: pip install requests"
        )


def geocode_location(location_name):
    """
    Resolve a location name to coordinates using Open-Meteo.
    """

    _require_requests()

    if not isinstance(location_name, str) or not location_name.strip():
        raise InputValidationError(
            "A weather location is required."
        )

    params = {
        "name": location_name.strip(),
        "count": 1,
        "language": "en",
        "format": "json",
    }

    try:
        response = requests.get(
            OPEN_METEO_GEOCODE_URL,
            params=params,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.exceptions.RequestException as exc:
        raise WeatherLookupError(
            f"Network error during location lookup: {exc}"
        ) from exc

    if response.status_code != 200:
        raise WeatherLookupError(
            "Open-Meteo geocoding returned status "
            f"{response.status_code}."
        )

    try:
        data = response.json()
    except ValueError as exc:
        raise WeatherLookupError(
            "Open-Meteo returned invalid geocoding data."
        ) from exc

    results = data.get("results", [])

    if not results:
        raise WeatherLookupError(
            f"Could not find weather location '{location_name}'."
        )

    top = results[0]

    if "latitude" not in top or "longitude" not in top:
        raise WeatherLookupError(
            "Open-Meteo geocoding did not return coordinates."
        )

    return {
        "lat": float(top["latitude"]),
        "lon": float(top["longitude"]),
        "resolved_name": top.get(
            "name",
            location_name,
        ),
        "state": top.get("admin1"),
        "country": top.get("country"),
    }


def fetch_current_weather(lat, lon):
    """
    Fetch current weather from Open-Meteo.
    """

    _require_requests()

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": (
            "temperature_2m,"
            "relative_humidity_2m,"
            "precipitation,"
            "rain,"
            "weather_code"
        ),
        "timezone": "auto",
    }

    try:
        response = requests.get(
            OPEN_METEO_WEATHER_URL,
            params=params,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.exceptions.RequestException as exc:
        raise WeatherLookupError(
            f"Network error during weather lookup: {exc}"
        ) from exc

    if response.status_code != 200:
        raise WeatherLookupError(
            "Open-Meteo weather API returned status "
            f"{response.status_code}."
        )

    try:
        data = response.json()
    except ValueError as exc:
        raise WeatherLookupError(
            "Open-Meteo returned invalid weather data."
        ) from exc

    current = data.get("current", {})

    if (
        "temperature_2m" not in current
        or "relative_humidity_2m" not in current
    ):
        raise WeatherLookupError(
            "Open-Meteo response is missing temperature "
            "or humidity."
        )

    recent_rain_mm = current.get("rain")

    if recent_rain_mm is None:
        recent_rain_mm = current.get("precipitation")

    weather_code = current.get("weather_code")

    description = (
        f"Weather code {weather_code}"
        if weather_code is not None
        else "Current weather"
    )

    return {
        "temperature_c": float(
            current["temperature_2m"]
        ),
        "humidity_pct": float(
            current["relative_humidity_2m"]
        ),
        "recent_rain_mm": (
            float(recent_rain_mm)
            if recent_rain_mm is not None
            else None
        ),
        "description": description,
        "observed_at_utc": datetime.now(
            timezone.utc
        ).isoformat(),
    }


def fetch_forecast_rainfall(lat, lon):
    """
    Fetch rainfall from Open-Meteo forecast data.

    Returns the total rainfall available in the
    returned hourly forecast.
    """

    _require_requests()

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "rain,precipitation",
        "forecast_days": 1,
        "timezone": "auto",
    }

    try:
        response = requests.get(
            OPEN_METEO_WEATHER_URL,
            params=params,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.exceptions.RequestException:
        return None

    if response.status_code != 200:
        return None

    try:
        data = response.json()
    except ValueError:
        return None

    hourly = data.get("hourly", {})

    rain_values = hourly.get("rain", [])

    if not rain_values:
        rain_values = hourly.get(
            "precipitation",
            []
        )

    valid_values = []

    for value in rain_values:
        try:
            number = float(value)

            if number >= 0:
                valid_values.append(number)

        except (TypeError, ValueError):
            pass

    if not valid_values:
        return None

    return float(sum(valid_values))


def _season_months(season):
    """Return (calendar months, note) for a season label."""
    key = normalize_text(season) if season is not None else None

    if key in SEASON_MONTHS:
        return list(SEASON_MONTHS[key]), None

    return (
        list(range(1, 13)),
        f"Season '{season}' has no month mapping in SEASON_MONTHS; "
        "all 12 months were used.",
    )


def fetch_rainfall_climatology(
    latitude,
    longitude,
    years=CLIMATOLOGY_YEARS,
):
    """
    Fetch a multi-year monthly climatology from Open-Meteo Historical Weather
    (ERA5 reanalysis) for one coordinate pair.

    For each calendar month, returns the mean over `years` complete years of:
      - total precipitation (mm/month)
      - mean daily temperature (deg C)
      - mean daily relative humidity (%)

    Only complete calendar months are used. Nothing is scaled or converted.
    """
    _require_requests()

    end_year = datetime.now(timezone.utc).year - 1
    start_year = end_year - int(years) + 1

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": f"{start_year}-01-01",
        "end_date": f"{end_year}-12-31",
        "daily": (
            "precipitation_sum,"
            "temperature_2m_mean,"
            "relative_humidity_2m_mean"
        ),
        "timezone": "auto",
    }

    try:
        response = requests.get(
            OPEN_METEO_ARCHIVE_URL,
            params=params,
            timeout=CLIMATOLOGY_TIMEOUT_SECONDS,
        )
    except requests.exceptions.RequestException as exc:
        raise WeatherLookupError(
            f"Network error during climatology lookup: {exc}"
        ) from exc

    if response.status_code != 200:
        raise WeatherLookupError(
            "Open-Meteo historical API returned status "
            f"{response.status_code}."
        )

    try:
        daily = response.json().get("daily", {})
    except ValueError as exc:
        raise WeatherLookupError(
            "Open-Meteo returned invalid historical data."
        ) from exc

    times = daily.get("time", [])

    if not times or "precipitation_sum" not in daily:
        raise WeatherLookupError(
            "Open-Meteo historical response has no precipitation_sum."
        )

    frame = pd.DataFrame({
        "date": pd.to_datetime(times),
        "precip": pd.to_numeric(
            pd.Series(daily["precipitation_sum"]), errors="coerce"
        ),
        "temp": pd.to_numeric(
            pd.Series(daily.get("temperature_2m_mean", [None] * len(times))),
            errors="coerce",
        ),
        "hum": pd.to_numeric(
            pd.Series(
                daily.get("relative_humidity_2m_mean", [None] * len(times))
            ),
            errors="coerce",
        ),
    })

    frame["year"] = frame["date"].dt.year
    frame["month"] = frame["date"].dt.month
    frame["days_in_month"] = frame["date"].dt.days_in_month

    grouped = frame.groupby(["year", "month"])

    monthly = grouped.agg(
        rain_total=("precip", "sum"),
        rain_days=("precip", "count"),
        days_in_month=("days_in_month", "first"),
        temp_mean=("temp", "mean"),
        hum_mean=("hum", "mean"),
    ).reset_index()

    # Keep only calendar months with every daily precipitation value present.
    complete = monthly[monthly["rain_days"] == monthly["days_in_month"]]

    rain_by_month = complete.groupby("month")["rain_total"].mean()

    if len(rain_by_month) < 12:
        raise WeatherLookupError(
            "Historical precipitation data is incomplete for this location "
            f"(complete months found for {len(rain_by_month)} of 12 "
            "calendar months)."
        )

    # Use the same complete-month set for all three climate features.
    # This prevents temperature/humidity from being averaged over months
    # whose precipitation data was incomplete.
    temp_by_month = complete.groupby("month")["temp_mean"].mean()
    hum_by_month = complete.groupby("month")["hum_mean"].mean()

    return {
        "period": f"{start_year}-{end_year}",
        "years": int(years),
        "rain_mm_by_month": {
            int(m): float(v) for m, v in rain_by_month.items()
        },
        "temperature_c_by_month": {
            int(m): float(v)
            for m, v in temp_by_month.items()
            if pd.notna(v)
        },
        "humidity_pct_by_month": {
            int(m): float(v)
            for m, v in hum_by_month.items()
            if pd.notna(v)
        },
        "annual_total_rain_mm": float(rain_by_month.sum()),
    }


def select_climate_features(climatology, season, mode=None):
    """
    Turn a monthly climatology into the model's rainfall (and optionally
    temperature/humidity) features, using the same definition every time.
    """
    mode = mode or RAINFALL_FEATURE_MODE

    if mode == "annual_mean_monthly":
        months = list(range(1, 13))
        month_note = None
    elif mode == "season_mean_monthly_proxy":
        months, month_note = _season_months(season)
    else:
        raise InputValidationError(f"Unknown rainfall mode '{mode}'.")

    def average(by_month):
        values = [by_month[m] for m in months if m in by_month]
        if len(values) != len(months):
            return None
        return float(np.mean(values))

    rainfall = average(climatology["rain_mm_by_month"])

    if rainfall is None:
        raise WeatherLookupError(
            "Rainfall climatology is missing months required for the season."
        )

    period = climatology["period"]

    return {
        "months_used": months,
        "month_note": month_note,
        "rainfall_mm": rainfall,
        "rainfall_definition": (
            f"Mean monthly precipitation total (mm/month) over calendar "
            f"months {months}, averaged across {climatology['years']} "
            f"years ({period}); Open-Meteo Historical Weather (ERA5)."
        ),
        "temperature_c": average(climatology["temperature_c_by_month"]),
        "humidity_pct": average(climatology["humidity_pct_by_month"]),
        "annual_total_rain_mm": climatology["annual_total_rain_mm"],
    }


def get_weather_from_coordinates(latitude, longitude, season=None):
    """
    Fetch weather for the farmer's GPS position.

    Two separate things are returned:

    1. CURRENT weather (temperature_c, humidity_pct, recent_rain_mm).
       Informational only. Current rain is NOT the rainfall feature.

    2. MODEL features (rainfall_for_prediction, temperature_for_prediction,
       humidity_for_prediction) from a multi-year historical climatology, so
       the model receives the same kind of quantity it saw in training.
    """
    try:
        latitude = float(latitude)
        longitude = float(longitude)

    except (TypeError, ValueError):
        raise InputValidationError(
            "Latitude and longitude must be numeric."
        )

    if not -90 <= latitude <= 90:
        raise InputValidationError(
            "Latitude must be between -90 and 90."
        )

    if not -180 <= longitude <= 180:
        raise InputValidationError(
            "Longitude must be between -180 and 180."
        )

    weather = fetch_current_weather(latitude, longitude)

    weather["latitude"] = latitude
    weather["longitude"] = longitude
    weather["resolved_location"] = f"{latitude:.5f}, {longitude:.5f}"

    weather["rainfall_for_prediction"] = None
    weather["temperature_for_prediction"] = None
    weather["humidity_for_prediction"] = None
    weather["rainfall_source"] = None
    weather["rainfall_definition"] = None
    weather["climatology_error"] = None

    try:
        climatology = fetch_rainfall_climatology(latitude, longitude)
        features = select_climate_features(climatology, season)

        weather["rainfall_for_prediction"] = features["rainfall_mm"]
        weather["rainfall_source"] = (
            f"Open-Meteo Historical Weather, {RAINFALL_FEATURE_MODE}, "
            f"{climatology['period']}"
        )
        weather["rainfall_definition"] = features["rainfall_definition"]
        weather["annual_total_rain_mm"] = features["annual_total_rain_mm"]
        weather["climatology_months_used"] = features["months_used"]
        weather["climatology_note"] = features["month_note"]

        if USE_CLIMATE_TEMP_HUMIDITY:
            weather["temperature_for_prediction"] = features["temperature_c"]
            weather["humidity_for_prediction"] = features["humidity_pct"]

    except WeatherLookupError as exc:
        weather["climatology_error"] = str(exc)
        weather["rainfall_source"] = (
            f"Historical rainfall unavailable: {exc}"
        )

    return weather


def get_weather_for_location(location_name, season=None):
    """
    Resolve a typed location name to coordinates, then use the same
    coordinate-based path as browser GPS.
    """
    geo = geocode_location(location_name)

    weather = get_weather_from_coordinates(
        geo["lat"],
        geo["lon"],
        season=season,
    )

    weather["resolved_location"] = geo["resolved_name"]
    weather["state_from_api"] = geo.get("state")
    weather["country_from_api"] = geo.get("country")

    return weather


def check_training_range(metadata, feature_values):
    """Warn when a model input lies outside the range seen in training."""
    ranges = metadata.get("feature_ranges") or {}
    warnings = []

    for column, value in feature_values.items():
        if column not in ranges:
            continue

        low, high = ranges[column]

        if value < low or value > high:
            warnings.append(
                f"{column}={value:.2f} is outside the training range "
                f"[{low:.2f}, {high:.2f}]; the model is extrapolating."
            )

    return warnings


# =============================================================================
# 14. STRUCTURED RECOMMENDATION FUNCTION FOR FASTAPI
# =============================================================================

def recommend_crop(
    farmer_input,
    model=None,
    scaler=None,
    metadata=None,
    ad_df=None,
    soil_district_df=None,
):
    """
    Reusable structured recommendation function.

    Required farmer_input fields:
        state
        district
        season
        latitude and longitude   (browser GPS; preferred)
          OR weather_location    (typed name, geocoded to coordinates)

    Soil can be provided using:
        N, P, K, ph

    If soil values are not supplied, the function attempts to use the
    cleaned district soil profile.

    Rainfall is NOT supplied by the farmer and is NOT current rain. It is
    an engineered historical climate proxy: mean monthly precipitation
    (mm/month) for the selected season from a multi-year Open-Meteo
    historical climatology at the given coordinates (see
    RAINFALL_FEATURE_MODE). Current weather is fetched only for display.

    State, district, and season are used for historical lookup.
    They are not passed to the Random Forest classifier.

    Returns a dictionary suitable for a future FastAPI JSON response.
    """
    if not isinstance(farmer_input, dict):
        raise InputValidationError(
            "farmer_input must be a dictionary."
        )

    required_context = [
        "state",
        "district",
        "season",
    ]

    missing_context = [
        key
        for key in required_context
        if key not in farmer_input
        or farmer_input[key] is None
        or not str(farmer_input[key]).strip()
    ]

    if missing_context:
        raise InputValidationError(
            f"Missing required input(s): {missing_context}"
        )

    state = normalize_text(
        farmer_input["state"]
    )

    district = normalize_text(
        farmer_input["district"]
    )

    season = normalize_text(
        farmer_input["season"]
    )

    has_coordinates = (
        farmer_input.get("latitude") is not None
        and farmer_input.get("longitude") is not None
    )

    weather_location = str(
        farmer_input.get("weather_location") or ""
    ).strip()

    if not has_coordinates and not weather_location:
        raise InputValidationError(
            "Provide latitude and longitude, or a weather_location name."
        )

    # Load model artifacts if not injected by the caller.
    if model is None or scaler is None or metadata is None:
        model, scaler, metadata = load_model()

    # Load contextual datasets if not injected by the caller.
    if ad_df is None:
        ad_df = load_agriculture_data()

    if soil_district_df is None:
        soil_district_df = load_soil_district_profiles()

    # -------------------------------------------------------------------------
    # Soil values: manual inputs take precedence.
    # -------------------------------------------------------------------------

    manual_soil_keys = ["N", "P", "K", "ph"]

    has_all_manual_soil = all(
        key in farmer_input
        and farmer_input[key] is not None
        for key in manual_soil_keys
    )

    if has_all_manual_soil:
        soil_values = {
            "N": validate_numeric_value(
                "N",
                farmer_input["N"],
                minimum=0,
            ),
            "P": validate_numeric_value(
                "P",
                farmer_input["P"],
                minimum=0,
            ),
            "K": validate_numeric_value(
                "K",
                farmer_input["K"],
                minimum=0,
            ),
            "ph": validate_numeric_value(
                "ph",
                farmer_input["ph"],
                minimum=0,
                maximum=14,
            ),
        }

        soil_source = "Farmer-provided soil values"
        soil_estimate = None
        is_general_recommendation = False

    else:
        soil_estimate = get_soil_estimate_for_district(
            soil_district_df,
            district,
        )

        if soil_estimate is None:
            # ---------------------------------------------------------------
            # NEW: GENERAL RECOMMENDATION FALLBACK.
            #
            # Previously this stopped with an error here:
            #   "Complete soil values N, P, K, and ph are required.
            #    No complete district soil estimate was available."
            #
            # Now, a farmer who knows only their state, district, and
            # season still gets a recommendation. N, P, K, and pH fall
            # back to a nationwide average (get_national_soil_estimate),
            # weather/climate is still fetched live from Open-Meteo below,
            # and historical planting evidence for this state/district is
            # given extra weight further down (see
            # GENERAL_MODE_HISTORICAL_BONUS_MULTIPLIER). The result is
            # clearly marked as general, not farm-specific.
            # ---------------------------------------------------------------
            national_estimate = get_national_soil_estimate()

            soil_values = {
                "N": national_estimate["N"],
                "P": national_estimate["P"],
                "K": national_estimate["K"],
                "ph": national_estimate["ph"],
            }

            soil_source = (
                "GENERAL recommendation: no Soil Health Card values "
                f"and no district soil estimate for {district}. Using "
                "a nationwide average soil profile, combined with "
                "live weather from Open-Meteo and historical planting "
                "evidence for your state and district."
            )

            is_general_recommendation = True

        else:
            soil_values = {
                "N": soil_estimate["N"],
                "P": soil_estimate["P"],
                "K": soil_estimate["K"],
                "ph": soil_estimate["ph"],
            }

            soil_source = (
                f"District-level median estimate for {district}"
            )

            is_general_recommendation = False

    # -------------------------------------------------------------------------
    # Weather and climate features.
    # Coordinates from browser GPS are used directly; a typed location name is
    # geocoded to coordinates. Either way the model receives the historical
    # climatology feature defined by RAINFALL_FEATURE_MODE, never the current
    # instantaneous rain.
    # -------------------------------------------------------------------------

    if has_coordinates:
        weather = get_weather_from_coordinates(
            farmer_input["latitude"],
            farmer_input["longitude"],
            season=season,
        )
    else:
        weather = get_weather_for_location(
            weather_location,
            season=season,
        )

    data_quality_warnings = []

    if weather.get("climatology_note"):
        data_quality_warnings.append(weather["climatology_note"])

    rainfall_value = weather.get("rainfall_for_prediction")
    rainfall_source = weather.get("rainfall_source") or "Unknown"
    rainfall_is_fallback = False

    # Do not substitute the training median. That number is not rainfall at
    # this location. If historical climate cannot be obtained, stop rather
    # than producing a recommendation with a fabricated weather input.
    if rainfall_value is None:
        error_detail = weather.get("climatology_error") or (
            "historical rainfall was not returned by the weather service"
        )
        raise WeatherLookupError(
            "Historical rainfall could not be obtained for this location. "
            f"Recommendation stopped: {error_detail}"
        )

    temperature_value = weather.get("temperature_for_prediction")
    temperature_source = "Open-Meteo historical climatology"

    if temperature_value is None:
        raise WeatherLookupError(
            "Historical temperature could not be obtained for this location. "
            "Recommendation stopped instead of using the current reading."
        )

    humidity_value = weather.get("humidity_for_prediction")
    humidity_source = "Open-Meteo historical climatology"

    if humidity_value is None:
        raise WeatherLookupError(
            "Historical humidity could not be obtained for this location. "
            "Recommendation stopped instead of using the current reading."
        )

    # -------------------------------------------------------------------------
    # Assemble classifier inputs.
    # Location context is deliberately not included in this feature dictionary.
    # -------------------------------------------------------------------------

    feature_values = {
        "N": soil_values["N"],
        "P": soil_values["P"],
        "K": soil_values["K"],
        "temperature": temperature_value,
        "humidity": humidity_value,
        "ph": soil_values["ph"],
        "rainfall": rainfall_value,
    }

    validated_features = validate_feature_values(
        feature_values
    )

    range_warnings = check_training_range(
        metadata,
        validated_features,
    )

    data_quality_warnings.extend(range_warnings)

    # -------------------------------------------------------------------------
    # Predict first, but do not display yet.
    # -------------------------------------------------------------------------

    all_model_predictions = predict_all_crops(
        model,
        scaler,
        metadata,
        validated_features,
    )

    # -------------------------------------------------------------------------
    # Cross-check every predicted crop against historical records.
    # Historical evidence is attached before the results are returned.
    # -------------------------------------------------------------------------

    # -------------------------------------------------------------------------
    # GENERAL mode (no soil data): historical evidence is PRIMARY, and it
    # considers every crop, not just the model's shortlist -- see
    # rank_crops_general_mode(). Otherwise (real soil data available):
    # unchanged original behavior -- Random Forest is primary, history is
    # a small bonus on top -- see apply_historical_evidence().
    # -------------------------------------------------------------------------

    if is_general_recommendation:
        ranked_results = rank_crops_general_mode(
            all_model_predictions,
            ad_df,
            state,
            district,
            season,
        )
    else:
        ranked_results = apply_historical_evidence(
            all_model_predictions,
            ad_df,
            state,
            district,
            season,
        )

    # Keep the top 3 after the historical cross-check.
    top_results = ranked_results[:3]

    # -------------------------------------------------------------------------
    # "Historically most-planted crops" context.
    #
    # IMPORTANT (general mode): this list is built by filtering the exact
    # same ranked_results used for top_results above, in the exact same
    # order. This guarantees the "Historically Most-Planted Crops" list
    # and the "Crop Recommendations" list can never disagree -- whatever
    # is recommendation #1 is also the #1 most-planted crop shown, #2
    # matches #2, and so on, since they now come from one single ranking
    # instead of two separate calculations.
    #
    # In normal mode (real soil data available), this stays purely
    # informational context and is NOT what drives top_results -- so it
    # still uses the original get_most_common_historical_crops() lookup.
    # -------------------------------------------------------------------------
    if is_general_recommendation:
        most_common_historical_crops = [
            {
                "crop": item["crop"],
                "records": item["historical_records"],
                "total_area": item["historical_total_area"],
            }
            for item in ranked_results
            if item["historical_match"]
        ][:5]
    else:
        most_common_historical_crops = get_most_common_historical_crops(
            ad_df,
            state,
            district,
            season,
        )

    return {
        "status": "success",
        "location": {
            "state": state,
            "district": district,
            "season": season,
        },
        "weather": weather,
        "rainfall_source": rainfall_source,
        "rainfall_is_fallback": rainfall_is_fallback,
        "feature_sources": {
            "rainfall": rainfall_source,
            "temperature": temperature_source,
            "humidity": humidity_source,
        },
        "data_quality_warnings": data_quality_warnings,
        "outside_training_range": bool(range_warnings),
        "soil": {
            "values": soil_values,
            "source": soil_source,
            "estimate_details": soil_estimate,
            "is_general_estimate": is_general_recommendation,
        },
        "is_general_recommendation": is_general_recommendation,
        "historical_most_planted_crops": most_common_historical_crops,
        "model_inputs": validated_features,
        "ranking_method": (
            {
                "mode": "general_history_primary",
                "description": (
                    "GENERAL MODE (no soil data available): crops are "
                    "ranked purely by how many historical planting "
                    "records exist for your state and district -- the "
                    "crop planted the most times historically is "
                    "recommendation #1, the second-most-planted is #2, "
                    "and so on, so this list always matches the "
                    "'Historically Most-Planted Crops' list shown above "
                    "it. Season-specific records are used first; if none "
                    "exist for your exact season, records from any "
                    "season in your district are used instead, so a "
                    "real but season-sparse history still counts. There "
                    "is no minimum-record threshold -- a single real "
                    "historical record outranks a crop with none. All "
                    "crops the model knows are considered, not only its "
                    "own top shortlist. The Random Forest probability "
                    "(based on current weather/climate from Open-Meteo) "
                    "is used ONLY as a final tie-breaker, for crops with "
                    "zero historical records, where it is the only "
                    "remaining evidence."
                ),
                "min_records_for_bonus": None,
                "full_bonus_record_count": FULL_BONUS_RECORD_COUNT,
            }
            if is_general_recommendation
            else {
                "mode": "model_primary",
                "description": (
                    "Random Forest probabilities are the primary ranking "
                    "signal. Only the top "
                    f"{HISTORICAL_SHORTLIST_SIZE} crops by raw model "
                    "probability are eligible for a historical bonus, so "
                    "historical evidence can reorder plausible crops but "
                    "cannot introduce a crop the model scores near zero. "
                    "Within that shortlist, a crop also needs at least "
                    f"{MIN_RECORDS_FOR_BONUS} matching historical records "
                    "for the selected state, district, and season before it "
                    "earns any bonus. From there the bonus scales linearly "
                    "with record count, reaching the full bonus at "
                    f"{FULL_BONUS_RECORD_COUNT} records. Missing or "
                    "insufficient historical records do not penalize a crop."
                ),
                "historical_match_bonus": HISTORICAL_MATCH_BONUS,
                "min_records_for_bonus": MIN_RECORDS_FOR_BONUS,
                "full_bonus_record_count": FULL_BONUS_RECORD_COUNT,
                "historical_shortlist_size": HISTORICAL_SHORTLIST_SIZE,
            }
        ),
        "recommendations": top_results,
        "limitations": [
            (
                "Model scores are Random Forest class probabilities over 22 "
                "crop profiles. They are not the chance that a crop will "
                "grow successfully, nor a prediction of yield or profit."
            ),
            (
                "The training dataset documents rainfall only as 'mm' and does not state "
                "its time period. The prediction rainfall is therefore an "
                "engineered historical climate proxy, not a verified match "
                "to the training measurement."
            ),
            (
                "Rainfall, and by default temperature and humidity, come "
                "from ERA5 reanalysis (about 25 km grid), not local gauges."
            ),
            (
                "Nitrogen, phosphorus and potassium in the soil profile file "
                "may be on a different scale from the training data; "
                "district estimates should be verified against a soil test."
            ),
            (
                "The soil dataset has no state column, so district estimates "
                "may be geographically ambiguous."
            ),
            (
                "Historical records provide supporting evidence and do not "
                "prove that a crop is unsuitable when records are absent."
            ),
        ]
        + (
            [
                (
                    "GENERAL RECOMMENDATION: no Soil Health Card values "
                    "and no district soil estimate were available, so N, "
                    "P, K, and pH were set to a nationwide average, not "
                    "your field's actual soil chemistry. This result "
                    "relies mainly on your location, live weather from "
                    "Open-Meteo, and historical planting evidence for "
                    "your state and district. Get a Soil Health Card "
                    "test for a more accurate, farm-specific "
                    "recommendation."
                )
            ]
            if is_general_recommendation
            else []
        ),
    }


# =============================================================================
# 15. TERMINAL INPUT HELPERS
# =============================================================================

def prompt_choice(prompt_text, options):
    """Display a numbered menu and return the selected option."""
    if not options:
        raise InputValidationError(
            "No options are available for this selection."
        )

    while True:
        print(f"\n{prompt_text}")

        for index, option in enumerate(
            options,
            start=1,
        ):
            print(f"  {index}. {option}")

        raw = input(
            f"Enter a number (1-{len(options)}): "
        ).strip()

        if raw.isdigit():
            selected = int(raw)

            if 1 <= selected <= len(options):
                return options[selected - 1]

        print(
            "Invalid selection. Please enter one of the listed numbers."
        )


def prompt_yes_no(prompt_text):
    """Prompt for a yes/no answer."""
    while True:
        raw = input(
            f"{prompt_text} (y/n): "
        ).strip().lower()

        if raw in ("y", "yes"):
            return True

        if raw in ("n", "no"):
            return False

        print("Please answer y or n.")


def prompt_float(
    prompt_text,
    min_value=None,
    max_value=None,
):
    """Prompt until a valid numeric value is entered."""
    while True:
        raw = input(prompt_text).strip()

        try:
            value = float(raw)
        except ValueError:
            print("Please enter a numeric value.")
            continue

        if not np.isfinite(value):
            print("Please enter a finite number.")
            continue

        if min_value is not None and value < min_value:
            print(f"Value must be at least {min_value}.")
            continue

        if max_value is not None and value > max_value:
            print(f"Value must be at most {max_value}.")
            continue

        return value


def collect_soil_health_card_values():
    """Collect N, P, K, and pH manually."""
    print("\nEnter your Soil Health Card values.")

    return {
        "N": prompt_float(
            "Nitrogen (N): ",
            min_value=0,
        ),
        "P": prompt_float(
            "Phosphorus (P): ",
            min_value=0,
        ),
        "K": prompt_float(
            "Potassium (K): ",
            min_value=0,
        ),
        "ph": prompt_float(
            "Soil pH (0-14): ",
            min_value=0,
            max_value=14,
        ),
    }


def collect_district_soil_estimate(
    soil_district_df,
    district,
):
    """Offer the district estimate or manual soil entry."""
    estimate = get_soil_estimate_for_district(
        soil_district_df,
        district,
    )

    if estimate is None:
        print(
            f"\nNo complete soil estimate was found for '{district}'."
        )

        if prompt_yes_no(
            "Would you like to enter soil values manually?"
        ):
            return collect_soil_health_card_values()

        return None

    print(
        f"\nDistrict estimate for '{district}' "
        f"(median of {estimate['record_count']} record(s)):"
    )

    print(f"N: {estimate['N']:.2f}")
    print(f"P: {estimate['P']:.2f}")
    print(f"K: {estimate['K']:.2f}")
    print(f"pH: {estimate['ph']:.2f}")

    print(f"\nNote: {estimate['note']}")
    print(
        "These are district estimates, not measurements "
        "from your individual farm."
    )

    if prompt_yes_no(
        "Use these estimated soil values?"
    ):
        return {
            "N": estimate["N"],
            "P": estimate["P"],
            "K": estimate["K"],
            "ph": estimate["ph"],
        }

    return collect_soil_health_card_values()


# =============================================================================
# 16. TERMINAL RECOMMENDATION WORKFLOW
# =============================================================================

def run_recommendation_workflow():
    """Run the interactive farmer workflow using recommend_crop()."""
    print(
        "\n===== SMART CROP ADVISORY — CROP RECOMMENDATION ====="
    )

    try:
        model, scaler, metadata = load_model()
        ad_df = load_agriculture_data()
        soil_district_df = load_soil_district_profiles()

    except RecommendationError as exc:
        print(f"\nSetup error: {exc}")
        return

    try:
        states = get_available_states(
            ad_df
        )

        state = prompt_choice(
            "Select your state:",
            states,
        )

        districts = get_districts_for_state(
            ad_df,
            state,
        )

        district = prompt_choice(
            f"Select your district in {state}:",
            districts,
        )

        seasons = get_seasons_for_state_district(
            ad_df,
            state,
            district,
        )

        season = prompt_choice(
            "Select your growing season:",
            seasons,
        )

        # Terminal mode does not have browser GPS. To prevent a mismatch
        # between the selected district and a manually typed weather city,
        # automatically geocode the selected district + state instead.
        weather_query = f"{district}, {state}, India"

        print(
            "\nWeather location will be taken automatically from the "
            f"selected district: {weather_query}"
        )

        weather_geo = geocode_location(weather_query)

        print(
            "Weather coordinates: "
            f"{weather_geo['lat']:.6f}, {weather_geo['lon']:.6f}"
        )

        has_soil_card = prompt_yes_no(
            "\nDo you have Soil Health Card values?"
        )

        if has_soil_card:
            soil_values = collect_soil_health_card_values()
            soil_source = "Farmer-provided Soil Health Card values"

        else:
            soil_values = collect_district_soil_estimate(
                soil_district_df,
                district,
            )

            if soil_values is None:
                # ------------------------------------------------------
                # NEW: previously this printed "Cannot continue without
                # complete soil values." and returned, aborting with no
                # recommendation at all. Now the workflow proceeds: no
                # N/P/K/ph keys are added to farmer_input below, so
                # recommend_crop() falls back to its GENERAL mode — a
                # nationwide average soil profile combined with live
                # Open-Meteo weather and historical planting evidence
                # for the selected state and district.
                # ------------------------------------------------------
                print(
                    f"\nNo soil values are available (no Soil Health "
                    f"Card entered, and no district estimate for "
                    f"{district})."
                )

                print(
                    "Proceeding with a GENERAL recommendation based on "
                    "your state, district, season, and current weather "
                    "conditions from Open-Meteo, combined with "
                    "historical planting evidence for your area. This "
                    "will be less precise than a recommendation based "
                    "on your actual soil test."
                )

                soil_source = (
                    "No soil data available — general recommendation "
                    f"for {district}, {state}"
                )

            else:
                soil_source = (
                    f"District-level estimate for {district}"
                )

        farmer_input = {
            "state": state,
            "district": district,
            "season": season,
            "latitude": weather_geo["lat"],
            "longitude": weather_geo["lon"],
        }

        # Only pass N/P/K/ph when we actually have them. Omitting them
        # when soil_values is None lets recommend_crop() apply its
        # general (no-soil-data) fallback automatically.
        if soil_values is not None:
            farmer_input["N"] = soil_values["N"]
            farmer_input["P"] = soil_values["P"]
            farmer_input["K"] = soil_values["K"]
            farmer_input["ph"] = soil_values["ph"]

        

        print(
            "\nFetching current weather automatically..."
        )

        # This function predicts, cross-checks historical evidence,
        # and returns the final results before anything is displayed.
        result = recommend_crop(
            farmer_input=farmer_input,
            model=model,
            scaler=scaler,
            metadata=metadata,
            ad_df=ad_df,
            soil_district_df=soil_district_df,
        )

    except (
        RecommendationError,
        ValueError,
    ) as exc:
        print(f"\nCould not complete recommendation: {exc}")
        return

    # -------------------------------------------------------------------------
    # Display only after historical lookup and ranking are complete.
    # -------------------------------------------------------------------------

    print(
        "\n===== CURRENT WEATHER ====="
    )

    weather = result["weather"]

    print(
        f"Weather location: {weather['resolved_location']}"
    )

    print(
        f"Temperature: {weather['temperature_c']:.1f} °C"
    )

    print(
        f"Humidity: {weather['humidity_pct']:.0f}%"
    )

    print(
        f"Conditions: {weather['description']}"
    )

    print(
        "Rainfall used for prediction: "
        f"{result['model_inputs']['rainfall']:.1f} mm/month (assumed "
        "definition, see limitations)"
    )

    print(
        "Rainfall source: "
        f"{result['rainfall_source']}"
    )

    if weather["recent_rain_mm"] is not None:
        print(
            "Recent rainfall (last 1-3 hours, informational only): "
            f"{weather['recent_rain_mm']:.1f} mm"
        )
    else:
        print(
            "No recent rainfall amount was reported by the API."
        )

    for warning in result["data_quality_warnings"]:
        print(f"WARNING: {warning}")

    print(
        "\nCurrent weather above is informational. The model uses "
        "multi-year historical averages for rainfall"
        + (
            ", temperature and humidity."
            if USE_CLIMATE_TEMP_HUMIDITY
            else "."
        )
    )

    print(
        "\n===== FARMER INPUTS ====="
    )

    print(
        f"Selected location: {district}, {state}"
    )

    print(
        f"Season: {season}"
    )

    print(
        f"Soil source: {soil_source}"
    )

    print(
        f"Model inputs: {result['model_inputs']}"
    )

    # NEW: general (no-soil-data) mode notice, and most-planted-crop
    # context sourced from historical records for this state/district.
    if result.get("is_general_recommendation"):
        print(
            "\n*** GENERAL RECOMMENDATION (no soil data available) ***"
        )

        print(
            "No Soil Health Card values and no district soil estimate "
            "were available, so N, P, K, and pH were set to a "
            "nationwide average, not your field's actual soil "
            "chemistry. This recommendation relies mainly on your "
            "location, live weather from Open-Meteo, and historical "
            "planting evidence for your state and district."
        )

    most_planted = result.get("historical_most_planted_crops") or []

    if most_planted:
        print(
            "\n===== HISTORICALLY MOST-PLANTED CROPS IN YOUR AREA ====="
        )

        for row in most_planted:
            print(
                f"- {row['crop'].title()}: recorded in "
                f"{row['records']} year(s), total area "
                f"{row['total_area']:.1f} (dataset units)"
            )

    print(
        "\n===== CROP RECOMMENDATIONS ====="
    )

    for item in result["recommendations"]:
        print(
            f"\n#{item['rank']}: {item['crop'].title()}"
        )

        if result.get("is_general_recommendation"):
            # NEW: in general mode, ranking is by raw historical record
            # count (item["historical_records"]) first, area second --
            # this is the PRIMARY signal, shown here directly rather
            # than only as a normalized 0-1 strength.
            print(
                "Historical records used for ranking (PRIMARY signal): "
                f"{item['historical_records']} record(s), "
                f"{item['historical_total_area']:.1f} total area"
            )

            print(
                "Random Forest class score (secondary/tie-break signal, "
                "not a chance of success): "
                f"{item['model_probability']:.3f}"
            )
        else:
            print(
                "Random Forest class score (not a chance of success): "
                f"{item['model_probability']:.3f}"
            )

            print(
                "Historical ranking bonus: "
                f"{item['historical_bonus']:.3f}"
            )

        if item["historical_match"]:
            evidence = item["historical_evidence"]

            print(
                "Historical evidence: "
                f"{evidence['records']} record(s), "
                f"{evidence['first_year']}-"
                f"{evidence['last_year']}"
            )

            print(
                "Average yield: "
                f"{evidence['average_yield']:.2f} "
                "(dataset Production/Area units)"
            )

            print(
                "Most recent yield: "
                f"{evidence['recent_yield']:.2f}"
            )

        else:
            print(
                "Historical evidence: No matching records were found "
                "for this crop, state, district, and season."
            )

            print(
                "This does not mean the crop is unsuitable."
            )

    print(
        "\n===== IMPORTANT LIMITATIONS ====="
    )

    for limitation in result["limitations"]:
        print(f"- {limitation}")

    print(
        "\nThis system supports decision-making and does not "
        "replace advice from a local agricultural expert."
    )


# =============================================================================
# 17. MAIN
# =============================================================================

def main():
    """Command-line entry point."""
    if len(sys.argv) > 1:
        mode = sys.argv[1].strip().lower()
    else:
        mode = prompt_choice(
            "What would you like to do?",
            ["train", "recommend"],
        )

    if mode == "train":
        try:
            train_model()
        except RecommendationError as exc:
            print(f"\nTraining error: {exc}")

    elif mode == "recommend":
        run_recommendation_workflow()

    else:
        print(
            f"Unknown mode '{mode}'. "
            "Use 'train' or 'recommend'."
        )


if __name__ == "__main__":
    main()