import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError, asyncHandler } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { requireSubscription } from "../middleware/subscription";
import { ownedProperty } from "./properties.routes";
import { parseReservationsCsv } from "../services/csvParser";

const router = Router();
router.use(requireAuth);
router.use(requireSubscription);

// Archivo en memoria (hasta 5 MB), sólo CSV/Excel exportado como texto.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// POST /api/properties/:id/reservations/upload
// Campo de formulario "file"; opcional "platform" para forzar la OTA.
router.post(
  "/:id/reservations/upload",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    if (!req.file) throw new ApiError(400, "No se ha subido ningún archivo");

    const content = req.file.buffer.toString("utf-8");
    const forced = (req.body.platform as string | undefined)?.trim();
    const parsed = parseReservationsCsv(content, forced);

    if (parsed.reservations.length === 0) {
      throw new ApiError(
        422,
        "No se han podido extraer reservas del archivo. Comprueba que es un CSV de ingresos válido."
      );
    }

    const months = Array.from(new Set(parsed.reservations.map((r) => r.month))).sort();

    // Evita duplicados al re-subir: descarta reservas ya existentes con la misma
    // huella (plataforma + entrada + salida + ingreso bruto) en los meses afectados.
    const existing = await prisma.reservation.findMany({
      where: { propertyId: property.id, month: { in: months } },
      select: { platform: true, checkIn: true, checkOut: true, grossRevenue: true },
    });
    const fingerprint = (r: { platform: string; checkIn: Date; checkOut: Date; grossRevenue: number }) =>
      `${r.platform}|${r.checkIn.getTime()}|${r.checkOut.getTime()}|${Math.round(r.grossRevenue * 100)}`;
    const seen = new Set(existing.map(fingerprint));

    const toInsert = parsed.reservations.filter((r) => {
      const fp = fingerprint(r);
      if (seen.has(fp)) return false;
      seen.add(fp); // también evita duplicados dentro del propio archivo
      return true;
    });

    if (toInsert.length > 0) {
      await prisma.reservation.createMany({
        data: toInsert.map((r) => ({
          propertyId: property.id,
          platform: r.platform,
          guestName: r.guestName,
          bookingDate: r.bookingDate,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          nights: r.nights,
          grossRevenue: r.grossRevenue,
          platformCommission: r.platformCommission,
          netRevenue: r.netRevenue,
          month: r.month,
        })),
      });
    }

    res.status(201).json({
      imported: toInsert.length,
      duplicates: parsed.reservations.length - toInsert.length,
      skipped: parsed.skipped,
      detectedPlatform: parsed.detectedPlatform,
      months,
    });
  })
);

// POST /api/properties/:id/reservations  (alta manual de una reserva)
router.post(
  "/:id/reservations",
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    const data = z
      .object({
        platform: z.string().min(1).default("Otra"),
        guestName: z.string().optional(),
        checkIn: z.string().min(1, "La fecha de entrada es obligatoria"),
        checkOut: z.string().min(1, "La fecha de salida es obligatoria"),
        grossRevenue: z.number().nonnegative(),
        platformCommission: z.number().nonnegative().default(0),
      })
      .parse({ ...req.body, grossRevenue: Number(req.body.grossRevenue), platformCommission: Number(req.body.platformCommission ?? 0) });

    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
      throw new ApiError(400, "Las fechas no son válidas (la salida debe ser posterior a la entrada).");
    }
    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);
    const month = `${checkIn.getFullYear()}-${String(checkIn.getMonth() + 1).padStart(2, "0")}`;

    const reservation = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        platform: data.platform || "Otra",
        guestName: data.guestName || null,
        checkIn,
        checkOut,
        nights,
        grossRevenue: data.grossRevenue,
        platformCommission: data.platformCommission,
        netRevenue: Math.max(0, data.grossRevenue - data.platformCommission),
        month,
      },
    });
    res.status(201).json({ reservation });
  })
);

// GET /api/properties/:id/reservations?month=YYYY-MM
router.get(
  "/:id/reservations",
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    const month = req.query.month as string | undefined;
    const reservations = await prisma.reservation.findMany({
      where: { propertyId: property.id, ...(month ? { month } : {}) },
      orderBy: { checkIn: "asc" },
    });
    res.json({ reservations });
  })
);

// DELETE /api/properties/:id/reservations/:reservationId
router.delete(
  "/:id/reservations/:reservationId",
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    const r = await prisma.reservation.findUnique({ where: { id: req.params.reservationId } });
    if (!r || r.propertyId !== property.id) throw new ApiError(404, "Reserva no encontrada");
    await prisma.reservation.delete({ where: { id: r.id } });
    res.json({ ok: true });
  })
);

export default router;
