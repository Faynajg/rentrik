import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, downloadFile, downloadPdf, errorMessage } from "../api/client";
import { Expense, Incident, Kpis, Property, Reservation } from "../types";
import { eur, formatDate, monthLabel, pct } from "../lib/format";
import { KpiCard } from "../components/KpiCard";
import { UploadModal } from "../components/UploadModal";
import { ImportHistoryModal } from "../components/ImportHistoryModal";
import { ProfitWaterfall, EarnedProgress, FixedVariableSplit, ExpenseCategoryBars } from "../components/PropertyBreakdowns";
import { PropertyNotes } from "../components/PropertyNotes";
import { ExpensesModal } from "../components/ExpensesModal";
import { EditPropertyModal } from "../components/EditPropertyModal";
import { AddReservationModal } from "../components/AddReservationModal";
import { OccupancyCalendar } from "../components/OccupancyCalendar";
import { AdvancedAnalytics } from "../components/AdvancedAnalytics";
import { IncidentsSection } from "../components/IncidentsSection";
import { SeasonsModal } from "../components/SeasonsModal";
import { Alert, ProfitBadge, Spinner } from "../components/ui";
import { ExpensePie, RevenueExpenseChart } from "../components/charts";
import { useAuth } from "../context/AuthContext";
import { SEASON_LABELS, evaluateSeason, parseSeasons, seasonForMonth } from "../lib/seasons";

interface DetailResponse {
  property: Property;
  month: string;
  kpis: Kpis;
  reservations: Reservation[];
  expenses: Expense[];
  incidents: Incident[];
  history: Kpis[];
}

const CATEGORY_LABELS: Record<string, string> = {
  fijo: "Gastos fijos",
  variable: "Gastos variables",
  plataforma: "Comisiones de plataforma",
  gestion: "Costes de gestión",
};

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const month = params.get("month") ?? currentMonth();

  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showImportHistory, setShowImportHistory] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddReservation, setShowAddReservation] = useState(false);
  const [showSeasons, setShowSeasons] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingBank, setDownloadingBank] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get<DetailResponse>(`/properties/${id}`, { params: { month } });
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

  // Abre automáticamente el modal indicado desde el onboarding (?upload=1 / ?expenses=1).
  useEffect(() => {
    if (params.get("upload") === "1") {
      setShowUpload(true);
      params.delete("upload");
      setParams(params, { replace: true });
    } else if (params.get("expenses") === "1") {
      setShowExpenses(true);
      params.delete("expenses");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthOptions = useMemo(() => {
    const set = new Set<string>(data?.history.map((h) => h.month) ?? []);
    set.add(month);
    set.add(currentMonth());
    return Array.from(set).sort().reverse();
  }, [data, month]);

  function changeMonth(m: string) {
    params.set("month", m);
    setParams(params);
  }

  async function downloadOwner() {
    if (!id) return;
    setDownloading(true);
    try {
      await downloadPdf(`/reports/property/${id}/owner.pdf?month=${month}`, `informe-propietario-${month}.pdf`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  async function downloadBank() {
    if (!id) return;
    setDownloadingBank(true);
    try {
      await downloadPdf(`/reports/property/${id}/bank.pdf`, `informe-ingresos-verificados.pdf`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDownloadingBank(false);
    }
  }

  async function deleteProperty() {
    if (!id || !confirm("¿Eliminar esta propiedad y todos sus datos?")) return;
    try {
      await api.delete(`/properties/${id}`);
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function deleteReservation(reservationId: string) {
    if (!id || !confirm("¿Eliminar esta reserva?")) return;
    try {
      await api.delete(`/properties/${id}/reservations/${reservationId}`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading && !data) return <Spinner label="Cargando propiedad…" />;
  if (!data) return <Alert kind="error">{error || "No se pudo cargar la propiedad."}</Alert>;

  const { property, kpis, reservations, expenses, incidents } = data;
  const evolution = data.history.map((h) => ({
    month: h.month,
    grossRevenue: h.grossRevenue,
    totalExpenses: h.totalExpenses,
    netProfit: h.netProfit,
    occupancyRate: h.occupancyRate,
  }));

  // Feature 9 — alerta de temporada
  const seasons = parseSeasons(property.seasonsConfig);
  const currentSeason = seasonForMonth(seasons, month);
  const seasonEval = currentSeason ? evaluateSeason(currentSeason, kpis.occupancyRate, kpis.adr) : null;
  const seasonAlert = seasonEval && kpis.grossRevenue > 0 && (!seasonEval.occupancyMet || !seasonEval.priceMet);

  return (
    <div>
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Volver al dashboard
      </Link>

      {/* Encabezado */}
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-ink">{property.name}</h1>
            <button
              onClick={() => setShowEdit(true)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand"
              title="Editar propiedad"
              aria-label="Editar propiedad"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <ProfitBadge profit={kpis.netProfit} />
          </div>
          {property.address && <p className="text-sm text-slate-500">{property.address}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input !w-auto !py-2" value={month} onChange={(e) => changeMonth(e.target.value)}>
            {monthOptions.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <button onClick={() => setShowUpload(true)} className="btn-ghost">Importar CSV/Excel</button>
          <button onClick={() => setShowImportHistory(true)} className="btn-ghost">Historial</button>
          <button onClick={() => setShowExpenses(true)} className="btn-ghost">Editar gastos</button>
          <button onClick={() => setShowSeasons(true)} className="btn-ghost">Temporadas</button>
          <button onClick={downloadBank} disabled={downloadingBank} className="btn-ghost">
            {downloadingBank ? "Generando…" : "PDF banco"}
          </button>
          <button onClick={downloadOwner} disabled={downloading} className="btn-primary">
            {downloading ? "Generando…" : "PDF propietario"}
          </button>
        </div>
      </div>

      {error && <div className="mt-4"><Alert kind="error">{error}</Alert></div>}

      {!kpis.isProfitable && kpis.totalExpenses > 0 && (
        <div className="mt-4">
          <Alert kind="error">
            ⚠️ Esta propiedad <strong>no es rentable</strong> en {monthLabel(month)}: los gastos ({eur(kpis.totalExpenses)})
            superan a los ingresos ({eur(kpis.grossRevenue)}).
          </Alert>
        </div>
      )}

      {seasonAlert && seasonEval && (
        <div className="mt-4 rounded-xl border border-gold/30 bg-gold-soft px-4 py-3 text-sm">
          <p className="font-semibold text-gold">
            {SEASON_LABELS[currentSeason!.type]}: objetivos sin cumplir
          </p>
          <p className="mt-0.5 text-slate-600">
            {!seasonEval.occupancyMet && (
              <>Ocupación {pct(kpis.occupancyRate)} vs. objetivo {pct(currentSeason!.targetOccupancy)} ({pct(seasonEval.occupancyGap)} por debajo). </>
            )}
            {!seasonEval.priceMet && (
              <>ADR {eur(kpis.adr)} por debajo del mínimo {eur(currentSeason!.minPrice)}.</>
            )}
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Beneficio neto" value={eur(kpis.netProfit)} accent={kpis.netProfit >= 0 ? "positive" : "negative"} sub={`Margen ${pct(kpis.profitMargin)}`} />
        <KpiCard label="Ingresos brutos" value={eur(kpis.grossRevenue)} accent="brand" />
        <KpiCard label="Gastos totales" value={eur(kpis.totalExpenses)} accent="negative" />
        <KpiCard label="Ocupación" value={pct(kpis.occupancyRate)} sub={`${kpis.occupiedNights}/${kpis.availableNights} noches`} />
        <KpiCard label="ADR" value={eur(kpis.adr)} sub="Precio medio/noche" />
        <KpiCard label="RevPAR" value={eur(kpis.revpar)} />
        <KpiCard label="Reservas" value={String(kpis.reservationsCount)} />
        <KpiCard label="Comisiones OTA" value={eur(kpis.platformCommission)} accent="negative" />
      </div>

      {/* Cascada de rentabilidad (feature 9) */}
      <div className="mt-6">
        <ProfitWaterfall kpis={kpis} />
      </div>

      {/* Ganado hasta ahora + fijos vs variables (features 7 y 8) */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <EarnedProgress reservations={reservations} />
        <FixedVariableSplit kpis={kpis} />
      </div>

      {/* IVA repercutido estimado */}
      {user && user.ivaRate > 0 && kpis.grossRevenue > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm shadow-card">
          <span className="text-slate-500">
            IVA repercutido estimado <span className="font-medium text-slate-600">({pct(user.ivaRate)})</span> sobre los ingresos
          </span>
          <span className="font-semibold text-brand">{eur((kpis.grossRevenue * user.ivaRate) / 100)}</span>
        </div>
      )}

      {/* Analítica avanzada (canal, break-even, RevPAR potencial, precio mínimo) */}
      <AdvancedAnalytics kpis={kpis} />

      {/* Tendencia + calendario de ocupación */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RevenueExpenseChart data={evolution} />
        <OccupancyCalendar month={month} reservations={reservations} />
      </div>

      {/* Desglose de gastos */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ExpensePie breakdown={kpis.expenseBreakdown} />
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Gastos por categoría</h3>
          <div className="space-y-2 text-sm">
            {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((cat) => (
              <div key={cat} className="flex items-center justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-600">{CATEGORY_LABELS[cat]}</span>
                <span className="font-medium text-slate-700">
                  {eur(kpis.expenseBreakdown[cat as keyof typeof kpis.expenseBreakdown] as number)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="font-semibold text-slate-700">Total</span>
              <span className="font-bold text-negative">{eur(kpis.totalExpenses)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gastos por concepto con barras + ratio de gastos (feature 3) */}
      <div className="mt-4">
        <ExpenseCategoryBars expenses={expenses} kpis={kpis} />
      </div>

      {/* Ingresos por plataforma */}
      <div className="mt-4">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Ingresos por plataforma</h3>
          {kpis.revenueByPlatform.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Sin ingresos este mes</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Plataforma</th>
                  <th className="pb-2 text-right">Reservas</th>
                  <th className="pb-2 text-right">Ingresos</th>
                  <th className="pb-2 text-right">Comisión</th>
                </tr>
              </thead>
              <tbody>
                {kpis.revenueByPlatform.map((p) => (
                  <tr key={p.platform} className="border-t border-slate-100">
                    <td className="py-2 font-medium text-slate-700">{p.platform}</td>
                    <td className="py-2 text-right text-slate-500">{p.reservations}</td>
                    <td className="py-2 text-right font-semibold text-slate-700">{eur(p.gross)}</td>
                    <td className="py-2 text-right text-negative">{eur(p.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reservas */}
      <div className="mt-6 card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-700">
            Reservas de {monthLabel(month)} ({reservations.length})
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddReservation(true)} className="btn-ghost btn-sm">+ Añadir reserva</button>
            {reservations.length > 0 && (
              <button
                onClick={() => downloadFile(`/export/property/${id}/reservations.csv?month=${month}`, `reservas-${month}.csv`)}
                className="btn-ghost btn-sm"
              >
                Exportar CSV
              </button>
            )}
          </div>
        </div>
        {reservations.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-400">No hay reservas este mes.</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <button onClick={() => setShowUpload(true)} className="btn-ghost btn-sm">Subir CSV de ingresos</button>
              <button onClick={() => setShowAddReservation(true)} className="btn-primary btn-sm">Añadir manualmente</button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Plataforma</th>
                  <th className="pb-2">Entrada</th>
                  <th className="pb-2">Salida</th>
                  <th className="pb-2 text-right">Noches</th>
                  <th className="pb-2 text-right">Bruto</th>
                  <th className="pb-2 text-right">Comisión</th>
                  <th className="pb-2 text-right">Neto</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="group border-t border-slate-100">
                    <td className="py-2">
                      <span className="badge bg-brand/10 text-brand">{r.platform}</span>
                    </td>
                    <td className="py-2 text-slate-600">{formatDate(r.checkIn)}</td>
                    <td className="py-2 text-slate-600">{formatDate(r.checkOut)}</td>
                    <td className="py-2 text-right text-slate-600">{r.nights}</td>
                    <td className="py-2 text-right font-medium text-slate-700">{eur(r.grossRevenue)}</td>
                    <td className="py-2 text-right text-negative">{eur(r.platformCommission)}</td>
                    <td className="py-2 text-right font-medium text-positive">{eur(r.netRevenue)}</td>
                    <td className="py-2 pl-2 text-right">
                      <button
                        onClick={() => deleteReservation(r.id)}
                        className="rounded p-1 text-slate-300 transition hover:bg-negative-soft hover:text-negative"
                        title="Eliminar reserva"
                        aria-label="Eliminar reserva"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a1 1 0 01-1 1H7a1 1 0 01-1-1V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incidencias (feature 8) */}
      <IncidentsSection propertyId={id!} incidents={incidents} onChange={load} />

      {/* Notas de la propiedad (feature 10) */}
      <div className="mt-6">
        <PropertyNotes
          propertyId={property.id}
          initialNotes={property.notes}
          updatedAt={property.notesUpdatedAt}
          onSaved={load}
        />
      </div>

      <div className="mt-8 flex justify-end">
        <button onClick={deleteProperty} className="text-sm text-negative hover:underline">
          Eliminar propiedad
        </button>
      </div>

      <UploadModal open={showUpload} propertyId={id!} onClose={() => setShowUpload(false)} onUploaded={load} />
      <ImportHistoryModal open={showImportHistory} propertyId={id!} onClose={() => setShowImportHistory(false)} onChanged={load} />
      <ExpensesModal
        open={showExpenses}
        propertyId={id!}
        month={month}
        grossRevenue={kpis.grossRevenue}
        onClose={() => setShowExpenses(false)}
        onSaved={load}
      />
      <EditPropertyModal open={showEdit} property={property} onClose={() => setShowEdit(false)} onSaved={load} />
      <AddReservationModal open={showAddReservation} propertyId={id!} onClose={() => setShowAddReservation(false)} onCreated={load} />
      <SeasonsModal open={showSeasons} propertyId={id!} seasonsConfig={property.seasonsConfig} onClose={() => setShowSeasons(false)} onSaved={load} />
    </div>
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
