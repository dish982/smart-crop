"""
Narrows the ALREADY-CLEANED dataset (cleaned.csv) down to a focused
scope — one state and its top N crops — without re-merging or
re-cleaning from raw data. Applies the flower-group exclusion and
future-date filter here too, since those weren't in your original
cleaned.csv run.

This OVERWRITES cleaned.csv with the narrowed version (after backing
up the original), so main.py picks up the narrowed data automatically —
no changes needed to clean.py, resample.py, features.py, or main.py.

Usage:
    python -m src.narrow_scope
"""

import os
import shutil
import pandas as pd
from src import config


def narrow_scope():
    if not os.path.exists(config.CLEANED_PATH):
        raise FileNotFoundError(f"{config.CLEANED_PATH} not found. Run clean.py at least once first.")

    # Back up the full-India cleaned data before overwriting, just in case
    backup_path = config.CLEANED_PATH.replace(".csv", "_full_india_backup.csv")
    if not os.path.exists(backup_path):
        shutil.copy(config.CLEANED_PATH, backup_path)
        print(f"Backed up original cleaned data -> {backup_path}")

    df = pd.read_csv(backup_path, parse_dates=["arrival_date"])
    n_start = len(df)
    print(f"Loaded existing cleaned data: {n_start} rows")

    # 1. Future-date filter (cheap, wasn't in the original clean.py run)
    n_before = len(df)
    df = df[df["arrival_date"] <= pd.Timestamp.today()]
    print(f"Dropped {n_before - len(df)} rows with impossible future dates")

    # 2. Flower-group exclusion, via the authoritative Agmarknet mapping
    if os.path.exists(config.GROUP_MAPPING_PATH):
        group_map = pd.read_csv(config.GROUP_MAPPING_PATH)
        n_before = len(df)
        df = df.merge(group_map, on="crop", how="left")
        df = df[~df["group_name"].isin(config.EXCLUDED_COMMODITY_GROUPS)]
        df = df.drop(columns=["group_name"])
        print(f"Excluded {n_before - len(df)} rows from groups {config.EXCLUDED_COMMODITY_GROUPS}")
    else:
        print("[!] commodity_group_mapping.csv not found — run `python -m src.build_commodity_groups` "
              "first if you want flowers excluded. Skipping this filter.")

    # 3. Narrow to FOCUS_STATE
    if config.FOCUS_STATE:
        n_before = len(df)
        df = df[df["state"].str.strip().str.lower() == config.FOCUS_STATE.strip().lower()]
        print(f"Filtered to state='{config.FOCUS_STATE}': {n_before} -> {len(df)} rows")

        # 4. Narrow to its TOP_N_CROPS by real record count, WITHIN this state
        if config.TOP_N_CROPS:
            crop_counts = df.groupby("crop").size().sort_values(ascending=False)
            top_crops = crop_counts.head(config.TOP_N_CROPS).index.tolist()
            print(f"\nTop {config.TOP_N_CROPS} crops in {config.FOCUS_STATE} by record count:")
            print(crop_counts.head(config.TOP_N_CROPS).to_string())

            n_before = len(df)
            df = df[df["crop"].isin(top_crops)]
            print(f"\nFiltered to top {config.TOP_N_CROPS} crops: {n_before} -> {len(df)} rows")

    # 5. Re-check the min-records-per-crop-mandi threshold, since narrowing
    #    can push some pairs below it even if they passed before
    counts = df.groupby(["crop", "mandi"]).size().reset_index(name="n")
    valid_pairs = counts[counts["n"] >= config.MIN_RECORDS_PER_CROP_MANDI][["crop", "mandi"]]
    n_before = len(df)
    df = df.merge(valid_pairs, on=["crop", "mandi"], how="inner")
    print(f"Re-applied MIN_RECORDS_PER_CROP_MANDI threshold: {n_before} -> {len(df)} rows")

    df = df.sort_values(["crop", "mandi", "arrival_date"]).reset_index(drop=True)

    print(f"\nFinal narrowed dataset: {n_start} -> {len(df)} rows "
          f"({df['crop'].nunique()} crops, {df['mandi'].nunique()} mandis)")

    df.to_csv(config.CLEANED_PATH, index=False)
    print(f"Overwrote -> {config.CLEANED_PATH}")

    return df


if __name__ == "__main__":
    narrow_scope()