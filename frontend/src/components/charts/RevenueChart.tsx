import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import type { ChartsResponse } from '../../types/financial';

interface Props { charts: ChartsResponse }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val: number = payload[0].value;
  return (
    <div className="bg-bg-elevated border border-border-bright rounded px-3 py-2 text-sm shadow-lg">
      <div className="text-text-secondary mb-1">{label}</div>
      <div className="font-numbers text-text-primary font-medium">${val.toFixed(2)}B</div>
    </div>
  );
};

export default function RevenueChart({ charts }: Props) {
  const data = useMemo(() =>
    charts.dates.map((date, i) => ({
      date,
      value: charts.revenue[i] != null ? +(charts.revenue[i]! / 1e9).toFixed(2) : null,
    })).reverse(),
  [charts]);

  return (
    <div className="bg-bg-surface border border-border rounded p-4">
      <div className="text-[11px] uppercase tracking-widest text-text-secondary font-medium mb-4">Revenue (B)</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2d40" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#8899aa', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8899aa', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}B`} width={55} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(74,158,255,0.08)' }} />
          <Bar dataKey="value" fill="#4a9eff" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
