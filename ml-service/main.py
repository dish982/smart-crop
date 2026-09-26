from contextlib import asynccontextmanager  # CHANGED: added, needed for the lifespan block below

from fastapi import FastAPI

from crop.router import router as crop_router
from market.router import router as market_router
# from nlp.router import router as nlp_router  # uncomment once NLP backend exists

# CHANGED: also need the modules themselves (not just their `router` objects)
# so we can call each one's init() function below.
import crop.router as crop_router_module
import market.router as market_router_module
# import nlp.router as nlp_router_module  # uncomment once NLP backend exists


# CHANGED: this whole function is new. It runs crop's and market's init()
# AFTER Uvicorn has already bound its port, instead of that loading happening
# during import (before). This is the actual fix for Render's "no open ports"
# error — the port opens immediately now, and model/data loading finishes a
# moment later in the background.
@asynccontextmanager
async def lifespan(app: FastAPI):
    crop_router_module.init()
    market_router_module.init()
    # nlp_router_module.init()
    yield


app = FastAPI(
    title="Smart Crop Advisory ML Service",
    version="1.0.0",
    lifespan=lifespan,  # CHANGED: wires the function above into the app
)


@app.get("/")
def home():
    return {"message": "Smart Crop ML API is running"}


app.include_router(crop_router, prefix="/api/crop", tags=["crop"])
app.include_router(market_router, prefix="/api/market", tags=["market"])
# app.include_router(nlp_router, prefix="/api/chat", tags=["nlp"])