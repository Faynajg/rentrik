import { Currency, getCurrency } from "./currency";

// Moneda activa de la app (se fija desde el usuario autenticado).
let activeCurrency: Currency = getCurrency("EUR");
export function setActiveCurrency(code: string) {
  activeCurrency = getCurrency(code);
}
export function currencySymbol(): string {
  return activeCurrency.symbol;
}

/** Formatea un importe en la moneda activa; si no se indican decimales, usa los de la moneda. */
export function eur(n: number, decimals?: number): string {
  const d = decimals ?? activeCurrency.decimals;
  return (
    (n ?? 0).toLocaleString(activeCurrency.locale, {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }) +
    " " +
    activeCurrency.symbol
  );
}

export function pct(n: number): string {
  return `${(n ?? 0).toLocaleString("es-ES", { maximumFractionDigits: 1 })} %`;
}

export function num(n: number): string {
  return (n ?? 0).toLocaleString("es-ES");
}

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-07" -> "julio 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return `${MONTHS[m - 1]} ${y}`;
}

/** "2026-07" -> "jul 2026" (compacto para ejes de gráficos). */
export function monthShort(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return `${MONTHS[m - 1].slice(0, 3)} ${String(y).slice(2)}`;
}

/** Lista de los últimos N meses (incluido el actual) como "YYYY-MM". */
export function recentMonths(count = 12): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}
