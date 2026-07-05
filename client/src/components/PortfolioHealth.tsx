import { PropertyWithKpis } from "../types";

/** Feature 11 — semáforo de salud del portfolio en la parte superior del dashboard. */
export function PortfolioHealth({ properties }: { properties: PropertyWithKpis[] }) {
  if (properties.length === 0) return null;

  const losses = properties.filter((p) => p.kpis.netProfit < 0 && p.kpis.totalExpenses > 0);
  const atRisk = properties.filter(
    (p) => p.kpis.netProfit >= 0 && (p.kpis.occupancyRate < 50 || p.kpis.profitMargin < 10)
  );
  const healthy = properties.length - losses.length - atRisk.length;

  const status: "red" | "yellow" | "green" = losses.length > 0 ? "red" : atRisk.length > 0 ? "yellow" : "green";

  const config = {
    green: {
      bg: "bg-positive-soft border-positive/25",
      dot: "bg-positive",
      title: "text-positive",
      label: "Todo en orden",
      msg: "Todas tus propiedades son rentables este mes.",
    },
    yellow: {
      bg: "bg-gold-soft border-gold/30",
      dot: "bg-gold",
      title: "text-gold",
      label: "Atención",
      msg: `${atRisk.length} propiedad${atRisk.length === 1 ? "" : "es"} en riesgo (ocupación u margen bajos).`,
    },
    red: {
      bg: "bg-negative-soft border-negative/25",
      dot: "bg-negative",
      title: "text-negative",
      label: "Pérdidas",
      msg: `${losses.length} propiedad${losses.length === 1 ? "" : "es"} está${losses.length === 1 ? "" : "n"} perdiendo dinero este mes.`,
    },
  }[status];

  return (
    <div className={`mt-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${config.bg}`}>
      <div className="flex items-center gap-3">
        <span className="relative flex h-10 w-10 items-center justify-center">
          <span className={`absolute h-10 w-10 rounded-full ${config.dot} opacity-20`} />
          <span className={`h-4 w-4 rounded-full ${config.dot}`} />
        </span>
        <div>
          <p className={`text-sm font-bold ${config.title}`}>Salud del portfolio · {config.label}</p>
          <p className="text-sm text-slate-600">{config.msg}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <Counter color="bg-positive" label="Rentables" value={healthy} />
        <Counter color="bg-gold" label="En riesgo" value={atRisk.length} />
        <Counter color="bg-negative" label="Pérdidas" value={losses.length} />
      </div>
    </div>
  );
}

function Counter({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="font-semibold text-ink">{value}</span>
      <span className="text-slate-400">{label}</span>
    </div>
  );
}
