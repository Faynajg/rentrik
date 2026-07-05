import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { downloadOwnerPdf, errorMessage, portalApi } from "../../api/client";
import { Incident, Kpis } from "../../types";
import { eur, formatDate, monthLabel, pct } from "../../lib/format";
import { PortalShell } from "../../components/PortalShell";
import { KpiCard } from "../../components/KpiCard";
import { RevenueExpenseChart } from "../../components/charts";
import { Alert, ProfitBadge, Spinner } from "../../components/ui";

interface PortalDetail {
  property: { id: string; name: string; address: string | null };
  month: string;
  kpis: Kpis;
  incidents: Incident[];
  history: Kpis[];
}

const INCIDENT_LABELS: Record<string, string> = {
  reparacion: "Reparación",
  queja: "Queja de huésped",
  problema: "Problema",
  otro: "Otro",
};

export default function PortalPropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const month = params.get("month") ?? currentMonth();
  const [data, setData] = useState<PortalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await portalApi.get<PortalDetail>(`/portal/properties/${id}`, { params: { month } });
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, month]);

  useEffect(() => {
    load();
  }, [load]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>(data?.history.map((h) => h.month) ?? []);
    set.add(month);
    set.add(currentMonth());
    return Array.from(set).sort().reverse();
  }, [data, month]);

  async function download() {
    if (!id) return;
    setDownloading(true);
    try {
      await downloadOwnerPdf(`/portal/reports/property/${id}/owner.pdf?month=${month}`, `informe-${month}.pdf`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  if (loading && !data) return <PortalShell><Spinner label="Cargando…" /></PortalShell>;
  if (!data) return <PortalShell><Alert kind="error">{error || "No se pudo cargar."}</Alert></PortalShell>;

  const { property, kpis } = data;
  const evolution = data.history.map((h) => ({
    month: h.month,
    grossRevenue: h.grossRevenue,
    totalExpenses: h.totalExpenses,
    netProfit: h.netProfit,
    occupancyRate: h.occupancyRate,
  }));

  return (
    <PortalShell>
      <Link to="/portal" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Volver
      </Link>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink">{property.name}</h1>
            <ProfitBadge profit={kpis.netProfit} />
          </div>
          {property.address && <p className="text-sm text-slate-500">{property.address}</p>}
        </div>
        <div className="flex items-center gap-2">
          <select className="input !w-auto !py-2" value={month} onChange={(e) => { params.set("month", e.target.value); setParams(params); }}>
            {monthOptions.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <button onClick={download} disabled={downloading} className="btn-primary">
            {downloading ? "Generando…" : "Descargar informe"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Beneficio neto" value={eur(kpis.netProfit)} accent={kpis.netProfit >= 0 ? "positive" : "negative"} sub={`Margen ${pct(kpis.profitMargin)}`} />
        <KpiCard label="Ingresos brutos" value={eur(kpis.grossRevenue)} accent="brand" />
        <KpiCard label="Gastos totales" value={eur(kpis.totalExpenses)} accent="negative" />
        <KpiCard label="Ocupación" value={pct(kpis.occupancyRate)} sub={`${kpis.occupiedNights}/${kpis.availableNights} noches`} />
      </div>

      <div className="mt-6">
        <RevenueExpenseChart data={evolution} />
      </div>

      {data.incidents.length > 0 && (
        <div className="mt-6 card p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Incidencias y gastos extraordinarios</h3>
          <div className="space-y-2">
            {data.incidents.map((inc) => (
              <div key={inc.id} className="flex items-center justify-between border-b border-slate-50 py-2 text-sm last:border-0">
                <div>
                  <span className="font-medium text-slate-700">{INCIDENT_LABELS[inc.type] ?? inc.type}</span>
                  <span className="text-slate-500"> · {inc.description}</span>
                  <span className="text-xs text-slate-400"> ({formatDate(inc.date)})</span>
                </div>
                <span className="font-semibold text-negative">{eur(inc.cost)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PortalShell>
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
