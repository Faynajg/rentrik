import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError, asyncHandler } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { ownedProperty } from "./properties.routes";
import { readTabularFile } from "../services/tabularFile";
import {
  autoMapColumns,
  buildReservations,
  CANONICAL_FIELDS,
  ColumnMap,
  FIELD_LABELS,
  fingerprintHeaders,
  isMappingComplete,
  mappingConfidence,
  REQUIRED_FIELDS,
  resolvePlatform,
  ParsedReservation,
} from "../services/csvParser";
import { detectCurrency, KNOWN_CURRENCIES, rateToEur } from "../services/currency";

const router = Router();
router.use(requireAuth);

// Archivo en memoria (hasta 10 MB), CSV o Excel.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const round2 = (n: number) => Math.round(n * 100) / 100;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const isRequired = (f: string) => (REQUIRED_FIELDS as readonly string[]).includes(f);

/** Convierte los importes de las reservas a EUR según el tipo del día de cada reserva. */
async function convertToEur(
  reservations: ParsedReservation[],
  currency: string
): Promise<ParsedReservation[]> {
  if ((currency || "EUR").toUpperCase() === "EUR") return reservations;
  const out: ParsedReservation[] = [];
  for (const r of reservations) {
    const rate = await rateToEur(currency, r.checkIn);
    out.push({
      ...r,
      grossRevenue: round2(r.grossRevenue * rate),
      netRevenue: round2(r.netRevenue * rate),
      platformCommission: round2(r.platformCommission * rate),
    });
  }
  return out;
}

/**
 * Separa las reservas entrantes (ya en EUR) en nuevas y duplicadas. Duplicada =
 * misma fecha de entrada + salida e importe similar (±1 € o ±1 %), comparando
 * con lo ya guardado y con lo ya aceptado dentro del propio archivo.
 */
async function partitionDuplicates(propertyId: string, list: ParsedReservation[]) {
  const months = [...new Set(list.map((r) => r.month))];
  const existing = await prisma.reservation.findMany({
    where: { propertyId, month: { in: months } },
    select: { checkIn: true, checkOut: true, grossRevenue: true },
  });
  const seen = existing.map((e) => ({
    k: `${dayKey(e.checkIn)}|${dayKey(e.checkOut)}`,
    g: e.grossRevenue,
  }));
  const matches = (r: ParsedReservation) => {
    const k = `${dayKey(r.checkIn)}|${dayKey(r.checkOut)}`;
    const tol = Math.max(1, r.grossRevenue * 0.01);
    return seen.some((s) => s.k === k && Math.abs(s.g - r.grossRevenue) <= tol);
  };

  const unique: ParsedReservation[] = [];
  const duplicates: ParsedReservation[] = [];
  for (const r of list) {
    if (matches(r)) {
      duplicates.push(r);
    } else {
      unique.push(r);
      seen.push({ k: `${dayKey(r.checkIn)}|${dayKey(r.checkOut)}`, g: r.grossRevenue });
    }
  }
  return { unique, duplicates };
}

/** Resumen (rango de fechas, total en EUR) de una lista de reservas ya en EUR. */
function summarize(list: ParsedReservation[]) {
  let totalGross = 0;
  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;
  for (const r of list) {
    totalGross += r.grossRevenue;
    if (!dateFrom || r.checkIn < dateFrom) dateFrom = r.checkIn;
    if (!dateTo || r.checkOut > dateTo) dateTo = r.checkOut;
  }
  return { count: list.length, totalGross: round2(totalGross), dateFrom, dateTo };
}

/** Detecta la moneda del archivo a partir de la columna de importe. */
function detectFileCurrency(rows: Record<string, string>[], grossCol?: string | null): string {
  if (!grossCol) return "EUR";
  for (const r of rows) {
    const found = detectCurrency(r[grossCol] ?? "");
    if (found) return found;
  }
  return "EUR";
}

// POST /api/properties/:id/import/analyze — analiza el archivo y decide si se
// puede importar directo o hace falta el mapeador visual.
router.post(
  "/properties/:id/import/analyze",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    if (!req.file) throw new ApiError(400, "No se ha subido ningún archivo");

    const { headers, rows } = readTabularFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    if (headers.length === 0 || rows.length === 0) {
      throw new ApiError(422, "El archivo está vacío o no contiene datos.");
    }

    const forced = (req.body.platform as string | undefined)?.trim() || undefined;
    const fp = fingerprintHeaders(headers);
    const saved = await prisma.importMapping.findUnique({
      where: { userId_headersHash: { userId: req.userId!, headersHash: fp } },
    });
    const savedMap: ColumnMap | null = saved ? (JSON.parse(saved.mapping) as ColumnMap) : null;

    const auto = autoMapColumns(headers);
    // El cliente puede enviar un mapeo manual (desde el mapeador visual) para
    // recalcular el resumen; si no, se usa el guardado o el automático.
    const providedMap: ColumnMap | null = req.body.mapping
      ? (JSON.parse(req.body.mapping) as ColumnMap)
      : null;
    const mapping = providedMap ?? savedMap ?? auto;
    const complete = isMappingComplete(mapping);

    const currencyForced = (req.body.currency as string | undefined)?.trim().toUpperCase() || undefined;
    const currency = currencyForced || detectFileCurrency(rows, mapping.grossRevenue);

    const detectedPlatform = resolvePlatform(headers, rows, mapping.platform, forced);

    let summary = null as null | ReturnType<typeof summarize> & { duplicates: number; skipped: number };
    if (complete) {
      const built = buildReservations(rows, mapping, detectedPlatform);
      const converted = await convertToEur(built.reservations, currency);
      const { duplicates } = await partitionDuplicates(property.id, converted);
      summary = { ...summarize(converted), duplicates: duplicates.length, skipped: built.skipped };
    }

    res.json({
      headers,
      preview: rows.slice(0, 3),
      fields: CANONICAL_FIELDS.map((f) => ({ key: f, label: FIELD_LABELS[f], required: isRequired(f) })),
      suggestedMapping: mapping,
      autoMapping: auto,
      confidence: mappingConfidence(auto),
      savedMappingUsed: !!savedMap && !providedMap,
      autoImportable: complete,
      needsMapping: !complete,
      detectedPlatform,
      currency,
      knownCurrencies: KNOWN_CURRENCIES,
      summary,
    });
  })
);

// POST /api/properties/:id/import/confirm — importa de verdad con el mapeo
// (auto o manual) confirmado por el usuario.
router.post(
  "/properties/:id/import/confirm",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    if (!req.file) throw new ApiError(400, "No se ha subido ningún archivo");

    const body = z
      .object({
        mapping: z.string().optional(),
        platform: z.string().optional(),
        currency: z.string().optional(),
        skipDuplicates: z.string().optional(),
        saveMapping: z.string().optional(),
      })
      .parse(req.body);

    const { headers, rows } = readTabularFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    if (headers.length === 0 || rows.length === 0) {
      throw new ApiError(422, "El archivo está vacío o no contiene datos.");
    }

    const mapping: ColumnMap = body.mapping ? (JSON.parse(body.mapping) as ColumnMap) : autoMapColumns(headers);
    if (!isMappingComplete(mapping)) {
      throw new ApiError(422, "Faltan columnas obligatorias: fecha de entrada, fecha de salida e importe.");
    }

    const forced = body.platform?.trim() || undefined;
    const currency = body.currency?.trim().toUpperCase() || detectFileCurrency(rows, mapping.grossRevenue);
    const skipDuplicates = body.skipDuplicates === "true";
    const saveMapping = body.saveMapping === "true";

    const detectedPlatform = resolvePlatform(headers, rows, mapping.platform, forced);
    const built = buildReservations(rows, mapping, detectedPlatform);
    if (built.reservations.length === 0) {
      throw new ApiError(422, "No se han podido extraer reservas del archivo. Revisa el mapeo de columnas.");
    }
    const converted = await convertToEur(built.reservations, currency);
    const { unique, duplicates } = await partitionDuplicates(property.id, converted);
    const finalList = skipDuplicates ? unique : converted;

    if (finalList.length === 0) {
      return res.status(200).json({
        imported: 0,
        duplicates: duplicates.length,
        skipped: built.skipped,
        detectedPlatform,
        currency,
        message: "Todas las reservas ya existían. No se importó nada.",
      });
    }

    const s = summarize(finalList);
    const batch = await prisma.importBatch.create({
      data: {
        userId: req.userId!,
        propertyId: property.id,
        filename: req.file.originalname,
        platform: detectedPlatform,
        count: finalList.length,
        totalGross: s.totalGross,
        currency,
        dateFrom: s.dateFrom,
        dateTo: s.dateTo,
      },
    });

    await prisma.reservation.createMany({
      data: finalList.map((r) => ({
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
        currency,
        month: r.month,
        importBatchId: batch.id,
      })),
    });

    if (saveMapping) {
      const fp = fingerprintHeaders(headers);
      const label = headers.slice(0, 6).join(", ");
      await prisma.importMapping.upsert({
        where: { userId_headersHash: { userId: req.userId!, headersHash: fp } },
        create: { userId: req.userId!, headersHash: fp, mapping: JSON.stringify(mapping), label },
        update: { mapping: JSON.stringify(mapping), label },
      });
    }

    res.status(201).json({
      imported: finalList.length,
      duplicates: duplicates.length,
      skipped: built.skipped,
      batchId: batch.id,
      detectedPlatform,
      currency,
      summary: s,
    });
  })
);

// GET /api/properties/:id/imports — historial de importaciones de la propiedad.
router.get(
  "/properties/:id/imports",
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    const imports = await prisma.importBatch.findMany({
      where: { propertyId: property.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    res.json({ imports });
  })
);

// POST /api/imports/:batchId/undo — deshace una importación (borra sus reservas).
router.post(
  "/imports/:batchId/undo",
  asyncHandler(async (req, res) => {
    const batch = await prisma.importBatch.findUnique({ where: { id: req.params.batchId } });
    if (!batch || batch.userId !== req.userId) throw new ApiError(404, "Importación no encontrada");
    await prisma.reservation.deleteMany({ where: { importBatchId: batch.id } });
    await prisma.importBatch.delete({ where: { id: batch.id } });
    res.json({ undone: true, removed: batch.count });
  })
);

export default router;
