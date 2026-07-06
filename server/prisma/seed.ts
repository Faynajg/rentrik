import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PLATFORMS = ["Airbnb", "Booking", "VRBO"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Genera reservas verosímiles para un mes dado. */
function genReservations(year: number, month: number, count: number, adrBase: number) {
  const reservations = [];
  let day = 1;
  for (let i = 0; i < count; i++) {
    const nights = 2 + Math.floor(Math.random() * 5);
    if (day + nights > 27) day = 1 + Math.floor(Math.random() * 3);
    const checkIn = new Date(year, month - 1, day);
    const checkOut = new Date(year, month - 1, day + nights);
    const platform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
    const adr = adrBase + Math.floor(Math.random() * 40) - 20;
    const gross = adr * nights;
    const rate = platform === "Airbnb" ? 0.03 : platform === "Booking" ? 0.15 : 0.08;
    const commission = Math.round(gross * rate * 100) / 100;
    reservations.push({
      platform,
      guestName: `Huésped ${i + 1}`,
      bookingDate: new Date(year, month - 2, 15),
      checkIn,
      checkOut,
      nights,
      grossRevenue: gross,
      platformCommission: commission,
      netRevenue: Math.round((gross - commission) * 100) / 100,
      month: `${year}-${pad(month)}`,
    });
    day += nights + 1 + Math.floor(Math.random() * 3);
  }
  return reservations;
}

function genExpenses(year: number, month: number, occupiedNights: number, gross: number) {
  const m = `${year}-${pad(month)}`;
  const cleanings = Math.ceil(occupiedNights / 4);
  return [
    { category: "fijo", concept: "Hipoteca / alquiler", amount: 550, isPercent: false, month: m },
    { category: "fijo", concept: "Comunidad de propietarios", amount: 60, isPercent: false, month: m },
    { category: "fijo", concept: "Seguro del hogar", amount: 22, isPercent: false, month: m },
    { category: "fijo", concept: "WiFi", amount: 35, isPercent: false, month: m },
    { category: "fijo", concept: "Suministros (luz, agua, gas)", amount: 120, isPercent: false, month: m },
    { category: "variable", concept: "Limpieza", amount: cleanings * 35, isPercent: false, month: m },
    { category: "variable", concept: "Lavandería", amount: cleanings * 12, isPercent: false, month: m },
    { category: "variable", concept: "Consumibles y amenities", amount: cleanings * 8, isPercent: false, month: m },
    { category: "gestion", concept: "Comisión de gestora", amount: 18, isPercent: true, month: m },
  ];
}

async function main() {
  console.log("🌱 Sembrando datos de ejemplo…");

  await prisma.user.deleteMany({ where: { email: "demo@rentrik.com" } });

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.create({
    data: {
      name: "Gestora Demo",
      email: "demo@rentrik.com",
      passwordHash,
      companyName: "Costa Rentals",
      plan: "agencia",
      subscriptionStatus: "active",
    },
  });

  const propertyDefs = [
    { name: "Apartamento Playa Centro", address: "Calle del Mar 12, Las Palmas", adr: 95, reservationsPerMonth: 6 },
    { name: "Ático Vista Volcán", address: "Av. Tenerife 45, Tenerife", adr: 140, reservationsPerMonth: 5 },
    { name: "Estudio Casco Antiguo", address: "Plaza Mayor 3, Madrid", adr: 70, reservationsPerMonth: 4 },
  ];

  // Meses: mayo, junio y julio de 2026.
  const months = [
    { year: 2026, month: 5 },
    { year: 2026, month: 6 },
    { year: 2026, month: 7 },
  ];

  for (const def of propertyDefs) {
    const property = await prisma.property.create({
      data: { userId: user.id, name: def.name, address: def.address },
    });

    for (const { year, month } of months) {
      const reservations = genReservations(year, month, def.reservationsPerMonth, def.adr);
      const occupied = reservations.reduce((a, r) => a + r.nights, 0);
      const gross = reservations.reduce((a, r) => a + r.grossRevenue, 0);

      await prisma.reservation.createMany({
        data: reservations.map((r) => ({ ...r, propertyId: property.id })),
      });
      await prisma.expense.createMany({
        data: genExpenses(year, month, occupied, gross).map((e) => ({ ...e, propertyId: property.id })),
      });
    }
    console.log(`  ✓ ${def.name}`);
  }

  console.log("\n✅ Listo. Accede con:");
  console.log("   Email:    demo@rentrik.com");
  console.log("   Password: demo1234\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
