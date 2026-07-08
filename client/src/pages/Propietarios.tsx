import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../api/client";
import { Owner, OwnerSummary, ReportLog } from "../types";
import { monthLabel } from "../lib/format";
import { Alert, EmptyState, Modal, PasswordInput, Spinner } from "../components/ui";

interface OwnerDetail {
  owner: Owner;
  assigned: { id: string; name: string; address: string | null }[];
  allProperties: { id: string; name: string; ownerId: string | null }[];
  reportLogs: ReportLog[];
}

export default function Propietarios() {
  const [owners, setOwners] = useState<OwnerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendMsg, setSendMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ owners: OwnerSummary[] }>("/owners");
      setOwners(res.data.owners);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  async function sendAllNow() {
    setSendingAll(true);
    setSendMsg("");
    setError("");
    try {
      const res = await api.post<{ sent: number; month: string }>("/owners/reports/send-now", {});
      setSendMsg(
        res.data.sent > 0
          ? `Se han enviado ${res.data.sent} informe(s) del mes ${res.data.month} a los propietarios.`
          : "No había informes pendientes de enviar (ya enviados o sin datos)."
      );
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSendingAll(false);
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  if (selected) {
    return <OwnerDetailView ownerId={selected} onBack={() => { setSelected(null); load(); }} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Propietarios</h1>
          <p className="text-sm text-slate-500">Gestiona tus propietarios e inversores y envíales sus informes</p>
        </div>
        <div className="flex items-center gap-2">
          {owners.length > 0 && (
            <button onClick={sendAllNow} disabled={sendingAll} className="btn-ghost">
              {sendingAll ? "Enviando…" : "Enviar informes del mes"}
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="btn-primary">+ Propietario</button>
        </div>
      </div>

      {sendMsg && <div className="mt-4"><Alert kind="success">{sendMsg}</Alert></div>}
      {error && <div className="mt-4"><Alert kind="error">{error}</Alert></div>}

      {loading ? (
        <Spinner label="Cargando propietarios…" />
      ) : owners.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Aún no tienes propietarios"
            description="Añade los propietarios o inversores a los que rindes cuentas y asígnales sus propiedades."
            action={<button onClick={() => setShowAdd(true)} className="btn-primary">Añadir propietario</button>}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {owners.map((o) => (
            <button key={o.id} onClick={() => setSelected(o.id)} className="card card-hover p-5 text-left">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
                  {o.name[0]?.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{o.name}</p>
                  <p className="truncate text-xs text-slate-400">{o.email ?? "Sin email"}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>{o.properties.length} propiedad{o.properties.length === 1 ? "" : "es"}</span>
                <span>{o.reportsCount} informe{o.reportsCount === 1 ? "" : "s"}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <AddOwnerModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={load} />
    </div>
  );
}

function AddOwnerModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/owners", form);
      setForm({ name: "", email: "", phone: "", notes: "" });
      onCreated();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo propietario">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <div>
          <label className="label">Nombre</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nombre del propietario o inversor" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Para enviarle informes" />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Notas <span className="text-slate-400">(opcional)</span></label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Crear propietario"}</button>
        </div>
      </form>
    </Modal>
  );
}

function OwnerDetailView({ ownerId, onBack }: { ownerId: string; onBack: () => void }) {
  const [data, setData] = useState<OwnerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [savingProps, setSavingProps] = useState(false);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());

  // Envío de informe
  const [reportProperty, setReportProperty] = useState("");
  const [reportMonth, setReportMonth] = useState(currentMonth());
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<OwnerDetail>(`/owners/${ownerId}`);
      setData(res.data);
      setAssignedIds(new Set(res.data.assigned.map((p) => p.id)));
      if (res.data.assigned[0]) setReportProperty(res.data.assigned[0].id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProperties() {
    setSavingProps(true);
    setMsg("");
    setError("");
    try {
      await api.put(`/owners/${ownerId}/properties`, { propertyIds: Array.from(assignedIds) });
      setMsg("Propiedades asignadas actualizadas.");
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingProps(false);
    }
  }

  async function sendReport() {
    if (!reportProperty) return;
    setSending(true);
    setMsg("");
    setError("");
    try {
      const res = await api.post<{ ok: boolean; sentTo: string; emailEnabled: boolean }>(`/owners/${ownerId}/send-report`, {
        propertyId: reportProperty,
        month: reportMonth,
      });
      setMsg(
        res.data.emailEnabled
          ? `Informe enviado a ${res.data.sentTo}.`
          : `Informe generado y registrado para ${res.data.sentTo}. (Email en modo desarrollo: configura SMTP para el envío real.)`
      );
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  function toggle(id: string) {
    setAssignedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading && !data) return <Spinner label="Cargando propietario…" />;
  if (!data) return <Alert kind="error">{error || "No se pudo cargar el propietario."}</Alert>;

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Volver a propietarios
      </button>

      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-gradient text-lg font-bold text-white">
          {data.owner.name[0]?.toUpperCase()}
        </span>
        <div>
          <h1 className="text-2xl font-bold text-ink">{data.owner.name}</h1>
          <p className="text-sm text-slate-500">
            {data.owner.email ?? "Sin email"}{data.owner.phone ? ` · ${data.owner.phone}` : ""}
          </p>
        </div>
      </div>

      {msg && <div className="mt-4"><Alert kind="success">{msg}</Alert></div>}
      {error && <div className="mt-4"><Alert kind="error">{error}</Alert></div>}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Ficha editable */}
        <OwnerFields owner={data.owner} onSaved={load} />

        {/* Enviar informe */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700">Generar y enviar informe PDF</h3>
          {!data.owner.email ? (
            <p className="mt-3 text-sm text-slate-500">Añade un email al propietario para poder enviarle informes.</p>
          ) : data.assigned.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Asigna alguna propiedad a este propietario para enviarle su informe.</p>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Propiedad</label>
                <select className="input" value={reportProperty} onChange={(e) => setReportProperty(e.target.value)}>
                  {data.assigned.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Mes del informe</label>
                <input className="input" type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
              </div>
              <button onClick={sendReport} disabled={sending} className="btn-primary w-full">
                {sending ? "Generando y enviando…" : `Enviar informe a ${data.owner.email}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Acceso al portal del propietario */}
      <PortalAccessCard owner={data.owner} onChanged={load} />

      {/* Asignación de propiedades */}
      <div className="mt-4 card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Propiedades asignadas</h3>
          <button onClick={saveProperties} disabled={savingProps} className="btn-ghost btn-sm">
            {savingProps ? "Guardando…" : "Guardar asignación"}
          </button>
        </div>
        {data.allProperties.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No tienes propiedades todavía.</p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.allProperties.map((p) => {
              const assignedElsewhere = p.ownerId && p.ownerId !== ownerId;
              return (
                <label key={p.id} className={`flex items-center gap-3 rounded-xl border p-3 ${assignedIds.has(p.id) ? "border-brand/30 bg-brand/[0.03]" : "border-slate-100"}`}>
                  <input type="checkbox" checked={assignedIds.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 accent-[#1E3A5F]" />
                  <span className="flex-1 text-sm text-slate-700">{p.name}</span>
                  {assignedElsewhere && <span className="text-2xs text-slate-400">otro propietario</span>}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de informes */}
      <div className="mt-4 card p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Historial de informes ({data.reportLogs.length})</h3>
        {data.reportLogs.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no se ha enviado ningún informe a este propietario.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Fecha</th>
                  <th className="pb-2">Mes del informe</th>
                  <th className="pb-2">Enviado a</th>
                </tr>
              </thead>
              <tbody>
                {data.reportLogs.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="py-2 text-slate-600">{new Date(r.createdAt).toLocaleDateString("es-ES")}</td>
                    <td className="py-2 capitalize text-slate-600">{monthLabel(r.month)}</td>
                    <td className="py-2 text-slate-600">{r.sentTo ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PortalAccessCard({ owner, onChanged }: { owner: Owner; onChanged: () => void }) {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const portalUrl = `${window.location.origin}/portal/login`;

  async function enable(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    setSaving(true);
    try {
      await api.post(`/owners/${owner.id}/portal-access`, { password });
      setPassword("");
      setMsg(owner.portalEnabled ? "Contraseña actualizada." : "Acceso al portal habilitado.");
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function disable() {
    if (!confirm("¿Desactivar el acceso del propietario al portal?")) return;
    try {
      await api.delete(`/owners/${owner.id}/portal-access`);
      setMsg("Acceso desactivado.");
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="mt-4 card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Portal del propietario</h3>
        {owner.portalEnabled ? (
          <span className="badge bg-positive-soft text-positive"><span className="h-1.5 w-1.5 rounded-full bg-positive" />Activo</span>
        ) : (
          <span className="badge bg-slate-100 text-slate-500">Desactivado</span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Da acceso de solo lectura al propietario para que consulte sus propiedades, ingresos e informes sin que tengas que enviarle nada.
      </p>
      {!owner.email ? (
        <p className="mt-3 text-sm text-slate-500">Añade un email al propietario para habilitar su acceso.</p>
      ) : (
        <form onSubmit={enable} className="mt-4 space-y-3">
          {msg && <Alert kind="success">{msg}</Alert>}
          {error && <Alert kind="error">{error}</Alert>}
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px] flex-1">
              <label className="label">{owner.portalEnabled ? "Nueva contraseña" : "Contraseña de acceso"}</label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
            </div>
            <button className="btn-primary" disabled={saving}>
              {saving ? "Guardando…" : owner.portalEnabled ? "Actualizar contraseña" : "Habilitar acceso"}
            </button>
            {owner.portalEnabled && (
              <button type="button" onClick={disable} className="btn-ghost">Desactivar</button>
            )}
          </div>
          <p className="text-xs text-slate-400">
            El propietario accede en <span className="font-medium text-slate-500">{portalUrl}</span> con su email ({owner.email}) y esta contraseña.
          </p>
        </form>
      )}
    </div>
  );
}

function OwnerFields({ owner, onSaved }: { owner: Owner; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: owner.name,
    email: owner.email ?? "",
    phone: owner.phone ?? "",
    notes: owner.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleted, setDeleted] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.patch(`/owners/${owner.id}`, form);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar este propietario? Sus propiedades quedarán sin asignar.")) return;
    try {
      await api.delete(`/owners/${owner.id}`);
      setDeleted(true);
      window.location.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (deleted) return null;

  return (
    <form onSubmit={save} className="card p-5">
      <h3 className="text-sm font-semibold text-slate-700">Datos de contacto</h3>
      <div className="mt-4 space-y-3">
        {error && <Alert kind="error">{error}</Alert>}
        <div>
          <label className="label">Nombre</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Notas</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={remove} className="text-sm text-negative hover:underline">Eliminar</button>
        <button className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
