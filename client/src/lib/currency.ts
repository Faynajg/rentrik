export interface Currency {
  code: string;
  symbol: string;
  locale: string;
  name: string;
}

export const CURRENCIES: Record<string, Currency> = {
  EUR: { code: "EUR", symbol: "€", locale: "es-ES", name: "Euro (€)" },
  USD: { code: "USD", symbol: "$", locale: "en-US", name: "Dólar estadounidense ($)" },
  MXN: { code: "MXN", symbol: "$", locale: "es-MX", name: "Peso mexicano ($)" },
  COP: { code: "COP", symbol: "$", locale: "es-CO", name: "Peso colombiano ($)" },
  ARS: { code: "ARS", symbol: "$", locale: "es-AR", name: "Peso argentino ($)" },
  CLP: { code: "CLP", symbol: "$", locale: "es-CL", name: "Peso chileno ($)" },
  PEN: { code: "PEN", symbol: "S/", locale: "es-PE", name: "Sol peruano (S/)" },
  DOP: { code: "DOP", symbol: "RD$", locale: "es-DO", name: "Peso dominicano (RD$)" },
  GBP: { code: "GBP", symbol: "£", locale: "en-GB", name: "Libra esterlina (£)" },
  BRL: { code: "BRL", symbol: "R$", locale: "pt-BR", name: "Real brasileño (R$)" },
};

export function getCurrency(code: string): Currency {
  return CURRENCIES[code] ?? CURRENCIES.EUR;
}
