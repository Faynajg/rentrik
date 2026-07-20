import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ApiError, asyncHandler } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { requireSubscription } from "../middleware/subscription";

const router = Router();
router.use(requireAuth);
router.use(requireSubscription);

const GUESTS = ["Lucía", "Marco", "Sophie", "Hans", "Marta", "Tom", "Elena", "Pablo", "Nadia", "Chen", "Ana", "Liam"];

const COMMISSION: Record<string, number> = { Airbnb: 0.15, Booking: 0.18, VRBO: 0.08 };

interface Spec {
  name: string;
  address: string;
  price: number;
  resPerMonth: number;
  avgNights: number;
  platforms: string[];
  comunidad: number;
  seguro: number;
  wifi: number;
  limpiezaPer: number;
  suministros: number;
  gestionPct: number;
}

// Tres propiedades: alta rentabilidad, media y una "mucho trabajo, poco margen".
const SPECS: Spec[] = [
  { name: "Ático Playa Valencia", address: "Valencia", price: 130, resPerMonth: 6, avgNights: 4,
    platforms: ["Airbnb", "Booking"], comunidad: 55, seguro: 22, wifi: 30, limpiezaPer: 35, suministros: 70, gestionPct: 0 },
  { name: "Apartamento Centro Málaga", address: "Málaga", price: 90, resPerMonth: 5, avgNights: 3,
    platforms: ["Airbnb", "Booking", "VRBO"], comunidad: 65, seguro: 20, wifi: 30, limpiezaPer: 40, suministros: 90, gestionPct: 0 },
  { name: "Casa Rural Granada", address: "Granada", price: 72, resPerMonth: 8, avgNights: 2,
    platforms: ["Booking", "Airbnb"], comunidad: 40, seguro: 25, wifi: 35, limpiezaPer: 60, suministros: 220, gestionPct: 15 },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Últimos `count` meses (incluido el actual) como "YYYY-MM". */
function recentMonths(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out.reverse();
}

function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function buildReservations(propertyId: string, spec: Spec, month: string) {
  const [y, m] = month.split("-").map(Number);
  const dim = daysInMonth(month);
  const rows = [];
  for (let i = 0; i < spec.resPerMonth; i++) {
    const platform = spec.platforms[i % spec.platforms.length];
    const nights = spec.avgNights + (i % 2 === 0 ? 0 : 1);
    const startDay = Math.min(dim - nights, 1 + Math.floor((i / spec.resPerMonth) * (dim - nights)));
    const checkIn = new Date(y, m - 1, Math.max(1, startDay));
    const checkOut = new Date(checkIn.getTime() + nights * 86400000);
    const bookingDate = new Date(checkIn.getTime() - 20 * 86400000);
    const gross = round2(spec.price * nights * (0.9 + ((i % 3) * 0.1)));
    const commission = round2(gross * (COMMISSION[platform] ?? 0.12));
    rows.push({
      propertyId,
      platform,
      guestName: GUESTS[(i + m) % GUESTS.length],
      bookingDate,
      checkIn,
      checkOut,
      nights,
      grossRevenue: gross,
      platformCommission: commission,
      netRevenue: round2(gross - commission),
      currency: "EUR",
      month,
    });
  }
  return rows;
}

function buildExpenses(propertyId: string, spec: Spec, month: string) {
  const rows = [
    { propertyId, category: "fijo", concept: "Comunidad", amount: spec.comunidad, isPercent: false, month },
    { propertyId, category: "fijo", concept: "Seguro del hogar", amount: spec.seguro, isPercent: false, month },
    { propertyId, category: "fijo", concept: "Wifi / Internet", amount: spec.wifi, isPercent: false, month },
    { propertyId, category: "variable", concept: "Limpieza", amount: round2(spec.limpiezaPer * spec.resPerMonth), isPercent: false, month },
    { propertyId, category: "variable", concept: "Suministros (luz y agua)", amount: spec.suministros, isPercent: false, month },
  ];
  if (spec.gestionPct > 0) {
    rows.push({ propertyId, category: "gestion", concept: "Comisión de gestión", amount: spec.gestionPct, isPercent: true, month });
  }
  return rows;
}

// POST /api/demo/load — carga 3 propiedades de ejemplo con datos realistas.
router.post(
  "/load",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const realCount = await prisma.property.count({ where: { userId, isDemo: false } });
    if (realCount > 0) {
      throw new ApiError(400, "Ya tienes propiedades. El modo demo es solo para empezar desde cero.");
    }
    // Recarga limpia si ya había demo.
    await prisma.property.deleteMany({ where: { userId, isDemo: true } });

    const months = recentMonths(3);
    for (const spec of SPECS) {
      const property = await prisma.property.create({
        data: { userId, name: spec.name, address: spec.address, isDemo: true },
      });
      const reservations = months.flatMap((mth) => buildReservations(property.id, spec, mth));
      const expenses = months.flatMap((mth) => buildExpenses(property.id, spec, mth));
      await prisma.reservation.createMany({ data: reservations });
      await prisma.expense.createMany({ data: expenses });
    }

    await prisma.user.update({ where: { id: userId }, data: { demoMode: true } });
    res.status(201).json({ ok: true, properties: SPECS.length });
  })
);

// POST /api/demo/exit — borra los datos de ejemplo.
router.post(
  "/exit",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    await prisma.property.deleteMany({ where: { userId, isDemo: true } });
    await prisma.user.update({ where: { id: userId }, data: { demoMode: false } });
    res.json({ ok: true });
  })
);

export default router;
