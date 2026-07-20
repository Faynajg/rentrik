import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ApiError, asyncHandler } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { requireSubscription } from "../middleware/subscription";
import { computeKpis } from "../services/kpi";
import { monthOrCurrent } from "../lib/dates";

const router = Router();
router.use(requireAuth);
router.use(requireSubscription);

/** Escapa un campo para CSV (delimitador ';', compatible con Excel en español). */
function cell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Número con coma decimal (formato europeo, sin símbolo de moneda). */
function numEs(n: number): string {
  return (Math.round((n + Number.EPSILON) * 100) / 100).toString().replace(".", ",");
}

function toCsv(rows: (string | number | null)[][]): string {
  const body = rows.map((r) => r.map(cell).join(";")).join("\r\n");
  return "﻿" + body; // BOM para que Excel detecte UTF-8
}

function sendCsv(res: import("express").Response, filename: string, csv: string) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

// GET /api/export/property/:id/reservations.csv?month=YYYY-MM (month opcional = todas)
router.get(
  "/property/:id/reservations.csv",
  asyncHandler(async (req, res) => {
    const property = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!property || property.userId !== req.userId) throw new ApiError(404, "Propiedad no encontrada");
    const month = req.query.month as string | undefined;

    const reservations = await prisma.reservation.findMany({
      where: { propertyId: property.id, ...(month ? { month } : {}) },
      orderBy: { checkIn: "asc" },
    });

    const rows: (string | number | null)[][] = [
      ["Plataforma", "Huésped", "Entrada", "Salida", "Noches", "Ingreso bruto", "Comisión", "Ingreso neto", "Mes"],
      ...reservations.map((r) => [
        r.platform,
        r.guestName ?? "",
        r.checkIn.toISOString().slice(0, 10),
        r.checkOut.toISOString().slice(0, 10),
        r.nights,
        numEs(r.grossRevenue),
        numEs(r.platformCommission),
        numEs(r.netRevenue),
        r.month,
      ]),
    ];
    sendCsv(res, `reservas-${property.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}${month ? "-" + month : ""}.csv`, toCsv(rows));
  })
);

// GET /api/export/dashboard.csv?month=YYYY-MM  → comparativa de KPIs por propiedad
router.get(
  "/dashboard.csv",
  asyncHandler(async (req, res) => {
    const month = monthOrCurrent(req.query.month as string | undefined);
    const properties = await prisma.property.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" },
      include: {
        reservations: { where: { month } },
        expenses: { where: { month } },
      },
    });

    const rows: (string | number | null)[][] = [
      ["Propiedad", "Ingresos brutos", "Gastos totales", "Beneficio neto", "Margen %", "Ocupación %", "ADR", "RevPAR", "Reservas"],
    ];
    for (const p of properties) {
      const k = computeKpis(month, p.reservations, p.expenses);
      rows.push([
        p.name,
        numEs(k.grossRevenue),
        numEs(k.totalExpenses),
        numEs(k.netProfit),
        numEs(k.profitMargin),
        numEs(k.occupancyRate),
        numEs(k.adr),
        numEs(k.revpar),
        k.reservationsCount,
      ]);
    }
    sendCsv(res, `rentrik-comparativa-${month}.csv`, toCsv(rows));
  })
);

export default router;
