import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, errorMessage } from "../api/client";
import { MonthlyPoint, PropertyWithKpis } from "../types";
import { eur, monthLabel, monthShort, pct } from "../lib/format";
import { Alert, EmptyState, Spinner } from "../components/ui";

export default function Historico() {
  const [series, setSeries] = useState<MonthlyPoint[]>([]);
  const [properties, setProperties] = useState<PropertyWithKpis[]>([]);
  const [propertyId, setPropertyId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<{ properties: PropertyWithKpis[] }>("/properties").then((r) => setProperties(r.data.properties)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<{ series: MonthlyPoint[] }>("/dashboard/history", { params: { propertyId } });
      setSeries(res.data.series);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = series.map((s) => ({ ...s, label: monthShort(s.month) }));

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Histórico</h1>
          <p className="text-sm text-slate-500">Evolución mes a mes de tu cartera o de una propiedad</p>
        </div>
        <select className="input !w-auto !py-2" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="all">Todas las propiedades</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {error && <div className="mt-4"><Alert kind="error">{error}</Alert></div>}

      {loading && series.length === 0 ? (
        <Spinner label="Cargando histórico…" />
      ) : series.length === 0 ? (
        <div className="mt-8"><EmptyState title="Sin histórico todavía" description="Cuando tengas datos de varios meses, verás aquí la evolución." /></div>
      ) : (
        <>
          <div className="mt-6 card p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Tendencia de ingresos y beneficio</h3>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="hist-rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E3A5F" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#1E3A5F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94A3B8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} width={56} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }}
                  formatter={(v: number, name: string) => [eur(v), name]}
                  labelFormatter={(l) => l}
                />
                <Area type="monotone" dataKey="grossRevenue" name="Ingresos" stroke="#1E3A5F" strokeWidth={2} fill="url(#hist-rev)" />
                <Line type="monotone" dataKey="netProfit" name="Beneficio neto" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3 text-left">Mes</th>
                    <th className="px-4 py-3 text-right">Ingresos</th>
                    <th className="px-4 py-3 text-right">Gastos</th>
                    <th className="px-4 py-3 text-right">Beneficio</th>
                    <th className="px-4 py-3 text-right">Ocupación</th>
                    <th className="px-4 py-3 text-right">Reservas</th>
                  </tr>
                </thead>
                <tbody>
                  {[...series].reverse().map((s) => (
                    <tr key={s.month} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium capitalize text-ink">{monthLabel(s.month)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{eur(s.grossRevenue)}</td>
                      <td className="px-4 py-3 text-right text-negative">{eur(s.totalExpenses)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${s.netProfit >= 0 ? "text-positive" : "text-negative"}`}>{eur(s.netProfit)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{pct(s.occupancyRate)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{s.reservationsCount ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
