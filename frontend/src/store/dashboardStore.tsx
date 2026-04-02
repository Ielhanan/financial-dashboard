import React, { createContext, useContext, useReducer } from 'react';
import type { ChartsResponse, EarningsHistoryResponse, FinancialTab, FinancialsResponse, Period, RatiosResponse, Tab, TickerInfo } from '../types/financial';

interface State {
  symbol: string | null;
  activeTab: Tab;
  period: Period;
  info: TickerInfo | null;
  financials: Record<FinancialTab, FinancialsResponse | null>;
  charts: ChartsResponse | null;
  ratios: RatiosResponse | null;
  earnings: EarningsHistoryResponse | null;
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'SET_SYMBOL'; payload: string }
  | { type: 'SET_TAB'; payload: Tab }
  | { type: 'SET_PERIOD'; payload: Period }
  | { type: 'SET_INFO'; payload: TickerInfo }
  | { type: 'SET_FINANCIALS'; tab: FinancialTab; payload: FinancialsResponse }
  | { type: 'SET_CHARTS'; payload: ChartsResponse }
  | { type: 'SET_RATIOS'; payload: RatiosResponse }
  | { type: 'SET_EARNINGS'; payload: EarningsHistoryResponse }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialFinancials: Record<FinancialTab, FinancialsResponse | null> = {
  income: null, balance: null, cashflow: null,
};

const initialState: State = {
  symbol: null,
  activeTab: 'income',
  period: 'annual',
  info: null,
  financials: initialFinancials,
  charts: null,
  ratios: null,
  earnings: null,
  loading: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SYMBOL':
      return { ...initialState, symbol: action.payload };
    case 'SET_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_PERIOD':
      return { ...state, period: action.payload, financials: initialFinancials, charts: null };
    case 'SET_INFO':
      return { ...state, info: action.payload };
    case 'SET_FINANCIALS':
      return { ...state, financials: { ...state.financials, [action.tab]: action.payload } };
    case 'SET_CHARTS':
      return { ...state, charts: action.payload };
    case 'SET_RATIOS':
      return { ...state, ratios: action.payload };
    case 'SET_EARNINGS':
      return { ...state, earnings: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
}

const DashboardContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <DashboardContext.Provider value={{ state, dispatch }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
