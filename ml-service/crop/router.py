"""
Crop Recommendation router.
Refactored from the original standalone main.py: FastAPI() -> APIRouter().
No logic changed — model_pipeline.py is untouched and imported as-is.
"""

from typing import Optional, Literal
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from crop.model_pipeline import (
    load_model,
    load_agriculture_data,
    load_soil_district_profiles,
    get_available_states,
    get_districts_for_state,
    get_seasons_for_state_district,
    recommend_crop,
    RecommendationError,
)

BASE_DIR = Path(__file__).resolve().parent

router = APIRouter()

# Loaded once when this module is imported (same behavior as the original main.py)
MODEL, SCALER, METADATA = load_model()
AGRICULTURE = load_agriculture_data()
SOIL_PROFILES = load_soil_district_profiles()


class CropRequest(BaseModel):
    state: str
    district: str
    season: str
    soil_mode: Literal["manual", "none"] = "none"
    N: Optional[float] = Field(default=None, ge=0)
    P: Optional[float] = Field(default=None, ge=0)
    K: Optional[float] = Field(default=None, ge=0)
    ph: Optional[float] = Field(default=None, ge=0, le=14)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)


def _empty_soil_profile_like_real_data() -> pd.DataFrame:
    # Force the pipeline into its GENERAL / no-soil-data path when the farmer
    # explicitly says they do not have soil values.
    return SOIL_PROFILES.iloc[0:0].copy()


def _yearly_history(
    state: str,
    district: str,
    season: str,
    crop: str,
    season_matched: bool,
):
    """Return real year-by-year yield data for a recommendation card/chart."""
    df = AGRICULTURE.copy()
    subset = df[
        (df["State_Name"] == state)
        & (df["District_Name"] == district)
        & (df["Crop"] == crop)
    ].copy()

    if season_matched:
        subset = subset[subset["Season"] == season]

    subset = subset[
        (subset["Area"] > 0)
        & subset["Production"].notna()
        & subset["Crop_Year"].notna()
    ].copy()

    if subset.empty:
        return []

    grouped = subset.groupby("Crop_Year", as_index=False).agg(
        area=("Area", "sum"),
        production=("Production", "sum"),
    )

    grouped["yield"] = grouped["production"] / grouped["area"]
    grouped = grouped.replace([float("inf"), float("-inf")], pd.NA).dropna(subset=["yield"])
    grouped = grouped.sort_values("Crop_Year")

    return [
        {
            "year": int(row["Crop_Year"]),
            "yield": float(row["yield"]),
            "area": float(row["area"]),
            "production": float(row["production"]),
        }
        for _, row in grouped.iterrows()
    ]


@router.get("/health")
def health():
    return {"status": "ok", "model_loaded": True}


@router.get("/metadata")
def metadata():
    states = get_available_states(AGRICULTURE)
    districts = {
        state: get_districts_for_state(AGRICULTURE, state)
        for state in states
    }
    seasons = {}
    for state in states:
        for district in districts[state]:
            seasons[f"{state}|||{district}"] = get_seasons_for_state_district(
                AGRICULTURE, state, district
            )

    return {
        "states": states,
        "districts": districts,
        "seasons": seasons,
    }


@router.post("/recommend-crop")
def recommend(request: CropRequest):
    try:
        farmer_input = {
            "state": request.state,
            "district": request.district,
            "season": request.season,
            "weather_location": f"{request.district}, {request.state}, India",
        }

        if request.latitude is not None and request.longitude is not None:
            farmer_input["latitude"] = request.latitude
            farmer_input["longitude"] = request.longitude

        if request.soil_mode == "manual":
            if None in (request.N, request.P, request.K, request.ph):
                raise HTTPException(
                    status_code=400,
                    detail="N, P, K and pH are required in manual soil mode.",
                )
            farmer_input.update(
                {
                    "N": request.N,
                    "P": request.P,
                    "K": request.K,
                    "ph": request.ph,
                }
            )
            soil_df = SOIL_PROFILES
        else:
            soil_df = _empty_soil_profile_like_real_data()

        result = recommend_crop(
            farmer_input=farmer_input,
            model=MODEL,
            scaler=SCALER,
            metadata=METADATA,
            ad_df=AGRICULTURE,
            soil_district_df=soil_df,
        )

        for item in result.get("recommendations", []):
            evidence = item.get("historical_evidence") or {}
            item["historical_yearly"] = _yearly_history(
                result["location"]["state"],
                result["location"]["district"],
                result["location"]["season"],
                item["crop"],
                bool(evidence.get("season_matched", True)),
            )

        if result.get("recommendations"):
            result["primary_historical_series"] = result["recommendations"][0].get(
                "historical_yearly", []
            )
        else:
            result["primary_historical_series"] = []

        return result

    except HTTPException:
        raise
    except RecommendationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc