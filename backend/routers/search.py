from fastapi import APIRouter, HTTPException
from services import yfinance_client

router = APIRouter()


@router.get("/ticker/{symbol}/info")
def get_ticker_info(symbol: str):
    try:
        info = yfinance_client.get_info(symbol.upper())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch ticker data. Yahoo Finance may be unavailable.")

    return {
        "symbol":       info.get("symbol", symbol.upper()),
        "name":         info.get("longName") or info.get("shortName", symbol.upper()),
        "sector":       info.get("sector", "—"),
        "industry":     info.get("industry", "—"),
        "currency":     info.get("currency", "USD"),
        "exchange":     info.get("exchange", "—"),
        "market_cap":   info.get("marketCap"),
        "current_price": info.get("regularMarketPrice") or info.get("currentPrice"),
        "previous_close": info.get("previousClose"),
        "price_change_pct": info.get("regularMarketChangePercent"),
        "logo_url":     info.get("logo_url"),
        "website":      info.get("website"),
        "description":  info.get("longBusinessSummary"),
    }
