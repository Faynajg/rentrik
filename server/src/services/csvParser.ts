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

// Palabras clave por campo (español + inglés, varias OTAs).
const FIELD_KEYWORDS: Record<string, string[]> = {
  checkIn: ["fecha de entrada", "fecha entrada", "check-in", "checkin", "check in", "llegada", "arrival", "start date", "fecha llegada"],
  checkOut: ["fecha de salida", "fecha salida", "check-out", "checkout", "check out", "salida", "departure", "end date"],
  bookingDate: ["fecha de reserva", "fecha reserva", "booking date", "reservado", "confirmation date", "fecha de la reserva"],
  grossRevenue: ["ingresos brutos", "importe bruto", "gross earnings", "gross", "total price", "importe total", "total payout", "amount", "importe", "precio total", "total"],
  netRevenue: ["ingresos netos", "importe neto", "net earnings", "payout", "net", "neto", "ganancia neta"],
  platformCommission: ["comision de plataforma", "comision", "commission", "service fee", "host fee", "host service fee", "tarifa de servicio", "comision del anfitrion"],
  nights: ["numero de noches", "num noches", "noches", "nights", "n noches"],
  guestName: ["nombre del huesped", "huesped", "guest name", "guest", "cliente", "nombre"],
  platform: ["plataforma", "platform", "canal", "channel", "source", "origen"],
};

/** Encuentra la cabecera real que corresponde a un campo canónico. */
function matchColumn(headers: string[], field: string): string | null {
  const keywords = FIELD_KEYWORDS[field];
  const normalized = headers.map((h) => ({ raw: h, n: norm(h) }));
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

/** Detecta la plataforma a partir de nombres de columnas conocidos. */
function detectPlatform(headers: string[]): string {
  const joined = headers.map(norm).join(" | ");
  if (joined.includes("airbnb") || joined.includes("host payout")) return "Airbnb";
  if (joined.includes("booking")) return "Booking";
  if (joined.includes("vrbo") || joined.includes("homeaway")) return "VRBO";
  return "Otra";
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

  const cols = {
    checkIn: matchColumn(headers, "checkIn"),
    checkOut: matchColumn(headers, "checkOut"),
    bookingDate: matchColumn(headers, "bookingDate"),
    grossRevenue: matchColumn(headers, "grossRevenue"),
    netRevenue: matchColumn(headers, "netRevenue"),
    platformCommission: matchColumn(headers, "platformCommission"),
    nights: matchColumn(headers, "nights"),
    guestName: matchColumn(headers, "guestName"),
    platform: matchColumn(headers, "platform"),
  };

  const detectedPlatform = forcedPlatform || detectPlatform(headers);
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
