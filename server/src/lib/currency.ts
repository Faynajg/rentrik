/** Monedas soportadas (España + LATAM). */
export interface Currency {
  code: string;
  symbol: string;
  locale: string;
  name: string;
  decimals: number; // decimales habituales de la moneda (CLP/COP: 0)
}

export const CURRENCIES: Record<string, Currency> = {
  EUR: { code: "EUR", symbol: "€", locale: "es-ES", name: "Euro (€)", decimals: 2 },
  USD: { code: "USD", symbol: "$", locale: "en-US", name: "Dólar estadounidense ($)", decimals: 2 },
  MXN: { code: "MXN", symbol: "$", locale: "es-MX", name: "Peso mexicano ($)", decimals: 2 },
  COP: { code: "COP", symbol: "$", locale: "es-CO", name: "Peso colombiano ($)", decimals: 0 },
  ARS: { code: "ARS", symbol: "$", locale: "es-AR", name: "Peso argentino ($)", decimals: 2 },
  CLP: { code: "CLP", symbol: "$", locale: "es-CL", name: "Peso chileno ($)", decimals: 0 },
  PEN: { code: "PEN", symbol: "S/", locale: "es-PE", name: "Sol peruano (S/)", decimals: 2 },
  DOP: { code: "DOP", symbol: "RD$", locale: "es-DO", name: "Peso dominicano (RD$)", decimals: 2 },
  GBP: { code: "GBP", symbol: "£", locale: "en-GB", name: "Libra esterlina (£)", decimals: 2 },
  BRL: { code: "BRL", symbol: "R$", locale: "pt-BR", name: "Real brasileño (R$)", decimals: 2 },
};

export function getCurrency(code: string): Currency {
  return CURRENCIES[code] ?? CURRENCIES.EUR;
}

/** Formatea un importe en la moneda dada; si no se indican decimales, usa los de la moneda. */
export function formatMoney(n: number, code = "EUR", decimals?: number): string {
  const cur = getCurrency(code);
  const d = decimals ?? cur.decimals;
  const value = (Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString(cur.locale, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
  return `${value} ${cur.symbol}`;
}
