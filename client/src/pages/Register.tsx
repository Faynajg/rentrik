import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, applyAuthHeader, errorMessage, setStoredToken } from "../api/client";
import { eur } from "../lib/format";
import { Alert, PasswordInput } from "../components/ui";
import { Logo } from "../components/Logo";
import { SiteFooter } from "../components/SiteFooter";

interface PlanCardData {
  id: string;
  name: string;
  price: number;
  limit: string;
  popular?: boolean;
  features: string[];
}

const PLANS: PlanCardData[] = [
  {
    id: "starter",
    name: "Starter",
    price: 15,
    limit: "Hasta 3 propiedades · 14 días gratis",
    features: [
      "Rentabilidad neta por propiedad",
      "Importar CSV de cualquier OTA",
      "Dashboard de ingresos y gastos",
      "Informes PDF básicos",
      "Soporte por email",
    ],
  },
  {
    id: "gestor",
    name: "Gestor",
    price: 79,
    limit: "Hasta 15 propiedades · 14 días gratis",
    popular: true,
    features: [
      "Todo lo del Starter",
      "Análisis comparativo entre propiedades",
      "Semáforo de rentabilidad automático",
      "Desglose de gastos por categoría",
      "Recomendaciones automáticas de mejora",
      "Informe para propietarios",
    ],
  },
  {
    id: "agencia",
    name: "Agencia",
    price: 189,
    limit: "Propiedades ilimitadas · 14 días gratis",
    features: [
      "Todo lo del Gestor",
      "Propiedades ilimitadas",
      "Ranking de rentabilidad entre propiedades",
      "Análisis automático de tu portfolio",
      "Alertas de margen bajo automáticas",
      "Soporte prioritario",
    ],
  },
];

export default function Register() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectedPlan = params.get("plan") ?? "starter";
  const validPreselect = PLANS.some((p) => p.id === preselectedPlan) ? preselectedPlan : "starter";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
    plan: validPreselect,
  });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedPlan = PLANS.find((p) => p.id === form.plan) ?? PLANS[0];

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
      // 1) Crear la cuenta. NO fijamos el usuario en el contexto todavía: si lo
      //    hiciéramos, PublicOnly navegaría al dashboard antes de que podamos
      //    redirigir a Stripe. Guardamos el token para autenticar el checkout.
      const reg = await api.post<{ token: string }>("/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        companyName: form.companyName || undefined,
        plan: form.plan,
      });
      setStoredToken(reg.data.token);
      applyAuthHeader(reg.data.token);

      // 2) Iniciar Stripe Checkout del plan elegido y redirigir a la tarjeta
      //    (trial de 14 días). Sin tarjeta confirmada no hay acceso al dashboard.
      try {
        const res = await api.post<{ url?: string }>("/billing/checkout", { plan: form.plan });
        if (res.data.url) {
          window.location.href = res.data.url;
          return; // salimos a Stripe (no fijamos usuario ni reactivamos el botón)
        }
      } catch {
        // Si el checkout falla, el usuario queda logueado y la guarda lo llevará
        // a /precios para reintentar el pago.
      }

      // 3) Sin URL (Stripe no configurado / modo simulado) o checkout fallido:
      //    refrescamos el estado real y entramos (la guarda decide el destino).
      await refreshUser();
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="section flex items-center justify-between py-4">
          <Link to="/"><Logo size={28} /></Link>
          <p className="text-sm text-slate-500">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-semibold text-brand hover:underline">Inicia sesión</Link>
          </p>
        </div>
      </header>

      <main className="section py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Crea tu cuenta</h1>
          <p className="mt-3 text-slate-500">
            Elige tu plan y empieza tus <strong>14 días gratis</strong>. Puedes cambiar de plan cuando quieras.
          </p>
        </div>

        {/* Presentación de planes */}
        <div id="planes" className="mt-10 grid items-stretch gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const selected = form.plan === plan.id;
            return (
              <button
                type="button"
                key={plan.id}
                onClick={() => update("plan", plan.id)}
                className={`relative flex h-full flex-col rounded-2xl border bg-white p-6 text-left transition-all duration-200 ${
                  plan.popular ? "shadow-elevated lg:-translate-y-2" : "shadow-card"
                } ${selected ? "border-brand ring-2 ring-brand/40" : "border-slate-200 hover:border-brand/40"}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-2xs font-bold uppercase tracking-wide text-white shadow-sm">
                    ⭐ Más popular
                  </span>
                )}
                <h3 className="text-sm font-bold uppercase tracking-wide text-brand">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-ink">{eur(plan.price, 0)}</span>
                  <span className="text-sm text-slate-400">/mes</span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-slate-500">{plan.limit}</p>

                <ul className="mt-5 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <svg className="mt-0.5 shrink-0 text-positive" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <span
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    selected ? "bg-brand text-white" : "border border-slate-200 text-slate-600"
                  }`}
                >
                  {selected ? "✓ Plan seleccionado" : `Elegir ${plan.name}`}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          14 días gratis · cancela cuando quieras · sin permanencia
        </p>

        {/* Formulario de registro con el plan preseleccionado */}
        <div className="mx-auto mt-10 max-w-md">
          <div className="card p-6 sm:p-8">
            <h2 className="text-xl font-bold text-ink">Completa tu registro</h2>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-brand/15 bg-brand/[0.04] px-3 py-2 text-sm">
              <span className="text-slate-600">
                Plan <strong className="text-brand">{selectedPlan.name}</strong> · {eur(selectedPlan.price, 0)}/mes
              </span>
              <a href="#planes" className="text-xs font-semibold text-brand hover:underline">Cambiar</a>
            </div>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
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
                <PasswordInput value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <label className="label">Nombre de la empresa <span className="text-slate-400">(opcional)</span></label>
                <input className="input" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Para la marca en tus informes" />
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
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-semibold text-brand hover:underline">Inicia sesión</Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
