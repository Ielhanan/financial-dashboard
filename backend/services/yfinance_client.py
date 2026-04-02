"""
All yfinance calls are isolated here. Nothing else imports yfinance directly.
Field names below are the exact strings yfinance returns in DataFrame indexes.
"""
from __future__ import annotations

from typing import Literal

import pandas as pd
import yfinance as yf

from services.cache import cached

PeriodType = Literal["annual", "quarterly"]

# ---------------------------------------------------------------------------
# Label maps: yfinance field name → human-readable label
# ---------------------------------------------------------------------------

INCOME_KEYS = [
    "Total Revenue",
    "Cost Of Revenue",
    "Gross Profit",
    "Research And Development",
    "Selling General And Administration",
    "Operating Income",
    "EBITDA",
    "Interest Expense Non Operating",
    "Pretax Income",
    "Tax Provision",
    "Net Income",
    "Basic EPS",
    "Diluted EPS",
]

INCOME_LABELS = {
    "Total Revenue":                    "Total Revenue",
    "Cost Of Revenue":                  "Cost of Revenue",
    "Gross Profit":                     "Gross Profit",
    "Research And Development":         "R&D Expenses",
    "Selling General And Administration": "SG&A Expenses",
    "Operating Income":                 "Operating Income (EBIT)",
    "EBITDA":                           "EBITDA",
    "Interest Expense Non Operating":   "Interest Expense",
    "Pretax Income":                    "Pre-tax Income",
    "Tax Provision":                    "Income Tax",
    "Net Income":                       "Net Income",
    "Basic EPS":                        "Basic EPS",
    "Diluted EPS":                      "Diluted EPS",
}

INCOME_FORMATS = {
    "Total Revenue":                    "currency",
    "Cost Of Revenue":                  "currency",
    "Gross Profit":                     "currency",
    "Research And Development":         "currency",
    "Selling General And Administration": "currency",
    "Operating Income":                 "currency",
    "EBITDA":                           "currency",
    "Interest Expense Non Operating":   "currency",
    "Pretax Income":                    "currency",
    "Tax Provision":                    "currency",
    "Net Income":                       "currency",
    "Basic EPS":                        "ratio",
    "Diluted EPS":                      "ratio",
}

BALANCE_KEYS = [
    "Cash And Cash Equivalents",
    "Cash Cash Equivalents And Short Term Investments",
    "Accounts Receivable",
    "Inventory",
    "Current Assets",
    "Net PPE",
    "Total Assets",
    "Accounts Payable",
    "Current Debt",
    "Current Liabilities",
    "Long Term Debt",
    "Total Liabilities Net Minority Interest",
    "Common Stock Equity",
    "Retained Earnings",
    "Total Equity Gross Minority Interest",
]

BALANCE_LABELS = {
    "Cash And Cash Equivalents":                "Cash & Equivalents",
    "Cash Cash Equivalents And Short Term Investments": "Cash & Short-term Investments",
    "Accounts Receivable":                      "Accounts Receivable",
    "Inventory":                                "Inventory",
    "Current Assets":                           "Total Current Assets",
    "Net PPE":                                  "Net PP&E",
    "Total Assets":                             "Total Assets",
    "Accounts Payable":                         "Accounts Payable",
    "Current Debt":                             "Current Debt",
    "Current Liabilities":                      "Total Current Liabilities",
    "Long Term Debt":                           "Long-term Debt",
    "Total Liabilities Net Minority Interest":  "Total Liabilities",
    "Common Stock Equity":                      "Shareholders' Equity",
    "Retained Earnings":                        "Retained Earnings",
    "Total Equity Gross Minority Interest":     "Total Equity",
}

CASHFLOW_KEYS = [
    "Operating Cash Flow",
    "Capital Expenditure",
    "Free Cash Flow",
    "Depreciation And Amortization",
    "Stock Based Compensation",
    "Change In Working Capital",
    "Investing Cash Flow",
    "Financing Cash Flow",
    "End Cash Position",
]

CASHFLOW_LABELS = {
    "Operating Cash Flow":      "Operating Cash Flow",
    "Capital Expenditure":      "Capital Expenditure",
    "Free Cash Flow":           "Free Cash Flow",
    "Depreciation And Amortization": "D&A",
    "Stock Based Compensation": "Stock-based Compensation",
    "Change In Working Capital": "Change in Working Capital",
    "Investing Cash Flow":      "Investing Cash Flow",
    "Financing Cash Flow":      "Financing Cash Flow",
    "End Cash Position":        "Ending Cash",
}

# All cash flow values are currency
CASHFLOW_FORMATS = {k: "currency" for k in CASHFLOW_KEYS}

# All balance sheet values are currency
BALANCE_FORMATS = {k: "currency" for k in BALANCE_KEYS}


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------

def _ticker(symbol: str) -> yf.Ticker:
    return yf.Ticker(symbol.upper())


def _format_annual_date(ts) -> str:
    return pd.Timestamp(ts).strftime("%Y-%m-%d")


def _format_quarterly_date(ts) -> str:
    ts = pd.Timestamp(ts)
    q = (ts.month - 1) // 3 + 1
    return f"Q{q} {ts.year}"


def _df_to_rows(
    df: pd.DataFrame,
    keys: list[str],
    label_map: dict[str, str],
    format_map: dict[str, str],
    period: PeriodType,
) -> tuple[list[str], list[dict]]:
    """Convert a yfinance DataFrame to the API response format."""
    fmt_date = _format_quarterly_date if period == "quarterly" else _format_annual_date
    dates = [fmt_date(col) for col in df.columns]

    rows = []
    for key in keys:
        if key not in df.index:
            continue
        raw = df.loc[key]
        fmt = format_map.get(key, "number")
        values = []
        for v in raw:
            if pd.isna(v):
                values.append(None)
            elif fmt in ("ratio",):
                values.append(round(float(v), 4))
            else:
                values.append(int(v))
        rows.append({
            "label": label_map.get(key, key),
            "key": key,
            "values": values,
            "format": fmt,
        })
    return dates, rows


# ---------------------------------------------------------------------------
# Public API — all functions are cached
# ---------------------------------------------------------------------------

@cached
def get_info(symbol: str) -> dict:
    t = _ticker(symbol)
    info = t.info
    if not info or info.get("regularMarketPrice") is None:
        raise ValueError(f"Ticker '{symbol}' not found or no market data available")
    return info


@cached
def get_income_statement(symbol: str, period: PeriodType) -> tuple[list[str], list[dict]]:
    t = _ticker(symbol)
    df = t.financials if period == "annual" else t.quarterly_financials
    if df is None or df.empty:
        raise ValueError(f"No income statement data for '{symbol}'")
    return _df_to_rows(df, INCOME_KEYS, INCOME_LABELS, INCOME_FORMATS, period)


@cached
def get_balance_sheet(symbol: str, period: PeriodType) -> tuple[list[str], list[dict]]:
    t = _ticker(symbol)
    df = t.balance_sheet if period == "annual" else t.quarterly_balance_sheet
    if df is None or df.empty:
        raise ValueError(f"No balance sheet data for '{symbol}'")
    return _df_to_rows(df, BALANCE_KEYS, BALANCE_LABELS, BALANCE_FORMATS, period)


@cached
def get_cash_flow(symbol: str, period: PeriodType) -> tuple[list[str], list[dict]]:
    t = _ticker(symbol)
    df = t.cashflow if period == "annual" else t.quarterly_cashflow
    if df is None or df.empty:
        raise ValueError(f"No cash flow data for '{symbol}'")
    # Compute Free Cash Flow if missing (OperatingCashFlow + CapitalExpenditure, CapEx is negative)
    if "Free Cash Flow" not in df.index and "Operating Cash Flow" in df.index and "Capital Expenditure" in df.index:
        df.loc["Free Cash Flow"] = df.loc["Operating Cash Flow"] + df.loc["Capital Expenditure"]
    return _df_to_rows(df, CASHFLOW_KEYS, CASHFLOW_LABELS, CASHFLOW_FORMATS, period)


@cached
def get_ratios(symbol: str) -> list[dict]:
    info = get_info(symbol)

    ratio_defs = [
        ("trailingPE",                    "P/E Ratio (TTM)",        "ratio"),
        ("forwardPE",                     "Forward P/E",            "ratio"),
        ("priceToSalesTrailing12Months",  "P/S Ratio (TTM)",        "ratio"),
        ("priceToBook",                   "P/B Ratio",              "ratio"),
        ("enterpriseToEbitda",            "EV/EBITDA",              "ratio"),
        ("enterpriseToRevenue",           "EV/Revenue",             "ratio"),
        ("grossMargins",                  "Gross Margin",           "percent"),
        ("operatingMargins",              "Operating Margin",       "percent"),
        ("profitMargins",                 "Net Profit Margin",      "percent"),
        ("returnOnEquity",                "Return on Equity (ROE)", "percent"),
        ("returnOnAssets",                "Return on Assets (ROA)", "percent"),
        ("debtToEquity",                  "Debt / Equity",          "ratio"),
        ("currentRatio",                  "Current Ratio",          "ratio"),
        ("revenueGrowth",                 "Revenue Growth (YoY)",   "percent"),
        ("earningsGrowth",                "Earnings Growth (YoY)",  "percent"),
        ("dividendYield",                 "Dividend Yield",         "percent"),
        ("beta",                          "Beta",                   "ratio"),
        ("fiftyTwoWeekHigh",              "52-Week High",           "currency"),
        ("fiftyTwoWeekLow",               "52-Week Low",            "currency"),
        ("marketCap",                     "Market Cap",             "currency"),
        ("enterpriseValue",               "Enterprise Value",       "currency"),
    ]

    ratios = []
    for key, label, fmt in ratio_defs:
        val = info.get(key)
        if val is not None:
            ratios.append({"label": label, "key": key, "value": val, "format": fmt})
    return ratios


@cached
def get_charts(symbol: str, period: PeriodType) -> dict:
    t = _ticker(symbol)
    inc_df = t.financials if period == "annual" else t.quarterly_financials
    cf_df  = t.cashflow   if period == "annual" else t.quarterly_cashflow

    if inc_df is None or inc_df.empty:
        raise ValueError(f"No chart data for '{symbol}'")

    fmt_date = _format_quarterly_date if period == "quarterly" else _format_annual_date

    # Align both DataFrames on the same dates
    dates = [fmt_date(col) for col in inc_df.columns]

    def _extract(df: pd.DataFrame, key: str) -> list:
        if df is None or key not in df.index:
            return [None] * len(dates)
        return [None if pd.isna(v) else float(v) for v in df.loc[key]]

    # Ensure FCF exists
    if cf_df is not None and "Free Cash Flow" not in cf_df.index:
        if "Operating Cash Flow" in cf_df.index and "Capital Expenditure" in cf_df.index:
            cf_df.loc["Free Cash Flow"] = cf_df.loc["Operating Cash Flow"] + cf_df.loc["Capital Expenditure"]

    # Align cashflow columns to income statement columns (they may differ)
    def _extract_aligned(df: pd.DataFrame, key: str) -> list:
        if df is None or key not in df.index:
            return [None] * len(inc_df.columns)
        result = []
        for col in inc_df.columns:
            if col in df.columns:
                v = df.loc[key, col]
                result.append(None if pd.isna(v) else float(v))
            else:
                result.append(None)
        return result

    return {
        "dates":          dates,
        "revenue":        _extract(inc_df, "Total Revenue"),
        "net_income":     _extract(inc_df, "Net Income"),
        "basic_eps":      _extract(inc_df, "Basic EPS"),
        "diluted_eps":    _extract(inc_df, "Diluted EPS"),
        "free_cash_flow": _extract_aligned(cf_df, "Free Cash Flow"),
    }


@cached
def get_earnings_history(symbol: str) -> dict:
    t = _ticker(symbol)
    df = t.get_earnings_dates(limit=20)

    if df is None or df.empty:
        raise ValueError(f"No earnings history for '{symbol}'")

    # Drop rows with no reported EPS (future scheduled dates)
    df = df.dropna(subset=["Reported EPS"])

    if df.empty:
        raise ValueError(f"No historical earnings data for '{symbol}'")

    # Keep most recent 16 quarters, then reverse to chronological order
    df = df.head(16).iloc[::-1]

    quarters = [_format_quarterly_date(ts) for ts in df.index]

    def _val(series, idx):
        v = series.iloc[idx]
        return None if pd.isna(v) else round(float(v), 4)

    estimated_eps = [_val(df["EPS Estimate"], i) for i in range(len(df))]
    actual_eps    = [_val(df["Reported EPS"], i) for i in range(len(df))]
    surprise_pct  = [_val(df["Surprise(%)"], i) for i in range(len(df))]

    surprise = [
        round(a - e, 4) if a is not None and e is not None else None
        for a, e in zip(actual_eps, estimated_eps)
    ]
    # EPS equal to estimate counts as a beat (>= is intentional)
    beat = [
        a >= e if a is not None and e is not None else None
        for a, e in zip(actual_eps, estimated_eps)
    ]

    return {
        "quarters":      quarters,
        "estimated_eps": estimated_eps,
        "actual_eps":    actual_eps,
        "surprise":      surprise,
        "surprise_pct":  surprise_pct,
        "beat":          beat,
    }
