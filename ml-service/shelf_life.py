# Typical post-harvest marketable shelf life.
# Values are approximate and depend on storage temperature,
# humidity, packaging and handling conditions.

SHELF_LIFE_DAYS = {
    "Cauliflower": 5,
    "Brinjal": 4,
    "Tomato": 5,
    "Cabbage": 14,
    "Onion": 30,
    "Green Chilli": 5,
    "Bhindi (Ladies Finger)": 3,
    "Bengal Gram (Gram)(Whole)": 180,
    "Wheat": 180,
    "Soyabean": 180,
}


def get_shelf_life_days(crop: str) -> int | None:
    return SHELF_LIFE_DAYS.get(crop)