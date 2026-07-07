import Papa from "papaparse";
import * as XLSX from "xlsx";

/** Datos tabulares normalizados: cabeceras + filas como objetos {cabecera: valor}. */
export interface TabularData {
  headers: string[];
  rows: Record<string, string>[];
}

function isExcel(filename: string, mimetype?: string): boolean {
  const f = (filename || "").toLowerCase();
  if (f.endsWith(".xlsx") || f.endsWith(".xls")) return true;
  if (mimetype && /(spreadsheet|excel|ms-excel)/i.test(mimetype)) return true;
  return false;
}

/** Lee un archivo CSV o Excel (.xlsx/.xls) desde un buffer y lo normaliza. */
export function readTabularFile(buffer: Buffer, filename: string, mimetype?: string): TabularData {
  return isExcel(filename, mimetype) ? readExcel(buffer) : readCsv(buffer.toString("utf-8"));
}

function readCsv(content: string): TabularData {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return { headers: (result.meta.fields ?? []).map((h) => h.trim()), rows: result.data ?? [] };
}

function readExcel(buffer: Buffer): TabularData {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const firstSheet = wb.SheetNames[0];
  const sheet = firstSheet ? wb.Sheets[firstSheet] : undefined;
  if (!sheet) return { headers: [], rows: [] };

  // Matriz de valores (raw:false → fechas y números ya formateados como texto).
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  }) as unknown[][];
  if (matrix.length === 0) return { headers: [], rows: [] };

  const headers = (matrix[0] ?? []).map((h) => String(h ?? "").trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      if (h) row[h] = String(cells[j] ?? "").trim();
    });
    // Descarta filas totalmente vacías.
    if (Object.values(row).some((v) => v !== "")) rows.push(row);
  }
  return { headers, rows };
}
