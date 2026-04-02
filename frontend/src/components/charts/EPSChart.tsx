import { useMemo } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import type { ChartsResponse } from '../../types/financial';

interface Props { charts: ChartsResponse }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-elevated border border-border-bright rounded px-3 py-2 text-sm shadow-lg">
      <div className="text-text-secondary mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="font-numbers font-medium" style={{ color: p.color }}>
          {p.name}: ${p.value?.toFixed(2)}
        </div>
      ))}
    </div>
  );
};

export default function EPSChart({ charts }: Props) {
  const data = useMemo(() =>
    charts.dates.map((date, i) => ({
      date,
      basic:   charts.basic_eps[i]   != null ? +charts.basic_eps[i]!.toFixed(2)   : null,
      diluted: charts.diluted_eps[i] != null ? +charts.diluted_eps[i]!.toFixed(2) : null,
    })).reverse(),
  [charts]);

  return (
    <div className="bg-bg-surface border border-border rounded p-4">
      <div className="text-[11px] uppercase tracking-widest text-text-secondary font-medium mb-4">EPS ($)</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2d40" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#8899aa', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8899aa', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={45} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#8899aa' }} />
          <Line type="monotone" dataKey="basic"   name="Basic EPS"   stroke="#f5a623" strokeWidth={2} dot={{ r: 3, fill: '#f5a623' }} connectNulls />
          <Line type="monotone" dataKey="diluted" name="Diluted EPS" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3, fill: '#a78bfa' }} strokeDasharray="4 2" connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
