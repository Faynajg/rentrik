// Semáforo de margen compartido por el dashboard (features 1, 2, 14).
// Verde > 25 % · Naranja 15-25 % · Rojo < 15 %.

export type Band = "green" | "amber" | "red";

export function marginBand(margin: number): Band {
  if (margin > 25) return "green";
  if (margin >= 15) return "amber";
  return "red";
}

export const BAND_BADGE: Record<Band, string> = {
  green: "bg-positive-soft text-positive",
  amber: "bg-gold-soft text-gold",
  red: "bg-negative-soft text-negative",
};

export const BAND_DOT: Record<Band, string> = {
  green: "bg-positive",
  amber: "bg-gold",
  red: "bg-negative",
};

export const BAND_TEXT: Record<Band, string> = {
  green: "text-positive",
  amber: "text-gold",
  red: "text-negative",
};

export const BAND_LABEL: Record<Band, string> = {
  green: "Rentable",
  amber: "Margen ajustado",
  red: "Margen bajo",
};

// Colores por plataforma (donut / badges).
const PLATFORM_COLORS: Record<string, string> = {
  Airbnb: "#FF5A5F",
  Booking: "#003580",
  "Booking.com": "#003580",
  VRBO: "#245ABC",
  Expedia: "#FFC72C",
  Holidu: "#F45D48",
  Rentalia: "#00A699",
  Wimdu: "#7A5FA6",
  TripAdvisor: "#34E0A1",
  Otra: "#94A3B8",
};

export function platformColor(platform: string): string {
  return PLATFORM_COLORS[platform] ?? "#64748B";
}
