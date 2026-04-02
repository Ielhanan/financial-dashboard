from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from services import yfinance_client

router = APIRouter()

PeriodType = Literal["annual", "quarterly"]


def _make_response(symbol: str, period: str, dates: list, rows: list) -> dict:
    return {"symbol": symbol.upper(), "period": period, "dates": dates, "rows": rows}


@router.get("/ticker/{symbol}/financials")
def get_income_statement(
    symbol: str,
    period: PeriodType = Query("annual"),
):
    try:
        dates, rows = yfinance_client.get_income_statement(symbol.upper(), period)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch income statement.")
    return _make_response(symbol, period, dates, rows)


@router.get("/ticker/{symbol}/balance-sheet")
def get_balance_sheet(
    symbol: str,
    period: PeriodType = Query("annual"),
):
    try:
        dates, rows = yfinance_client.get_balance_sheet(symbol.upper(), period)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch balance sheet.")
    return _make_response(symbol, period, dates, rows)


@router.get("/ticker/{symbol}/cash-flow")
def get_cash_flow(
    symbol: str,
    period: PeriodType = Query("annual"),
):
    try:
        dates, rows = yfinance_client.get_cash_flow(symbol.upper(), period)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch cash flow statement.")
    return _make_response(symbol, period, dates, rows)


@router.get("/ticker/{symbol}/charts")
def get_charts(
    symbol: str,
    period: PeriodType = Query("annual"),
):
    try:
        data = yfinance_client.get_charts(symbol.upper(), period)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch chart data.")
    return {"symbol": symbol.upper(), "period": period, **data}
