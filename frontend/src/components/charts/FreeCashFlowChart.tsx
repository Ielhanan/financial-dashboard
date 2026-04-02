import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import type { ChartsResponse } from '../../types/financial';

interface Props { charts: ChartsResponse }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val: number = payload[0].value;
  const isNeg = val < 0;
  return (
    <div className="bg-bg-elevated border border-border-bright rounded px-3 py-2 text-sm shadow-lg">
      <div className="text-text-secondary mb-1">{label}</div>
      <div className={`font-numbers font-medium ${isNeg ? 'text-negative' : 'text-chart-2'}`}>
        {isNeg ? '-' : ''}${Math.abs(val).toFixed(2)}B
      </div>
    </div>
  );
};

export default function FreeCashFlowChart({ charts }: Props) {
  const data = useMemo(() =>
    charts.dates.map((date, i) => ({
      date,
      value: charts.free_cash_flow[i] != null ? +(charts.free_cash_flow[i]! / 1e9).toFixed(2) : null,
    })).reverse(),
  [charts]);

  return (
    <div className="bg-bg-surface border border-border rounded p-4">
      <div className="text-[11px] uppercase tracking-widest text-text-secondary font-medium mb-4">Free Cash Flow (B)</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2d40" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#8899aa', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8899aa', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}B`} width={55} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(34,209,94,0.06)' }} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={(entry.value ?? 0) >= 0 ? '#22d15e' : '#f04e4e'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
