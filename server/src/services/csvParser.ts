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
    // "entrada" suelto: cabecera habitual en los exports españoles (Booking).
    // Simétrico con "salida", que checkOut ya aceptaba.
    "entrada",
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
    // "precio" suelto: cabecera habitual en los exports españoles (Booking).
    "precio",
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
/**
 * Cabeceras de tarifa unitaria: NO son el importe de la reserva. Se excluyen de
 * la búsqueda por inclusión en los campos de dinero total, para que "Precio por
 * noche" no acabe importándose como ingreso bruto (sería un dato financiero
 * incorrecto y silencioso). Una coincidencia exacta sigue mandando.
 */
const PER_UNIT_HINTS = ["por noche", "per night", "nightly", "por persona", "per person", "por dia", "per day"];
const TOTAL_MONEY_FIELDS = new Set(["grossRevenue", "netRevenue"]);

function matchColumn(headers: string[], field: string, used?: Set<string>): string | null {
  const keywords = FIELD_KEYWORDS[field];
  const normalized = headers.filter((h) => !used?.has(h)).map((h) => ({ raw: h, n: norm(h) }));
  // 1) coincidencia exacta primero
  for (const kw of keywords) {
    const exact = normalized.find((h) => h.n === kw);
    if (exact) return exact.raw;
  }
  // 2) coincidencia por inclusión (sin tarifas unitarias en campos de total)
  const candidates = TOTAL_MONEY_FIELDS.has(field)
    ? normalized.filter((h) => !PER_UNIT_HINTS.some((hint) => h.n.includes(hint)))
    : normalized;
  for (const kw of keywords) {
    const partial = candidates.find((h) => h.n.includes(kw));
    if (partial) return partial.raw;
  }
  return null;
}

/** Convierte un valor monetario ("€1.234,56", "$1,234.56", "1234.5") a número. */
export function parseMoney(value: unknown): number {
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
export function parseDate(value: unknown): Date | null {
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
export function platformFromText(text: string): string | null {
  for (const [name, tokens] of PLATFORM_TOKENS) {
    if (tokens.some((t) => text.includes(t))) return name;
  }
  return null;
}

/** Detecta la plataforma a partir de los nombres de columnas conocidos. */
export function detectPlatform(headers: string[]): string {
  return platformFromText(headers.map(norm).join(" | ")) ?? "Otra";
}

// ─── Mapeo de columnas ────────────────────────────────────────────────

/** Mapa de campo canónico → nombre de columna real del archivo (o null). */
export type ColumnMap = Partial<Record<string, string | null>>;

/** Todos los campos canónicos que Rentrik entiende. */
export const CANONICAL_FIELDS = [
  "checkIn", "checkOut", "grossRevenue", "netRevenue",
  "platformCommission", "nights", "guestName", "bookingDate", "platform",
] as const;

/** Campos imprescindibles para poder importar una reserva. */
export const REQUIRED_FIELDS = ["checkIn", "checkOut", "grossRevenue"] as const;

/** Etiquetas legibles (ES) por campo, para el mapeador visual. */
export const FIELD_LABELS: Record<string, string> = {
  checkIn: "Fecha de entrada",
  checkOut: "Fecha de salida",
  grossRevenue: "Importe (ingresos brutos)",
  netRevenue: "Ingresos netos",
  platformCommission: "Comisión de plataforma",
  nights: "Noches",
  guestName: "Nombre del huésped",
  bookingDate: "Fecha de reserva",
  platform: "Plataforma / canal",
};

/**
 * Mapea automáticamente las cabeceras a los campos canónicos. Cada columna se
 * asigna de más específico a más genérico y se excluye de los siguientes para
 * que un campo genérico no robe la columna de otro más concreto.
 */
export function autoMapColumns(headers: string[]): ColumnMap {
  const used = new Set<string>();
  const map: ColumnMap = {};
  for (const field of CANONICAL_FIELDS) {
    const col = matchColumn(headers, field, used);
    if (col) used.add(col);
    map[field] = col;
  }
  return map;
}

/** Confianza (0-1): fracción de campos requeridos que se mapearon. */
export function mappingConfidence(map: ColumnMap): number {
  const got = REQUIRED_FIELDS.filter((f) => map[f]).length;
  return got / REQUIRED_FIELDS.length;
}

/** ¿El mapeo cubre todos los campos requeridos? */
export function isMappingComplete(map: ColumnMap): boolean {
  return REQUIRED_FIELDS.every((f) => !!map[f]);
}

/** Huella estable de las cabeceras (normalizadas y ordenadas) para recordar el mapeo. */
export function fingerprintHeaders(headers: string[]): string {
  return headers.map(norm).filter(Boolean).sort().join("|");
}

/** Resuelve la plataforma: forzada > cabeceras > valor de la columna canal. */
export function resolvePlatform(
  headers: string[],
  rows: Record<string, string>[],
  platformCol: string | null | undefined,
  forcedPlatform?: string
): string {
  let detected = forcedPlatform || detectPlatform(headers);
  if (!forcedPlatform && detected === "Otra" && platformCol) {
    for (const row of rows) {
      const raw = row[platformCol]?.trim();
      if (!raw) continue;
      detected = platformFromText(norm(raw)) ?? raw;
      break;
    }
  }
  return detected;
}

/**
 * Construye reservas normalizadas a partir de filas ya parseadas y un mapeo de
 * columnas explícito (auto o manual). No convierte divisas: eso se hace aparte.
 */
export function buildReservations(
  rows: Record<string, string>[],
  map: ColumnMap,
  detectedPlatform: string
): { reservations: ParsedReservation[]; skipped: number } {
  const reservations: ParsedReservation[] = [];
  let skipped = 0;

  for (const row of rows) {
    const checkIn = map.checkIn ? parseDate(row[map.checkIn]) : null;
    let checkOut = map.checkOut ? parseDate(row[map.checkOut]) : null;

    // Sin fecha de entrada no podemos ubicar la reserva en el tiempo.
    if (!checkIn) {
      skipped++;
      continue;
    }

    let nights = map.nights ? parseInt(row[map.nights], 10) : NaN;
    if ((!nights || isNaN(nights)) && checkOut) {
      nights = nightsBetween(checkIn, checkOut);
    }
    if (!nights || isNaN(nights) || nights <= 0) nights = 1;
    if (!checkOut) {
      checkOut = new Date(checkIn.getTime() + nights * 86400000);
    }

    const gross = map.grossRevenue ? parseMoney(row[map.grossRevenue]) : 0;
    let commission = map.platformCommission ? parseMoney(row[map.platformCommission]) : 0;
    let net = map.netRevenue ? parseMoney(row[map.netRevenue]) : 0;

    // Completar valores derivables entre sí.
    if (!net && gross) net = Math.max(0, gross - commission);
    if (!commission && gross && net) commission = Math.max(0, gross - net);
    const grossFinal = gross || net + commission;

    const rowPlatform = map.platform ? row[map.platform]?.trim() : "";

    reservations.push({
      platform: rowPlatform || detectedPlatform,
      guestName: map.guestName ? row[map.guestName]?.trim() || null : null,
      bookingDate: map.bookingDate ? parseDate(row[map.bookingDate]) : null,
      checkIn,
      checkOut,
      nights,
      grossRevenue: grossFinal,
      platformCommission: commission,
      netRevenue: net || grossFinal - commission,
      month: toMonth(checkIn),
    });
  }

  return { reservations, skipped };
}

/**
 * Parsea el contenido de un CSV (texto) con auto-mapeo. Se mantiene por
 * compatibilidad; el nuevo flujo usa readTabularFile + buildReservations.
 */
export function parseReservationsCsv(content: string, forcedPlatform?: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const rows = result.data ?? [];
  const headers = result.meta.fields ?? [];
  const map = autoMapColumns(headers);
  const detectedPlatform = resolvePlatform(headers, rows, map.platform, forcedPlatform);
  const { reservations, skipped } = buildReservations(rows, map, detectedPlatform);
  return { reservations, detectedPlatform, totalRows: rows.length, skipped };
}
