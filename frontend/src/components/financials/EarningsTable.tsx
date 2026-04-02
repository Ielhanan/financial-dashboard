import type { EarningsHistoryResponse } from '../../types/financial';

interface Props { earnings: EarningsHistoryResponse }

function fmtEps(v: number | null): string {
  if (v == null) return '—';
  return `$${v.toFixed(2)}`;
}

function fmtSurprise(v: number | null): string {
  if (v == null) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}$${v.toFixed(2)}`;
}

function fmtSurprisePct(v: number | null): string {
  if (v == null) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

function fmtRevenue(v: number | null): string {
  if (v == null) return '—';
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (Math.abs(v) >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
}

export default function EarningsTable({ earnings }: Props) {
  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-bg-elevated">
            {['Quarter', 'Est. EPS', 'Actual EPS', 'Surprise $', 'Surprise %', 'Revenue'].map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-[11px] uppercase tracking-widest text-text-secondary font-medium border-b border-border whitespace-nowrap text-right first:text-left"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {earnings.quarters.map((q, i) => {
            const beat = earnings.beat[i];
            const actual = earnings.actual_eps[i];
            const estimated = earnings.estimated_eps[i];
            const surprise = earnings.surprise[i];
            const surprisePct = earnings.surprise_pct[i];
            const revenue = earnings.actual_revenue?.[i] ?? null;
            return (
              <tr
                key={q}
                className={`border-b border-border transition-colors hover:bg-bg-hover ${
                  i % 2 === 0 ? 'bg-bg-base' : 'bg-bg-surface'
                }`}
              >
                <td className="px-4 py-2 text-text-secondary whitespace-nowrap">{q}</td>
                <td className="px-4 py-2 text-right font-numbers text-text-secondary whitespace-nowrap">
                  {fmtEps(estimated)}
                </td>
                <td className={`px-4 py-2 text-right font-numbers font-medium whitespace-nowrap ${
                  beat === true ? 'text-positive' : beat === false ? 'text-negative' : 'text-text-secondary'
                }`}>
                  {fmtEps(actual)}
                </td>
                <td className={`px-4 py-2 text-right font-numbers whitespace-nowrap ${
                  beat === true ? 'text-positive' : beat === false ? 'text-negative' : 'text-text-secondary'
                }`}>
                  {fmtSurprise(surprise)}
                </td>
                <td className={`px-4 py-2 text-right font-numbers whitespace-nowrap ${
                  beat === true ? 'text-positive' : beat === false ? 'text-negative' : 'text-text-secondary'
                }`}>
                  {fmtSurprisePct(surprisePct)}
                </td>
                <td className="px-4 py-2 text-right font-numbers text-text-secondary whitespace-nowrap">
                  {fmtRevenue(revenue)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
