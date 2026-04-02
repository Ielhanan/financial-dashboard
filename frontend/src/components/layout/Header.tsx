import TickerSearch from '../search/TickerSearch';

export default function Header() {
  return (
    <header className="bg-bg-surface border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="text-text-primary font-semibold text-sm tracking-wider uppercase">
          Financial Dashboard
        </span>
      </div>
      <TickerSearch />
    </header>
  );
}
