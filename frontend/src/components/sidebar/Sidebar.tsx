import { useState, useRef } from 'react';
import { useDashboard } from '../../store/dashboardStore';
import { useLists } from '../../hooks/useLists';
import WatchList from './WatchList';

export default function Sidebar() {
  const { state } = useDashboard();
  const { createList } = useLists();
  const { lists } = state;

  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreateList = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setCreatingList(false);
      setNewListName('');
      return;
    }
    if (e.key !== 'Enter') return;
    const name = newListName.trim();
    if (!name) return;
    await createList(name);
    setNewListName('');
    setCreatingList(false);
  };

  const startCreating = () => {
    setCreatingList(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <aside className="w-52 flex-shrink-0 bg-bg-surface border-r border-border flex flex-col overflow-hidden">
      <div className="px-3 py-3 border-b border-border">
        <span className="text-text-muted text-xs uppercase tracking-wider font-semibold">
          Watchlists
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {lists.length === 0 && !creatingList && (
          <p className="text-text-muted text-xs px-3 py-4">No lists yet.</p>
        )}
        {lists.map(list => (
          <WatchList key={list.id} list={list} />
        ))}
      </div>

      <div className="border-t border-border p-2">
        {creatingList ? (
          <input
            ref={inputRef}
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            onKeyDown={handleCreateList}
            onBlur={() => { setCreatingList(false); setNewListName(''); }}
            placeholder="List name…"
            className="w-full bg-transparent text-text-secondary text-xs border-b border-accent focus:outline-none py-1"
          />
        ) : (
          <button
            onClick={startCreating}
            className="w-full text-left text-text-muted text-xs hover:text-text-secondary transition-colors py-1"
          >
            + New list
          </button>
        )}
      </div>
    </aside>
  );
}
