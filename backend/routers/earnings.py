from fastapi import APIRouter, HTTPException
from services import yfinance_client

router = APIRouter()


@router.get("/ticker/{symbol}/earnings-history")
def get_earnings_history(symbol: str):
    try:
        data = yfinance_client.get_earnings_history(symbol.upper())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch earnings history.")
    return {"symbol": symbol.upper(), **data}
