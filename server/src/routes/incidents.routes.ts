import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError, asyncHandler } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { requireSubscription } from "../middleware/subscription";
import { ownedProperty } from "./properties.routes";

const router = Router();
router.use(requireAuth);
router.use(requireSubscription);

const TYPES = ["reparacion", "queja", "problema", "otro"] as const;

// GET /api/properties/:id/incidents?month=YYYY-MM (month opcional)
router.get(
  "/:id/incidents",
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    const month = req.query.month as string | undefined;
    const incidents = await prisma.incident.findMany({
      where: { propertyId: property.id, ...(month ? { month } : {}) },
      orderBy: { date: "desc" },
    });
    res.json({ incidents });
  })
);

// POST /api/properties/:id/incidents
router.post(
  "/:id/incidents",
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    const data = z
      .object({
        type: z.enum(TYPES),
        description: z.string().min(1, "La descripción es obligatoria"),
        cost: z.number().nonnegative().default(0),
        date: z.string().min(1, "La fecha es obligatoria"),
      })
      .parse({ ...req.body, cost: Number(req.body.cost ?? 0) });

    const date = new Date(data.date);
    if (isNaN(date.getTime())) throw new ApiError(400, "Fecha inválida");
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const incident = await prisma.incident.create({
      data: { propertyId: property.id, type: data.type, description: data.description, cost: data.cost, date, month },
    });
    res.status(201).json({ incident });
  })
);

// DELETE /api/properties/:id/incidents/:incidentId
router.delete(
  "/:id/incidents/:incidentId",
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    const inc = await prisma.incident.findUnique({ where: { id: req.params.incidentId } });
    if (!inc || inc.propertyId !== property.id) throw new ApiError(404, "Incidencia no encontrada");
    await prisma.incident.delete({ where: { id: inc.id } });
    res.json({ ok: true });
  })
);

export default router;
