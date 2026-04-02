import { useState } from 'react';
import { useDashboard } from '../../store/dashboardStore';
import { useLists } from '../../hooks/useLists';
import AddStockInput from './AddStockInput';
import type { WatchList as WatchListType } from '../../types/auth';

interface Props {
  list: WatchListType;
}

export default function WatchList({ list }: Props) {
  const [open, setOpen] = useState(true);
  const { dispatch } = useDashboard();
  const { deleteList, removeStock } = useLists();

  const handleStockClick = (symbol: string) => {
    dispatch({ type: 'SET_SYMBOL', payload: symbol });
  };

  return (
    <div className="border-b border-border last:border-0">
      {/* List header */}
      <div className="flex items-center justify-between px-3 py-2 group">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          <span className="text-text-muted text-xs">{open ? '▾' : '▸'}</span>
          <span className="text-text-secondary text-xs font-medium truncate">{list.name}</span>
          <span className="text-text-muted text-xs ml-1">({list.stocks.length})</span>
        </button>
        <button
          onClick={() => deleteList(list.id)}
          className="text-text-muted text-xs opacity-0 group-hover:opacity-100 hover:text-negative transition-all ml-1 flex-shrink-0"
          title="Delete list"
        >
          ✕
        </button>
      </div>

      {/* Stocks */}
      {open && (
        <div className="pb-1">
          {list.stocks.map(stock => (
            <div
              key={stock.symbol}
              className="flex items-center justify-between px-4 py-1 group/stock hover:bg-bg-surface cursor-pointer"
              onClick={() => handleStockClick(stock.symbol)}
            >
              <span className="text-text-primary text-xs font-numbers">{stock.symbol}</span>
              <button
                onClick={e => { e.stopPropagation(); removeStock(list.id, stock.symbol); }}
                className="text-text-muted text-xs opacity-0 group-hover/stock:opacity-100 hover:text-negative transition-all"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
          <AddStockInput listId={list.id} />
        </div>
      )}
    </div>
  );
}
