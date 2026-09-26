"""
Central place for target transformation logic. Since we log-transform
the price target during training (to dampen the influence of extreme
spikes), every place that calls model.predict() must convert the raw
output back to real rupees using expm1(). Keeping this in one shared
module means we can't accidentally forget to invert it somewhere.
"""

import numpy as np
from src import config


def transform_target(y):
    """Apply before training, if LOG_TRANSFORM_TARGET is on."""
    if getattr(config, "LOG_TRANSFORM_TARGET", False):
        return np.log1p(y)
    return y


def predict_price(model, X):
    """Use this EVERYWHERE instead of model.predict(X) directly."""
    raw = model.predict(X)
    if getattr(config, "LOG_TRANSFORM_TARGET", False):
        return np.expm1(raw)
    return raw