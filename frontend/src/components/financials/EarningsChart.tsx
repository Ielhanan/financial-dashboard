import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { EarningsHistoryResponse } from '../../types/financial';

interface Props { earnings: EarningsHistoryResponse }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const est  = payload.find((p: any) => p.dataKey === 'estimated');
  const act  = payload.find((p: any) => p.dataKey === 'actual');
  const beat = act?.payload?.beat;
  const surp = act?.payload?.surprise;
  const surpPct = act?.payload?.surprisePct;
  return (
    <div className="bg-bg-elevated border border-border-bright rounded px-3 py-2 text-sm shadow-lg min-w-[160px]">
      <div className="text-text-secondary mb-1">{label}</div>
      {est && (
        <div className="font-numbers text-text-secondary">
          Est: ${est.value?.toFixed(2) ?? '—'}
        </div>
      )}
      {act && (
        <div className={`font-numbers font-medium ${beat ? 'text-positive' : 'text-negative'}`}>
          Act: ${act.value?.toFixed(2) ?? '—'}
        </div>
      )}
      {surp != null && (
        <div className={`font-numbers text-xs mt-1 ${beat ? 'text-positive' : 'text-negative'}`}>
          {beat ? '+' : ''}{surp.toFixed(2)} ({beat ? '+' : ''}{surpPct?.toFixed(2)}%)
        </div>
      )}
    </div>
  );
};

export default function EarningsChart({ earnings }: Props) {
  const data = useMemo(() =>
    earnings.quarters.map((q, i) => ({
      quarter:     q,
      estimated:   earnings.estimated_eps[i],
      actual:      earnings.actual_eps[i],
      beat:        earnings.beat[i],
      surprise:    earnings.surprise[i],
      surprisePct: earnings.surprise_pct[i],
    })),
  [earnings]);

  return (
    <div className="bg-bg-surface border border-border rounded p-4">
      <div className="text-[11px] uppercase tracking-widest text-text-secondary font-medium mb-4">
        EPS Estimate vs Actual ($)
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2d40" vertical={false} />
          <XAxis dataKey="quarter" tick={{ fill: '#8899aa', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8899aa', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={45} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#8899aa' }} />
          <Bar dataKey="estimated" name="Estimated EPS" fill="#4a5568" radius={[3, 3, 0, 0]} />
          <Bar dataKey="actual" name="Actual EPS" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.beat ? '#22d15e' : '#f04e4e'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
