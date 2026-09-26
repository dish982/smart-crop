import market.config as config

FEATURE_COLUMNS = (
    ["month_sin", "month_cos", "week_of_year"]
    + [f"price_lag_{lag}" for lag in config.LAG_DAYS]
    + [f"rolling_mean_{w}" for w in config.ROLLING_WINDOWS]
    + ["price_same_week_last_year", "crop", "mandi", "state"]
)