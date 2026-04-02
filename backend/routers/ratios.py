from fastapi import APIRouter, HTTPException
from services import yfinance_client

router = APIRouter()


@router.get("/ticker/{symbol}/ratios")
def get_ratios(symbol: str):
    try:
        ratios = yfinance_client.get_ratios(symbol.upper())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch ratios.")
    return {"symbol": symbol.upper(), "ratios": ratios}
