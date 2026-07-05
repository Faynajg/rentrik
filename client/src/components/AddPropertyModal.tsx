import { FormEvent, useState } from "react";
import { api, errorMessage } from "../api/client";
import { Alert, Modal } from "./ui";

export function AddPropertyModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/properties", { name, address: address || undefined });
      setName("");
      setAddress("");
      onCreated();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva propiedad">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <div>
          <label className="label">Nombre de la propiedad</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej. Apartamento Playa Centro" />
        </div>
        <div>
          <label className="label">Dirección <span className="text-slate-400">(opcional)</span></label>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, ciudad" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button className="btn-primary" disabled={loading}>{loading ? "Creando…" : "Crear propiedad"}</button>
        </div>
      </form>
    </Modal>
  );
}
