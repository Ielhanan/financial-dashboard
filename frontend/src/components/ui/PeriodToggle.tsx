import { useDashboard } from '../../store/dashboardStore';
import type { Period } from '../../types/financial';

export default function PeriodToggle() {
  const { state, dispatch } = useDashboard();

  const set = (p: Period) => dispatch({ type: 'SET_PERIOD', payload: p });

  return (
    <div className="flex bg-bg-elevated rounded border border-border text-sm">
      {(['annual', 'quarterly'] as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => set(p)}
          className={`px-4 py-1.5 rounded transition-colors capitalize ${
            state.period === p
              ? 'bg-accent text-bg-base font-semibold'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
