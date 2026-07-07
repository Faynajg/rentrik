import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError, asyncHandler } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { computeKpis } from "../services/kpi";
import { getPlan } from "../lib/plans";
import { currentMonth, monthOrCurrent } from "../lib/dates";

const router = Router();
router.use(requireAuth);

/** Carga una propiedad verificando que pertenece al usuario autenticado. */
async function ownedProperty(userId: string, propertyId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property || property.userId !== userId) {
    throw new ApiError(404, "Propiedad no encontrada");
  }
  return property;
}

// GET /api/properties?month=YYYY-MM&platform=Airbnb
// Lista todas las propiedades con sus KPIs del mes indicado.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const month = monthOrCurrent(req.query.month as string | undefined);
    const platform = (req.query.platform as string | undefined)?.trim();

    const properties = await prisma.property.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" },
      include: {
        reservations: { where: { month, ...(platform ? { platform } : {}) } },
        expenses: { where: { month } },
      },
    });

    const data = properties.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      kpis: computeKpis(month, p.reservations, p.expenses),
    }));

    res.json({ month, properties: data });
  })
);

// POST /api/properties
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(1, "El nombre es obligatorio"),
      address: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new ApiError(404, "Usuario no encontrado");

    // Al crear su primera propiedad real, se retira el modo demo (borra el ejemplo).
    await prisma.property.deleteMany({ where: { userId: req.userId!, isDemo: true } });
    if (user.demoMode) {
      await prisma.user.update({ where: { id: req.userId! }, data: { demoMode: false } });
    }

    const count = await prisma.property.count({ where: { userId: req.userId } });
    const plan = getPlan(user.plan);
    if (count >= plan.maxProperties) {
      throw new ApiError(
        403,
        `Tu plan ${plan.name} permite hasta ${plan.maxProperties} propiedades. Mejora de plan para añadir más.`
      );
    }

    const property = await prisma.property.create({
      data: { userId: req.userId!, name: data.name, address: data.address ?? null },
    });
    res.status(201).json({ property });
  })
);

// GET /api/properties/:id?month=YYYY-MM
// Detalle de una propiedad: KPIs del mes, reservas, gastos e histórico.
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    const month = monthOrCurrent(req.query.month as string | undefined);

    const [reservations, expenses, incidents, allReservations, allExpenses, allIncidents] = await Promise.all([
      prisma.reservation.findMany({ where: { propertyId: property.id, month }, orderBy: { checkIn: "asc" } }),
      prisma.expense.findMany({ where: { propertyId: property.id, month }, orderBy: { category: "asc" } }),
      prisma.incident.findMany({ where: { propertyId: property.id, month }, orderBy: { date: "desc" } }),
      prisma.reservation.findMany({ where: { propertyId: property.id } }),
      prisma.expense.findMany({ where: { propertyId: property.id } }),
      prisma.incident.findMany({ where: { propertyId: property.id } }),
    ]);

    const kpis = computeKpis(month, reservations, expenses, incidents);

    // Histórico de los meses con datos (para gráficos de evolución).
    const months = Array.from(
      new Set([
        ...allReservations.map((r) => r.month),
        ...allExpenses.map((e) => e.month),
        ...allIncidents.map((i) => i.month),
      ])
    ).sort();

    const history = months.map((m) =>
      computeKpis(
        m,
        allReservations.filter((r) => r.month === m),
        allExpenses.filter((e) => e.month === m),
        allIncidents.filter((i) => i.month === m)
      )
    );

    res.json({ property, month, kpis, reservations, expenses, incidents, history });
  })
);

// PATCH /api/properties/:id  (editar nombre / dirección)
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    const data = z
      .object({
        name: z.string().min(1, "El nombre es obligatorio").optional(),
        address: z.string().optional(),
        notes: z.string().max(2000, "Máximo 2000 caracteres").optional(),
      })
      .parse(req.body);

    const updated = await prisma.property.update({
      where: { id: property.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.address !== undefined ? { address: data.address || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null, notesUpdatedAt: new Date() } : {}),
      },
    });
    res.json({ property: updated });
  })
);

// PUT /api/properties/:id/seasons  (configuración de temporadas alta/media/baja)
router.put(
  "/:id/seasons",
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    const schema = z.object({
      seasons: z.array(
        z.object({
          type: z.enum(["alta", "media", "baja"]),
          months: z.array(z.number().int().min(1).max(12)),
          targetOccupancy: z.number().min(0).max(100),
          minPrice: z.number().min(0),
        })
      ),
    });
    const data = schema.parse(req.body);
    const updated = await prisma.property.update({
      where: { id: property.id },
      data: { seasonsConfig: JSON.stringify(data) },
    });
    res.json({ property: updated });
  })
);

// DELETE /api/properties/:id
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    await prisma.property.delete({ where: { id: property.id } });
    res.json({ ok: true });
  })
);

export default router;
export { ownedProperty, currentMonth };
