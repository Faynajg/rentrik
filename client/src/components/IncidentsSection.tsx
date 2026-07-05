import { FormEvent, useState } from "react";
import { api, errorMessage } from "../api/client";
import { Incident } from "../types";
import { eur, formatDate } from "../lib/format";
import { Alert, Modal } from "./ui";

const TYPE_LABELS: Record<string, string> = {
  reparacion: "Reparación",
  queja: "Queja de huésped",
  problema: "Problema",
  otro: "Otro",
};

const TYPE_STYLES: Record<string, string> = {
  reparacion: "bg-brand/10 text-brand",
  queja: "bg-gold-soft text-gold",
  problema: "bg-negative-soft text-negative",
  otro: "bg-slate-100 text-slate-500",
};

export function IncidentsSection({
  propertyId,
  incidents,
  onChange,
}: {
  propertyId: string;
  incidents: Incident[];
  onChange: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const total = incidents.reduce((a, i) => a + i.cost, 0);

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta incidencia?")) return;
    try {
      await api.delete(`/properties/${propertyId}/incidents/${id}`);
      onChange();
    } catch {
      /* noop */
    }
  }

  return (
    <div className="mt-6 card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Incidencias del mes ({incidents.length})</h3>
          {total > 0 && <p className="text-xs text-slate-400">Coste total: <span className="font-semibold text-negative">{eur(total)}</span> · se incluyen en el informe como gastos extraordinarios</p>}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-ghost btn-sm">+ Añadir incidencia</button>
      </div>

      {incidents.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Sin incidencias registradas este mes.</p>
      ) : (
        <div className="space-y-2">
          {incidents.map((inc) => (
            <div key={inc.id} className="group flex items-center gap-3 rounded-xl border border-slate-100 p-3">
              <span className={`badge ${TYPE_STYLES[inc.type]}`}>{TYPE_LABELS[inc.type]}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-700">{inc.description}</p>
                <p className="text-xs text-slate-400">{formatDate(inc.date)}</p>
              </div>
              <span className="font-semibold text-negative">{eur(inc.cost)}</span>
              <button
                onClick={() => remove(inc.id)}
                className="rounded p-1 text-slate-300 transition hover:bg-negative-soft hover:text-negative"
                title="Eliminar"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a1 1 0 01-1 1H7a1 1 0 01-1-1V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <AddIncidentModal
        open={showAdd}
        propertyId={propertyId}
        onClose={() => setShowAdd(false)}
        onCreated={onChange}
      />
    </div>
  );
}

function AddIncidentModal({ open, propertyId, onClose, onCreated }: { open: boolean; propertyId: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ type: "reparacion", description: "", cost: "", date: new Date().toISOString().slice(0, 10) });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post(`/properties/${propertyId}/incidents`, {
        type: form.type,
        description: form.description,
        cost: Number(form.cost) || 0,
        date: form.date,
      });
      setForm({ type: "reparacion", description: "", cost: "", date: new Date().toISOString().slice(0, 10) });
      onCreated();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Añadir incidencia" subtitle="Reparaciones, quejas o problemas con su coste">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fecha</label>
            <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
        </div>
        <div>
          <label className="label">Descripción</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="Ej. Reparación de la caldera" />
        </div>
        <div>
          <label className="label">Coste</label>
          <input className="input" type="number" min={0} step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="0,00" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Añadir"}</button>
        </div>
      </form>
    </Modal>
  );
}
