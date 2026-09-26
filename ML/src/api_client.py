"""
Wrapper around the Agmarknet daily mandi price API (data.gov.in).
Get your free API key by registering at https://data.gov.in

Usage:
    from src.api_client import get_live_price
    price = get_live_price("Maharashtra", "Pune", "Tomato")
"""

import requests
from src import config


def get_live_records(state: str, mandi: str, crop: str, limit: int = 10) -> list:
    params = {
        "api-key": config.AGMARKNET_API_KEY,
        "format": "json",
        "filters[state]": state,
        "filters[market]": mandi,
        "filters[commodity]": crop,
        "limit": limit,
        "sort[arrival_date]": "desc",
    }
    try:
        resp = requests.get(config.AGMARKNET_API_URL, params=params, timeout=10)
        resp.raise_for_status()
        return resp.json().get("records", [])
    except requests.RequestException as e:
        print(f"[api_client] Live price fetch failed: {e}")
        return []


def get_live_price(state: str, mandi: str, crop: str) -> float | None:
    records = get_live_records(state, mandi, crop, limit=1)
    if not records:
        return None
    try:
        return float(records[0]["modal_price"])
    except (KeyError, ValueError):
        return None


if __name__ == "__main__":
    price = get_live_price("Maharashtra", "Pune", "Tomato")
    print(f"Live price: {price}")
