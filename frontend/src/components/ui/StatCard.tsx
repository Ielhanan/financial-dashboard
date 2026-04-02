interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  negative?: boolean;
}

export default function StatCard({ label, value, sub, positive, negative }: StatCardProps) {
  const valueColor = positive
    ? 'text-positive'
    : negative
    ? 'text-negative'
    : 'text-text-primary';

  return (
    <div className="bg-bg-surface border border-border rounded px-4 py-3 min-w-[140px]">
      <div className="text-[11px] uppercase tracking-widest text-text-secondary font-medium mb-1">
        {label}
      </div>
      <div className={`font-numbers text-lg font-semibold ${valueColor}`}>{value}</div>
      {sub && <div className="text-[11px] text-text-muted mt-0.5 font-numbers">{sub}</div>}
    </div>
  );
}
