import { useState } from "react";
import { api, errorMessage } from "../api/client";
import { formatDate } from "../lib/format";
import { Alert } from "./ui";

export function PropertyNotes({
  propertyId,
  initialNotes,
  updatedAt,
  onSaved,
}: {
  propertyId: string;
  initialNotes: string | null;
  updatedAt: string | null;
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(updatedAt);
  const [error, setError] = useState("");
  const dirty = notes !== (initialNotes ?? "");

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/properties/${propertyId}`, { notes });
      setSaved(new Date().toISOString());
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Notas de la propiedad</h3>
        {saved && <span className="text-xs text-slate-400">Última nota: {formatDate(saved)}</span>}
      </div>
      <p className="mb-3 text-xs text-slate-400">
        Anota reparaciones, incidencias y cosas a recordar de esta propiedad.
      </p>
      {error && <div className="mb-3"><Alert kind="error">{error}</Alert></div>}
      <textarea
        className="input min-h-[120px] resize-y"
        maxLength={2000}
        placeholder="Ej: Cambiar la caldera antes del invierno. El vecino del 3º tiene una copia de llaves…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-2xs text-slate-400">{notes.length}/2000</span>
        <button onClick={save} disabled={saving || !dirty} className="btn-primary btn-sm">
          {saving ? "Guardando…" : "Guardar nota"}
        </button>
      </div>
    </div>
  );
}
