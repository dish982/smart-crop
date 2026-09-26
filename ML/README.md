# Crop Price Advisory — Module 3

Forecasts crop prices per crop-mandi pair using 10 years of Agmarknet-style
mandi data, and recommends whether a farmer should sell now or wait.

## Setup

```bash
pip install -r requirements.txt
```

## How to use

1. **Drop your yearly CSVs** (2016.csv, 2017.csv, ..., 2026.csv) into `data/raw/`.

2. **Check `src/config.py`** — the `COLUMN_MAP` dict maps standard internal
   column names to whatever your CSVs actually call them
   (e.g. if your file uses `"Modal Price"` instead of `"Modal_Price"`, fix it here).
   This is the **only file** you should need to edit before running.

3. **Get an Agmarknet API key** from https://data.gov.in (free registration),
   and paste it into `AGMARKNET_API_KEY` in `src/config.py`.

4. **Run the full pipeline:**

   ```bash
   python main.py
   ```

   This will, step by step:
   - Merge all yearly CSVs -> `data/interim/merged_all_years.csv`
   - Clean and filter -> `data/interim/cleaned.csv`
   - Engineer features -> `data/processed/featured_dataset.csv`
   - Train the model (time-based split) -> `models/price_model_v1.pkl`
   - Run a rolling backtest across multiple years and print MAE/MAPE per year

5. **Get a recommendation for a specific farmer:**

   ```python
   import joblib, pandas as pd
   from src import config
   from src.predict import recommend

   model = joblib.load(config.MODEL_PATH)
   df = pd.read_csv(config.FEATURED_PATH, parse_dates=["arrival_date"])
   history = df[(df.crop == "Tomato") & (df.mandi == "Pune")].sort_values("arrival_date")

   result = recommend(model, history, crop="Tomato", mandi="Pune", state="Maharashtra")
   print(result["message"])
   ```

## Notes

- Each module in `src/` can also be run standalone for debugging, e.g.
  `python -m src.clean` will load, clean, and save — useful to inspect
  intermediate output without running the whole pipeline.
- Re-run `main.py` periodically (e.g. monthly) as new price data comes in —
  commodity prices drift with policy/MSP changes, so the model needs refreshing.
- If a particular crop-mandi pair keeps getting dropped by the
  `MIN_RECORDS_PER_CROP_MANDI` filter in `config.py`, lower that threshold,
  but understand the model's predictions for that pair will be less reliable.
