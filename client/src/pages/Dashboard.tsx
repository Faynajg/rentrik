import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, downloadPdf, errorMessage } from "../api/client";
import { DashboardData } from "../types";
import { eur, monthLabel, num, pct } from "../lib/format";
import { KpiCard } from "../components/KpiCard";
import { AddPropertyModal } from "../components/AddPropertyModal";
import { OnboardingChecklist } from "../components/OnboardingChecklist";
import { PortfolioHealth } from "../components/PortfolioHealth";
import { useAuth } from "../context/AuthContext";
import { Alert, ProfitBadge, Spinner } from "../components/ui";
import {
  ExpensePie,
  OccupancyChart,
  PropertyComparisonChart,
  RevenueExpenseChart,
} from "../components/charts";

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

            {/* KPIs consolidados */}
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard label="Ingresos brutos" value={eur(t.grossRevenue)} accent="brand" />
              <KpiCard label="Gastos totales" value={eur(t.totalExpenses)} accent="negative" />
              <KpiCard
                label="Beneficio neto"
                value={eur(t.netProfit)}
                accent={t.netProfit >= 0 ? "positive" : "negative"}
                sub={`${t.propertiesCount} propiedades`}
              />
              <KpiCard label="Ocupación media" value={pct(t.occupancyRate)} accent="neutral" sub={`ADR ${eur(t.adr)}`} />
            </div>

            {/* Alertas */}
            <AlertsPanel properties={data.properties} month={month} />

            {/* Gráficos */}
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <RevenueExpenseChart data={data.evolution} />
              <OccupancyChart data={data.evolution} />
              <PropertyComparisonChart properties={data.properties} />
              <ExpensePie breakdown={data.expenseBreakdown} />
            </div>

            {/* Propiedades */}
            <div className="mt-8 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Propiedades</h2>
              <span className="text-sm text-slate-400">{num(t.reservationsCount)} reservas este mes</span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.properties.map((p) => (
                <Link
                  key={p.id}
                  to={`/propiedades/${p.id}?month=${month}`}
                  className="card card-hover p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-ink">{p.name}</h3>
                      {p.address && <p className="text-xs text-slate-400">{p.address}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ProfitBadge profit={p.kpis.netProfit} />
                      {p.kpis.occupancyRate < 50 && (
                        <span className="badge bg-gold-soft text-gold">
                          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                          Ocupación baja
                        </span>
                      )}
                    </div>
                  </div>

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
              ))}
            </div>
          </>
        )
      )}

      <AddPropertyModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={load} />
    </div>
  );
}

function AlertsPanel({ properties, month }: { properties: DashboardData["properties"]; month: string }) {
  const critical = properties.filter((p) => p.kpis.netProfit < 0 && p.kpis.totalExpenses > 0);
  const lowOcc = properties.filter((p) => p.kpis.occupancyRate < 50 && p.kpis.netProfit >= 0);
  if (critical.length === 0 && lowOcc.length === 0) return null;

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {critical.length > 0 && (
        <div className="rounded-2xl border border-negative/20 bg-negative-soft p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-negative text-sm font-bold text-white">!</span>
            <p className="text-sm font-semibold text-negative">{critical.length} propiedad{critical.length === 1 ? "" : "es"} sin rentabilidad</p>
          </div>
          <ul className="mt-2 space-y-1">
            {critical.map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <Link to={`/propiedades/${p.id}?month=${month}`} className="text-slate-600 hover:text-negative">{p.name}</Link>
                <span className="font-medium text-negative">{eur(p.kpis.netProfit)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {lowOcc.length > 0 && (
        <div className="rounded-2xl border border-gold/30 bg-gold-soft p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-sm font-bold text-white">!</span>
            <p className="text-sm font-semibold text-gold">{lowOcc.length} propiedad{lowOcc.length === 1 ? "" : "es"} con ocupación baja</p>
          </div>
          <ul className="mt-2 space-y-1">
            {lowOcc.map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <Link to={`/propiedades/${p.id}?month=${month}`} className="text-slate-600 hover:text-gold">{p.name}</Link>
                <span className="font-medium text-gold">{pct(p.kpis.occupancyRate)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
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
