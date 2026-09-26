"""
Wraps the free, keyless Mandi Price API (mandi-api.onrender.com).
No API key needed. Used for:
  - today's live price (replaces the old dead Agmarknet key)
  - price history chart for a market
  - cross-mandi price comparison for a crop
"""

import requests

BASE_URL = "https://mandi-api.onrender.com/v1"

MANDI_API_MAPPING = {
    "Pune": "Pune APMC",
}


def get_today_price(state: str, commodity: str, market: str) -> dict | None:
    try:
        # Convert the model's mandi name to the API's mandi name
        api_market = MANDI_API_MAPPING.get(market, market)

        resp = requests.get(
            f"{BASE_URL}/prices",
            params={
                "state": state,
                "commodity": commodity,
                "market": api_market,
            },
            timeout=10,
        )

        resp.raise_for_status()
        data = resp.json()

        if not data.get("success") or not data.get("data"):
            return None

        rows = sorted(
            data["data"],
            key=lambda r: r["arrival_date"],
            reverse=True
        )

        return rows[0]

    except requests.RequestException as e:
        print(f"[mandi_api_client] get_today_price failed: {e}")
        return None


def get_price_history(state: str, commodity: str, market: str | None = None,
                       from_date: str | None = None, to_date: str | None = None) -> list:
    params = {"state": state, "commodity": commodity}
    if market:
        params["market"] = MANDI_API_MAPPING.get(market, market)
    if from_date:
        params["from"] = from_date
    if to_date:
        params["to"] = to_date

    try:
        resp = requests.get(f"{BASE_URL}/prices/history", params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", []) if data.get("success") else []
    except requests.RequestException as e:
        print(f"[mandi_api_client] get_price_history failed: {e}")
        return []


def get_crop_across_mandis(state: str, commodity: str) -> list:
    """All mandis' latest prices for one crop, state-wide — for the comparison chart."""
    try:
        resp = requests.get(
            f"{BASE_URL}/prices", params={"state": state, "commodity": commodity}, timeout=15
        )
        resp.raise_for_status()
        data = resp.json()
        rows = data.get("data", []) if data.get("success") else []

        # Keep only the latest record per market
        latest_by_market = {}
        for row in rows:
            m = row["market"]
            if m not in latest_by_market or row["arrival_date"] > latest_by_market[m]["arrival_date"]:
                latest_by_market[m] = row
        return list(latest_by_market.values())
    except requests.RequestException as e:
        print(f"[mandi_api_client] get_crop_across_mandis failed: {e}")
        return []