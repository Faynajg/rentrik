/** Mes actual en formato "YYYY-MM". */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Valida un "YYYY-MM"; si no es válido devuelve el mes actual. */
export function monthOrCurrent(month?: string): string {
  if (month && /^\d{4}-\d{2}$/.test(month)) return month;
  return currentMonth();
}

/** Mes anterior a "YYYY-MM". */
export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-07" -> "julio de 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return `${MONTHS_ES[m - 1]} de ${y}`;
}
