import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, errorMessage } from "../api/client";
import { MonthlyPoint, PropertyWithKpis } from "../types";
import { eur, pct } from "../lib/format";
import { Alert, Spinner } from "../components/ui";

const MONTH_ABBR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const abbr = (m: string) => MONTH_ABBR[Number(m.split("-")[1]) - 1] ?? m;

export default function Estacionalidad() {
  const [series, setSeries] = useState<MonthlyPoint[]>([]);
  const [properties, setProperties] = useState<PropertyWithKpis[]>([]);
  const [propertyId, setPropertyId] = useState("all");
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<{ properties: PropertyWithKpis[] }>("/properties").then((r) => setProperties(r.data.properties)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<{ series: MonthlyPoint[] }>("/dashboard/seasonality", { params: { year, propertyId } });
      setSeries(res.data.series);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [year, propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = series.map((s) => ({ ...s, label: abbr(s.month) }));
  const totalGross = series.reduce((a, s) => a + s.grossRevenue, 0);
  const totalNet = series.reduce((a, s) => a + s.netProfit, 0);
  const avgOcc = series.length ? series.reduce((a, s) => a + s.occupancyRate, 0) / series.length : 0;
  const bestMonth = [...series].sort((a, b) => b.grossRevenue - a.grossRevenue)[0];

  const years = [year + 1, year, year - 1, year - 2].filter((y, i, arr) => arr.indexOf(y) === i);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Estacionalidad</h1>
          <p className="text-sm text-slate-500">Evolución anual de ingresos y ocupación mes a mes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input !w-auto !py-2" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="all">Todas las propiedades</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select className="input !w-auto !py-2" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="mt-4"><Alert kind="error">{error}</Alert></div>}

      {loading && series.length === 0 ? (
        <Spinner label="Cargando estacionalidad…" />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label={`Ingresos ${year}`} value={eur(totalGross)} />
            <Stat label={`Beneficio ${year}`} value={eur(totalNet)} accent={totalNet >= 0 ? "text-positive" : "text-negative"} />
            <Stat label="Ocupación media" value={pct(avgOcc)} />
            <Stat label="Mejor mes" value={bestMonth && bestMonth.grossRevenue > 0 ? abbr(bestMonth.month) : "—"} />
          </div>

          <div className="mt-6 card p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Ingresos, gastos y ocupación · {year}</h3>
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94A3B8" }} />
                <YAxis yAxisId="money" tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={(v) => `${v}`} />
                <YAxis yAxisId="occ" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }}
                  formatter={(value: number, name: string) =>
                    name === "Ocupación" ? [pct(value), name] : [eur(value), name]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="money" dataKey="grossRevenue" name="Ingresos" fill="#1E3A5F" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar yAxisId="money" dataKey="totalExpenses" name="Gastos" fill="#DC2626" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Line yAxisId="occ" type="monotone" dataKey="occupancyRate" name="Ocupación" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent = "text-ink" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card p-4">
      <p className="stat-label">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
