import { useEffect } from 'react';
import { api } from '../api/client';
import { useDashboard } from '../store/dashboardStore';

export function useFinancials() {
  const { state, dispatch } = useDashboard();

  useEffect(() => {
    if (!state.symbol) return;

    const symbol = state.symbol;
    const period = state.period;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    Promise.all([
      api.getInfo(symbol),
      api.getIncomeStatement(symbol, period),
      api.getBalanceSheet(symbol, period),
      api.getCashFlow(symbol, period),
      api.getRatios(symbol),
      api.getCharts(symbol, period),
      api.getEarningsHistory(symbol),
    ])
      .then(([info, income, balance, cashflow, ratios, charts, earnings]) => {
        dispatch({ type: 'SET_INFO',       payload: info });
        dispatch({ type: 'SET_FINANCIALS', tab: 'income',   payload: income });
        dispatch({ type: 'SET_FINANCIALS', tab: 'balance',  payload: balance });
        dispatch({ type: 'SET_FINANCIALS', tab: 'cashflow', payload: cashflow });
        dispatch({ type: 'SET_RATIOS',     payload: ratios });
        dispatch({ type: 'SET_CHARTS',     payload: charts });
        dispatch({ type: 'SET_EARNINGS',   payload: earnings });
        dispatch({ type: 'SET_LOADING',    payload: false });
      })
      .catch((e: Error) => {
        dispatch({ type: 'SET_ERROR', payload: e.message });
      });
  }, [state.symbol, state.period]);
}
