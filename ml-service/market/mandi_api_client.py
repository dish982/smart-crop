import requests

BASE_URL = "https://mandi-api.onrender.com/v1"

MANDI_API_MAPPING = {
    "Pune": "Pune APMC",
}


def get_today_price(state: str, commodity: str, market: str) -> dict | None:
    try:
        api_market = MANDI_API_MAPPING.get(market, market)
        resp = requests.get(
            f"{BASE_URL}/prices",
            params={"state": state, "commodity": commodity, "market": api_market},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data.get("success") or not data.get("data"):
            return None
        rows = sorted(data["data"], key=lambda r: r["arrival_date"], reverse=True)
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
    try:
        resp = requests.get(
            f"{BASE_URL}/prices", params={"state": state, "commodity": commodity}, timeout=15
        )
        resp.raise_for_status()
        data = resp.json()
        rows = data.get("data", []) if data.get("success") else []
        latest_by_market = {}
        for row in rows:
            m = row["market"]
            if m not in latest_by_market or row["arrival_date"] > latest_by_market[m]["arrival_date"]:
                latest_by_market[m] = row
        return list(latest_by_market.values())
    except requests.RequestException as e:
        print(f"[mandi_api_client] get_crop_across_mandis failed: {e}")
        return []


# --- NEW, best-guess: needed for /options -------------------------------
# UNCONFIRMED against the real Mandi API. If your friend already has these
# (or the API works differently), replace this block, don't merge both.

def get_commodities(state: str) -> list[str]:
    try:
        resp = requests.get(f"{BASE_URL}/commodities", params={"state": state}, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", []) if data.get("success") else []
    except requests.RequestException as e:
        print(f"[mandi_api_client] get_commodities failed: {e}")
        return []


def get_markets(state: str, commodity: str) -> list[str]:
    try:
        resp = requests.get(
            f"{BASE_URL}/markets", params={"state": state, "commodity": commodity}, timeout=10
        )
        resp.raise_for_status()
        data = resp.json()
        rows = data.get("data", []) if data.get("success") else []
        return [row["market"] for row in rows]
    except requests.RequestException as e:
        print(f"[mandi_api_client] get_markets failed: {e}")
        return []