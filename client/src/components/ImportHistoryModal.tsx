import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../api/client";
import { eur, formatDate } from "../lib/format";
import { Alert, Modal, Spinner } from "./ui";

interface ImportBatch {
  id: string;
  filename: string;
  platform: string;
  count: number;
  totalGross: number;
  currency: string;
  dateFrom: string | null;
  dateTo: string | null;
  createdAt: string;
}

export function ImportHistoryModal({
  open,
  propertyId,
  onClose,
  onChanged,
}: {
  open: boolean;
  propertyId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [imports, setImports] = useState<ImportBatch[] | null>(null);
  const [error, setError] = useState("");
  const [undoing, setUndoing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.get<{ imports: ImportBatch[] }>(`/properties/${propertyId}/imports`);
      setImports(res.data.imports);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [propertyId]);

  useEffect(() => {
    if (open) {
      setImports(null);
      load();
    }
  }, [open, load]);

  async function undo(batch: ImportBatch) {
    if (!window.confirm(`¿Deshacer esta importación? Se eliminarán ${batch.count} reservas.`)) return;
    setUndoing(batch.id);
    setError("");
    try {
      await api.post(`/imports/${batch.id}/undo`);
      await load();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUndoing(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Historial de importaciones" wide>
      {error && <div className="mb-4"><Alert kind="error">{error}</Alert></div>}

      {imports === null ? (
        <Spinner label="Cargando historial…" />
      ) : imports.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Todavía no has importado ningún archivo.</p>
      ) : (
        <div className="space-y-3">
          {imports.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{b.filename}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDate(b.createdAt)} · <strong>{b.count}</strong> reservas · {b.platform}
                  {b.dateFrom && b.dateTo && <> · {formatDate(b.dateFrom)}–{formatDate(b.dateTo)}</>}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Total: {eur(b.totalGross)}{b.currency !== "EUR" && ` (origen ${b.currency})`}
                </p>
              </div>
              <button
                onClick={() => undo(b)}
                disabled={undoing === b.id}
                className="shrink-0 text-sm font-semibold text-negative hover:underline disabled:opacity-50"
              >
                {undoing === b.id ? "Deshaciendo…" : "Deshacer"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button onClick={onClose} className="btn-primary">Cerrar</button>
      </div>
    </Modal>
  );
}
