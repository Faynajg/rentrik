import { Expense, Kpis, Reservation } from "../types";
import { eur, pct } from "../lib/format";

// ─── Feature 9 — Cascada de rentabilidad simplificada ──────────────────
export function ProfitWaterfall({ kpis }: { kpis: Kpis }) {
  const paidByGuest = kpis.grossRevenue;
  const platformTook = kpis.platformCommission;
  const reachedYou = paidByGuest - platformTook;
  const youSpent = Math.max(0, kpis.totalExpenses - platformTook);
  const youEarned = kpis.netProfit;

  const steps = [
    { label: "Lo que pagó el huésped", value: paidByGuest, tone: "neutral" as const },
    { label: "Lo que se llevó la plataforma", value: platformTook, tone: "minus" as const },
    { label: "Lo que te llegó a ti", value: reachedYou, tone: "neutral" as const },
    { label: "Lo que gastaste", value: youSpent, tone: "minus" as const },
    { label: "Lo que ganaste de verdad", value: youEarned, tone: youEarned >= 0 ? "good" : "bad" as const },
  ];

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">De lo que pagó el huésped a lo que ganaste</h3>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        {steps.map((s, i) => (
          <div key={s.label} className="flex flex-1 items-center gap-2 sm:flex-col sm:items-stretch sm:gap-0">
            <div
              className={`flex-1 rounded-xl border p-3 text-center ${
                s.tone === "good"
                  ? "border-positive/25 bg-positive-soft"
                  : s.tone === "bad"
                  ? "border-negative/25 bg-negative-soft"
                  : s.tone === "minus"
                  ? "border-slate-200 bg-slate-50"
                  : "border-brand/15 bg-brand/[0.04]"
              }`}
            >
              <p className="text-xs leading-tight text-slate-500">{s.label}</p>
              <p
                className={`mt-1 text-base font-bold ${
                  s.tone === "good" ? "text-positive" : s.tone === "bad" ? "text-negative" : s.tone === "minus" ? "text-slate-500" : "text-brand"
                }`}
              >
                {s.tone === "minus" ? `− ${eur(s.value)}` : eur(s.value)}
              </p>
            </div>
            {i < steps.length - 1 && (
              <span className="shrink-0 text-slate-300 sm:my-1 sm:rotate-90">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feature 7 — Ganado hasta ahora + por cobrar (barra de progreso) ────
export function EarnedProgress({ reservations }: { reservations: Reservation[] }) {
  const now = Date.now();
  let earned = 0;
  let pending = 0;
  for (const r of reservations) {
    const done = new Date(r.checkOut).getTime() <= now;
    if (done) earned += r.netRevenue;
    else pending += r.netRevenue;
  }
  const total = earned + pending;
  if (total <= 0) return null;
  const progress = Math.round((earned / total) * 100);

  return (
    <div className="card p-5">
      <h3 className="mb-1 text-sm font-semibold text-slate-700">Ganado hasta ahora</h3>
      <p className="text-2xl font-extrabold text-positive">{eur(earned)}</p>
      <p className="mt-1 text-sm text-slate-500">
        Has ganado <strong>{eur(earned)}</strong> este periodo.
        {pending > 0 ? (
          <> Te quedan <strong>{eur(pending)}</strong> por cobrar de reservas ya confirmadas.</>
        ) : (
          <> Ya has cobrado todas las reservas del periodo.</>
        )}
      </p>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-positive transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-slate-400">
        <span>Cobrado {progress}%</span>
        {pending > 0 && <span>Pendiente {eur(pending)}</span>}
      </div>
    </div>
  );
}

// ─── Feature 8 — Gastos fijos mensuales vs variables por reserva ────────
export function FixedVariableSplit({ kpis }: { kpis: Kpis }) {
  const fixed = kpis.expenseBreakdown.fijo + kpis.expenseBreakdown.gestion;
  const variable = kpis.expenseBreakdown.variable;
  const total = fixed + variable;

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Gastos fijos vs. variables</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Fijos mensuales</p>
          <p className="mt-1 text-xl font-bold text-ink">{eur(fixed)}</p>
          <p className="mt-0.5 text-2xs text-slate-400">Comunidad, seguro, wifi, hipoteca, gestión…</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Variables del periodo</p>
          <p className="mt-1 text-xl font-bold text-ink">{eur(variable)}</p>
          <p className="mt-0.5 text-2xs text-slate-400">Limpieza, suministros por reserva…</p>
        </div>
      </div>
      {total > 0 && (
        <div className="mt-4">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-brand" style={{ width: `${(fixed / total) * 100}%` }} />
            <div className="h-full bg-gold" style={{ width: `${(variable / total) * 100}%` }} />
          </div>
          <div className="mt-2 flex gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand" />Fijos {pct((fixed / total) * 100)}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gold" />Variables {pct((variable / total) * 100)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Feature 3 — Desglose de gastos por categoría con barras ────────────
const CAT_ORDER = ["Limpieza", "Mantenimiento", "Plataforma", "Suministros", "Otros"] as const;
type Cat = (typeof CAT_ORDER)[number];
const CAT_COLORS: Record<Cat, string> = {
  Limpieza: "#2C5282",
  Mantenimiento: "#C79A3C",
  Plataforma: "#1E3A5F",
  Suministros: "#00A699",
  Otros: "#94A3B8",
};

function classifyConcept(concept: string): Cat {
  const c = (concept || "").toLowerCase();
  if (/limpie|clean|lavand/.test(c)) return "Limpieza";
  if (/manten|reparac|repair|averi|fontan|pintur|obra|reforma/.test(c)) return "Mantenimiento";
  if (/suminis|luz|agua|gas|electri|internet|wifi|energ/.test(c)) return "Suministros";
  return "Otros";
}

export function ExpenseCategoryBars({ expenses, kpis }: { expenses: Expense[]; kpis: Kpis }) {
  const buckets: Record<Cat, number> = { Limpieza: 0, Mantenimiento: 0, Plataforma: 0, Suministros: 0, Otros: 0 };
  // Comisión de plataforma (autoritativa, incluye la de reservas si no hay gasto explícito).
  buckets.Plataforma = kpis.expenseBreakdown.plataforma;
  // Incidencias → mantenimiento.
  buckets.Mantenimiento += kpis.extraordinary;

  for (const e of expenses) {
    if (e.category === "plataforma") continue; // ya contabilizada arriba
    const amount = e.isPercent ? (kpis.grossRevenue * e.amount) / 100 : e.amount;
    buckets[classifyConcept(e.concept)] += amount;
  }

  const rows = CAT_ORDER.map((cat) => ({ cat, value: buckets[cat] })).filter((r) => r.value > 0);
  const total = rows.reduce((a, r) => a + r.value, 0);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const expenseRatio = kpis.grossRevenue > 0 ? (kpis.totalExpenses / kpis.grossRevenue) * 100 : 0;

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Gastos por concepto</h3>
        <span className="text-xs text-slate-400">
          Ratio de gastos: <strong className={expenseRatio > 60 ? "text-negative" : "text-slate-600"}>{pct(expenseRatio)}</strong>
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Sin gastos registrados este mes</p>
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.cat}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">{r.cat}</span>
                  <span className="font-semibold text-slate-700">{eur(r.value)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: CAT_COLORS[r.cat] }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3">
            {rows.map((r) => (
              <span key={r.cat} className="inline-flex items-center gap-1.5 text-2xs text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAT_COLORS[r.cat] }} />
                {r.cat} · {pct((r.value / total) * 100)}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
