import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, downloadPdf, errorMessage } from "../api/client";
import { DashboardData } from "../types";
import { eur, monthLabel, num, pct } from "../lib/format";
import { KpiCard, Variation } from "../components/KpiCard";
import { AddPropertyModal } from "../components/AddPropertyModal";
import { OnboardingChecklist } from "../components/OnboardingChecklist";
import { PortfolioHealth } from "../components/PortfolioHealth";
import { PortfolioTriage, PortfolioInsights, PlatformBreakdown, OccupancyRanking } from "../components/PortfolioAnalytics";
import { BAND_BADGE, BAND_LABEL, marginBand, platformColor } from "../lib/health";
import { useAuth } from "../context/AuthContext";
import { Alert, Spinner } from "../components/ui";
import {
  ExpensePie,
  OccupancyChart,
  PropertyComparisonChart,
  RevenueExpenseChart,
} from "../components/charts";
import type { EvolutionPoint } from "../types";

const PLATFORMS = ["", "Airbnb", "Booking", "VRBO"];

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [month, setMonth] = useState<string>(currentMonth());
  const [platform, setPlatform] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<DashboardData>("/dashboard", { params: { month, platform: platform || undefined } });
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [month, platform]);

  useEffect(() => {
    load();
  }, [load]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>(data?.availableMonths ?? []);
    set.add(month);
    set.add(currentMonth());
    return Array.from(set).sort().reverse();
  }, [data, month]);

  async function downloadManager() {
    setDownloading(true);
    try {
      await downloadPdf(`/reports/manager.pdf?month=${month}`, `informe-gestora-${month}.pdf`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  const t = data?.totals;
  const hasProperties = (data?.properties.length ?? 0) > 0;
  const setup = data?.setup;
  const onboardingComplete = !!setup && setup.hasProperty && setup.hasReservations && setup.hasExpenses;

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-sm text-slate-500">Rentabilidad de {monthLabel(month)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input !w-auto !py-2" value={month} onChange={(e) => setMonth(e.target.value)}>
            {monthOptions.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <select className="input !w-auto !py-2" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p || "Todas las OTAs"}</option>
            ))}
          </select>
          {hasProperties && (
            <button onClick={downloadManager} disabled={downloading} className="btn-ghost">
              {downloading ? "Generando…" : "PDF gestora"}
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            + Propiedad
          </button>
        </div>
      </div>

      {error && <div className="mt-4"><Alert kind="error">{error}</Alert></div>}

      {/* Onboarding guiado para usuarios nuevos */}
      {!loading && setup && !onboardingComplete && (
        <div className="mt-6">
          <OnboardingChecklist
            setup={setup}
            userName={user?.name?.split(" ")[0] ?? ""}
            onCreateProperty={() => setShowAdd(true)}
          />
        </div>
      )}

      {loading && !data ? (
        <Spinner label="Cargando dashboard…" />
      ) : !hasProperties ? null : (
        t && (
          <>
            {/* Salud del portfolio (semáforo) */}
            <PortfolioHealth properties={data.properties} />

            {/* Necesita atención vs mejores propiedades (feature 1) */}
            <PortfolioTriage properties={data.properties} month={month} />

            {/* KPIs consolidados con variación vs mes anterior (feature 5) */}
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard label="Ingresos brutos" value={eur(t.grossRevenue)} accent="brand"
                variation={variationFor(data.evolution, month, "grossRevenue", true)} />
              <KpiCard label="Gastos totales" value={eur(t.totalExpenses)} accent="negative"
                variation={variationFor(data.evolution, month, "totalExpenses", false)} />
              <KpiCard label="Beneficio neto" value={eur(t.netProfit)}
                accent={t.netProfit >= 0 ? "positive" : "negative"}
                variation={variationFor(data.evolution, month, "netProfit", true)} />
              <KpiCard label="Ocupación media" value={pct(t.occupancyRate)} accent="neutral"
                variation={variationFor(data.evolution, month, "occupancyRate", true)} />
            </div>

            {/* Análisis automático (feature 13) */}
            <PortfolioInsights properties={data.properties} />

            {/* Gráficos */}
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <RevenueExpenseChart data={data.evolution} />
              <OccupancyChart data={data.evolution} />
              <PropertyComparisonChart properties={data.properties} />
              <PlatformBreakdown properties={data.properties} />
              <OccupancyRanking properties={data.properties} month={month} />
              <ExpensePie breakdown={data.expenseBreakdown} />
            </div>

            {/* Propiedades */}
            <div className="mt-8 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Propiedades</h2>
              <span className="text-sm text-slate-400">{num(t.reservationsCount)} reservas este mes</span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.properties.map((p) => {
                const band = marginBand(p.kpis.profitMargin);
                const platforms = p.kpis.revenueByPlatform.slice(0, 3);
                return (
                <Link
                  key={p.id}
                  to={`/propiedades/${p.id}?month=${month}`}
                  className="card card-hover p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-ink">{p.name}</h3>
                      {p.address && <p className="truncate text-xs text-slate-400">{p.address}</p>}
                      {platforms.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {platforms.map((pr) => (
                            <span key={pr.platform} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-2xs font-medium text-slate-500">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: platformColor(pr.platform) }} />
                              {pr.platform}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-2xs font-bold ${BAND_BADGE[band]}`}>
                      {BAND_LABEL[band]} · {pct(p.kpis.profitMargin)}
                    </span>
                  </div>

                  {band === "red" && p.kpis.grossRevenue > 0 && (
                    <div className="mt-3 rounded-lg border border-negative/20 bg-negative-soft px-3 py-2 text-2xs leading-snug text-negative">
                      ⚠️ Esta propiedad lleva 30 días con margen bajo. Revisa tus gastos o ajusta el precio mínimo por noche.
                    </div>
                  )}

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Beneficio neto</p>
                      <p className={`text-2xl font-bold ${p.kpis.netProfit >= 0 ? "text-positive" : "text-negative"}`}>
                        {eur(p.kpis.netProfit)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>Ingresos {eur(p.kpis.grossRevenue)}</p>
                      <p>Gastos {eur(p.kpis.totalExpenses)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                    <Metric label="Ocupación" value={pct(p.kpis.occupancyRate)} />
                    <Metric label="ADR" value={eur(p.kpis.adr, 0)} />
                    <Metric label="RevPAR" value={eur(p.kpis.revpar, 0)} />
                  </div>
                </Link>
                );
              })}
            </div>
          </>
        )
      )}

      <AddPropertyModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={load} />
    </div>
  );
}

/** Mes anterior a "YYYY-MM". */
function prevMonthStr(m: string): string {
  const [y, mm] = m.split("-").map(Number);
  const d = new Date(y, mm - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Variación de un KPI vs el mes anterior (feature 5). */
function variationFor(
  evolution: EvolutionPoint[],
  month: string,
  key: keyof Pick<EvolutionPoint, "grossRevenue" | "totalExpenses" | "netProfit" | "occupancyRate">,
  goodWhenUp: boolean
): Variation | null {
  const curr = evolution.find((e) => e.month === month);
  const prev = evolution.find((e) => e.month === prevMonthStr(month));
  if (!curr || !prev || !prev[key]) return null;
  const delta = Math.round(((curr[key] - prev[key]) / Math.abs(prev[key])) * 100);
  if (!isFinite(delta)) return null;
  return { deltaPct: delta, good: goodWhenUp ? delta >= 0 : delta <= 0 };
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
