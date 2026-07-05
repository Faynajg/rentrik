import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EvolutionPoint, PropertyWithKpis } from "../types";
import { eur, monthShort, pct } from "../lib/format";

const COLORS = {
  brand: "#1E3A5F",
  green: "#16A34A",
  red: "#DC2626",
  blue: "#2C5282",
  amber: "#C79A3C",
  slate: "#94A3B8",
};

const CATEGORY_COLORS = [COLORS.brand, COLORS.blue, COLORS.amber, COLORS.slate];

function ChartCard({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 },
};

/** Evolución mensual: ingresos vs gastos (área). */
export function RevenueExpenseChart({ data }: { data: EvolutionPoint[] }) {
  return (
    <ChartCard title="Evolución de ingresos vs. gastos" hint="Mensual">
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.green} stopOpacity={0.3} />
              <stop offset="100%" stopColor={COLORS.green} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.red} stopOpacity={0.25} />
              <stop offset="100%" stopColor={COLORS.red} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tickFormatter={monthShort} tick={{ fontSize: 11, fill: COLORS.slate }} />
          <YAxis tick={{ fontSize: 11, fill: COLORS.slate }} width={60} tickFormatter={(v) => `${v}€`} />
          <Tooltip
            {...tooltipStyle}
            formatter={(v: number, name) => [eur(v), name === "grossRevenue" ? "Ingresos" : "Gastos"]}
            labelFormatter={monthShort}
          />
          <Area type="monotone" dataKey="grossRevenue" stroke={COLORS.green} strokeWidth={2} fill="url(#gRev)" />
          <Area type="monotone" dataKey="totalExpenses" stroke={COLORS.red} strokeWidth={2} fill="url(#gExp)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Ocupación por mes (barras). */
export function OccupancyChart({ data }: { data: EvolutionPoint[] }) {
  return (
    <ChartCard title="Ocupación por mes" hint="Estacionalidad">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <XAxis dataKey="month" tickFormatter={monthShort} tick={{ fontSize: 11, fill: COLORS.slate }} />
          <YAxis tick={{ fontSize: 11, fill: COLORS.slate }} width={40} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => [pct(v), "Ocupación"]} labelFormatter={monthShort} />
          <Bar dataKey="occupancyRate" fill={COLORS.brand} radius={[4, 4, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Desglose de gastos por categoría (tarta). */
export function ExpensePie({
  breakdown,
}: {
  breakdown: { fijo: number; variable: number; plataforma: number; gestion: number };
}) {
  const data = [
    { name: "Fijos", value: breakdown.fijo },
    { name: "Variables", value: breakdown.variable },
    { name: "Plataforma", value: breakdown.plataforma },
    { name: "Gestión", value: breakdown.gestion },
  ].filter((d) => d.value > 0);

  return (
    <ChartCard title="Desglose de gastos" hint="Por categoría">
      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">Sin gastos registrados este mes</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v: number) => eur(v)} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/** Comparativa de beneficio neto entre propiedades (barras horizontales). */
export function PropertyComparisonChart({ properties }: { properties: PropertyWithKpis[] }) {
  const data = properties
    .map((p) => ({ name: p.name, net: p.kpis.netProfit }))
    .sort((a, b) => b.net - a.net);

  return (
    <ChartCard title="Comparativa entre propiedades" hint="Beneficio neto">
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 46)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
          <XAxis type="number" tick={{ fontSize: 11, fill: COLORS.slate }} tickFormatter={(v) => `${v}€`} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: COLORS.brand }} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => [eur(v), "Beneficio neto"]} />
          <Bar dataKey="net" radius={[0, 4, 4, 0]} maxBarSize={26}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.net >= 0 ? COLORS.green : COLORS.red} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
