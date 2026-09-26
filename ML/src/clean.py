"""
Cleans the merged raw dataset:
  - drops missing/zero/implausibly low prices, and impossible future dates
  - removes duplicates
  - excludes floriculture via Agmarknet's authoritative commodity_groups mapping
  - narrows to FOCUS_STATE and its TOP_N_CROPS (by real record count), if configured
  - keeps only crop-mandi pairs with enough history
  - removes per-crop-mandi statistical outliers (IQR)
"""

import os
import pandas as pd
from src import config


def clean_data(df: pd.DataFrame, save: bool = True) -> pd.DataFrame:
    n_start = len(df)

    required = ["modal_price", "arrival_date", "crop", "state", "mandi"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns after loading: {missing}. Check config.COLUMN_MAP.")

    # 1. Basic price validity
    df = df.dropna(subset=required)
    df = df[df["modal_price"] > 0]
    df = df[df["modal_price"] >= 10]

    # 2. Dates: parse, drop unparseable, drop impossible future dates
    df["arrival_date"] = pd.to_datetime(df["arrival_date"], errors="coerce", dayfirst=True)
    df = df.dropna(subset=["arrival_date"])
    df = df[df["arrival_date"] <= pd.Timestamp.today()]

    # 3. Dedup
    df = df.drop_duplicates(subset=["crop", "mandi", "arrival_date"])

    # 4. Exclude commodity groups that don't fit a per-quintal price model
    #    (authoritative mapping from src/build_commodity_groups.py, not a
    #    hand-guessed name list — see technical-decisions.md)
    if os.path.exists(config.GROUP_MAPPING_PATH):
        group_map = pd.read_csv(config.GROUP_MAPPING_PATH)
        n_before = len(df)
        df = df.merge(group_map, on="crop", how="left")
        df = df[~df["group_name"].isin(config.EXCLUDED_COMMODITY_GROUPS)]
        df = df.drop(columns=["group_name"])
        print(f"Excluded {n_before - len(df)} rows from groups {config.EXCLUDED_COMMODITY_GROUPS}")
    else:
        print("[!] commodity_group_mapping.csv not found — run `python -m src.build_commodity_groups` "
              "first if you want group-based exclusion. Skipping for now.")

    # 5. Narrow to FOCUS_STATE, then its TOP_N_CROPS by real record count
    if config.FOCUS_STATE:
        n_before = len(df)
        df = df[df["state"].str.strip().str.lower() == config.FOCUS_STATE.strip().lower()]
        print(f"Filtered to state='{config.FOCUS_STATE}': {n_before} -> {len(df)} rows")

        if config.TOP_N_CROPS:
            crop_counts = df.groupby("crop").size().sort_values(ascending=False)
            top_crops = crop_counts.head(config.TOP_N_CROPS).index.tolist()
            print(f"\nTop {config.TOP_N_CROPS} crops in {config.FOCUS_STATE} by record count:")
            print(crop_counts.head(config.TOP_N_CROPS).to_string())

            n_before = len(df)
            df = df[df["crop"].isin(top_crops)]
            print(f"\nFiltered to top {config.TOP_N_CROPS} crops: {n_before} -> {len(df)} rows")

    # 6. Keep only crop-mandi pairs with enough history
    counts = df.groupby(["crop", "mandi"]).size().reset_index(name="n")
    valid_pairs = counts[counts["n"] >= config.MIN_RECORDS_PER_CROP_MANDI][["crop", "mandi"]]
    df = df.merge(valid_pairs, on=["crop", "mandi"], how="inner")

    # 7. Remove per-crop-mandi outliers (IQR, vectorized via transform)
    q1 = df.groupby(["crop", "mandi"])["modal_price"].transform(lambda x: x.quantile(0.25))
    q3 = df.groupby(["crop", "mandi"])["modal_price"].transform(lambda x: x.quantile(0.75))
    iqr = q3 - q1
    mask = (df["modal_price"] >= (q1 - 1.5 * iqr)) & (df["modal_price"] <= (q3 + 1.5 * iqr))
    df = df[mask]

    df = df.sort_values(["crop", "mandi", "arrival_date"]).reset_index(drop=True)

    print(f"\nFinal cleaned dataset: {n_start} -> {len(df)} rows "
          f"({df['crop'].nunique()} crops, {df['mandi'].nunique()} mandis)")

    if save:
        os.makedirs(config.INTERIM_DATA_DIR, exist_ok=True)
        df.to_csv(config.CLEANED_PATH, index=False)
        print(f"Saved cleaned data -> {config.CLEANED_PATH}")

    return df


if __name__ == "__main__":
    from src.data_loader import load_all_years
    raw = load_all_years()
    clean_data(raw)