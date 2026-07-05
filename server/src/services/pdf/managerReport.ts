import { PropertyKpis } from "../kpi";
import { monthLabel } from "../../lib/dates";
import {
  COLORS,
  CHART_PALETTE,
  Doc,
  MARGIN,
  calloutBox,
  contentWidth,
  coverBand,
  donutWithLegend,
  ensureSpace,
  eur,
  kpiGrid,
  paintFooters,
  pct,
  sectionTitle,
} from "./theme";

export interface ManagerReportItem {
  name: string;
  kpis: PropertyKpis;
}

export interface ManagerReportData {
  brand: string;
  month: string;
  items: ManagerReportItem[];
}

/** Informe interno para la gestora: consolidado, ranking, alertas y recomendaciones. */
export function buildManagerReport(doc: Doc, data: ManagerReportData) {
  const { items } = data;

  coverBand(doc, {
    brand: data.brand,
    label: "Informe de gestora",
    title: "Vista consolidada de la cartera",
    subtitle: `${items.length} propiedades · ${monthLabel(data.month)}`,
  });

  const totals = items.reduce(
    (acc, it) => {
      acc.gross += it.kpis.grossRevenue;
      acc.expenses += it.kpis.totalExpenses;
      acc.profit += it.kpis.netProfit;
      acc.occupied += it.kpis.occupiedNights;
      acc.available += it.kpis.availableNights;
      acc.gestion += it.kpis.expenseBreakdown.gestion;
      return acc;
    },
    { gross: 0, expenses: 0, profit: 0, occupied: 0, available: 0, gestion: 0 }
  );
  const occ = totals.available > 0 ? (totals.occupied / totals.available) * 100 : 0;
  const profitable = totals.profit >= 0;

  // Resumen consolidado
  sectionTitle(doc, "Resumen de la cartera");
  kpiGrid(
    doc,
    [
      { label: "Ingresos totales", value: eur(totals.gross), accent: COLORS.navy },
      { label: "Beneficio neto", value: eur(totals.profit), accent: profitable ? COLORS.green : COLORS.red },
      { label: "Ocupación media", value: pct(occ), accent: COLORS.navyLight },
      { label: "Propiedades", value: String(items.length), accent: COLORS.navyLight },
      { label: "Margen de gestión", value: eur(totals.gestion), accent: COLORS.gold },
      { label: "Gastos totales", value: eur(totals.expenses), accent: COLORS.red },
    ],
    3,
    58
  );

  // Ranking por rentabilidad
  ensureSpace(doc, 60 + items.length * 22);
  sectionTitle(doc, "Ranking por rentabilidad");
  rankingTable(doc, items);

  // Propiedades con alerta
  const alerts = items.filter((it) => !it.kpis.isProfitable || it.kpis.profitMargin < 10);
  ensureSpace(doc, 60 + alerts.length * 20);
  sectionTitle(doc, "Propiedades con alerta");
  if (alerts.length === 0) {
    calloutBox(doc, "Ninguna propiedad en alerta. Todas las propiedades superan el 10 % de margen de beneficio este mes.", COLORS.green, COLORS.greenSoft);
  } else {
    for (const a of alerts) {
      const critical = !a.kpis.isProfitable;
      const reason = critical
        ? `Pérdida de ${eur(Math.abs(a.kpis.netProfit))} — los gastos superan a los ingresos`
        : `Margen bajo (${pct(a.kpis.profitMargin)}) — vigilar de cerca`;
      alertRow(doc, a.name, reason, critical);
    }
    doc.y += 6;
  }

  // Rendimiento por plataforma
  const byPlatform = aggregatePlatforms(items);
  if (byPlatform.length > 0) {
    ensureSpace(doc, 175);
    sectionTitle(doc, "Rendimiento por plataforma (OTA)");
    const segments = byPlatform.map((p, i) => ({
      label: `${p.platform} · ${p.reservations} res.`,
      value: p.gross,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    }));
    const cy = doc.y + 66;
    donutWithLegend(doc, MARGIN + 66, cy, 62, 38, segments, MARGIN + 175);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.ink)
      .text(eur(byPlatform.reduce((a, p) => a + p.gross, 0)).replace(" €", "€"), MARGIN + 20, cy - 6, { width: 92, align: "center" });
    doc.y = cy + 76;
    doc.x = MARGIN;
  }

  // Recomendaciones
  ensureSpace(doc, 130);
  sectionTitle(doc, "Recomendaciones automáticas");
  const recs = buildRecommendations(items, occ);
  calloutBox(doc, recs.map((r) => `•  ${r}`).join("\n"), COLORS.navy, COLORS.bg);

  paintFooters(doc, data.brand);
}

/** Tabla-ranking con barra de beneficio proporcional. */
function rankingTable(doc: Doc, items: ManagerReportItem[]) {
  const ranked = [...items].sort((a, b) => b.kpis.netProfit - a.kpis.netProfit);
  const maxAbs = Math.max(1, ...ranked.map((r) => Math.abs(r.kpis.netProfit)));
  const w = contentWidth(doc);
  const x = MARGIN;

  // cabecera
  let y = doc.y;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.faint);
  doc.text("PROPIEDAD", x + 22, y, { width: 150, characterSpacing: 0.5 });
  doc.text("INGRESOS", x + w - 300, y, { width: 90, align: "right" });
  doc.text("BENEFICIO", x + w - 200, y, { width: 90, align: "right" });
  doc.text("MARGEN", x + w - 70, y, { width: 70, align: "right" });
  doc.moveTo(x, y + 14).lineTo(x + w, y + 14).lineWidth(0.75).strokeColor(COLORS.border).stroke();
  doc.y = y + 22;

  ranked.forEach((it, i) => {
    y = doc.y;
    const k = it.kpis;
    const color = k.isProfitable ? COLORS.green : COLORS.red;
    // posición
    doc.circle(x + 6, y + 6, 8).fill(COLORS.navy);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.white).text(String(i + 1), x, y + 2.5, { width: 12, align: "center" });
    // nombre + mini barra
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.ink).text(it.name, x + 22, y - 1, { width: 200, lineBreak: false });
    const barW = 150;
    const barX = x + 22;
    doc.roundedRect(barX, y + 13, barW, 4, 2).fill(COLORS.panel);
    doc.roundedRect(barX, y + 13, Math.max(2, (Math.abs(k.netProfit) / maxAbs) * barW), 4, 2).fill(color);
    // cifras
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.text).text(eur(k.grossRevenue), x + w - 300, y + 2, { width: 90, align: "right" });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(color).text(eur(k.netProfit), x + w - 200, y + 2, { width: 90, align: "right" });
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.muted).text(pct(k.profitMargin), x + w - 70, y + 2, { width: 70, align: "right" });
    doc.y = y + 26;
  });
  doc.x = MARGIN;
}

function alertRow(doc: Doc, name: string, reason: string, critical: boolean) {
  const x = MARGIN;
  const y = doc.y;
  const w = contentWidth(doc);
  const color = critical ? COLORS.red : COLORS.gold;
  doc.roundedRect(x, y, w, 30, 7).fill(critical ? COLORS.redSoft : COLORS.goldSoft);
  doc.rect(x, y, 4, 30).fill(color);
  // icono aviso
  doc.font("Helvetica-Bold").fontSize(13).fillColor(color).text("!", x + 14, y + 8, { width: 12, align: "center" });
  doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.ink).text(name, x + 32, y + 6, { width: 180 });
  doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted).text(reason, x + 32, y + 18, { width: w - 44 });
  doc.y = y + 38;
  doc.x = MARGIN;
}

function aggregatePlatforms(items: ManagerReportItem[]) {
  const map = new Map<string, { platform: string; gross: number; commission: number; reservations: number }>();
  for (const it of items) {
    for (const p of it.kpis.revenueByPlatform) {
      const e = map.get(p.platform) ?? { platform: p.platform, gross: 0, commission: 0, reservations: 0 };
      e.gross += p.gross;
      e.commission += p.commission;
      e.reservations += p.reservations;
      map.set(p.platform, e);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.gross - a.gross);
}

function buildRecommendations(items: ManagerReportItem[], occ: number): string[] {
  const recs: string[] = [];
  const losers = items.filter((i) => !i.kpis.isProfitable);
  if (losers.length > 0) {
    recs.push(`Revisa con prioridad ${losers.map((l) => l.name).join(", ")}: no cubren gastos este mes.`);
  }
  const lowOcc = items.filter((i) => i.kpis.occupancyRate < 50 && i.kpis.availableNights > 0);
  if (lowOcc.length > 0) {
    recs.push(`Ocupación por debajo del 50 % en ${lowOcc.map((l) => l.name).join(", ")}: ajusta precios o mínimos de noches.`);
  }
  if (occ >= 80) {
    recs.push("La ocupación media supera el 80 %: hay margen para subir tarifas en temporada alta.");
  }
  const best = [...items].sort((a, b) => b.kpis.profitMargin - a.kpis.profitMargin)[0];
  if (best && best.kpis.isProfitable) {
    recs.push(`${best.name} es la más rentable (margen ${pct(best.kpis.profitMargin)}): replica su estrategia de precios y gastos.`);
  }
  if (recs.length === 0) recs.push("Cartera equilibrada. Mantén el control mensual de gastos para conservar los márgenes actuales.");
  return recs;
}
