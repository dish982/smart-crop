import numpy as np
import market.config as config


def transform_target(y):
    if config.LOG_TRANSFORM_TARGET:
        return np.log1p(y)
    return y


def predict_price(model, X):
    raw = model.predict(X)
    if config.LOG_TRANSFORM_TARGET:
        return np.expm1(raw)
    return raw  # was missing — previously returned None when LOG_TRANSFORM_TARGET is False