import { Expense, Incident, Reservation } from "@prisma/client";

/** Días disponibles en un mes "YYYY-MM". */
export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

export interface ExpenseBreakdown {
  fijo: number;
  variable: number;
  plataforma: number;
  gestion: number;
  extraordinario: number; // incidencias (reparaciones, quejas…)
  total: number;
}

export interface PlatformRevenue {
  platform: string;
  gross: number;
  commission: number;
  net: number;
  reservations: number;
  nights: number;
}

/** Rentabilidad neta real por canal (feature 1). */
export interface ChannelProfit {
  platform: string;
  gross: number;
  commission: number;
  netIncome: number; // ingresos tras comisión
  allocatedExpenses: number; // gastos imputados por proporción de noches
  netProfit: number; // beneficio neto real del canal
  margin: number; // % beneficio / ingresos del canal
  nights: number;
  reservations: number;
}

export interface PropertyKpis {
  month: string;
  grossRevenue: number;
  platformCommission: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  occupiedNights: number;
  availableNights: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
  reservationsCount: number;
  isProfitable: boolean;
  expenseBreakdown: ExpenseBreakdown;
  revenueByPlatform: PlatformRevenue[];

  // Analítica avanzada
  channelProfit: ChannelProfit[]; // 1 · rentabilidad por canal
  costPerReservation: number; // 2 · coste medio por estancia
  marginPerReservation: number; // 2 · margen neto por check-in
  potentialRevenue: number; // 3 · ingreso potencial al 100 % de ocupación
  optimizationGap: number; // 3 · dinero dejado sobre la mesa
  revparPotential: number; // 3 · RevPAR potencial (= ADR)
  minProfitablePrice: number; // 4 · precio mínimo por noche para no perder
  breakEvenNights: number; // 5/12 · noches mínimas para cubrir gastos fijos
  breakEvenFeasible: boolean; // si es alcanzable con el ADR actual
  breakEvenMet: boolean; // si ya se está cumpliendo
  extraordinary: number; // 8 · coste de incidencias del mes
}

/**
 * Calcula todos los KPIs de una propiedad para un mes dado, incluida la analítica avanzada.
 */
export function computeKpis(
  month: string,
  reservations: Reservation[],
  expenses: Expense[],
  incidents: Incident[] = []
): PropertyKpis {
  const grossRevenue = sum(reservations.map((r) => r.grossRevenue));
  const reservationCommission = sum(reservations.map((r) => r.platformCommission));
  const occupiedNights = sum(reservations.map((r) => r.nights));
  const availableNights = daysInMonth(month);
  const reservationsCount = reservations.length;

  const breakdown: ExpenseBreakdown = { fijo: 0, variable: 0, plataforma: 0, gestion: 0, extraordinario: 0, total: 0 };

  for (const e of expenses) {
    const amount = e.isPercent ? (grossRevenue * e.amount) / 100 : e.amount;
    if (e.category in breakdown) breakdown[e.category as keyof ExpenseBreakdown] += amount;
  }
  if (breakdown.plataforma === 0 && reservationCommission > 0) breakdown.plataforma = reservationCommission;

  // Incidencias del mes → gastos extraordinarios.
  const extraordinary = sum(incidents.map((i) => i.cost));
  breakdown.extraordinario = extraordinary;

  breakdown.total =
    breakdown.fijo + breakdown.variable + breakdown.plataforma + breakdown.gestion + breakdown.extraordinario;

  const totalExpenses = breakdown.total;
  const netProfit = grossRevenue - totalExpenses;
  const occupancyRate = availableNights > 0 ? (occupiedNights / availableNights) * 100 : 0;
  const adr = occupiedNights > 0 ? grossRevenue / occupiedNights : 0;
  const revpar = availableNights > 0 ? grossRevenue / availableNights : 0;
  const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  // 3 · RevPAR real vs potencial
  const potentialRevenue = adr * availableNights;
  const optimizationGap = Math.max(0, potentialRevenue - grossRevenue);

  // 2 · coste y margen por reserva
  const costPerReservation = reservationsCount > 0 ? totalExpenses / reservationsCount : 0;
  const marginPerReservation = reservationsCount > 0 ? netProfit / reservationsCount : 0;

  // 4 · precio mínimo de rentabilidad (a la ocupación actual)
  const minProfitablePrice = occupiedNights > 0 ? totalExpenses / occupiedNights : 0;

  // 5/12 · break-even de ocupación (noches para cubrir gastos fijos)
  const fixedCosts = breakdown.fijo + breakdown.gestion;
  const variableCostPerNight = occupiedNights > 0 ? breakdown.variable / occupiedNights : 0;
  const commissionPerNight = occupiedNights > 0 ? breakdown.plataforma / occupiedNights : 0;
  const contributionPerNight = adr - variableCostPerNight - commissionPerNight;
  const breakEvenFeasible = contributionPerNight > 0 && fixedCosts > 0;
  const breakEvenNights = breakEvenFeasible ? Math.ceil(fixedCosts / contributionPerNight) : 0;
  const breakEvenMet = fixedCosts === 0 || (breakEvenFeasible && occupiedNights >= breakEvenNights);

  const platforms = revenueByPlatform(reservations);

  // 1 · rentabilidad neta por canal (imputa gastos no-plataforma por proporción de noches)
  const nonPlatformExpenses = breakdown.fijo + breakdown.variable + breakdown.gestion + breakdown.extraordinario;
  const channelProfit: ChannelProfit[] = platforms.map((p) => {
    const share = occupiedNights > 0 ? p.nights / occupiedNights : 0;
    const allocatedExpenses = nonPlatformExpenses * share;
    const netIncome = p.gross - p.commission;
    const cp = netIncome - allocatedExpenses;
    return {
      platform: p.platform,
      gross: p.gross,
      commission: p.commission,
      netIncome: round(netIncome),
      allocatedExpenses: round(allocatedExpenses),
      netProfit: round(cp),
      margin: p.gross > 0 ? round((cp / p.gross) * 100) : 0,
      nights: p.nights,
      reservations: p.reservations,
    };
  });

  return {
    month,
    grossRevenue: round(grossRevenue),
    platformCommission: round(reservationCommission),
    totalExpenses: round(totalExpenses),
    netProfit: round(netProfit),
    profitMargin: round(profitMargin),
    occupiedNights,
    availableNights,
    occupancyRate: round(occupancyRate),
    adr: round(adr),
    revpar: round(revpar),
    reservationsCount,
    isProfitable: netProfit >= 0,
    expenseBreakdown: {
      fijo: round(breakdown.fijo),
      variable: round(breakdown.variable),
      plataforma: round(breakdown.plataforma),
      gestion: round(breakdown.gestion),
      extraordinario: round(breakdown.extraordinario),
      total: round(breakdown.total),
    },
    revenueByPlatform: platforms,
    channelProfit,
    costPerReservation: round(costPerReservation),
    marginPerReservation: round(marginPerReservation),
    potentialRevenue: round(potentialRevenue),
    optimizationGap: round(optimizationGap),
    revparPotential: round(adr),
    minProfitablePrice: round(minProfitablePrice),
    breakEvenNights,
    breakEvenFeasible,
    breakEvenMet,
    extraordinary: round(extraordinary),
  };
}

function revenueByPlatform(reservations: Reservation[]): PlatformRevenue[] {
  const map = new Map<string, PlatformRevenue>();
  for (const r of reservations) {
    const key = r.platform || "Otra";
    const entry =
      map.get(key) ?? { platform: key, gross: 0, commission: 0, net: 0, reservations: 0, nights: 0 };
    entry.gross += r.grossRevenue;
    entry.commission += r.platformCommission;
    entry.net += r.netRevenue;
    entry.reservations += 1;
    entry.nights += r.nights;
    map.set(key, entry);
  }
  return Array.from(map.values())
    .map((e) => ({ ...e, gross: round(e.gross), commission: round(e.commission), net: round(e.net) }))
    .sort((a, b) => b.gross - a.gross);
}

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

function round(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
