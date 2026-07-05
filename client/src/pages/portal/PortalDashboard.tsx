import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { downloadOwnerPdf, errorMessage, portalApi } from "../../api/client";
import { PropertyWithKpis } from "../../types";
import { eur, monthLabel, pct } from "../../lib/format";
import { PortalShell } from "../../components/PortalShell";
import { KpiCard } from "../../components/KpiCard";
import { Alert, EmptyState, ProfitBadge, Spinner } from "../../components/ui";

interface PortalDash {
  month: string;
  availableMonths: string[];
  properties: PropertyWithKpis[];
  totals: { grossRevenue: number; totalExpenses: number; netProfit: number };
}

export default function PortalDashboard() {
  const [data, setData] = useState<PortalDash | null>(null);
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await portalApi.get<PortalDash>("/portal/dashboard", { params: { month } });
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>(data?.availableMonths ?? []);
    set.add(month);
    set.add(currentMonth());
    return Array.from(set).sort().reverse();
  }, [data, month]);

  async function download(id: string) {
    setDownloading(id);
    try {
      await downloadOwnerPdf(`/portal/reports/property/${id}/owner.pdf?month=${month}`, `informe-${month}.pdf`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDownloading(null);
    }
  }

  const t = data?.totals;

  return (
    <PortalShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Tus propiedades</h1>
          <p className="text-sm text-slate-500">Rentabilidad de {monthLabel(month)}</p>
        </div>
        <select className="input !w-auto !py-2" value={month} onChange={(e) => setMonth(e.target.value)}>
          {monthOptions.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
      </div>

      {error && <div className="mt-4"><Alert kind="error">{error}</Alert></div>}

      {loading && !data ? (
        <Spinner label="Cargando…" />
      ) : !data || data.properties.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Sin propiedades asignadas" description="Todavía no tienes propiedades asociadas a tu cuenta." />
        </div>
      ) : (
        <>
          {t && (
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
              <KpiCard label="Ingresos del mes" value={eur(t.grossRevenue)} accent="brand" />
              <KpiCard label="Gastos del mes" value={eur(t.totalExpenses)} accent="negative" />
              <KpiCard label="Beneficio neto" value={eur(t.netProfit)} accent={t.netProfit >= 0 ? "positive" : "negative"} />
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.properties.map((p) => (
              <div key={p.id} className="card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-ink">{p.name}</h3>
                    {p.address && <p className="text-xs text-slate-400">{p.address}</p>}
                  </div>
                  <ProfitBadge profit={p.kpis.netProfit} />
                </div>
                <div className="mt-4">
                  <p className="text-xs text-slate-400">Beneficio neto</p>
                  <p className={`text-2xl font-bold ${p.kpis.netProfit >= 0 ? "text-positive" : "text-negative"}`}>{eur(p.kpis.netProfit)}</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center text-xs">
                  <div><p className="text-slate-400">Ingresos</p><p className="font-semibold text-slate-700">{eur(p.kpis.grossRevenue, 0)}</p></div>
                  <div><p className="text-slate-400">Ocupación</p><p className="font-semibold text-slate-700">{pct(p.kpis.occupancyRate)}</p></div>
                  <div><p className="text-slate-400">ADR</p><p className="font-semibold text-slate-700">{eur(p.kpis.adr, 0)}</p></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link to={`/portal/propiedades/${p.id}?month=${month}`} className="btn-ghost btn-sm flex-1 justify-center">Ver detalle</Link>
                  <button onClick={() => download(p.id)} disabled={downloading === p.id} className="btn-primary btn-sm flex-1 justify-center">
                    {downloading === p.id ? "…" : "Informe PDF"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </PortalShell>
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
