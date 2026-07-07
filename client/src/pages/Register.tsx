import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../api/client";
import { Alert } from "../components/ui";
import { AuthLayout } from "./Login";

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter",
  gestor: "Gestor",
  agencia: "Agencia",
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectedPlan = params.get("plan") ?? "starter";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
    plan: PLAN_NAMES[preselectedPlan] ? preselectedPlan : "starter",
  });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!accepted) {
      setError("Debes aceptar los Términos y Condiciones y la Política de Privacidad para continuar.");
      return;
    }
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        companyName: form.companyName || undefined,
        plan: form.plan,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Crea tu cuenta" subtitle="14 días de prueba gratis · cancela cuando quieras">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <div>
          <label className="label">Nombre</label>
          <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} required placeholder="Tu nombre o gestora" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
        </div>
        <div>
          <label className="label">Contraseña</label>
          <input className="input" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
        </div>
        <div>
          <label className="label">Nombre de la empresa <span className="text-slate-400">(opcional)</span></label>
          <input className="input" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Para la marca en tus informes" />
        </div>
        <div>
          <label className="label">Plan</label>
          <select className="input" value={form.plan} onChange={(e) => update("plan", e.target.value)}>
            {Object.entries(PLAN_NAMES).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#1E3A5F]"
          />
          <span>
            He leído y acepto los{" "}
            <Link to="/terminos" target="_blank" className="font-medium text-brand hover:underline">Términos y Condiciones</Link>{" "}
            y la{" "}
            <Link to="/privacidad" target="_blank" className="font-medium text-brand hover:underline">Política de Privacidad</Link>.
          </span>
        </label>
        <button className="btn-primary btn-lg w-full" disabled={loading || !accepted}>
          {loading ? "Creando cuenta…" : "Empezar prueba gratuita"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Inicia sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
