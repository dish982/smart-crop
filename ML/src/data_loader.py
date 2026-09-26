"""
Loads every yearly CSV from data/raw/ (2016.csv, 2017.csv, ... 2026.csv)
and merges them into a single dataframe, standardizing column names
using the mapping in config.py.

Usage:
    from src.data_loader import load_all_years
    df = load_all_years()
"""

import os
import glob
import pandas as pd
from src import config


def load_all_years(raw_dir: str = None, save_merged: bool = True) -> pd.DataFrame:
    raw_dir = raw_dir or config.RAW_DATA_DIR
    csv_files = sorted(glob.glob(os.path.join(raw_dir, "*.csv")))

    if not csv_files:
        raise FileNotFoundError(
            f"No CSV files found in {raw_dir}. "
            f"Put your yearly files (2016.csv, 2017.csv, ...) in this folder."
        )

    print(f"Found {len(csv_files)} yearly files:")
    for f in csv_files:
        print(f"   - {os.path.basename(f)}")

    dfs = []
    for f in csv_files:
        year_label = os.path.splitext(os.path.basename(f))[0]
        try:
            df_year = pd.read_csv(f, low_memory=False)
        except UnicodeDecodeError:
            df_year = pd.read_csv(f, low_memory=False, encoding="latin1")

        # Rename columns to standard names using config.COLUMN_MAP
        rename_dict = {v: k for k, v in config.COLUMN_MAP.items() if v in df_year.columns}
        missing = [v for v in config.COLUMN_MAP.values() if v not in df_year.columns]
        if missing:
            print(f"   [!] {year_label}.csv is missing expected columns: {missing} — check config.COLUMN_MAP")

        df_year = df_year.rename(columns=rename_dict)
        df_year["source_file"] = year_label
        dfs.append(df_year)

    merged = pd.concat(dfs, ignore_index=True)
    print(f"\nMerged total rows: {len(merged)}")

    if save_merged:
        os.makedirs(config.INTERIM_DATA_DIR, exist_ok=True)
        merged.to_csv(config.MERGED_RAW_PATH, index=False)
        print(f"Saved merged raw data -> {config.MERGED_RAW_PATH}")

    return merged


if __name__ == "__main__":
    df = load_all_years()
    print(df.head())
