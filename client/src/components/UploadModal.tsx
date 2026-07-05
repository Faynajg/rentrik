import { FormEvent, useRef, useState } from "react";
import { api, errorMessage } from "../api/client";
import { Alert, Modal } from "./ui";

interface UploadResult {
  imported: number;
  duplicates: number;
  skipped: number;
  detectedPlatform: string;
  months: string[];
}

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
  const [file, setFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setPlatform("");
    setError("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecciona un archivo CSV.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (platform) fd.append("platform", platform);
      const res = await api.post<UploadResult>(`/properties/${propertyId}/reservations/upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      onUploaded();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function close() {
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title="Subir ingresos (CSV)">
      {result ? (
        <div className="space-y-4">
          <Alert kind={result.imported > 0 ? "success" : "info"}>
            Se importaron <strong>{result.imported}</strong> reservas
            {result.skipped > 0 && ` · ${result.skipped} filas omitidas`}. Plataforma detectada:{" "}
            <strong>{result.detectedPlatform}</strong>.
          </Alert>
          {result.duplicates > 0 && (
            <Alert kind="info">
              Se omitieron <strong>{result.duplicates}</strong> reservas que ya estaban
              importadas (para evitar duplicados).
            </Alert>
          )}
          <p className="text-sm text-slate-500">
            Meses con datos: {result.months.join(", ")}
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={reset} className="btn-ghost">Subir otro</button>
            <button onClick={close} className="btn-primary">Listo</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <p className="text-sm text-slate-500">
            Descarga tu informe de ingresos desde Airbnb, Booking, VRBO o cualquier OTA y súbelo aquí.
            Rentrik detecta el formato automáticamente.
          </p>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center hover:border-brand hover:bg-brand/5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-brand">
              <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-medium text-slate-600">
              {file ? file.name : "Haz clic para seleccionar un archivo CSV"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div>
            <label className="label">Plataforma <span className="text-slate-400">(opcional — se detecta sola)</span></label>
            <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="">Detección automática</option>
              <option value="Airbnb">Airbnb</option>
              <option value="Booking">Booking</option>
              <option value="VRBO">VRBO</option>
              <option value="Otra">Otra</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={close} className="btn-ghost">Cancelar</button>
            <button className="btn-primary" disabled={loading}>{loading ? "Procesando…" : "Subir y procesar"}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
