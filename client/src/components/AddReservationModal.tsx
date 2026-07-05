import { FormEvent, useState } from "react";
import { api, errorMessage } from "../api/client";
import { Alert, Modal } from "./ui";

const PLATFORMS = ["Airbnb", "Booking", "VRBO", "Otra"];

export function AddReservationModal({
  open,
  propertyId,
  onClose,
  onCreated,
}: {
  open: boolean;
  propertyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    platform: "Airbnb",
    guestName: "",
    checkIn: "",
    checkOut: "",
    grossRevenue: "",
    platformCommission: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post(`/properties/${propertyId}/reservations`, {
        platform: form.platform,
        guestName: form.guestName || undefined,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        grossRevenue: Number(form.grossRevenue) || 0,
        platformCommission: Number(form.platformCommission) || 0,
      });
      setForm({ platform: "Airbnb", guestName: "", checkIn: "", checkOut: "", grossRevenue: "", platformCommission: "" });
      onCreated();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Añadir reserva" subtitle="Introduce una reserva manualmente">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Plataforma</label>
            <select className="input" value={form.platform} onChange={(e) => set("platform", e.target.value)}>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Huésped <span className="text-slate-400">(opcional)</span></label>
            <input className="input" value={form.guestName} onChange={(e) => set("guestName", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Fecha de entrada</label>
            <input className="input" type="date" value={form.checkIn} onChange={(e) => set("checkIn", e.target.value)} required />
          </div>
          <div>
            <label className="label">Fecha de salida</label>
            <input className="input" type="date" value={form.checkOut} onChange={(e) => set("checkOut", e.target.value)} required />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Ingreso bruto</label>
            <input className="input" type="number" min={0} step="0.01" value={form.grossRevenue} onChange={(e) => set("grossRevenue", e.target.value)} required placeholder="0,00" />
          </div>
          <div>
            <label className="label">Comisión plataforma</label>
            <input className="input" type="number" min={0} step="0.01" value={form.platformCommission} onChange={(e) => set("platformCommission", e.target.value)} placeholder="0,00" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Añadir reserva"}</button>
        </div>
      </form>
    </Modal>
  );
}
