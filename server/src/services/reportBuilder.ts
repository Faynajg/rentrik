import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { computeKpis } from "./kpi";
import { getPlan } from "../lib/plans";
import { monthOrCurrent, previousMonth, monthLabel } from "../lib/dates";
import { PDFDocument, setReportCurrency } from "./pdf/theme";
import { approxRate } from "./currency";
import type { Expense, Reservation } from "@prisma/client";
import { buildOwnerReport } from "./pdf/ownerReport";
import { buildManagerReport } from "./pdf/managerReport";
import { buildBankReport } from "./pdf/bankReport";

/** Renderiza un PDF a un Buffer (para descargar o adjuntar a un email). */
function renderToBuffer(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    build(doc);
    doc.end();
  });
}

async function brandAndCurrency(userId: string): Promise<{ brand: string; currency: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const brand = user && getPlan(user.plan).ownBranding && user.companyName ? user.companyName : "Rentrik";
  return { brand, currency: user?.currency ?? "EUR" };
}

/** Convierte reservas y gastos de una propiedad a la moneda base (para el consolidado). */
function toBase(reservations: Reservation[], expenses: Expense[], from: string, base: string) {
  const rate = approxRate(from || "EUR", base);
  if (rate === 1) return { reservations, expenses };
  return {
    reservations: reservations.map((r) => ({
      ...r,
      grossRevenue: r.grossRevenue * rate,
      platformCommission: r.platformCommission * rate,
      netRevenue: r.netRevenue * rate,
    })),
    expenses: expenses.map((e) => (e.isPercent ? e : { ...e, amount: e.amount * rate })),
  };
}

export function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export interface RenderedReport {
  buffer: Buffer;
  filename: string;
  propertyName?: string;
  monthLabelText: string;
}

export async function renderOwnerReport(userId: string, propertyId: string, monthArg?: string): Promise<RenderedReport> {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property || property.userId !== userId) throw new ApiError(404, "Propiedad no encontrada");

  const month = monthOrCurrent(monthArg);
  const prevMonth = previousMonth(month);

  const [reservations, expenses, incidents, prevReservations, prevExpenses, prevIncidents] = await Promise.all([
    prisma.reservation.findMany({ where: { propertyId: property.id, month } }),
    prisma.expense.findMany({ where: { propertyId: property.id, month } }),
    prisma.incident.findMany({ where: { propertyId: property.id, month }, orderBy: { date: "desc" } }),
    prisma.reservation.findMany({ where: { propertyId: property.id, month: prevMonth } }),
    prisma.expense.findMany({ where: { propertyId: property.id, month: prevMonth } }),
    prisma.incident.findMany({ where: { propertyId: property.id, month: prevMonth } }),
  ]);

  const kpis = computeKpis(month, reservations, expenses, incidents);
  const previous =
    prevReservations.length || prevExpenses.length
      ? computeKpis(prevMonth, prevReservations, prevExpenses, prevIncidents)
      : null;

  const { brand } = await brandAndCurrency(userId);
  setReportCurrency(property.currency); // el informe de una propiedad va en su moneda

  const buffer = await renderToBuffer((doc) =>
    buildOwnerReport(doc, { brand, propertyName: property.name, month, kpis, previous, incidents })
  );
  return {
    buffer,
    filename: `informe-propietario-${slug(property.name)}-${month}.pdf`,
    propertyName: property.name,
    monthLabelText: monthLabel(month),
  };
}

export async function renderManagerReport(userId: string, monthArg?: string): Promise<RenderedReport> {
  const month = monthOrCurrent(monthArg);
  const properties = await prisma.property.findMany({
    where: { userId },
    include: {
      reservations: { where: { month } },
      expenses: { where: { month } },
    },
  });
  if (properties.length === 0) throw new ApiError(400, "No tienes propiedades para generar el informe");

  const { brand, currency } = await brandAndCurrency(userId); // currency = moneda base
  // El informe consolidado de la gestora va en la moneda base: se convierte
  // cada propiedad desde su moneda antes de calcular sus KPIs.
  const items = properties.map((p) => {
    const c = toBase(p.reservations, p.expenses, p.currency, currency);
    return { name: p.name, kpis: computeKpis(month, c.reservations, c.expenses) };
  });
  setReportCurrency(currency);

  const buffer = await renderToBuffer((doc) => buildManagerReport(doc, { brand, month, items }));
  return { buffer, filename: `informe-gestora-${month}.pdf`, monthLabelText: monthLabel(month) };
}

/** Informe de ingresos verificados para banco/financiación (feature 10). */
export async function renderBankReport(userId: string, propertyId: string): Promise<RenderedReport> {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property || property.userId !== userId) throw new ApiError(404, "Propiedad no encontrada");

  const [reservations, expenses, incidents] = await Promise.all([
    prisma.reservation.findMany({ where: { propertyId: property.id } }),
    prisma.expense.findMany({ where: { propertyId: property.id } }),
    prisma.incident.findMany({ where: { propertyId: property.id } }),
  ]);

  const months = Array.from(
    new Set([...reservations.map((r) => r.month), ...expenses.map((e) => e.month), ...incidents.map((i) => i.month)])
  ).sort();
  const history = months.map((m) =>
    computeKpis(
      m,
      reservations.filter((r) => r.month === m),
      expenses.filter((e) => e.month === m),
      incidents.filter((i) => i.month === m)
    )
  );

  const { brand } = await brandAndCurrency(userId);
  setReportCurrency(property.currency); // ingresos verificados en la moneda de la propiedad

  const buffer = await renderToBuffer((doc) =>
    buildBankReport(doc, { brand, propertyName: property.name, address: property.address, history })
  );
  return {
    buffer,
    filename: `informe-ingresos-${slug(property.name)}.pdf`,
    propertyName: property.name,
    monthLabelText: "",
  };
}
