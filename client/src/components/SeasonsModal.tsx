import { FormEvent, useState } from "react";
import { api, errorMessage } from "../api/client";
import { SeasonConfig } from "../types";
import { MONTHS_SHORT, SEASON_LABELS, defaultSeasons, parseSeasons } from "../lib/seasons";
import { Alert, Modal } from "./ui";

const SEASON_COLORS: Record<string, string> = {
  alta: "border-negative/30 bg-negative-soft/40",
  media: "border-gold/30 bg-gold-soft/50",
  baja: "border-brand/20 bg-brand/[0.03]",
};

export function SeasonsModal({
  open,
  propertyId,
  seasonsConfig,
  onClose,
  onSaved,
}: {
  open: boolean;
  propertyId: string;
  seasonsConfig: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [seasons, setSeasons] = useState<SeasonConfig[]>(() => {
    const parsed = parseSeasons(seasonsConfig);
    return parsed.length > 0 ? parsed : defaultSeasons();
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleMonth(sType: string, m: number) {
    setSeasons((prev) =>
      prev.map((s) => {
        if (s.type !== sType) return s;
        const has = s.months.includes(m);
        return { ...s, months: has ? s.months.filter((x) => x !== m) : [...s.months, m].sort((a, b) => a - b) };
      })
    );
  }

  function setField(sType: string, field: "targetOccupancy" | "minPrice", value: number) {
    setSeasons((prev) => prev.map((s) => (s.type === sType ? { ...s, [field]: value } : s)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.put(`/properties/${propertyId}/seasons`, { seasons });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Gestión de temporadas" subtitle="Objetivos de ocupación y precio mínimo por temporada" wide>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <p className="text-sm text-slate-500">
          Asigna los meses a cada temporada y fija su objetivo de ocupación y precio mínimo. Rentrik te avisará
          cuando una propiedad no cumpla el objetivo de su temporada.
        </p>

        {seasons.map((s) => (
          <div key={s.type} className={`rounded-xl border p-4 ${SEASON_COLORS[s.type]}`}>
            <h4 className="text-sm font-semibold text-ink">{SEASON_LABELS[s.type]}</h4>
            <div className="mt-2 flex flex-wrap gap-1">
              {MONTHS_SHORT.map((label, i) => {
                const m = i + 1;
                const active = s.months.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMonth(s.type, m)}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                      active ? "bg-brand text-white" : "bg-white text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label !mb-1 text-xs">Objetivo de ocupación (%)</label>
                <input className="input !py-1.5" type="number" min={0} max={100} value={s.targetOccupancy} onChange={(e) => setField(s.type, "targetOccupancy", Number(e.target.value))} />
              </div>
              <div>
                <label className="label !mb-1 text-xs">Precio mínimo (€/noche)</label>
                <input className="input !py-1.5" type="number" min={0} value={s.minPrice} onChange={(e) => setField(s.type, "minPrice", Number(e.target.value))} />
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar temporadas"}</button>
        </div>
      </form>
    </Modal>
  );
}
