export interface PlanInfo {
  id: string;
  name: string;
  price: number;
  maxProperties: number | null;
  ownBranding: boolean;
  features: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  companyName: string | null;
  plan: string;
  planInfo: PlanInfo;
  currency: string;
  ivaRate: number;
  autoSendReports: boolean;
  autoSendDay: number;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  trialDaysLeft: number;
}

export interface OwnerSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  properties: { id: string; name: string }[];
  reportsCount: number;
}

export interface Owner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  portalEnabled?: boolean;
}

export interface ReportLog {
  id: string;
  type: string;
  month: string;
  sentTo: string | null;
  propertyId: string | null;
  createdAt: string;
}

export interface MonthlyPoint {
  month: string;
  grossRevenue: number;
  totalExpenses: number;
  netProfit: number;
  occupancyRate: number;
  reservationsCount?: number;
}

export interface BillingStatus {
  stripeEnabled: boolean;
  plan: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  trialDaysLeft: number;
  hasActiveSubscription: boolean;
  currentPeriodEnd: string | null;
}

export interface ExpenseBreakdown {
  fijo: number;
  variable: number;
  plataforma: number;
  gestion: number;
  extraordinario: number;
  total: number;
}

export interface ChannelProfit {
  platform: string;
  gross: number;
  commission: number;
  netIncome: number;
  allocatedExpenses: number;
  netProfit: number;
  margin: number;
  nights: number;
  reservations: number;
}

export interface Incident {
  id: string;
  type: "reparacion" | "queja" | "problema" | "otro";
  description: string;
  cost: number;
  date: string;
  month: string;
}

export interface SeasonConfig {
  type: "alta" | "media" | "baja";
  months: number[];
  targetOccupancy: number;
  minPrice: number;
}

export interface PlatformRevenue {
  platform: string;
  gross: number;
  commission: number;
  net: number;
  reservations: number;
  nights: number;
}

export interface Kpis {
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
  channelProfit: ChannelProfit[];
  costPerReservation: number;
  marginPerReservation: number;
  potentialRevenue: number;
  optimizationGap: number;
  revparPotential: number;
  minProfitablePrice: number;
  breakEvenNights: number;
  breakEvenFeasible: boolean;
  breakEvenMet: boolean;
  extraordinary: number;
}

export interface PropertyWithKpis {
  id: string;
  name: string;
  address: string | null;
  kpis: Kpis;
}

export interface Property {
  id: string;
  name: string;
  address: string | null;
  seasonsConfig: string | null;
  createdAt: string;
}

export interface Reservation {
  id: string;
  platform: string;
  guestName: string | null;
  bookingDate: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  grossRevenue: number;
  platformCommission: number;
  netRevenue: number;
  month: string;
}

export type ExpenseCategory = "fijo" | "variable" | "plataforma" | "gestion";

export interface Expense {
  id: string;
  propertyId: string;
  category: ExpenseCategory;
  concept: string;
  amount: number;
  isPercent: boolean;
  month: string;
}

export interface EvolutionPoint {
  month: string;
  grossRevenue: number;
  totalExpenses: number;
  netProfit: number;
  occupancyRate: number;
}

export interface SetupStatus {
  hasProperty: boolean;
  hasReservations: boolean;
  hasExpenses: boolean;
  firstPropertyId: string | null;
}

export interface DashboardData {
  month: string;
  availableMonths: string[];
  setup: SetupStatus;
  totals: {
    grossRevenue: number;
    totalExpenses: number;
    netProfit: number;
    occupiedNights: number;
    availableNights: number;
    reservationsCount: number;
    occupancyRate: number;
    adr: number;
    propertiesCount: number;
  };
  properties: PropertyWithKpis[];
  evolution: EvolutionPoint[];
  expenseBreakdown: Omit<ExpenseBreakdown, "total">;
}
