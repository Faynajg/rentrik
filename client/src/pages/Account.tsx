import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { User } from "../types";
import { CURRENCIES } from "../lib/currency";
import { Alert } from "../components/ui";

export default function Account() {
  const { user, setUser } = useAuth();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Mi cuenta</h1>
        <p className="text-sm text-slate-500">Gestiona tu perfil, tu marca y tu seguridad.</p>
      </div>

      <div className="mt-6 space-y-6">
        <ProfileCard user={user} onSaved={setUser} />
        <AutoSendCard user={user} onSaved={setUser} />
        <CurrencyCard user={user} onSaved={setUser} />
        <PasswordCard />
        <PlanCard planName={user.planInfo.name} />
      </div>
    </div>
  );
}

function ProfileCard({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const [name, setName] = useState(user.name);
  const [companyName, setCompanyName] = useState(user.companyName ?? "");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    setSaving(true);
    try {
      const res = await api.patch<{ user: User }>("/auth/me", { name, companyName });
      onSaved(res.data.user);
      setMsg("Perfil actualizado correctamente.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-6">
      <h2 className="text-lg font-semibold text-ink">Perfil</h2>
      <p className="mt-1 text-sm text-slate-500">
        El nombre de la empresa aparece como marca en los informes PDF del plan Agencia.
      </p>
      <div className="mt-5 space-y-4">
        {msg && <Alert kind="success">{msg}</Alert>}
        {error && <Alert kind="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-slate-50 text-slate-400" value={user.email} disabled />
          </div>
        </div>
        <div>
          <label className="label">Nombre de la empresa / gestora <span className="text-slate-400">(opcional)</span></label>
          <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Aparecerá en tus informes con marca propia" />
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <button className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button>
      </div>
    </form>
  );
}

function AutoSendCard({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const [enabled, setEnabled] = useState(user.autoSendReports);
  const [day, setDay] = useState(user.autoSendDay);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    setSaving(true);
    try {
      const res = await api.patch<{ user: User }>("/auth/me", { autoSendReports: enabled, autoSendDay: day });
      onSaved(res.data.user);
      setMsg("Preferencias de auto-envío guardadas.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-6">
      <h2 className="text-lg font-semibold text-ink">Auto-envío de informes</h2>
      <p className="mt-1 text-sm text-slate-500">
        Envía automáticamente cada mes el informe del mes anterior a cada propietario con email, para sus propiedades asignadas.
      </p>
      <div className="mt-5 space-y-4">
        {msg && <Alert kind="success">{msg}</Alert>}
        {error && <Alert kind="error">{error}</Alert>}

        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-canvas px-4 py-3">
          <span className="text-sm font-medium text-slate-700">Activar auto-envío mensual</span>
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-positive" : "bg-slate-300"}`}
            role="switch"
            aria-checked={enabled}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${enabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </label>

        {enabled && (
          <div>
            <label className="label">Día del mes para el envío</label>
            <select className="input !w-auto" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>Día {d}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-400">
              Se enviará a partir del día {day} de cada mes (solo una vez por informe). Requiere SMTP configurado para el envío real.
            </p>
          </div>
        )}
      </div>
      <div className="mt-5 flex justify-end">
        <button className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

function CurrencyCard({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const [currency, setCurrency] = useState(user.currency);
  const [ivaRate, setIvaRate] = useState(String(user.ivaRate));
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    setSaving(true);
    try {
      const res = await api.patch<{ user: User }>("/auth/me", { currency, ivaRate: Number(ivaRate) || 0 });
      onSaved(res.data.user);
      setMsg("Moneda e impuestos actualizados.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-6">
      <h2 className="text-lg font-semibold text-ink">Moneda e impuestos</h2>
      <p className="mt-1 text-sm text-slate-500">
        Elige la moneda de tu mercado y el tipo de IVA/impuesto aplicable. Se usará en toda la app y en los informes.
      </p>
      <div className="mt-5 space-y-4">
        {msg && <Alert kind="success">{msg}</Alert>}
        {error && <Alert kind="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Moneda</label>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {Object.values(CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tipo de IVA / impuesto (%)</label>
            <input className="input" type="number" min={0} max={100} step="0.5" value={ivaRate} onChange={(e) => setIvaRate(e.target.value)} placeholder="Ej. 21 (España), 16 (México)" />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          El IVA se muestra como estimación informativa sobre los ingresos; no altera el beneficio neto (es un impuesto repercutido).
        </p>
      </div>
      <div className="mt-5 flex justify-end">
        <button className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

function PasswordCard() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    if (newPassword !== confirm) {
      setError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setMsg("Contraseña actualizada correctamente.");
      setCurrent("");
      setNew("");
      setConfirm("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-6">
      <h2 className="text-lg font-semibold text-ink">Seguridad</h2>
      <p className="mt-1 text-sm text-slate-500">Cambia tu contraseña de acceso.</p>
      <div className="mt-5 space-y-4">
        {msg && <Alert kind="success">{msg}</Alert>}
        {error && <Alert kind="error">{error}</Alert>}
        <div>
          <label className="label">Contraseña actual</label>
          <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nueva contraseña</label>
            <input className="input" type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label className="label">Repite la nueva contraseña</label>
            <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <button className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Cambiar contraseña"}</button>
      </div>
    </form>
  );
}

function PlanCard({ planName }: { planName: string }) {
  return (
    <div className="card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
      <div>
        <h2 className="text-lg font-semibold text-ink">Plan y facturación</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tu plan actual es <span className="font-semibold text-brand">{planName}</span>.
        </p>
      </div>
      <Link to="/precios" className="btn-ghost">Ver planes</Link>
    </div>
  );
}
