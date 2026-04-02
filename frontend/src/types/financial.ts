export type Period = 'annual' | 'quarterly';
export type FinancialTab = 'income' | 'balance' | 'cashflow';
export type Tab = FinancialTab | 'earnings' | 'ratios';

export interface TickerInfo {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  currency: string;
  exchange: string;
  market_cap: number | null;
  current_price: number | null;
  previous_close: number | null;
  price_change_pct: number | null;
  logo_url: string | null;
  website: string | null;
  description: string | null;
}

export interface FinancialRow {
  label: string;
  key: string;
  values: (number | null)[];
  format: 'currency' | 'percent' | 'ratio' | 'number';
}

export interface FinancialsResponse {
  symbol: string;
  period: Period;
  dates: string[];
  rows: FinancialRow[];
}

export interface RatioItem {
  label: string;
  key: string;
  value: number | null;
  format: 'currency' | 'percent' | 'ratio' | 'number';
}

export interface RatiosResponse {
  symbol: string;
  ratios: RatioItem[];
}

export interface ChartsResponse {
  symbol: string;
  period: Period;
  dates: string[];
  revenue: (number | null)[];
  net_income: (number | null)[];
  basic_eps: (number | null)[];
  diluted_eps: (number | null)[];
  free_cash_flow: (number | null)[];
}

export interface EarningsHistoryResponse {
  symbol: string;
  quarters: string[];
  estimated_eps: (number | null)[];
  actual_eps: (number | null)[];
  surprise: (number | null)[];
  surprise_pct: (number | null)[];
  beat: (boolean | null)[];
  actual_revenue: (number | null)[];
}
