import type { FinancialRow } from '../../types/financial';

// Bold header rows — key metrics that deserve visual emphasis
const HEADER_ROWS = new Set([
  'Total Revenue', 'Gross Profit', 'Operating Income (EBIT)', 'EBITDA',
  'Net Income', 'Total Current Assets', 'Total Assets', 'Total Current Liabilities',
  'Total Liabilities', "Shareholders' Equity", 'Total Equity',
  'Operating Cash Flow', 'Free Cash Flow',
]);

function formatValue(value: number | null | undefined, format: string): string {
  if (value == null) return '—';
  switch (format) {
    case 'currency': {
      const abs = Math.abs(value);
      const sign = value < 0 ? '-' : '';
      if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
      if (abs >= 1e9)  return `${sign}$${(abs / 1e9).toFixed(2)}B`;
      if (abs >= 1e6)  return `${sign}$${(abs / 1e6).toFixed(1)}M`;
      return `${sign}$${value.toLocaleString()}`;
    }
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    case 'ratio':
      return value.toFixed(2);
    default:
      return value.toLocaleString();
  }
}

interface Props {
  dates: string[];
  rows: FinancialRow[];
}

export default function FinancialsTable({ dates, rows }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-bg-elevated">
            <th className="sticky left-0 z-10 bg-bg-elevated text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-text-secondary font-medium border-b border-border w-56 min-w-[180px]">
              Metric
            </th>
            {dates.map((d) => (
              <th key={d} className="text-right px-4 py-2.5 text-[11px] uppercase tracking-widest text-text-secondary font-medium border-b border-border whitespace-nowrap">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isHeader = HEADER_ROWS.has(row.label);
            return (
              <tr
                key={row.key}
                className={`border-b border-border transition-colors hover:bg-bg-hover ${
                  i % 2 === 0 ? 'bg-bg-base' : 'bg-bg-surface'
                }`}
              >
                <td
                  className={`sticky left-0 z-10 px-4 py-2 text-sm whitespace-nowrap border-r border-border ${
                    i % 2 === 0 ? 'bg-bg-base' : 'bg-bg-surface'
                  } ${isHeader ? 'border-l-2 border-l-accent font-semibold text-text-primary' : 'text-text-secondary'}`}
                >
                  {row.label}
                </td>
                {row.values.map((v, j) => {
                  const isNeg = v != null && v < 0;
                  return (
                    <td
                      key={j}
                      className={`text-right px-4 py-2 font-numbers text-sm whitespace-nowrap ${
                        isNeg ? 'text-negative' : isHeader ? 'text-text-primary' : 'text-text-secondary'
                      }`}
                    >
                      {formatValue(v, row.format)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { formatValue };
