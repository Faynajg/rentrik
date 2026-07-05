import { PropertyKpis } from "../kpi";
import { monthLabel } from "../../lib/dates";
import {
  COLORS,
  Doc,
  MARGIN,
  calloutBox,
  contentWidth,
  coverBand,
  ensureSpace,
  eur,
  kpiGrid,
  paintFooters,
  pct,
  sectionTitle,
} from "./theme";

export interface BankReportData {
  brand: string;
  propertyName: string;
  address?: string | null;
  history: PropertyKpis[]; // meses con datos, orden ascendente
}

/** Informe de ingresos verificados para banco/financiación (feature 10). */
export function buildBankReport(doc: Doc, data: BankReportData) {
  const months = data.history.filter((h) => h.grossRevenue > 0 || h.reservationsCount > 0);

  coverBand(doc, {
    brand: data.brand,
    label: "Informe de ingresos verificados",
    title: data.propertyName,
    subtitle: data.address ? data.address : "Documento para entidad financiera / inversor",
  });

  const totalGross = sum(months.map((m) => m.grossRevenue));
  const totalNet = sum(months.map((m) => m.grossRevenue - m.platformCommission));
  const totalNights = sum(months.map((m) => m.occupiedNights));
  const totalReservations = sum(months.map((m) => m.reservationsCount));
  const avgMonthly = months.length ? totalGross / months.length : 0;
  const avgOccupancy = months.length ? sum(months.map((m) => m.occupancyRate)) / months.length : 0;

  doc.font("Helvetica").fontSize(10.5).fillColor(COLORS.text).text(
    "Este documento recoge el histórico de ingresos por alquiler vacacional de la propiedad, " +
      "obtenido directamente de los informes de las plataformas de reserva (Airbnb, Booking, VRBO y otras). " +
      "Los importes reflejan ingresos brutos, comisiones de plataforma e ingresos netos por periodo.",
    MARGIN,
    doc.y,
    { width: contentWidth(doc), lineGap: 3 }
  );
  doc.y += 12;

  sectionTitle(doc, "Resumen de ingresos verificados");
  kpiGrid(
    doc,
    [
      { label: "Ingresos brutos totales", value: eur(totalGross), accent: COLORS.navy },
      { label: "Ingresos netos totales", value: eur(totalNet), accent: COLORS.green },
      { label: "Media mensual", value: eur(avgMonthly), accent: COLORS.navyLight },
      { label: "Meses con actividad", value: String(months.length), accent: COLORS.navyLight },
      { label: "Ocupación media", value: pct(avgOccupancy), accent: COLORS.navyLight },
      { label: "Reservas totales", value: String(totalReservations), accent: COLORS.gold },
    ],
    3,
    58
  );

  sectionTitle(doc, "Detalle mensual verificado");
  tableHeader(doc);
  for (const m of months) {
    ensureSpace(doc, 22);
    if (doc.y < 160) tableHeader(doc); // repite cabecera tras salto de página
    tableRow(doc, m);
  }
  totalsRow(doc, { totalReservations, totalNights, totalGross, totalNet });

  ensureSpace(doc, 110);
  calloutBox(
    doc,
    `Ingresos brutos acumulados de ${eur(totalGross)} en ${months.length} meses de actividad, con una media ` +
      `de ${eur(avgMonthly)} mensuales y una ocupación media del ${pct(avgOccupancy)}. ` +
      `Datos trazables a los informes originales de las plataformas de reserva.`,
    COLORS.navy,
    COLORS.bg
  );

  paintFooters(doc, data.brand);
}

function cols(doc: Doc) {
  const w = contentWidth(doc);
  return {
    month: MARGIN,
    res: MARGIN + w - 330,
    nights: MARGIN + w - 260,
    gross: MARGIN + w - 200,
    commission: MARGIN + w - 110,
    net: MARGIN + w - 10,
  };
}

function tableHeader(doc: Doc) {
  const c = cols(doc);
  const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.faint);
  doc.text("MES", c.month, y);
  doc.text("RESERVAS", c.res - 40, y, { width: 60, align: "right" });
  doc.text("NOCHES", c.nights - 30, y, { width: 55, align: "right" });
  doc.text("BRUTO", c.gross - 30, y, { width: 70, align: "right" });
  doc.text("COMISIÓN", c.commission - 40, y, { width: 80, align: "right" });
  doc.text("NETO", c.net - 70, y, { width: 70, align: "right" });
  doc.moveTo(MARGIN, y + 13).lineTo(doc.page.width - MARGIN, y + 13).lineWidth(0.75).strokeColor(COLORS.border).stroke();
  doc.y = y + 20;
}

function tableRow(doc: Doc, m: PropertyKpis) {
  const c = cols(doc);
  const y = doc.y;
  const net = m.grossRevenue - m.platformCommission;
  doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.text);
  doc.text(capitalize(monthLabel(m.month)), c.month, y, { width: 140 });
  doc.text(String(m.reservationsCount), c.res - 40, y, { width: 60, align: "right" });
  doc.text(String(m.occupiedNights), c.nights - 30, y, { width: 55, align: "right" });
  doc.text(eur(m.grossRevenue), c.gross - 30, y, { width: 70, align: "right" });
  doc.fillColor(COLORS.red).text(eur(m.platformCommission), c.commission - 40, y, { width: 80, align: "right" });
  doc.font("Helvetica-Bold").fillColor(COLORS.green).text(eur(net), c.net - 70, y, { width: 70, align: "right" });
  doc.y = y + 17;
  doc.moveTo(MARGIN, doc.y - 3).lineTo(doc.page.width - MARGIN, doc.y - 3).lineWidth(0.4).strokeColor("#EEF2F7").stroke();
}

function totalsRow(doc: Doc, t: { totalReservations: number; totalNights: number; totalGross: number; totalNet: number }) {
  const c = cols(doc);
  const y = doc.y + 3;
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.ink);
  doc.text("TOTAL", c.month, y, { width: 140 });
  doc.text(String(t.totalReservations), c.res - 40, y, { width: 60, align: "right" });
  doc.text(String(t.totalNights), c.nights - 30, y, { width: 55, align: "right" });
  doc.text(eur(t.totalGross), c.gross - 30, y, { width: 70, align: "right" });
  doc.text("", c.commission - 40, y, { width: 80, align: "right" });
  doc.fillColor(COLORS.green).text(eur(t.totalNet), c.net - 70, y, { width: 70, align: "right" });
  doc.y = y + 20;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function sum(a: number[]) {
  return a.reduce((x, y) => x + y, 0);
}
