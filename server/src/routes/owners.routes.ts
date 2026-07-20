import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError, asyncHandler } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { requireSubscription } from "../middleware/subscription";
import { currentMonth, monthOrCurrent, previousMonth } from "../lib/dates";
import { dispatchOwnerReport, runMonthlyOwnerReportsForUser } from "../services/ownerReports";

const router = Router();
router.use(requireAuth);
router.use(requireSubscription);

async function ownedOwner(userId: string, ownerId: string) {
  const owner = await prisma.owner.findUnique({ where: { id: ownerId } });
  if (!owner || owner.userId !== userId) throw new ApiError(404, "Propietario no encontrado");
  return owner;
}

const ownerSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/owners
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const owners = await prisma.owner.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" },
      include: {
        properties: { select: { id: true, name: true } },
        _count: { select: { reportLogs: true } },
      },
    });
    res.json({
      owners: owners.map((o) => ({
        id: o.id,
        name: o.name,
        email: o.email,
        phone: o.phone,
        notes: o.notes,
        properties: o.properties,
        reportsCount: o._count.reportLogs,
      })),
    });
  })
);

// POST /api/owners
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = ownerSchema.parse(req.body);
    const owner = await prisma.owner.create({
      data: {
        userId: req.userId!,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
      },
    });
    res.status(201).json({ owner });
  })
);

// GET /api/owners/:id  → ficha completa: datos, propiedades asignadas, disponibles e historial.
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const owner = await ownedOwner(req.userId!, req.params.id);
    const [assigned, allProperties, reportLogs] = await Promise.all([
      prisma.property.findMany({ where: { ownerId: owner.id }, select: { id: true, name: true, address: true } }),
      prisma.property.findMany({ where: { userId: req.userId }, select: { id: true, name: true, ownerId: true } }),
      prisma.reportLog.findMany({ where: { ownerId: owner.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    const { passwordHash, ...safeOwner } = owner;
    res.json({ owner: safeOwner, assigned, allProperties, reportLogs });
  })
);

// PATCH /api/owners/:id
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    await ownedOwner(req.userId!, req.params.id);
    const data = ownerSchema.partial().parse(req.body);
    const owner = await prisma.owner.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      },
    });
    res.json({ owner });
  })
);

// DELETE /api/owners/:id
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await ownedOwner(req.userId!, req.params.id);
    await prisma.owner.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

// PUT /api/owners/:id/properties  { propertyIds: string[] }  → define qué propiedades pertenecen al propietario.
router.put(
  "/:id/properties",
  asyncHandler(async (req, res) => {
    const owner = await ownedOwner(req.userId!, req.params.id);
    const { propertyIds } = z.object({ propertyIds: z.array(z.string()) }).parse(req.body);

    // Solo propiedades del usuario.
    const valid = await prisma.property.findMany({
      where: { userId: req.userId, id: { in: propertyIds } },
      select: { id: true },
    });
    const validIds = valid.map((p) => p.id);

    await prisma.$transaction([
      // Desasigna las que ya no están.
      prisma.property.updateMany({
        where: { ownerId: owner.id, id: { notIn: validIds.length ? validIds : ["__none__"] } },
        data: { ownerId: null },
      }),
      // Asigna las seleccionadas.
      prisma.property.updateMany({ where: { userId: req.userId, id: { in: validIds } }, data: { ownerId: owner.id } }),
    ]);

    const assigned = await prisma.property.findMany({ where: { ownerId: owner.id }, select: { id: true, name: true } });
    res.json({ assigned });
  })
);

// POST /api/owners/:id/portal-access  { password }  → habilita el portal y fija/actualiza la contraseña.
router.post(
  "/:id/portal-access",
  asyncHandler(async (req, res) => {
    const owner = await ownedOwner(req.userId!, req.params.id);
    const { password } = z
      .object({ password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres") })
      .parse(req.body);
    if (!owner.email) throw new ApiError(400, "El propietario necesita un email para acceder al portal.");

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.owner.update({ where: { id: owner.id }, data: { passwordHash, portalEnabled: true } });
    res.json({ ok: true, portalEnabled: true });
  })
);

// DELETE /api/owners/:id/portal-access  → desactiva el acceso al portal.
router.delete(
  "/:id/portal-access",
  asyncHandler(async (req, res) => {
    const owner = await ownedOwner(req.userId!, req.params.id);
    await prisma.owner.update({ where: { id: owner.id }, data: { portalEnabled: false } });
    res.json({ ok: true, portalEnabled: false });
  })
);

// POST /api/owners/:id/send-report  { propertyId, month }  → genera el PDF del propietario y lo envía por email.
router.post(
  "/:id/send-report",
  asyncHandler(async (req, res) => {
    const owner = await ownedOwner(req.userId!, req.params.id);
    const { propertyId, month: monthArg } = z
      .object({ propertyId: z.string().min(1), month: z.string().optional() })
      .parse(req.body);
    if (!owner.email) throw new ApiError(400, "Este propietario no tiene email. Añádelo para poder enviarle informes.");

    const month = monthOrCurrent(monthArg);
    const result = await dispatchOwnerReport({ userId: req.userId!, owner, propertyId, month });
    res.json(result);
  })
);

// POST /api/owners/reports/send-now  { month? }
// Envía ya el informe del mes indicado (por defecto, el mes anterior) a todos los propietarios con email.
router.post(
  "/reports/send-now",
  asyncHandler(async (req, res) => {
    const monthArg = z.object({ month: z.string().optional() }).parse(req.body).month;
    const month = monthArg && /^\d{4}-\d{2}$/.test(monthArg) ? monthArg : previousMonth(currentMonth());
    const sent = await runMonthlyOwnerReportsForUser(req.userId!, month);
    res.json({ sent, month });
  })
);

export default router;
