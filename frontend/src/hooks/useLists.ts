import { useEffect } from 'react';
import { useDashboard } from '../store/dashboardStore';
import { authApi } from '../api/auth';
import { listsApi } from '../api/lists';

export function useAuth() {
  const { dispatch } = useDashboard();

  useEffect(() => {
    authApi.getMe()
      .then(user => dispatch({ type: 'SET_USER', payload: user }))
      .catch(() => dispatch({ type: 'SET_USER', payload: null }));
  }, [dispatch]);
}

export function useLists() {
  const { state, dispatch } = useDashboard();
  const { user } = state;

  useEffect(() => {
    if (!user) {
      dispatch({ type: 'SET_LISTS', payload: [] });
      return;
    }
    listsApi.getLists()
      .then(lists => dispatch({ type: 'SET_LISTS', payload: lists }))
      .catch(() => {});
  }, [user, dispatch]);

  const createList = async (name: string) => {
    const list = await listsApi.createList(name);
    dispatch({ type: 'ADD_LIST', payload: list });
    return list;
  };

  const deleteList = async (listId: string) => {
    await listsApi.deleteList(listId);
    dispatch({ type: 'REMOVE_LIST', payload: listId });
  };

  const addStock = async (listId: string, symbol: string) => {
    const stock = await listsApi.addStock(listId, symbol);
    dispatch({ type: 'ADD_STOCK_TO_LIST', list_id: listId, payload: stock });
    return stock;
  };

  const removeStock = async (listId: string, symbol: string) => {
    await listsApi.removeStock(listId, symbol);
    dispatch({ type: 'REMOVE_STOCK_FROM_LIST', list_id: listId, symbol });
  };

  return { createList, deleteList, addStock, removeStock };
}
