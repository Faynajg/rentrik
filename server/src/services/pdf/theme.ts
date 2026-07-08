import PDFDocument from "pdfkit";
import { formatMoney } from "../../lib/currency";

/** Paleta de marca Rentrik para los informes PDF. */
export const COLORS = {
  navy: "#1E3A5F",
  navyLight: "#2C5282",
  navyDark: "#152B47",
  ink: "#0F1B2D",
  green: "#16A34A",
  greenLight: "#2ECC71",
  greenSoft: "#E7F7EE",
  red: "#DC2626",
  redSoft: "#FBE9E9",
  gold: "#C79A3C",
  goldSoft: "#FBF4E4",
  bg: "#F6F8FB",
  panel: "#F1F5F9",
  border: "#E2E8F0",
  text: "#1F2937",
  muted: "#64748B",
  faint: "#94A3B8",
  white: "#FFFFFF",
  headText: "#C3D6EC",
};

// Paleta para segmentos de gráficos (categorías / plataformas).
export const CHART_PALETTE = ["#1E3A5F", "#2C5282", "#C79A3C", "#94A3B8", "#16A34A", "#7F9FC4"];

export const MARGIN = 48;
export type Doc = PDFKit.PDFDocument;

// Moneda activa para el informe en curso (se fija antes de construir cada PDF).
let activeCurrency = "EUR";
export function setReportCurrency(code: string) {
  activeCurrency = code || "EUR";
}

export function eur(n: number): string {
  return formatMoney(n, activeCurrency);
}

export function eur0(n: number): string {
  return formatMoney(n, activeCurrency, 0);
}

export function signedEur(n: number): string {
  return `${n >= 0 ? "+" : "-"}${eur(Math.abs(n))}`;
}

/** Flecha "de → a" segura para la codificación WinAnsi de pdfkit. */
export const ARROW = "»"; // »

export function pct(n: number): string {
  return `${(Math.round(n * 10) / 10).toLocaleString("es-ES")} %`;
}

export function contentWidth(doc: Doc): number {
  return doc.page.width - MARGIN * 2;
}

/** Dibuja el isotipo de Rentrik (casa con línea de tendencia). */
export function drawMark(doc: Doc, x: number, y: number, size: number) {
  const s = size;
  doc.save();
  doc.roundedRect(x, y, s, s, s * 0.28).fill(COLORS.white);
  const p = (n: number) => x + (n / 32) * s;
  const q = (n: number) => y + (n / 32) * s;
  doc
    .moveTo(p(7), q(22)).lineTo(p(7), q(12)).lineTo(p(16), q(7.5)).lineTo(p(25), q(12)).lineTo(p(25), q(22))
    .lineWidth(s * 0.062).lineJoin("round").lineCap("round").strokeColor(COLORS.navy).stroke();
  doc
    .moveTo(p(12), q(22)).lineTo(p(12), q(16)).lineTo(p(20), q(16)).lineTo(p(20), q(22))
    .lineWidth(s * 0.062).lineJoin("round").strokeColor(COLORS.green).stroke();
  doc.restore();
}

/**
 * Cabecera del informe: banda con degradado, marca, etiqueta y título.
 * Devuelve la Y donde empieza el contenido.
 */
export function coverBand(
  doc: Doc,
  opts: { brand: string; label: string; title: string; subtitle: string; height?: number }
): number {
  const h = opts.height ?? 150;
  const w = doc.page.width;
  const grad = doc.linearGradient(0, 0, w, h);
  grad.stop(0, COLORS.navyDark).stop(0.55, COLORS.navy).stop(1, COLORS.navyLight);
  doc.rect(0, 0, w, h).fill(grad);

  // Textura sutil de puntos
  doc.save();
  doc.fillColor(COLORS.white).opacity(0.05);
  for (let gx = w - 200; gx < w - 20; gx += 16) {
    for (let gy = 20; gy < h - 20; gy += 16) {
      doc.circle(gx, gy, 1.2).fill();
    }
  }
  doc.restore();
  doc.opacity(1);

  // Marca
  drawMark(doc, MARGIN, 34, 30);
  doc.font("Helvetica-Bold").fontSize(18).fillColor(COLORS.white).text(opts.brand, MARGIN + 40, 40);
  doc
    .font("Helvetica-Bold").fontSize(8).fillColor(COLORS.headText)
    .text(opts.label.toUpperCase(), MARGIN + 40, 62, { characterSpacing: 1.5 });

  // Título
  doc.font("Helvetica-Bold").fontSize(23).fillColor(COLORS.white).text(opts.title, MARGIN, 92, {
    width: contentWidth(doc),
  });
  doc.font("Helvetica").fontSize(11).fillColor(COLORS.headText).text(opts.subtitle, MARGIN, 122);

  doc.y = h + 26;
  doc.x = MARGIN;
  return doc.y;
}

/** Bloque destacado del beneficio neto (el dato estrella). */
export function heroProfit(
  doc: Doc,
  opts: { profit: number; margin: number; profitable: boolean; caption: string }
) {
  const x = MARGIN;
  const y = doc.y;
  const w = contentWidth(doc);
  const h = 92;
  const accent = opts.profitable ? COLORS.green : COLORS.red;
  const soft = opts.profitable ? COLORS.greenSoft : COLORS.redSoft;

  doc.roundedRect(x, y, w, h, 12).fill(soft);
  doc.roundedRect(x, y, w, h, 12).lineWidth(1).strokeColor(accent).opacity(0.35).stroke();
  doc.opacity(1);
  doc.rect(x, y, 5, h).fill(accent);

  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.muted)
    .text("BENEFICIO NETO REAL", x + 22, y + 18, { characterSpacing: 1 });
  doc.font("Helvetica-Bold").fontSize(34).fillColor(accent).text(eur(opts.profit), x + 20, y + 32);

  // Píldora de estado a la derecha
  const badge = opts.profitable ? "RENTABLE" : "NO RENTABLE";
  const bw = doc.widthOfString(badge) + 24;
  doc.roundedRect(x + w - bw - 22, y + 20, bw, 22, 11).fill(accent);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.white)
    .text(badge, x + w - bw - 22, y + 26, { width: bw, align: "center", characterSpacing: 0.5 });
  doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.muted)
    .text(opts.caption, x + w - 200 - 22, y + 52, { width: 200, align: "right" });

  doc.y = y + h + 22;
  doc.x = MARGIN;
}

/** Rejilla de tarjetas KPI. `cols` por fila; altura fija. */
export function kpiGrid(
  doc: Doc,
  cards: { label: string; value: string; accent?: string }[],
  cols: number,
  cardH = 60
) {
  const gap = 12;
  const w = contentWidth(doc);
  const cardW = (w - gap * (cols - 1)) / cols;
  const startY = doc.y;
  cards.forEach((c, i) => {
    const col = i % cols;
    const rowN = Math.floor(i / cols);
    const x = MARGIN + col * (cardW + gap);
    const y = startY + rowN * (cardH + gap);
    kpiTile(doc, x, y, cardW, cardH, c.label, c.value, c.accent ?? COLORS.navy);
  });
  const rows = Math.ceil(cards.length / cols);
  doc.y = startY + rows * (cardH + gap) + 4;
  doc.x = MARGIN;
}

export function kpiTile(doc: Doc, x: number, y: number, w: number, h: number, label: string, value: string, accent: string) {
  doc.roundedRect(x, y, w, h, 9).fill(COLORS.white);
  doc.roundedRect(x, y, w, h, 9).lineWidth(1).strokeColor(COLORS.border).stroke();
  doc.circle(x + 15, y + 17, 3).fill(accent);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(COLORS.faint)
    .text(label.toUpperCase(), x + 24, y + 14, { width: w - 30, characterSpacing: 0.5 });
  doc.font("Helvetica-Bold").fontSize(15).fillColor(COLORS.ink).text(value, x + 14, y + 30, { width: w - 24 });
}

/** Título de sección con tick de acento. */
export function sectionTitle(doc: Doc, text: string) {
  const y = doc.y;
  doc.roundedRect(MARGIN, y + 1, 4, 15, 2).fill(COLORS.gold);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.navy).text(text, MARGIN + 12, y);
  doc.y = y + 24;
  doc.x = MARGIN;
  doc.fillColor(COLORS.text);
}

/** Donut a partir de segmentos con valor y color. Dibuja también leyenda a la derecha. */
export function donutWithLegend(
  doc: Doc,
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  segments: { label: string; value: number; color: string }[],
  legendX: number
) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  let start = -Math.PI / 2;
  if (total <= 0) {
    doc.circle(cx, cy, rOuter).lineWidth(rOuter - rInner).strokeColor(COLORS.border).stroke();
  } else {
    for (const seg of segments) {
      if (seg.value <= 0) continue;
      const angle = (seg.value / total) * Math.PI * 2;
      const end = start + angle;
      const steps = Math.max(2, Math.ceil(angle / 0.12));
      const outer = (a: number): [number, number] => [cx + rOuter * Math.cos(a), cy + rOuter * Math.sin(a)];
      const inner = (a: number): [number, number] => [cx + rInner * Math.cos(a), cy + rInner * Math.sin(a)];
      doc.moveTo(...outer(start));
      for (let i = 1; i <= steps; i++) doc.lineTo(...outer(start + (angle * i) / steps));
      doc.lineTo(...inner(end));
      for (let i = 1; i <= steps; i++) doc.lineTo(...inner(end - (angle * i) / steps));
      doc.closePath().fill(seg.color);
      start = end;
    }
  }
  // Leyenda
  const labelW = 150;
  let ly = cy - segments.length * 9;
  for (const seg of segments) {
    const share = total > 0 ? (seg.value / total) * 100 : 0;
    doc.roundedRect(legendX, ly, 9, 9, 2).fill(seg.color);
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.text)
      .text(seg.label, legendX + 15, ly - 1, { width: labelW, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.muted)
      .text(pct(share), legendX + 15 + labelW + 4, ly - 1, { width: 46, align: "right", lineBreak: false });
    ly += 18;
  }
}

/** Barras horizontales comparativas con etiqueta y valor. */
export function barCompare(
  doc: Doc,
  items: { label: string; value: number; color: string }[],
  opts: { labelW?: number; max?: number } = {}
) {
  const x = MARGIN;
  const labelW = opts.labelW ?? 90;
  const valueW = 84;
  const track = contentWidth(doc) - labelW - valueW - 12;
  const max = opts.max ?? Math.max(1, ...items.map((i) => Math.abs(i.value)));
  for (const item of items) {
    const y = doc.y;
    doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.text).text(item.label, x, y + 3, { width: labelW });
    doc.roundedRect(x + labelW, y, track, 18, 4).fill(COLORS.panel);
    const w = Math.max(3, (Math.abs(item.value) / max) * track);
    doc.roundedRect(x + labelW, y, w, 18, 4).fill(item.color);
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.ink)
      .text(eur(item.value), x + labelW + track + 12, y + 4, { width: valueW, align: "right" });
    doc.y = y + 28;
  }
  doc.x = MARGIN;
}

/** Fila etiqueta/valor. */
export function row(doc: Doc, label: string, value: string, opts: { bold?: boolean; color?: string; indent?: number } = {}) {
  const y = doc.y;
  const x = MARGIN + (opts.indent ?? 0);
  const font = opts.bold ? "Helvetica-Bold" : "Helvetica";
  doc.font(font).fontSize(10).fillColor(opts.color ?? COLORS.text).text(label, x, y, { width: 320 });
  doc.font(font).fontSize(10).fillColor(opts.color ?? COLORS.text)
    .text(value, doc.page.width - MARGIN - 200, y, { width: 200, align: "right" });
  doc.y = y + 17;
  doc.x = MARGIN;
}

export function divider(doc: Doc, gap = 6) {
  doc.moveTo(MARGIN, doc.y + gap).lineTo(doc.page.width - MARGIN, doc.y + gap)
    .lineWidth(0.75).strokeColor(COLORS.border).stroke();
  doc.y += gap * 2;
}

/** Caja de texto con acento lateral (conclusión / recomendaciones). */
export function calloutBox(doc: Doc, text: string, accent = COLORS.navy, bg = COLORS.bg) {
  const x = MARGIN;
  const y = doc.y;
  const w = contentWidth(doc);
  const pad = 16;
  const textW = w - pad * 2 - 6;
  doc.font("Helvetica").fontSize(10.5);
  const th = doc.heightOfString(text, { width: textW, lineGap: 3 });
  const h = th + pad * 2;
  doc.roundedRect(x, y, w, h, 10).fill(bg);
  doc.rect(x, y, 4, h).fill(accent);
  doc.fillColor(COLORS.text).text(text, x + pad + 6, y + pad, { width: textW, lineGap: 3 });
  doc.y = y + h + 12;
  doc.x = MARGIN;
}

/** Pie con marca, numeración y confidencialidad. Se aplica a todas las páginas. */
export function paintFooters(doc: Doc, brand: string) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    // Evita que pdfkit añada páginas al escribir por debajo del margen inferior.
    doc.page.margins.bottom = 0;
    const y = doc.page.height - 34;
    doc.moveTo(MARGIN, y).lineTo(doc.page.width - MARGIN, y).lineWidth(0.75).strokeColor(COLORS.border).stroke();
    doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.faint)
      .text(`${brand} · Informe de rentabilidad · Confidencial`, MARGIN, y + 8, { width: 300, lineBreak: false });
    doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.faint)
      .text(`Generado el ${new Date().toLocaleDateString("es-ES")}   ·   Página ${i + 1} de ${range.count}`,
        doc.page.width - MARGIN - 260, y + 8, { width: 260, align: "right", lineBreak: false });
  }
}

/** Salto de página si no queda espacio suficiente. */
export function ensureSpace(doc: Doc, needed: number) {
  if (doc.y + needed > doc.page.height - 50) {
    doc.addPage();
    doc.y = MARGIN;
    doc.x = MARGIN;
  }
}

export { PDFDocument };
