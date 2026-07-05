import { Kpis } from "../types";
import { eur, pct } from "../lib/format";

/** Analítica avanzada: canal, coste/reserva, RevPAR potencial, precio mínimo, break-even. */
export function AdvancedAnalytics({ kpis }: { kpis: Kpis }) {
  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-ink">Analítica avanzada</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChannelProfitCard kpis={kpis} />
        <OptimizationCard kpis={kpis} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Coste por reserva"
          value={eur(kpis.costPerReservation)}
          sub="Media por estancia"
          accent="text-negative"
        />
        <MetricCard
          label="Margen por reserva"
          value={eur(kpis.marginPerReservation)}
          sub="Beneficio neto/check-in"
          accent={kpis.marginPerReservation >= 0 ? "text-positive" : "text-negative"}
        />
        <MetricCard
          label="Precio mínimo rentable"
          value={eur(kpis.minProfitablePrice)}
          sub="€/noche para no perder"
          accent="text-brand"
        />
        <BreakEvenCard kpis={kpis} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, accent = "text-ink" }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="card p-4">
      <p className="stat-label">{label}</p>
      <p className={`mt-2 text-xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

/** Feature 5/12 — break-even de ocupación con indicador. */
function BreakEvenCard({ kpis }: { kpis: Kpis }) {
  const feasible = kpis.breakEvenFeasible;
  const met = kpis.breakEvenMet;
  return (
    <div className={`card p-4 ${!feasible ? "" : met ? "ring-1 ring-positive/30" : "ring-1 ring-negative/30"}`}>
      <p className="stat-label">Break-even ocupación</p>
      {feasible ? (
        <>
          <p className="mt-2 text-xl font-bold text-ink">
            {kpis.breakEvenNights} <span className="text-sm font-medium text-slate-400">noches/mes</span>
          </p>
          <p className={`mt-0.5 inline-flex items-center gap-1 text-xs font-semibold ${met ? "text-positive" : "text-negative"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${met ? "bg-positive" : "bg-negative"}`} />
            {met ? `Cumplido (${kpis.occupiedNights} ocupadas)` : `Faltan ${Math.max(0, kpis.breakEvenNights - kpis.occupiedNights)}`}
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-xl font-bold text-slate-400">—</p>
          <p className="mt-0.5 text-xs text-slate-400">Sin datos suficientes</p>
        </>
      )}
    </div>
  );
}

/** Feature 1 — rentabilidad neta real por canal (OTA). */
function ChannelProfitCard({ kpis }: { kpis: Kpis }) {
  const channels = kpis.channelProfit;
  const max = Math.max(1, ...channels.map((c) => Math.abs(c.netProfit)));
  const best = [...channels].sort((a, b) => b.margin - a.margin)[0];

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Rentabilidad por canal</h3>
        {best && best.netProfit > 0 && (
          <span className="text-xs text-slate-400">
            Más rentable: <span className="font-semibold text-brand">{best.platform}</span>
          </span>
        )}
      </div>
      {channels.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Sin ingresos este mes</p>
      ) : (
        <div className="space-y-3">
          {channels.map((c) => (
            <div key={c.platform}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{c.platform}</span>
                <span className={`font-semibold ${c.netProfit >= 0 ? "text-positive" : "text-negative"}`}>
                  {eur(c.netProfit)} <span className="text-xs font-normal text-slate-400">({pct(c.margin)})</span>
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${c.netProfit >= 0 ? "bg-positive" : "bg-negative"}`}
                  style={{ width: `${Math.max(4, (Math.abs(c.netProfit) / max) * 100)}%` }}
                />
              </div>
              <p className="mt-0.5 text-2xs text-slate-400">
                Ingresos {eur(c.gross)} · comisión {eur(c.commission)} · {c.reservations} reservas
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Feature 3 — RevPAR real vs potencial + brecha de optimización. */
function OptimizationCard({ kpis }: { kpis: Kpis }) {
  const realPct = kpis.potentialRevenue > 0 ? (kpis.grossRevenue / kpis.potentialRevenue) * 100 : 0;
  return (
    <div className="card p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Ingreso real vs. potencial</h3>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xs uppercase tracking-wide text-slate-400">Ingreso real</p>
          <p className="text-xl font-bold text-ink">{eur(kpis.grossRevenue)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xs uppercase tracking-wide text-slate-400">Potencial (100 % ocup.)</p>
          <p className="text-xl font-bold text-slate-400">{eur(kpis.potentialRevenue)}</p>
        </div>
      </div>
      <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, realPct)}%` }} />
      </div>
      <div className="mt-4 rounded-xl bg-gold-soft px-4 py-3">
        <p className="text-xs text-slate-500">Dinero sobre la mesa este mes</p>
        <p className="text-lg font-bold text-gold">{eur(kpis.optimizationGap)}</p>
        <p className="text-2xs text-slate-400">
          RevPAR real {eur(kpis.revpar)} · potencial {eur(kpis.revparPotential)}
        </p>
      </div>
    </div>
  );
}
