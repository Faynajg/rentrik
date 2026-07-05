import { ReactNode } from "react";

type Accent = "brand" | "positive" | "negative" | "neutral";

const ACCENTS: Record<Accent, { text: string; bar: string; iconBg: string }> = {
  brand: { text: "text-brand", bar: "bg-brand", iconBg: "bg-brand/8 text-brand" },
  positive: { text: "text-positive", bar: "bg-positive", iconBg: "bg-positive-soft text-positive" },
  negative: { text: "text-negative", bar: "bg-negative", iconBg: "bg-negative-soft text-negative" },
  neutral: { text: "text-ink", bar: "bg-slate-300", iconBg: "bg-slate-100 text-slate-500" },
};

export function KpiCard({
  label,
  value,
  sub,
  accent = "neutral",
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: Accent;
  icon?: ReactNode;
  highlight?: boolean;
}) {
  const a = ACCENTS[accent];
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-card transition-all duration-200 hover:shadow-soft ${
        highlight ? "border-brand/20 ring-1 ring-brand/10" : "border-slate-100"
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${a.bar} opacity-70`} />
      <div className="flex items-center justify-between">
        <p className="stat-label">{label}</p>
        {icon && <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${a.iconBg}`}>{icon}</span>}
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${a.text}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
