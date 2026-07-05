import { SeasonConfig } from "../types";

export const SEASON_LABELS: Record<string, string> = {
  alta: "Temporada alta",
  media: "Temporada media",
  baja: "Temporada baja",
};

export const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function parseSeasons(json: string | null | undefined): SeasonConfig[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed.seasons) ? parsed.seasons : [];
  } catch {
    return [];
  }
}

/** Devuelve la temporada a la que pertenece un mes "YYYY-MM". */
export function seasonForMonth(seasons: SeasonConfig[], month: string): SeasonConfig | null {
  const m = Number(month.split("-")[1]);
  return seasons.find((s) => s.months.includes(m)) ?? null;
}

export interface SeasonEvaluation {
  season: SeasonConfig;
  occupancyMet: boolean;
  priceMet: boolean;
  occupancyGap: number; // puntos porcentuales por debajo del objetivo
  priceGap: number; // € por debajo del mínimo
}

export function evaluateSeason(
  season: SeasonConfig,
  occupancyRate: number,
  adr: number
): SeasonEvaluation {
  const occupancyMet = occupancyRate >= season.targetOccupancy;
  const priceMet = season.minPrice === 0 || adr >= season.minPrice;
  return {
    season,
    occupancyMet,
    priceMet,
    occupancyGap: Math.max(0, season.targetOccupancy - occupancyRate),
    priceGap: Math.max(0, season.minPrice - adr),
  };
}

/** Config por defecto (temporadas típicas del hemisferio norte). */
export function defaultSeasons(): SeasonConfig[] {
  return [
    { type: "alta", months: [6, 7, 8], targetOccupancy: 80, minPrice: 0 },
    { type: "media", months: [4, 5, 9, 10], targetOccupancy: 60, minPrice: 0 },
    { type: "baja", months: [1, 2, 3, 11, 12], targetOccupancy: 40, minPrice: 0 },
  ];
}
