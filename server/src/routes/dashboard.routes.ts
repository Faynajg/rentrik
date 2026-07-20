import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { requireSubscription } from "../middleware/subscription";
import { computeKpis, PropertyKpis } from "../services/kpi";
import { monthOrCurrent } from "../lib/dates";
import { approxRate } from "../services/currency";
import type { Expense, Property, Reservation } from "@prisma/client";

const router = Router();
router.use(requireAuth);
router.use(requireSubscription);

type PropertyWithData = Property & { reservations: Reservation[]; expenses: Expense[] };

/**
 * Convierte los importes de cada propiedad de su moneda a la moneda base del
 * usuario (aproximado), para poder consolidar el portfolio en una sola moneda.
 * Los gastos porcentuales (isPercent) se dejan igual: escalan solos con los ingresos.
 */
function convertToBase(properties: PropertyWithData[], base: string): PropertyWithData[] {
  return properties.map((p) => {
    const rate = approxRate(p.currency || "EUR", base);
    if (rate === 1) return p;
    return {
      ...p,
      reservations: p.reservations.map((r) => ({
        ...r,
        grossRevenue: round(r.grossRevenue * rate),
        platformCommission: round(r.platformCommission * rate),
        netRevenue: round(r.netRevenue * rate),
      })),
      expenses: p.expenses.map((e) => (e.isPercent ? e : { ...e, amount: round(e.amount * rate) })),
    };
  });
}

/** Moneda base del usuario (para el consolidado). */
async function userBaseCurrency(userId: string | undefined): Promise<string> {
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  return user?.currency ?? "EUR";
}

// GET /api/dashboard?month=YYYY-MM&platform=Airbnb
// Resumen consolidado + KPIs por propiedad + datos para gráficos.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const month = monthOrCurrent(req.query.month as string | undefined);
    const platform = (req.query.platform as string | undefined)?.trim();

    const base = await userBaseCurrency(req.userId);
    const rawProperties = await prisma.property.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" },
      include: {
        reservations: true,
        expenses: true,
      },
    });
    // Consolidación: todos los importes en la moneda base del usuario.
    const converted = rawProperties.some((p) => (p.currency || "EUR") !== base);
    const properties = convertToBase(rawProperties, base);

    // KPIs del mes seleccionado por propiedad.
    const perProperty = properties.map((p) => {
      const monthReservations = p.reservations.filter(
        (r) => r.month === month && (!platform || r.platform === platform)
      );
      const monthExpenses = p.expenses.filter((e) => e.month === month);
      return {
        id: p.id,
        name: p.name,
        address: p.address,
        kpis: computeKpis(month, monthReservations, monthExpenses),
      };
    });

    // Totales consolidados.
    const totals = perProperty.reduce(
      (acc, p) => {
        acc.grossRevenue += p.kpis.grossRevenue;
        acc.totalExpenses += p.kpis.totalExpenses;
        acc.netProfit += p.kpis.netProfit;
        acc.occupiedNights += p.kpis.occupiedNights;
        acc.availableNights += p.kpis.availableNights;
        acc.reservationsCount += p.kpis.reservationsCount;
        return acc;
      },
      {
        grossRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        occupiedNights: 0,
        availableNights: 0,
        reservationsCount: 0,
      }
    );

    const occupancyRate =
      totals.availableNights > 0 ? (totals.occupiedNights / totals.availableNights) * 100 : 0;
    const adr = totals.occupiedNights > 0 ? totals.grossRevenue / totals.occupiedNights : 0;

    // Meses con datos (para el selector de periodo).
    const availableMonths = Array.from(
      new Set(
        properties.flatMap((p) => [
          ...p.reservations.map((r) => r.month),
          ...p.expenses.map((e) => e.month),
        ])
      )
    ).sort();
    if (!availableMonths.includes(month)) availableMonths.push(month);
    availableMonths.sort();

    // Evolución mensual consolidada (ingresos vs gastos, ocupación).
    const evolution = availableMonths.map((m) => {
      const kpisList: PropertyKpis[] = properties.map((p) =>
        computeKpis(
          m,
          p.reservations.filter((r) => r.month === m),
          p.expenses.filter((e) => e.month === m)
        )
      );
      const gross = round(kpisList.reduce((a, k) => a + k.grossRevenue, 0));
      const expenses = round(kpisList.reduce((a, k) => a + k.totalExpenses, 0));
      const occNights = kpisList.reduce((a, k) => a + k.occupiedNights, 0);
      const availNights = kpisList.reduce((a, k) => a + k.availableNights, 0);
      return {
        month: m,
        grossRevenue: gross,
        totalExpenses: expenses,
        netProfit: round(gross - expenses),
        occupancyRate: availNights > 0 ? round((occNights / availNights) * 100) : 0,
      };
    });

    // Desglose de gastos consolidado del mes seleccionado.
    const expenseBreakdown = perProperty.reduce(
      (acc, p) => {
        acc.fijo += p.kpis.expenseBreakdown.fijo;
        acc.variable += p.kpis.expenseBreakdown.variable;
        acc.plataforma += p.kpis.expenseBreakdown.plataforma;
        acc.gestion += p.kpis.expenseBreakdown.gestion;
        return acc;
      },
      { fijo: 0, variable: 0, plataforma: 0, gestion: 0 }
    );

    // Estado de configuración para el onboarding guiado (sobre todos los meses).
    const setup = {
      hasProperty: properties.length > 0,
      hasReservations: properties.some((p) => p.reservations.length > 0),
      hasExpenses: properties.some((p) => p.expenses.length > 0),
      firstPropertyId: properties[0]?.id ?? null,
    };

    res.json({
      month,
      availableMonths,
      setup,
      baseCurrency: base,
      converted,
      totals: {
        ...totals,
        grossRevenue: round(totals.grossRevenue),
        totalExpenses: round(totals.totalExpenses),
        netProfit: round(totals.netProfit),
        occupancyRate: round(occupancyRate),
        adr: round(adr),
        propertiesCount: properties.length,
      },
      properties: perProperty,
      evolution,
      expenseBreakdown: {
        fijo: round(expenseBreakdown.fijo),
        variable: round(expenseBreakdown.variable),
        plataforma: round(expenseBreakdown.plataforma),
        gestion: round(expenseBreakdown.gestion),
      },
    });
  })
);

// GET /api/dashboard/seasonality?year=2026&propertyId=all|<id>
// Serie mensual (12 meses) de ingresos, gastos, beneficio y ocupación.
router.get(
  "/seasonality",
  asyncHandler(async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const propertyId = (req.query.propertyId as string | undefined) ?? "all";

    const base = await userBaseCurrency(req.userId);
    const rawProperties = await prisma.property.findMany({
      where: { userId: req.userId, ...(propertyId !== "all" ? { id: propertyId } : {}) },
      include: { reservations: true, expenses: true },
    });
    const properties = convertToBase(rawProperties, base);

    const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
    const series = months.map((m) => {
      const kpisList = properties.map((p) =>
        computeKpis(
          m,
          p.reservations.filter((r) => r.month === m),
          p.expenses.filter((e) => e.month === m)
        )
      );
      const gross = kpisList.reduce((a, k) => a + k.grossRevenue, 0);
      const expenses = kpisList.reduce((a, k) => a + k.totalExpenses, 0);
      const occNights = kpisList.reduce((a, k) => a + k.occupiedNights, 0);
      const availNights = kpisList.reduce((a, k) => a + k.availableNights, 0);
      return {
        month: m,
        grossRevenue: round(gross),
        totalExpenses: round(expenses),
        netProfit: round(gross - expenses),
        occupancyRate: availNights > 0 ? round((occNights / availNights) * 100) : 0,
      };
    });

    res.json({ year, propertyId, series, propertiesCount: properties.length });
  })
);

// GET /api/dashboard/history?propertyId=all|<id>
// Todos los meses con datos, con KPIs por mes (evolución histórica).
router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const propertyId = (req.query.propertyId as string | undefined) ?? "all";
    const base = await userBaseCurrency(req.userId);
    const rawProperties = await prisma.property.findMany({
      where: { userId: req.userId, ...(propertyId !== "all" ? { id: propertyId } : {}) },
      include: { reservations: true, expenses: true },
    });
    const properties = convertToBase(rawProperties, base);

    const monthsSet = new Set<string>();
    for (const p of properties) {
      p.reservations.forEach((r) => monthsSet.add(r.month));
      p.expenses.forEach((e) => monthsSet.add(e.month));
    }
    const months = Array.from(monthsSet).sort();

    const series = months.map((m) => {
      const kpisList = properties.map((p) =>
        computeKpis(
          m,
          p.reservations.filter((r) => r.month === m),
          p.expenses.filter((e) => e.month === m)
        )
      );
      const gross = kpisList.reduce((a, k) => a + k.grossRevenue, 0);
      const expenses = kpisList.reduce((a, k) => a + k.totalExpenses, 0);
      const occNights = kpisList.reduce((a, k) => a + k.occupiedNights, 0);
      const availNights = kpisList.reduce((a, k) => a + k.availableNights, 0);
      const reservationsCount = kpisList.reduce((a, k) => a + k.reservationsCount, 0);
      return {
        month: m,
        grossRevenue: round(gross),
        totalExpenses: round(expenses),
        netProfit: round(gross - expenses),
        occupancyRate: availNights > 0 ? round((occNights / availNights) * 100) : 0,
        reservationsCount,
      };
    });

    res.json({ propertyId, series });
  })
);

function round(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export default router;
