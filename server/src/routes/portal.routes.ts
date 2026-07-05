import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError, asyncHandler } from "../lib/errors";
import { signOwnerToken } from "../lib/jwt";
import { requireOwnerAuth } from "../middleware/ownerAuth";
import { computeKpis } from "../services/kpi";
import { monthOrCurrent } from "../lib/dates";
import { renderOwnerReport } from "../services/reportBuilder";

const router = Router();

// POST /api/portal/login  { email, password }
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = z
      .object({ email: z.string().email("Email inválido"), password: z.string().min(1) })
      .parse(req.body);

    const owners = await prisma.owner.findMany({
      where: { email, portalEnabled: true, passwordHash: { not: null } },
    });

    let matched: (typeof owners)[number] | null = null;
    for (const o of owners) {
      if (o.passwordHash && (await bcrypt.compare(password, o.passwordHash))) {
        matched = o;
        break;
      }
    }
    if (!matched) throw new ApiError(401, "Email o contraseña incorrectos");

    const token = signOwnerToken(matched.id);
    res.json({ token, owner: { id: matched.id, name: matched.name, email: matched.email } });
  })
);

router.use(requireOwnerAuth);

// GET /api/portal/me
router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const owner = await prisma.owner.findUnique({ where: { id: req.ownerId } });
    if (!owner) throw new ApiError(404, "Propietario no encontrado");
    res.json({ owner: { id: owner.id, name: owner.name, email: owner.email } });
  })
);

// GET /api/portal/dashboard?month=YYYY-MM
router.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const month = monthOrCurrent(req.query.month as string | undefined);
    const properties = await prisma.property.findMany({
      where: { ownerId: req.ownerId },
      orderBy: { createdAt: "asc" },
      include: { reservations: true, expenses: true, incidents: true },
    });

    const perProperty = properties.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      kpis: computeKpis(
        month,
        p.reservations.filter((r) => r.month === month),
        p.expenses.filter((e) => e.month === month),
        p.incidents.filter((i) => i.month === month)
      ),
    }));

    const availableMonths = Array.from(
      new Set(properties.flatMap((p) => [...p.reservations.map((r) => r.month), ...p.expenses.map((e) => e.month)]))
    ).sort();
    if (!availableMonths.includes(month)) availableMonths.push(month);
    availableMonths.sort();

    const totals = perProperty.reduce(
      (acc, p) => {
        acc.grossRevenue += p.kpis.grossRevenue;
        acc.totalExpenses += p.kpis.totalExpenses;
        acc.netProfit += p.kpis.netProfit;
        return acc;
      },
      { grossRevenue: 0, totalExpenses: 0, netProfit: 0 }
    );

    res.json({ month, availableMonths, properties: perProperty, totals });
  })
);

// GET /api/portal/properties/:id?month=YYYY-MM  (solo si es del propietario)
router.get(
  "/properties/:id",
  asyncHandler(async (req, res) => {
    const property = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!property || property.ownerId !== req.ownerId) throw new ApiError(404, "Propiedad no encontrada");
    const month = monthOrCurrent(req.query.month as string | undefined);

    const [reservations, expenses, incidents, allRes, allExp, allInc] = await Promise.all([
      prisma.reservation.findMany({ where: { propertyId: property.id, month }, orderBy: { checkIn: "asc" } }),
      prisma.expense.findMany({ where: { propertyId: property.id, month } }),
      prisma.incident.findMany({ where: { propertyId: property.id, month }, orderBy: { date: "desc" } }),
      prisma.reservation.findMany({ where: { propertyId: property.id } }),
      prisma.expense.findMany({ where: { propertyId: property.id } }),
      prisma.incident.findMany({ where: { propertyId: property.id } }),
    ]);

    const kpis = computeKpis(month, reservations, expenses, incidents);
    const months = Array.from(
      new Set([...allRes.map((r) => r.month), ...allExp.map((e) => e.month), ...allInc.map((i) => i.month)])
    ).sort();
    const history = months.map((m) =>
      computeKpis(
        m,
        allRes.filter((r) => r.month === m),
        allExp.filter((e) => e.month === m),
        allInc.filter((i) => i.month === m)
      )
    );

    res.json({ property: { id: property.id, name: property.name, address: property.address }, month, kpis, reservations, incidents, history });
  })
);

// GET /api/portal/reports/property/:id/owner.pdf?month=
router.get(
  "/reports/property/:id/owner.pdf",
  asyncHandler(async (req, res) => {
    const property = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!property || property.ownerId !== req.ownerId) throw new ApiError(404, "Propiedad no encontrada");
    const report = await renderOwnerReport(property.userId, property.id, req.query.month as string | undefined);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${report.filename}"`);
    res.send(report.buffer);
  })
);

export default router;
