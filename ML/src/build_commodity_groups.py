"""
One-time (or occasional) script: pulls the official Agmarknet commodity ->
group mapping (e.g. "Flowers", "Vegetables", "Cereals") from their filters
API, and saves it locally as a CSV. This is the authoritative source —
no guessing crop names by hand, and it covers every commodity Agmarknet
tracks, not just the ones you've happened to notice in your data.

Run this occasionally (e.g. once, then re-run every few months in case
new commodities get added) — NOT every time you train.
"""

import os
import pandas as pd
from agmarknet import Agmarknet
from src import config

GROUP_MAPPING_PATH = os.path.join(config.INTERIM_DATA_DIR, "commodity_group_mapping.csv")


def build_commodity_group_mapping(save: bool = True) -> pd.DataFrame:
    api = Agmarknet()
    filters = api.filters()

    commodities_df = pd.DataFrame(filters.commodities)      # cmdt_id, cmdt_name, cmdt_group_id
    groups_df = pd.DataFrame(filters.commodity_groups)       # id, cmdt_grp_name

    merged = commodities_df.merge(
        groups_df, left_on="cmdt_group_id", right_on="id", how="left"
    )
    merged = merged[["cmdt_name", "cmdt_grp_name"]].rename(
        columns={"cmdt_name": "crop", "cmdt_grp_name": "group_name"}
    )

    print(f"Built mapping for {len(merged)} commodities across {merged['group_name'].nunique()} groups")
    print(merged["group_name"].value_counts())

    if save:
        os.makedirs(config.INTERIM_DATA_DIR, exist_ok=True)
        merged.to_csv(GROUP_MAPPING_PATH, index=False)
        print(f"\nSaved crop -> group mapping -> {GROUP_MAPPING_PATH}")

    return merged

def inspect_all_filter_tables():
    api = Agmarknet()
    filters = api.filters()

    # Print every table this filters object exposes, so we can find the
    # group id -> group name lookup (separate from the commodities table)
    print("\nAll available filter tables:")
    for key in dir(filters):
        if not key.startswith("_"):
            print(f"  - {key}")

    # Try the most likely candidates for the group name lookup
    for candidate in ["groups", "cmdt_groups", "commodity_groups", "group_data"]:
        if hasattr(filters, candidate):
            table = getattr(filters, candidate)
            df = pd.DataFrame(table)
            print(f"\nFound '{candidate}':")
            print(df.head(20))
            return df

    print("\nNo obvious groups table found by name — check the full attribute list above "
          "and try filters['<name>'] manually for anything that looks like group names.")
    return None


if __name__ == "__main__":
    build_commodity_group_mapping()
    inspect_all_filter_tables()