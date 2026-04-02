import { useState, useRef } from 'react';
import { api } from '../../api/client';
import { useLists } from '../../hooks/useLists';

interface Props {
  listId: string;
}

export default function AddStockInput({ listId }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addStock } = useLists();

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const symbol = value.trim().toUpperCase();
    if (!symbol) return;

    setLoading(true);
    setError(null);

    try {
      // Validate ticker exists
      await api.getInfo(symbol);
    } catch {
      setError('Ticker not found');
      setLoading(false);
      return;
    }

    try {
      await addStock(listId, symbol);
      setValue('');
      inputRef.current?.blur();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      setError(msg === 'Already in this list' ? 'Already in this list' : 'Failed to add');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-2 pb-1">
      <input
        ref={inputRef}
        value={value}
        onChange={e => { setValue(e.target.value); setError(null); }}
        onKeyDown={handleKeyDown}
        placeholder={loading ? 'Adding…' : '+ Add ticker'}
        disabled={loading}
        className="w-full bg-transparent text-text-secondary text-xs placeholder-text-muted border-b border-border focus:outline-none focus:border-accent py-1 uppercase"
      />
      {error && <p className="text-negative text-xs mt-0.5">{error}</p>}
    </div>
  );
}
