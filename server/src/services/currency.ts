// Detección de moneda y conversión a EUR usando tipos de cambio históricos
// (API pública Frankfurter, datos del Banco Central Europeo). Con caché en
// memoria y respaldo aproximado si no hay conexión.

export const KNOWN_CURRENCIES = [
  "EUR", "USD", "GBP", "MXN", "COP", "ARS", "CLP", "PEN", "DOP", "BRL", "CAD", "AUD", "CHF",
];

// Respaldo aproximado (moneda → EUR) si la API de tipos de cambio no responde.
const FALLBACK_TO_EUR: Record<string, number> = {
  EUR: 1, USD: 0.92, GBP: 1.17, MXN: 0.055, COP: 0.00025, ARS: 0.0011,
  CLP: 0.0011, PEN: 0.25, DOP: 0.016, BRL: 0.18, CAD: 0.68, AUD: 0.6, CHF: 1.05,
};

/** Intenta detectar la moneda de un texto por código ISO o símbolo. */
export function detectCurrency(sample: string): string | null {
  if (!sample) return null;
  const upper = sample.toUpperCase();
  for (const code of KNOWN_CURRENCIES) {
    if (new RegExp(`\\b${code}\\b`).test(upper)) return code;
  }
  if (sample.includes("€")) return "EUR";
  if (sample.includes("£")) return "GBP";
  if (sample.includes("$")) return "USD"; // ambiguo: por defecto USD
  return null;
}

export function isKnownCurrency(code: string): boolean {
  return KNOWN_CURRENCIES.includes((code || "").toUpperCase());
}

const rateCache = new Map<string, number>();

/** Tipo de cambio moneda→EUR para una fecha (histórico, con caché y respaldo). */
export async function rateToEur(currency: string, date: Date): Promise<number> {
  const cur = (currency || "EUR").toUpperCase();
  if (cur === "EUR") return 1;
  const safeDate = date && !isNaN(date.getTime()) ? date : new Date();
  const day = safeDate.toISOString().slice(0, 10);
  const key = `${day}:${cur}`;
  const cached = rateCache.get(key);
  if (cached != null) return cached;

  let rate = FALLBACK_TO_EUR[cur] ?? 1;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://api.frankfurter.app/${day}?from=${cur}&to=EUR`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number> };
      const r = data?.rates?.EUR;
      if (typeof r === "number" && r > 0) rate = r;
    }
  } catch {
    // Sin conexión o error: se mantiene el respaldo.
  }
  rateCache.set(key, rate);
  return rate;
}

/** Convierte un importe de una moneda a otra usando el tipo del día (vía EUR). */
export async function convertAmount(amount: number, from: string, to: string, date: Date): Promise<number> {
  if (!amount) return 0;
  const f = (from || "EUR").toUpperCase();
  const t = (to || "EUR").toUpperCase();
  if (f === t) return amount;
  const rf = await rateToEur(f, date); // from → EUR
  const rt = await rateToEur(t, date); // to → EUR
  if (!rt) return amount;
  return Math.round((amount * (rf / rt)) * 100) / 100;
}
