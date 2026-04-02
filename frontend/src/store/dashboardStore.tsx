import React, { createContext, useContext, useReducer } from 'react';
import type {
  ChartsResponse,
  EarningsHistoryResponse,
  FinancialTab,
  FinancialsResponse,
  Period,
  RatiosResponse,
  Tab,
  TickerInfo,
} from '../types/financial';
import type { User, WatchList, ListStock } from '../types/auth';

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
  user: User | null;
  lists: WatchList[];
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
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LISTS'; payload: WatchList[] }
  | { type: 'ADD_LIST'; payload: WatchList }
  | { type: 'REMOVE_LIST'; payload: string }
  | { type: 'ADD_STOCK_TO_LIST'; list_id: string; payload: ListStock }
  | { type: 'REMOVE_STOCK_FROM_LIST'; list_id: string; symbol: string };

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
  user: null,
  lists: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SYMBOL':
      return { ...initialState, symbol: action.payload, user: state.user, lists: state.lists };
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
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_LISTS':
      return { ...state, lists: action.payload };
    case 'ADD_LIST':
      return { ...state, lists: [...state.lists, action.payload] };
    case 'REMOVE_LIST':
      return { ...state, lists: state.lists.filter(l => l.id !== action.payload) };
    case 'ADD_STOCK_TO_LIST':
      return {
        ...state,
        lists: state.lists.map(l =>
          l.id === action.list_id
            ? { ...l, stocks: [...l.stocks, action.payload] }
            : l
        ),
      };
    case 'REMOVE_STOCK_FROM_LIST':
      return {
        ...state,
        lists: state.lists.map(l =>
          l.id === action.list_id
            ? { ...l, stocks: l.stocks.filter(s => s.symbol !== action.symbol) }
            : l
        ),
      };
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
