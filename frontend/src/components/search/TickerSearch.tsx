import { useState } from 'react';
import { useDashboard } from '../../store/dashboardStore';

export default function TickerSearch() {
  const { dispatch } = useDashboard();
  const [input, setInput] = useState('');

  const submit = () => {
    const clean = input.trim().toUpperCase().replace(/[^A-Z0-9.]/g, '');
    if (clean.length > 0 && clean.length <= 10) {
      dispatch({ type: 'SET_SYMBOL', payload: clean });
      setInput('');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Enter ticker... (AAPL)"
          maxLength={10}
          className="bg-bg-elevated border border-border text-text-primary placeholder-text-muted font-numbers text-sm px-3 py-2 rounded w-48 focus:outline-none focus:border-accent transition-colors"
        />
      </div>
      <button
        onClick={submit}
        className="bg-accent hover:bg-accent-dim text-bg-base font-semibold text-sm px-4 py-2 rounded transition-colors"
      >
        Search
      </button>
    </div>
  );
}
