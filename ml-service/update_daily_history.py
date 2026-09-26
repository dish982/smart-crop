"""
Run this once per day (via Windows Task Scheduler, or manually for now)
to append today's live price for every trained crop-mandi pair into the
historical series, so forecast_prices() always has an up-to-date anchor
date instead of relying solely on the static training-time CSV.

Usage: python update_daily_history.py
"""

import os
import sys
from datetime import date

import pandas as pd


from dotenv import load_dotenv

load_dotenv()

CROP_ADVISORY_ROOT = os.environ.get(
    "CROP_ADVISORY_ROOT", r"C:\Users\Zenia hussain\price_crop_advisory\ML"
)
sys.path.insert(0, CROP_ADVISORY_ROOT)

from src import config
from src.api_client import get_live_price

LIVE_HISTORY_PATH = os.path.join(config.INTERIM_DATA_DIR, "live_accumulated_history.csv")


def update_daily_history():
    # Fail fast: test connectivity with a single lightweight call first,
    # instead of discovering the network is down after 50+ timeouts.
    import requests
    try:
        requests.get("https://api.data.gov.in", timeout=5)
    except requests.RequestException as e:
        print(f"[!] Cannot reach api.data.gov.in at all — network/firewall issue, not a code problem.")
        print(f"    Error: {e}")
        print(f"    Skipping live update. Using existing resampled_daily.csv only.")
        return

    base_df = pd.read_csv(config.RESAMPLED_PATH, parse_dates=["arrival_date"])

    if os.path.exists(LIVE_HISTORY_PATH):
        live_df = pd.read_csv(LIVE_HISTORY_PATH, parse_dates=["arrival_date"])
        combined = pd.concat([base_df, live_df], ignore_index=True)
    else:
        combined = base_df.copy()

    today = pd.Timestamp(date.today())
    pairs = combined[["crop", "mandi", "state"]].drop_duplicates()

    new_rows = []
    consecutive_failures = 0
    MAX_CONSECUTIVE_FAILURES = 5   # abort if the API is clearly not responding at all

    for _, row in pairs.iterrows():
        crop, mandi, state = row["crop"], row["mandi"], row["state"]

        already_have_today = (
            (combined["crop"] == crop) & (combined["mandi"] == mandi)
            & (combined["state"] == state) & (combined["arrival_date"] == today)
        ).any()
        if already_have_today:
            continue

        price = get_live_price(state, mandi, crop)
        if price is not None:
            consecutive_failures = 0
            new_rows.append({
                "arrival_date": today, "crop": crop, "mandi": mandi, "state": state,
                "modal_price": price, "is_interpolated": False,
            })
        else:
            consecutive_failures += 1
            print(f"[!] No live price for {crop} / {mandi} / {state}")
            if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                print(f"\n[!] {MAX_CONSECUTIVE_FAILURES} failures in a row — API is likely down or "
                      f"unreachable. Stopping early instead of grinding through every pair.")
                break

    if new_rows:
        new_df = pd.DataFrame(new_rows)
        if os.path.exists(LIVE_HISTORY_PATH):
            existing = pd.read_csv(LIVE_HISTORY_PATH)
            updated_live = pd.concat([existing, new_df], ignore_index=True)
        else:
            updated_live = new_df
        updated_live.to_csv(LIVE_HISTORY_PATH, index=False)
        print(f"Appended {len(new_rows)} new daily price rows -> {LIVE_HISTORY_PATH}")
    else:
        print("No new rows appended.")


if __name__ == "__main__":
    update_daily_history()