import { Incident } from "@prisma/client";
import { PropertyKpis } from "../kpi";
import { monthLabel } from "../../lib/dates";
import {
  ARROW,
  COLORS,
  CHART_PALETTE,
  Doc,
  MARGIN,
  barCompare,
  calloutBox,
  contentWidth,
  coverBand,
  donutWithLegend,
  ensureSpace,
  eur,
  heroProfit,
  kpiGrid,
  paintFooters,
  pct,
  row,
  sectionTitle,
  signedEur,
} from "./theme";

export interface OwnerReportData {
  brand: string;
  propertyName: string;
  month: string;
  kpis: PropertyKpis;
  previous?: PropertyKpis | null;
  incidents?: Incident[];
}

const CATEGORY_LABELS: Record<string, string> = {
  fijo: "Gastos fijos",
  variable: "Gastos variables",
  plataforma: "Comisiones OTA",
  gestion: "Costes de gestión",
  extraordinario: "Extraordinarios",
};

const INCIDENT_LABELS: Record<string, string> = {
  reparacion: "Reparación",
  queja: "Queja de huésped",
  problema: "Problema",
  otro: "Otro",
};

/** Informe PDF para el propietario/inversor: limpio, visual y profesional. */
export function buildOwnerReport(doc: Doc, data: OwnerReportData) {
  const { kpis, previous } = data;

  coverBand(doc, {
    brand: data.brand,
    label: "Informe para el propietario",
    title: data.propertyName,
    subtitle: monthLabel(data.month),
  });

  // Beneficio neto — el dato estrella
  heroProfit(doc, {
    profit: kpis.netProfit,
    margin: kpis.profitMargin,
    profitable: kpis.isProfitable,
    caption: `Margen del ${pct(kpis.profitMargin)}\nsobre ${eur(kpis.grossRevenue)} de ingresos`,
  });

  // Resumen ejecutivo
  sectionTitle(doc, "Resumen ejecutivo");
  kpiGrid(
    doc,
    [
      { label: "Ingresos brutos", value: eur(kpis.grossRevenue), accent: COLORS.navy },
      { label: "Gastos totales", value: eur(kpis.totalExpenses), accent: COLORS.red },
      { label: "Comisiones OTA", value: eur(kpis.platformCommission), accent: COLORS.gold },
      { label: "Ocupación", value: pct(kpis.occupancyRate), accent: COLORS.navyLight },
      { label: "Precio medio (ADR)", value: eur(kpis.adr), accent: COLORS.navyLight },
      { label: "RevPAR", value: eur(kpis.revpar), accent: COLORS.navyLight },
    ],
    3,
    58
  );

  // Ingresos vs gastos
  ensureSpace(doc, 120);
  sectionTitle(doc, "Ingresos frente a gastos");
  barCompare(doc, [
    { label: "Ingresos", value: kpis.grossRevenue, color: COLORS.green },
    { label: "Gastos", value: kpis.totalExpenses, color: COLORS.red },
    { label: "Beneficio", value: Math.max(0, kpis.netProfit), color: COLORS.navy },
  ]);

  // Ingresos por plataforma
  if (kpis.revenueByPlatform.length > 0) {
    ensureSpace(doc, 40 + kpis.revenueByPlatform.length * 18);
    sectionTitle(doc, "Ingresos por plataforma");
    for (const p of kpis.revenueByPlatform) {
      row(doc, `${p.platform}   ·   ${p.reservations} reservas · ${p.nights} noches`, eur(p.gross));
    }
  }

  // Desglose de gastos (donut)
  ensureSpace(doc, 175);
  sectionTitle(doc, "Desglose de gastos");
  const segments = (Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>)
    .map((k, i) => ({
      label: CATEGORY_LABELS[k],
      value: kpis.expenseBreakdown[k as keyof typeof kpis.expenseBreakdown] as number,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    }))
    .filter((s) => s.value > 0);

  if (segments.length > 0) {
    const cy = doc.y + 66;
    donutWithLegend(doc, MARGIN + 66, cy, 62, 38, segments, MARGIN + 175);
    // total en el centro del donut
    doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.ink)
      .text(eur(kpis.totalExpenses).replace(" €", ""), MARGIN + 20, cy - 12, { width: 92, align: "center" });
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.faint)
      .text("€ TOTAL", MARGIN + 20, cy + 5, { width: 92, align: "center", characterSpacing: 1 });
    doc.y = cy + 76;
    doc.x = MARGIN;
  } else {
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.muted).text("Sin gastos registrados este mes.", MARGIN, doc.y);
    doc.y += 20;
  }

  // Gastos extraordinarios (incidencias)
  const incidents = data.incidents ?? [];
  if (incidents.length > 0) {
    ensureSpace(doc, 40 + incidents.length * 18);
    sectionTitle(doc, "Gastos extraordinarios justificados");
    for (const inc of incidents) {
      const fecha = new Date(inc.date).toLocaleDateString("es-ES");
      let label = `${INCIDENT_LABELS[inc.type] ?? inc.type} · ${fecha} — ${inc.description}`;
      if (label.length > 68) label = label.slice(0, 66) + "…";
      row(doc, label, eur(inc.cost), { color: COLORS.red });
    }
  }

  // Comparativa con mes anterior
  if (previous) {
    ensureSpace(doc, 110);
    sectionTitle(doc, "Comparativa con el mes anterior");
    row(doc, "Ingresos", `${eur(previous.grossRevenue)}   ${ARROW}   ${eur(kpis.grossRevenue)}`);
    row(doc, "Gastos", `${eur(previous.totalExpenses)}   ${ARROW}   ${eur(kpis.totalExpenses)}`);
    const diff = kpis.netProfit - previous.netProfit;
    row(doc, "Beneficio neto", `${eur(previous.netProfit)}   ${ARROW}   ${eur(kpis.netProfit)}   (${signedEur(diff)})`, {
      bold: true,
      color: diff >= 0 ? COLORS.green : COLORS.red,
    });
  }

  // Conclusión
  ensureSpace(doc, 120);
  sectionTitle(doc, "Conclusión del análisis");
  calloutBox(
    doc,
    buildConclusion(kpis),
    kpis.isProfitable ? COLORS.green : COLORS.red,
    kpis.isProfitable ? COLORS.greenSoft : COLORS.redSoft
  );

  paintFooters(doc, data.brand);
}

function buildConclusion(k: PropertyKpis): string {
  if (k.grossRevenue === 0 && k.totalExpenses === 0) {
    return "No hay datos suficientes este mes para valorar la rentabilidad de la propiedad. Sube el informe de ingresos de tu OTA e introduce los gastos para obtener el análisis completo.";
  }
  if (k.isProfitable) {
    return (
      `La propiedad ha sido RENTABLE este mes, con un beneficio neto de ${eur(k.netProfit)} sobre unos ingresos de ${eur(k.grossRevenue)} ` +
      `(margen del ${pct(k.profitMargin)}). La ocupación alcanzó el ${pct(k.occupancyRate)} con un precio medio por noche de ${eur(k.adr)}. ` +
      `Los gastos supusieron el ${pct(100 - k.profitMargin)} de los ingresos: una estructura de costes saludable que conviene mantener.`
    );
  }
  return (
    `La propiedad NO ha sido rentable este mes: los gastos (${eur(k.totalExpenses)}) superaron a los ingresos (${eur(k.grossRevenue)}), ` +
    `con una pérdida de ${eur(Math.abs(k.netProfit))}. Con una ocupación del ${pct(k.occupancyRate)} y un ADR de ${eur(k.adr)}, ` +
    `se recomienda revisar los gastos fijos y ajustar la estrategia de precios o de ocupación para recuperar el margen.`
  );
}
