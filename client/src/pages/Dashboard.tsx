import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, downloadPdf, errorMessage } from "../api/client";
import { DashboardData, Property } from "../types";
import { eur, monthLabel, num, pct } from "../lib/format";
import { KpiCard, Variation } from "../components/KpiCard";
import { AddPropertyModal } from "../components/AddPropertyModal";
import { EditPropertyModal } from "../components/EditPropertyModal";
import { PropertyCardMenu } from "../components/PropertyCardMenu";
import { OnboardingChecklist } from "../components/OnboardingChecklist";
import { OnboardingGuide } from "../components/OnboardingGuide";
import { PortfolioHealth } from "../components/PortfolioHealth";
import { PortfolioTriage, PortfolioInsights, PlatformBreakdown, OccupancyRanking } from "../components/PortfolioAnalytics";
import { BAND_BADGE, BAND_LABEL, marginBand, platformColor } from "../lib/health";
import { useAuth } from "../context/AuthContext";
import { Alert, Modal, Spinner } from "../components/ui";
import {
  ExpensePie,
  OccupancyChart,
  PropertyComparisonChart,
  RevenueExpenseChart,
} from "../components/charts";
import type { EvolutionPoint } from "../types";

const PLATFORMS = ["", "Airbnb", "Booking", "VRBO"];

type SortKey = "net" | "margin" | "occ" | "name";

export default function Dashboard() {
  const { user, refreshUser, setUser } = useAuth();
  const [guideOpen, setGuideOpen] = useState(false);
  const guideAutoOpened = useRef(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [month, setMonth] = useState<string>(currentMonth());
  const [platform, setPlatform] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("net");
  const [demoLoading, setDemoLoading] = useState(false);
  // Acciones del menú (⋯) de cada tarjeta de propiedad.
  const [editing, setEditing] = useState<Property | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  /**
   * Las tarjetas traen `PropertyWithKpis` (sin divisa ni notas), así que se pide
   * la propiedad completa antes de abrir el editor: si no, el PATCH del modal
   * mandaría la divisa por defecto y se la cambiaría al usuario.
   */
  async function startEdit(id: string) {
    setActionError("");
    setActionBusy(true);
    try {
      const res = await api.get<{ property: Property }>(`/properties/${id}`);
      setEditing(res.data.property);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setActionError("");
    setActionBusy(true);
    try {
      await api.delete(`/properties/${deleting.id}`);
      setDeleting(null);
      await load();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  // Guía de bienvenida: se abre sola la primera vez que carga un usuario que
  // aún no la ha completado. El botón "Guía de inicio" del encabezado permite
  // reabrirla siempre. Solo se marca vista al COMPLETARLA (paso 4 / demo);
  // saltarla la cierra pero deja el botón para volver.
  useEffect(() => {
    if (user && !user.hasSeenOnboarding && !guideAutoOpened.current) {
      guideAutoOpened.current = true;
      setGuideOpen(true);
    }
  }, [user]);

  /** Marca la guía como completada en la BD y en el estado local, y la cierra. */
  async function completeGuide() {
    setGuideOpen(false);
    if (!user || user.hasSeenOnboarding) return;
    setUser({ ...user, hasSeenOnboarding: true });
    try {
      await api.patch("/auth/me", { hasSeenOnboarding: true });
    } catch {
      // Si el PATCH falla, la guía ya está cerrada; el peor caso es que se
      // vuelva a abrir sola en la siguiente visita. No bloquea al usuario.
    }
  }

  async function loadDemo() {
    setDemoLoading(true);
    setError("");
    try {
      await api.post("/demo/load");
      await refreshUser?.();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDemoLoading(false);
    }
  }

  async function exitDemo() {
    setDemoLoading(true);
    setError("");
    try {
      await api.post("/demo/exit");
      await refreshUser?.();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDemoLoading(false);
    }
  }

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

  // Buscador + ordenación de la lista de propiedades (feature 11).
  const displayedProperties = useMemo(() => {
    const list = (data?.properties ?? []).filter((p) =>
      p.name.toLowerCase().includes(search.trim().toLowerCase())
    );
    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "margin") return b.kpis.profitMargin - a.kpis.profitMargin;
      if (sortBy === "occ") return b.kpis.occupancyRate - a.kpis.occupancyRate;
      return b.kpis.netProfit - a.kpis.netProfit;
    });
  }, [data, search, sortBy]);

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
          <button onClick={() => setGuideOpen(true)} className="btn-ghost" title="Volver a la guía de inicio">
            📋 Guía de inicio
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            + Propiedad
          </button>
        </div>
      </div>

      {error && <div className="mt-4"><Alert kind="error">{error}</Alert></div>}
      {/* Errores del menú (⋯); dentro del modal de borrado ya se muestra allí. */}
      {actionError && !deleting && <div className="mt-4"><Alert kind="error">{actionError}</Alert></div>}

      {/* Banner de modo demo */}
      {user?.demoMode && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-brand/20 bg-brand/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            <strong className="text-brand">Estás viendo datos de ejemplo.</strong> Explora Rentrik con 3 propiedades ficticias.
          </p>
          <button onClick={exitDemo} disabled={demoLoading} className="btn-ghost btn-sm shrink-0">
            {demoLoading ? "Saliendo…" : "Salir del modo demo"}
          </button>
        </div>
      )}

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
      ) : !hasProperties ? (
        <DemoPrompt onUpload={() => setShowAdd(true)} onDemo={loadDemo} loading={demoLoading} />
      ) : (
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

            {data.converted && (
              <p className="mt-2 text-xs text-slate-400">
                Los importes se han convertido a {data.baseCurrency ?? "EUR"} (aprox.) para la vista consolidada.
              </p>
            )}

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
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-ink">
                Propiedades <span className="text-sm font-normal text-slate-400">· {num(t.reservationsCount)} reservas</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="input !w-auto !py-2"
                  placeholder="Buscar propiedad…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select className="input !w-auto !py-2" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
                  <option value="net">Ordenar: Ingresos netos</option>
                  <option value="margin">Ordenar: Margen</option>
                  <option value="occ">Ordenar: Ocupación</option>
                  <option value="name">Ordenar: Nombre</option>
                </select>
              </div>
            </div>
            {displayedProperties.length === 0 ? (
              <p className="mt-4 rounded-xl border border-slate-100 bg-white py-8 text-center text-sm text-slate-400">
                Ninguna propiedad coincide con "{search}".
              </p>
            ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayedProperties.map((p) => {
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
                    <div className="flex shrink-0 items-center gap-1">
                      <span className={`rounded-full px-2 py-1 text-2xs font-bold ${BAND_BADGE[band]}`}>
                        {BAND_LABEL[band]} · {pct(p.kpis.profitMargin)}
                      </span>
                      <PropertyCardMenu
                        onEdit={() => startEdit(p.id)}
                        onDelete={() => setDeleting({ id: p.id, name: p.name })}
                      />
                    </div>
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
            )}
          </>
        )
      )}

      {guideOpen && (
        <OnboardingGuide
          onCreateProperty={() => {
            // Paso 1: no marca vista (solo se marca al completar); cierra y abre crear.
            setGuideOpen(false);
            setShowAdd(true);
          }}
          onLoadDemo={() => {
            void completeGuide();
            void loadDemo();
          }}
          onComplete={() => void completeGuide()}
          onSkip={() => setGuideOpen(false)}
        />
      )}

      <AddPropertyModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={load} />

      {/* Editar: se monta solo con la propiedad ya cargada (el modal inicializa
          su estado desde las props, así que necesita datos frescos y su key). */}
      {editing && (
        <EditPropertyModal
          key={editing.id}
          open
          property={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}

      <Modal
        open={!!deleting}
        onClose={() => {
          if (!actionBusy) {
            setDeleting(null);
            setActionError("");
          }
        }}
        title="Eliminar propiedad"
      >
        <p className="text-sm leading-relaxed text-slate-600">
          ¿Estás seguro de que quieres eliminar esta propiedad? Esta acción no se puede deshacer.
        </p>
        {deleting && <p className="mt-2 text-sm font-semibold text-ink">{deleting.name}</p>}
        {actionError && (
          <div className="mt-4">
            <Alert kind="error">{actionError}</Alert>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setDeleting(null);
              setActionError("");
            }}
            disabled={actionBusy}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={actionBusy}
            className="btn bg-negative text-white hover:opacity-90 disabled:opacity-60"
          >
            {actionBusy ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </Modal>
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

/** Feature 12 — dos opciones para el usuario nuevo sin propiedades. */
function DemoPrompt({ onUpload, onDemo, loading }: { onUpload: () => void; onDemo: () => void; loading: boolean }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <button onClick={onUpload} className="card card-hover flex flex-col items-start gap-2 p-6 text-left">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/8 text-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <h3 className="text-lg font-bold text-ink">Subir mis datos</h3>
        <p className="text-sm text-slate-500">Crea tu primera propiedad e importa tu CSV o Excel de ingresos.</p>
      </button>
      <button onClick={onDemo} disabled={loading} className="card card-hover flex flex-col items-start gap-2 p-6 text-left disabled:opacity-60">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-positive-soft text-positive">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
        </span>
        <h3 className="text-lg font-bold text-ink">Ver cómo funciona con datos de ejemplo</h3>
        <p className="text-sm text-slate-500">
          {loading ? "Cargando ejemplo…" : "Carga 3 propiedades ficticias con reservas y gastos realistas para explorar Rentrik."}
        </p>
      </button>
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
