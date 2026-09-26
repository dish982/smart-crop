from fastapi import FastAPI

from crop.router import router as crop_router
from market.router import router as market_router
# from nlp.router import router as nlp_router  # uncomment once NLP backend exists

app = FastAPI(title="Smart Crop Advisory ML Service", version="1.0.0")


@app.get("/")
def home():
    return {"message": "Smart Crop ML API is running"}


app.include_router(crop_router, prefix="/api/crop", tags=["crop"])
app.include_router(market_router, prefix="/api/market", tags=["market"])
# app.include_router(nlp_router, prefix="/api/chat", tags=["nlp"])
