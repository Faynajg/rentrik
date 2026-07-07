import Papa from "papaparse";

/** Reserva normalizada extraída de un CSV de cualquier OTA. */
export interface ParsedReservation {
  platform: string;
  guestName: string | null;
  bookingDate: Date | null;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  grossRevenue: number;
  platformCommission: number;
  netRevenue: number;
  month: string; // YYYY-MM
}

export interface ParseResult {
  reservations: ParsedReservation[];
  detectedPlatform: string;
  totalRows: number;
  skipped: number;
}

/** Quita acentos y normaliza a minúsculas para comparar cabeceras. */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Palabras clave por campo (español + inglés, múltiples OTAs: Airbnb, Booking,
// VRBO, Expedia, Holidu, Rentalia, Wimdu, TripAdvisor/FlipKey y CSVs genéricos).
const FIELD_KEYWORDS: Record<string, string[]> = {
  checkIn: [
    "fecha de entrada", "fecha entrada", "check-in", "checkin", "check in",
    "llegada", "fecha llegada", "arrival", "arrival date", "start date",
    "fecha inicio", "fecha de inicio", "inicio de estancia", "stay start",
  ],
  checkOut: [
    "fecha de salida", "fecha salida", "check-out", "checkout", "check out",
    "salida", "departure", "departure date", "end date", "fecha fin",
    "fecha de fin", "fin de estancia", "stay end",
  ],
  bookingDate: [
    "fecha de reserva", "fecha reserva", "fecha de la reserva", "booking date",
    "reservado", "confirmation date", "fecha de confirmacion", "reservation date",
    "fecha de creacion", "created",
  ],
  grossRevenue: [
    "ingresos brutos", "importe bruto", "gross earnings", "gross revenue", "gross",
    "importe de la reserva", "total de la reserva", "valor de la reserva",
    "booking amount", "booking value", "reservation total", "total booking",
    "total price", "importe total", "total payout", "precio total",
    "importe alquiler", "rental amount", "importe", "amount", "ingresos", "total",
  ],
  netRevenue: [
    "ingresos netos", "importe neto", "net earnings", "net revenue", "net amount",
    "net payout", "owner payout", "pago al propietario", "importe para el propietario",
    "importe liquidado", "liquidacion", "payout", "neto", "net", "ganancia neta",
  ],
  platformCommission: [
    "comision de plataforma", "comision del anfitrion", "comision de reserva",
    "comision ota", "comision", "commission", "ota commission", "service fee",
    "host service fee", "host fee", "channel fee", "booking fee",
    "tarifa de servicio", "tarifa de gestion", "expedia compensation",
  ],
  nights: [
    "numero de noches", "num noches", "n noches", "noches", "nights",
    "estancia", "duracion", "duration", "length of stay",
  ],
  guestName: [
    "nombre del huesped", "huesped", "guest name", "guest", "cliente",
    "nombre del cliente", "titular", "nombre y apellidos", "nombre completo",
    "traveler", "viajero", "nombre",
  ],
  platform: ["plataforma", "platform", "canal", "channel", "source", "origen", "portal"],
};

/**
 * Encuentra la cabecera real que corresponde a un campo canónico.
 * `used` contiene cabeceras ya asignadas a otro campo, que se excluyen para
 * evitar colisiones (p. ej. que "plataforma" robe "Comisión de plataforma").
 */
function matchColumn(headers: string[], field: string, used?: Set<string>): string | null {
  const keywords = FIELD_KEYWORDS[field];
  const normalized = headers.filter((h) => !used?.has(h)).map((h) => ({ raw: h, n: norm(h) }));
  // 1) coincidencia exacta primero
  for (const kw of keywords) {
    const exact = normalized.find((h) => h.n === kw);
    if (exact) return exact.raw;
  }
  // 2) coincidencia por inclusión
  for (const kw of keywords) {
    const partial = normalized.find((h) => h.n.includes(kw));
    if (partial) return partial.raw;
  }
  return null;
}

/** Convierte un valor monetario ("€1.234,56", "$1,234.56", "1234.5") a número. */
function parseMoney(value: unknown): number {
  if (value == null || value === "") return 0;
  let s = String(value).replace(/[^\d.,-]/g, "").trim();
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    // formato europeo: coma decimal
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // formato anglosajón: punto decimal
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

/** Parsea fechas en formatos comunes (ISO, dd/mm/yyyy, mm/dd/yyyy). */
function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  // ISO o parseable directamente
  const iso = new Date(s);
  if (!isNaN(iso.getTime()) && /\d{4}-\d{2}-\d{2}/.test(s)) return iso;

  // dd/mm/yyyy o mm/dd/yyyy
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let [, a, b, y] = m;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    let day = Number(a);
    let month = Number(b);
    // Si el primer número > 12 es claramente el día (formato europeo)
    if (day > 12) {
      // day/month ya correctos
    } else if (month > 12) {
      [day, month] = [month, day];
    }
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) return d;
  }

  return isNaN(iso.getTime()) ? null : iso;
}

function toMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nightsBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

/** Marcas de OTA reconocidas y los tokens que las identifican. */
const PLATFORM_TOKENS: [string, string[]][] = [
  ["Airbnb", ["airbnb", "host payout"]],
  ["VRBO", ["vrbo", "homeaway", "home away"]],
  ["Expedia", ["expedia"]],
  ["Holidu", ["holidu"]],
  ["Rentalia", ["rentalia"]],
  ["Wimdu", ["wimdu"]],
  ["TripAdvisor", ["tripadvisor", "trip advisor", "flipkey", "flip key"]],
  // "booking" es genérico (aparece en "gross booking value", "booking amount"…),
  // por eso Booking va al final: solo gana si ninguna marca específica coincide.
  ["Booking", ["booking.com", "booking number", "booking id", "booker", "booking"]],
];

/** Busca una marca conocida dentro de un texto ya normalizado. */
function platformFromText(text: string): string | null {
  for (const [name, tokens] of PLATFORM_TOKENS) {
    if (tokens.some((t) => text.includes(t))) return name;
  }
  return null;
}

/** Detecta la plataforma a partir de los nombres de columnas conocidos. */
function detectPlatform(headers: string[]): string {
  return platformFromText(headers.map(norm).join(" | ")) ?? "Otra";
}

/**
 * Parsea el contenido de un CSV y devuelve reservas normalizadas.
 * @param content contenido del archivo en texto
 * @param forcedPlatform plataforma indicada manualmente por el usuario (opcional)
 */
export function parseReservationsCsv(
  content: string,
  forcedPlatform?: string
): ParseResult {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rows = result.data ?? [];
  const headers = result.meta.fields ?? [];

  // Se asignan de más específico a más genérico; cada columna asignada se
  // excluye de las siguientes para que un campo genérico ("plataforma",
  // "importe"…) no se quede con la columna de otro más concreto.
  const used = new Set<string>();
  const pick = (field: string) => {
    const col = matchColumn(headers, field, used);
    if (col) used.add(col);
    return col;
  };
  const cols = {
    checkIn: pick("checkIn"),
    checkOut: pick("checkOut"),
    bookingDate: pick("bookingDate"),
    nights: pick("nights"),
    platformCommission: pick("platformCommission"),
    netRevenue: pick("netRevenue"),
    grossRevenue: pick("grossRevenue"),
    guestName: pick("guestName"),
    platform: pick("platform"),
  };

  let detectedPlatform = forcedPlatform || detectPlatform(headers);

  // Si por cabeceras no se reconoce, intenta inferir la marca del valor de la
  // columna de plataforma/canal/portal (Holidu, Rentalia… la ponen ahí).
  if (!forcedPlatform && detectedPlatform === "Otra" && cols.platform) {
    for (const row of rows) {
      const raw = row[cols.platform]?.trim();
      if (!raw) continue;
      detectedPlatform = platformFromText(norm(raw)) ?? raw;
      break;
    }
  }

  const reservations: ParsedReservation[] = [];
  let skipped = 0;

  for (const row of rows) {
    const checkIn = cols.checkIn ? parseDate(row[cols.checkIn]) : null;
    let checkOut = cols.checkOut ? parseDate(row[cols.checkOut]) : null;

    // Sin fecha de entrada no podemos ubicar la reserva en el tiempo.
    if (!checkIn) {
      skipped++;
      continue;
    }

    let nights = cols.nights ? parseInt(row[cols.nights], 10) : NaN;
    if ((!nights || isNaN(nights)) && checkOut) {
      nights = nightsBetween(checkIn, checkOut);
    }
    if (!nights || isNaN(nights) || nights <= 0) nights = 1;
    if (!checkOut) {
      checkOut = new Date(checkIn.getTime() + nights * 86400000);
    }

    const gross = cols.grossRevenue ? parseMoney(row[cols.grossRevenue]) : 0;
    let commission = cols.platformCommission ? parseMoney(row[cols.platformCommission]) : 0;
    let net = cols.netRevenue ? parseMoney(row[cols.netRevenue]) : 0;

    // Completar valores derivables entre sí.
    if (!net && gross) net = Math.max(0, gross - commission);
    if (!commission && gross && net) commission = Math.max(0, gross - net);
    const grossFinal = gross || net + commission;

    const rowPlatform = cols.platform ? row[cols.platform]?.trim() : "";

    reservations.push({
      platform: rowPlatform || detectedPlatform,
      guestName: cols.guestName ? row[cols.guestName]?.trim() || null : null,
      bookingDate: cols.bookingDate ? parseDate(row[cols.bookingDate]) : null,
      checkIn,
      checkOut,
      nights,
      grossRevenue: grossFinal,
      platformCommission: commission,
      netRevenue: net || grossFinal - commission,
      month: toMonth(checkIn),
    });
  }

  return {
    reservations,
    detectedPlatform,
    totalRows: rows.length,
    skipped,
  };
}
