import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PropertyWithKpis } from "../types";
import { eur, pct } from "../lib/format";
import { BAND_TEXT, marginBand, platformColor } from "../lib/health";

// ─── Feature 1 — Semáforo enfrentado: necesita atención vs mejores ─────
export function PortfolioTriage({ properties, month }: { properties: PropertyWithKpis[]; month: string }) {
  const withData = properties.filter((p) => p.kpis.grossRevenue > 0);
  const needs = withData.filter((p) => p.kpis.profitMargin < 15).sort((a, b) => a.kpis.profitMargin - b.kpis.profitMargin);
  const best = withData.filter((p) => p.kpis.profitMargin > 25).sort((a, b) => b.kpis.profitMargin - a.kpis.profitMargin);
  if (needs.length === 0 && best.length === 0) return null;

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <TriageColumn
        title="Necesita atención"
        tone="red"
        empty="Ninguna propiedad con margen bajo. 👏"
        items={needs}
        month={month}
        badge="Margen bajo"
      />
      <TriageColumn
        title="Tus mejores propiedades"
        tone="green"
        empty="Aún no hay propiedades con margen alto."
        items={best}
        month={month}
        badge="Rentable"
      />
    </div>
  );
}

function TriageColumn({
  title,
  tone,
  empty,
  items,
  month,
  badge,
}: {
  title: string;
  tone: "red" | "green";
  empty: string;
  items: PropertyWithKpis[];
  month: string;
  badge: string;
}) {
  const styles =
    tone === "red"
      ? { box: "border-negative/20 bg-negative-soft/40", title: "text-negative", badge: "bg-negative text-white" }
      : { box: "border-positive/20 bg-positive-soft/40", title: "text-positive", badge: "bg-positive text-white" };
  return (
    <div className={`rounded-2xl border p-4 ${styles.box}`}>
      <p className={`text-sm font-bold ${styles.title}`}>{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <Link to={`/propiedades/${p.id}?month=${month}`} className="truncate text-sm font-medium text-slate-700 hover:underline">
                {p.name}
              </Link>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold text-slate-600">{pct(p.kpis.profitMargin)}</span>
                <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${styles.badge}`}>{badge}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Feature 13 — Dos tarjetas de análisis automático ──────────────────
export function PortfolioInsights({ properties }: { properties: PropertyWithKpis[] }) {
  const withData = properties.filter((p) => p.kpis.grossRevenue > 0);
  if (withData.length < 2) return null;

  const avgNet = withData.reduce((a, p) => a + p.kpis.netProfit, 0) / withData.length;
  const avgRes = withData.reduce((a, p) => a + p.kpis.reservationsCount, 0) / withData.length;
  const avgAdr = withData.reduce((a, p) => a + p.kpis.adr, 0) / withData.length;

  const best = [...withData].sort((a, b) => b.kpis.netProfit - a.kpis.netProfit)[0];
  const doble = avgNet > 0 && best.kpis.netProfit >= 1.8 * avgNet;
  const menosReservas = best.kpis.reservationsCount <= avgRes;
  const bestMsg =
    `${best.name} genera ${eur(best.kpis.netProfit)} de beneficio` +
    (doble ? ", más del doble que la media de tu portfolio" : ", por encima de la media") +
    (menosReservas ? " y con menos reservas que otras" : "") +
    ". ¡Sigue así!";

  // Propiedad que da trabajo pero poco margen: muchas reservas y bajo ingreso/noche.
  const busy = withData
    .filter((p) => p.id !== best.id && p.kpis.reservationsCount > 0)
    .sort((a, b) => b.kpis.reservationsCount - a.kpis.reservationsCount || a.kpis.adr - b.kpis.adr);
  const worst = busy.find((p) => p.kpis.adr < avgAdr || p.kpis.profitMargin < 20);

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <InsightCard tone="green" icon="⭐" title="Tu propiedad más rentable" message={bestMsg} />
      {worst && (
        <InsightCard
          tone="amber"
          icon="⚠️"
          title="Mucho trabajo, poco margen"
          message={`${worst.name} tiene muchas reservas (${worst.kpis.reservationsCount}) pero el ingreso por noche es bajo (${eur(worst.kpis.adr)}). Considera subir el precio mínimo por noche.`}
        />
      )}
    </div>
  );
}

function InsightCard({ tone, icon, title, message }: { tone: "green" | "amber"; icon: string; title: string; message: string }) {
  const box =
    tone === "green" ? "border-positive/20 bg-positive-soft/40" : "border-gold/25 bg-gold-soft/40";
  const titleColor = tone === "green" ? "text-positive" : "text-gold";
  return (
    <div className={`rounded-2xl border p-4 ${box}`}>
      <p className={`flex items-center gap-2 text-sm font-bold ${titleColor}`}>
        <span className="text-base">{icon}</span> {title}
      </p>
      <p className="mt-1.5 text-sm text-slate-600">{message}</p>
    </div>
  );
}

// ─── Feature 6 — Ingresos por plataforma (donut + lista) ───────────────
export function PlatformBreakdown({ properties }: { properties: PropertyWithKpis[] }) {
  const map = new Map<string, { platform: string; gross: number; reservations: number; nights: number }>();
  for (const p of properties) {
    for (const pr of p.kpis.revenueByPlatform) {
      const e = map.get(pr.platform) ?? { platform: pr.platform, gross: 0, reservations: 0, nights: 0 };
      e.gross += pr.gross;
      e.reservations += pr.reservations;
      e.nights += pr.nights;
      map.set(pr.platform, e);
    }
  }
  const list = Array.from(map.values()).sort((a, b) => b.gross - a.gross);
  const total = list.reduce((a, e) => a + e.gross, 0);
  if (list.length === 0 || total === 0) return null;
  const top = list[0];

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Ingresos por plataforma</h3>
        <span className="rounded-full bg-brand/8 px-2 py-0.5 text-2xs font-bold text-brand">
          {top.platform} lidera
        </span>
      </div>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <ResponsiveContainer width="100%" height={170} className="!w-full sm:!w-40">
          <PieChart>
            <Pie data={list} dataKey="gross" nameKey="platform" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
              {list.map((e) => (
                <Cell key={e.platform} fill={platformColor(e.platform)} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v: number) => eur(v)} />
          </PieChart>
        </ResponsiveContainer>
        <ul className="w-full space-y-2">
          {list.map((e) => (
            <li key={e.platform} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: platformColor(e.platform) }} />
                <span className="font-medium text-slate-700">{e.platform}</span>
                <span className="text-xs text-slate-400">{e.reservations} reservas</span>
              </span>
              <span className="text-right">
                <span className="font-semibold text-slate-700">{eur(e.gross)}</span>
                <span className="ml-2 text-xs text-slate-400">{pct((e.gross / total) * 100)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Feature 15 — Ranking de propiedades por ocupación ─────────────────
export function OccupancyRanking({ properties, month }: { properties: PropertyWithKpis[]; month: string }) {
  const ranked = [...properties]
    .filter((p) => p.kpis.availableNights > 0)
    .sort((a, b) => b.kpis.occupancyRate - a.kpis.occupancyRate);
  if (ranked.length === 0) return null;

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Ranking por ocupación</h3>
      <ol className="space-y-3">
        {ranked.map((p, i) => {
          const band = marginBand(p.kpis.profitMargin);
          const width = Math.min(100, Math.max(2, p.kpis.occupancyRate));
          return (
            <li key={p.id} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-center text-sm font-bold text-slate-400">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <Link to={`/propiedades/${p.id}?month=${month}`} className="truncate text-sm font-medium text-slate-700 hover:underline">
                    {p.name}
                  </Link>
                  <span className={`shrink-0 text-sm font-semibold ${BAND_TEXT[band]}`}>{pct(p.kpis.occupancyRate)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${band === "green" ? "bg-positive" : band === "amber" ? "bg-gold" : "bg-negative"}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <p className="mt-0.5 text-2xs text-slate-400">{p.kpis.occupiedNights} noches ocupadas</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
