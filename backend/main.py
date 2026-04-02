import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from routers import auth, earnings, financials, lists, ratios, search

app = FastAPI(title="Financial Dashboard API", version="1.0.0")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

# SessionMiddleware must be added before CORSMiddleware
app.add_middleware(SessionMiddleware, secret_key=os.getenv("JWT_SECRET", "dev-secret"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

app.include_router(search.router,     prefix="/api/v1")
app.include_router(financials.router, prefix="/api/v1")
app.include_router(ratios.router,     prefix="/api/v1")
app.include_router(earnings.router,   prefix="/api/v1")
app.include_router(auth.router,       prefix="/api/v1")
app.include_router(lists.router,      prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
