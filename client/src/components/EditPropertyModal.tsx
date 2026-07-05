import { FormEvent, useState } from "react";
import { api, errorMessage } from "../api/client";
import { Property } from "../types";
import { Alert, Modal } from "./ui";

export function EditPropertyModal({
  open,
  property,
  onClose,
  onSaved,
}: {
  open: boolean;
  property: Property;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(property.name);
  const [address, setAddress] = useState(property.address ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.patch(`/properties/${property.id}`, { name, address });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar propiedad">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <div>
          <label className="label">Nombre de la propiedad</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Dirección <span className="text-slate-400">(opcional)</span></label>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, ciudad" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button>
        </div>
      </form>
    </Modal>
  );
}
