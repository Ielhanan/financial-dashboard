import type { RatioItem } from '../../types/financial';
import { formatValue } from './FinancialsTable';

const RATIO_GROUPS = [
  {
    title: 'Valuation',
    keys: ['trailingPE', 'forwardPE', 'priceToSalesTrailing12Months', 'priceToBook', 'enterpriseToEbitda', 'enterpriseToRevenue'],
  },
  {
    title: 'Profitability',
    keys: ['grossMargins', 'operatingMargins', 'profitMargins', 'returnOnEquity', 'returnOnAssets'],
  },
  {
    title: 'Growth',
    keys: ['revenueGrowth', 'earningsGrowth'],
  },
  {
    title: 'Financial Health',
    keys: ['debtToEquity', 'currentRatio'],
  },
  {
    title: 'Market Data',
    keys: ['marketCap', 'enterpriseValue', 'beta', 'dividendYield', 'fiftyTwoWeekHigh', 'fiftyTwoWeekLow'],
  },
];

interface Props {
  ratios: RatioItem[];
}

export default function KeyRatios({ ratios }: Props) {
  const byKey = Object.fromEntries(ratios.map((r) => [r.key, r]));

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {RATIO_GROUPS.map((group) => {
        const items = group.keys.map((k) => byKey[k]).filter(Boolean);
        if (items.length === 0) return null;
        return (
          <div key={group.title} className="bg-bg-surface border border-border rounded p-4">
            <div className="text-[11px] uppercase tracking-widest text-accent font-medium mb-3">
              {group.title}
            </div>
            <div className="space-y-2">
              {items.map((item) => {
                const isNeg = item.value != null && item.value < 0;
                return (
                  <div key={item.key} className="flex justify-between items-center py-1 border-b border-border last:border-0">
                    <span className="text-text-secondary text-sm">{item.label}</span>
                    <span className={`font-numbers text-sm font-medium ${isNeg ? 'text-negative' : 'text-text-primary'}`}>
                      {formatValue(item.value, item.format)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
