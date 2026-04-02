import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import search, financials, ratios

app = FastAPI(title="Financial Dashboard API", version="1.0.0")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(search.router,     prefix="/api/v1")
app.include_router(financials.router, prefix="/api/v1")
app.include_router(ratios.router,     prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
