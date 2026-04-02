import { useDashboard } from '../../store/dashboardStore';
import type { Tab } from '../../types/financial';

const TABS: { id: Tab; label: string }[] = [
  { id: 'income',   label: 'Income Statement' },
  { id: 'balance',  label: 'Balance Sheet' },
  { id: 'cashflow', label: 'Cash Flow' },
  { id: 'ratios',   label: 'Key Ratios' },
  { id: 'earnings', label: 'Earnings' },
];

export default function TabBar() {
  const { state, dispatch } = useDashboard();

  return (
    <div className="flex border-b border-border">
      {TABS.map((tab) => {
        const active = state.activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => dispatch({ type: 'SET_TAB', payload: tab.id })}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-bright'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
