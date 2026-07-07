import { FormEvent, useRef, useState } from "react";
import { api, errorMessage } from "../api/client";
import { eur, formatDate } from "../lib/format";
import { Alert, Modal, Spinner } from "./ui";

// ─── Tipos de respuesta del backend ───────────────────────────────────
type ColMap = Record<string, string | null>;

interface FieldDef {
  key: string;
  label: string;
  required: boolean;
}

interface Summary {
  count: number;
  totalGross: number;
  dateFrom: string | null;
  dateTo: string | null;
  duplicates: number;
  skipped: number;
}

interface AnalyzeResp {
  headers: string[];
  preview: Record<string, string>[];
  fields: FieldDef[];
  suggestedMapping: ColMap;
  confidence: number;
  savedMappingUsed: boolean;
  autoImportable: boolean;
  needsMapping: boolean;
  detectedPlatform: string;
  currency: string;
  targetCurrency: string;
  knownCurrencies: string[];
  summary: Summary | null;
}

interface ConfirmResp {
  imported: number;
  duplicates: number;
  skipped: number;
  detectedPlatform: string;
  currency: string;
  message?: string;
}

type Step = "select" | "mapping" | "confirm" | "result";

const PLATFORMS = ["Airbnb", "Booking", "VRBO", "Expedia", "Holidu", "Rentalia", "Wimdu", "TripAdvisor", "Otra"];

export function UploadModal({
  open,
  propertyId,
  onClose,
  onUploaded,
}: {
  open: boolean;
  propertyId: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [analysis, setAnalysis] = useState<AnalyzeResp | null>(null);
  const [mapping, setMapping] = useState<ColMap>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [saveMapping, setSaveMapping] = useState(true);
  const [result, setResult] = useState<ConfirmResp | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("select");
    setFile(null);
    setPlatform("");
    setCurrency("EUR");
    setAnalysis(null);
    setMapping({});
    setSkipDuplicates(true);
    setSaveMapping(true);
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    reset();
    onClose();
  }

  function buildForm(withMapping?: ColMap) {
    const fd = new FormData();
    fd.append("file", file as File);
    if (platform) fd.append("platform", platform);
    if (currency && currency !== "EUR") fd.append("currency", currency);
    if (withMapping) fd.append("mapping", JSON.stringify(withMapping));
    return fd;
  }

  const requiredMapped = (a: AnalyzeResp | null, m: ColMap) =>
    !!a && a.fields.filter((f) => f.required).every((f) => m[f.key]);

  // Paso 1 → analizar el archivo.
  async function onAnalyze(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecciona un archivo CSV o Excel.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post<AnalyzeResp>(`/properties/${propertyId}/import/analyze`, buildForm());
      const data = res.data;
      setAnalysis(data);
      setMapping(data.suggestedMapping);
      setCurrency(data.currency);
      if (data.autoImportable) setStep("confirm");
      else setStep("mapping");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Paso 2 (si hace falta mapear) → recalcular resumen con el mapeo manual.
  async function onMappingContinue() {
    setError("");
    setLoading(true);
    try {
      const res = await api.post<AnalyzeResp>(`/properties/${propertyId}/import/analyze`, buildForm(mapping));
      setAnalysis(res.data);
      setStep("confirm");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Si el usuario cambia la moneda en el paso de confirmación, recalcula el resumen.
  async function refreshSummary(nextCurrency: string) {
    setCurrency(nextCurrency);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file as File);
      if (platform) fd.append("platform", platform);
      if (nextCurrency && nextCurrency !== "EUR") fd.append("currency", nextCurrency);
      fd.append("mapping", JSON.stringify(mapping));
      const res = await api.post<AnalyzeResp>(`/properties/${propertyId}/import/analyze`, fd);
      setAnalysis(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Paso 3 → importar de verdad.
  async function onConfirmImport() {
    setError("");
    setLoading(true);
    try {
      const fd = buildForm(mapping);
      fd.append("skipDuplicates", String(skipDuplicates));
      fd.append("saveMapping", String(saveMapping));
      const res = await api.post<ConfirmResp>(`/properties/${propertyId}/import/confirm`, fd);
      setResult(res.data);
      setStep("result");
      onUploaded();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const summary = analysis?.summary ?? null;
  const willImport = summary ? (skipDuplicates ? summary.count - summary.duplicates : summary.count) : 0;

  return (
    <Modal open={open} onClose={close} title="Importar reservas" subtitle="CSV o Excel de cualquier plataforma" wide>
      {error && <div className="mb-4"><Alert kind="error">{error}</Alert></div>}

      {/* PASO 1 — seleccionar archivo */}
      {step === "select" && (
        <form onSubmit={onAnalyze} className="space-y-4">
          <p className="text-sm text-slate-500">
            Sube el CSV o Excel (.xlsx) de ingresos de <strong>cualquier plataforma</strong> — Airbnb,
            Booking, tu gestor o tu propio Excel. Rentrik detecta las columnas automáticamente; si no,
            te deja mapearlas a mano.
          </p>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center hover:border-brand hover:bg-brand/5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-brand">
              <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-medium text-slate-600">
              {file ? file.name : "Haz clic para seleccionar un archivo CSV o Excel"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div>
            <label className="label">Plataforma <span className="text-slate-400">(opcional — se detecta sola)</span></label>
            <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="">Detección automática</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p === "TripAdvisor" ? "TripAdvisor / FlipKey" : p}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={close} className="btn-ghost">Cancelar</button>
            <button className="btn-primary" disabled={loading || !file}>
              {loading ? "Analizando…" : "Analizar archivo"}
            </button>
          </div>
        </form>
      )}

      {/* PASO 2 — mapeador visual */}
      {step === "mapping" && analysis && (
        <div className="space-y-5">
          <Alert kind="info">
            No hemos reconocido todas las columnas automáticamente. Indícanos qué columna corresponde a
            cada dato. Los marcados con <span className="font-semibold">*</span> son obligatorios.
          </Alert>

          {/* Preview de las primeras filas */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Vista previa del archivo</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {analysis.headers.map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.preview.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      {analysis.headers.map((h) => (
                        <td key={h} className="whitespace-nowrap px-3 py-1.5 text-slate-600">{row[h] ?? ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selects de mapeo */}
          <div className="grid gap-3 sm:grid-cols-2">
            {analysis.fields.map((f) => (
              <div key={f.key}>
                <label className="label">
                  {f.label} {f.required && <span className="text-negative">*</span>}
                  {!f.required && <span className="text-slate-400"> (opcional)</span>}
                </label>
                <select
                  className="input"
                  value={mapping[f.key] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value || null }))}
                >
                  <option value="">— Sin asignar —</option>
                  {analysis.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-between gap-2 pt-1">
            <button onClick={() => setStep("select")} className="btn-ghost">Atrás</button>
            <button
              onClick={onMappingContinue}
              disabled={loading || !requiredMapped(analysis, mapping)}
              className="btn-primary"
            >
              {loading ? "Calculando…" : "Continuar"}
            </button>
          </div>
        </div>
      )}

      {/* PASO 3 — validación / confirmación */}
      {step === "confirm" && analysis && (
        <div className="space-y-4">
          {loading && !summary ? (
            <Spinner label="Calculando resumen…" />
          ) : (
            <>
              {analysis.savedMappingUsed && (
                <Alert kind="info">
                  Detectamos que es el mismo formato que usaste antes — mapeo aplicado automáticamente.
                </Alert>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Se van a importar</p>
                <p className="text-2xl font-extrabold text-ink">{willImport} reservas</p>
                {summary?.dateFrom && summary?.dateTo && (
                  <p className="mt-1 text-sm text-slate-500">
                    Del <strong>{formatDate(summary.dateFrom)}</strong> al <strong>{formatDate(summary.dateTo)}</strong>
                  </p>
                )}
                <p className="mt-1 text-sm text-slate-500">
                  Importe total: <strong>{eur(summary?.totalGross ?? 0)}</strong>
                  {currency !== "EUR" && <span className="text-slate-400"> (convertido de {currency})</span>}
                  {" · "}Plataforma: <strong>{analysis.detectedPlatform}</strong>
                </p>
                {summary && summary.skipped > 0 && (
                  <p className="mt-1 text-xs text-slate-400">{summary.skipped} filas sin fecha válida se omitirán.</p>
                )}
              </div>

              {/* Moneda del archivo (origen) */}
              <div>
                <label className="label">Moneda del archivo</label>
                <select className="input" value={currency} onChange={(e) => refreshSummary(e.target.value)}>
                  {(analysis.knownCurrencies ?? ["EUR"]).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {currency !== analysis.targetCurrency && (
                  <p className="mt-1 text-xs text-slate-400">
                    Los importes se convertirán a {analysis.targetCurrency} (moneda de la propiedad) con el tipo de cambio del día de cada reserva.
                  </p>
                )}
              </div>

              {/* Duplicados */}
              {summary && summary.duplicates > 0 && (
                <div className="rounded-xl border border-gold/30 bg-gold-soft/40 p-4">
                  <p className="text-sm font-semibold text-ink">
                    {summary.duplicates} reservas parecen duplicadas
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Ya existen reservas con las mismas fechas e importe similar.
                  </p>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={skipDuplicates} onChange={() => setSkipDuplicates(true)} />
                      Ignorar las duplicadas (recomendado)
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={!skipDuplicates} onChange={() => setSkipDuplicates(false)} />
                      Importarlas igualmente
                    </label>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={saveMapping} onChange={(e) => setSaveMapping(e.target.checked)} />
                Recordar este formato para la próxima vez
              </label>

              <div className="flex justify-between gap-2 pt-1">
                <button
                  onClick={() => setStep(analysis.needsMapping ? "mapping" : "select")}
                  className="btn-ghost"
                >
                  Atrás
                </button>
                <button onClick={onConfirmImport} disabled={loading || willImport <= 0} className="btn-primary">
                  {loading ? "Importando…" : `Importar ${willImport} reservas`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* PASO 4 — resultado */}
      {step === "result" && result && (
        <div className="space-y-4">
          <Alert kind={result.imported > 0 ? "success" : "info"}>
            {result.imported > 0
              ? <>Se importaron <strong>{result.imported}</strong> reservas correctamente.</>
              : (result.message ?? "No se importó ninguna reserva.")}
          </Alert>
          {result.duplicates > 0 && (
            <p className="text-sm text-slate-500">
              {skipDuplicates
                ? <>Se ignoraron <strong>{result.duplicates}</strong> reservas duplicadas.</>
                : <><strong>{result.duplicates}</strong> reservas duplicadas se importaron igualmente.</>}
            </p>
          )}
          {result.skipped > 0 && (
            <p className="text-sm text-slate-400">{result.skipped} filas sin fecha válida se omitieron.</p>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={reset} className="btn-ghost">Importar otro</button>
            <button onClick={close} className="btn-primary">Listo</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
