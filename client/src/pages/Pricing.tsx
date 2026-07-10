import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { BillingStatus, PlanInfo } from "../types";
import { eur } from "../lib/format";
import { Logo } from "../components/Logo";
import { SiteFooter } from "../components/SiteFooter";
import { Alert, Spinner } from "../components/ui";

const STATUS_LABELS: Record<string, string> = {
  trialing: "En prueba gratuita",
  active: "Suscripción activa",
  past_due: "Pago pendiente",
  canceled: "Sin suscripción",
  none: "Sin suscripción",
};

const FAQ = [
  ["¿Necesito tarjeta para la prueba?", "Sí. Pedimos una tarjeta para activar la prueba, pero no se cobra nada durante los 14 días. Puedes cancelar cuando quieras antes de que termine y no se te cobrará."],
  ["¿Puedo cambiar de plan más adelante?", "Sí, puedes subir o bajar de plan en cualquier momento desde tu cuenta. El cambio se aplica al instante."],
  ["¿Qué pasa si supero el número de propiedades?", "Te avisamos y podrás pasar a un plan superior. Nunca perderás tus datos."],
  ["¿En qué se diferencia Rentrik de otros software?", "La mayoría de herramientas te dicen cuánto has ingresado. Rentrik te dice cuánto has ganado de verdad. Descontamos todos tus gastos reales — limpieza, mantenimiento, comisiones, plataformas — y te damos la rentabilidad neta por propiedad. En español, pensado para el mercado hispanohablante, sin traducciones automáticas ni curvas de aprendizaje."],
];

export default function Pricing({ publicView = false }: { publicView?: boolean }) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ plans: PlanInfo[] }>("/plans")
      .then((res) => setPlans(res.data.plans))
      .catch(() => setError("No se pudieron cargar los planes. Recarga la página."))
      .finally(() => setLoading(false));
    if (!publicView && user) {
      api.get<BillingStatus>("/billing/status").then((res) => setBilling(res.data)).catch(() => {});
    }
    // Retorno de Stripe Checkout.
    const checkout = params.get("checkout");
    if (checkout === "success") {
      params.delete("checkout");
      setParams(params, { replace: true });
      setMessage("Activando tu suscripción…");
      // El webhook de Stripe tarda unos segundos en activar el trial: sondeamos
      // el estado hasta que esté activo y entonces entramos al dashboard.
      let tries = 0;
      const poll = async () => {
        tries++;
        try {
          const res = await api.get<BillingStatus>("/billing/status");
          if (["trialing", "active", "past_due"].includes(res.data.subscriptionStatus)) {
            await refreshUser();
            navigate("/dashboard");
            return;
          }
        } catch {
          /* reintenta */
        }
        if (tries < 12) {
          window.setTimeout(poll, 2000);
        } else {
          await refreshUser();
          setMessage("¡Suscripción recibida! Si tu plan no aparece activo, recarga en unos segundos.");
        }
      };
      poll();
    } else if (checkout === "cancel") {
      setError("Has cancelado el proceso de pago. Elige un plan para empezar tu prueba gratuita de 14 días.");
      params.delete("checkout");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    setError("");
    try {
      const res = await api.post<{ url: string }>("/billing/portal", {});
      window.location.href = res.data.url;
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPortalLoading(false);
    }
  }

  async function selectPlan(planId: string) {
    if (publicView || !user) {
      navigate(`/registro?plan=${planId}`);
      return;
    }
    setChanging(planId);
    setMessage("");
    setError("");
    try {
      // Intenta iniciar el checkout de Stripe; si no está configurado, cambia el plan directamente.
      const res = await api.post<{ url?: string; updated?: boolean }>("/billing/checkout", { plan: planId });
      if (res.data.url) {
        window.location.href = res.data.url;
        return;
      }
      await refreshUser();
      setMessage(`Plan actualizado a ${plans.find((p) => p.id === planId)?.name}.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setChanging(null);
    }
  }

  // Solo hay "plan actual" si el usuario tiene una suscripción activa/trial;
  // sin suscripción, todos los botones deben permitir iniciar el checkout.
  const subscribed = ["trialing", "active", "past_due"].includes(user?.subscriptionStatus ?? "");

  const accents: Record<string, string> = {
    starter: "text-slate-500",
    gestor: "text-brand",
    agencia: "text-gold",
  };

  const content = (
    <div className="mx-auto max-w-6xl">
      <div className="mx-auto max-w-2xl text-center">
        <span className="eyebrow">Precios</span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Planes para cada tamaño</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-500">
          Desde el propietario con un apartamento hasta la agencia con decenas de propiedades.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-positive/25 bg-positive-soft px-4 py-1.5 text-sm font-semibold text-positive">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          14 días gratis · cancela cuando quieras
        </div>
      </div>

      {message && <div className="mx-auto mt-6 max-w-md"><Alert kind="success">{message}</Alert></div>}
      {error && <div className="mx-auto mt-6 max-w-md"><Alert kind="error">{error}</Alert></div>}

      {/* Estado de facturación (usuario autenticado) */}
      {!publicView && billing && (
        <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:flex-row">
          <div className="flex items-center gap-4">
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${billing.subscriptionStatus === "active" ? "bg-positive-soft text-positive" : "bg-brand/8 text-brand"}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 10h18M7 15h4m-8 3h18a1 1 0 001-1V7a1 1 0 00-1-1H3a1 1 0 00-1 1v10a1 1 0 001 1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                {STATUS_LABELS[billing.subscriptionStatus] ?? billing.subscriptionStatus}
                {" · "}
                <span className="text-brand">{user?.planInfo.name}</span>
              </p>
              <p className="text-xs text-slate-400">
                {billing.subscriptionStatus === "trialing" && billing.trialDaysLeft > 0
                  ? `Te quedan ${billing.trialDaysLeft} días de prueba gratuita`
                  : billing.subscriptionStatus === "active"
                  ? "Tu suscripción está al día"
                  : "Elige un plan para desbloquear todo"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gestionar suscripción vía el portal de clientes de Stripe. Visible con
          prueba (trialing), activa o past_due — debajo del card de estado. */}
      {!publicView && billing && billing.stripeEnabled &&
        ["trialing", "active", "past_due"].includes(billing.subscriptionStatus) && (
          <div className="mx-auto mt-3 flex max-w-3xl justify-center sm:justify-end">
            <button onClick={openPortal} disabled={portalLoading} className="btn-primary btn-sm">
              {portalLoading ? "Abriendo…" : "Gestionar suscripción"}
            </button>
          </div>
        )}

      {loading ? (
        <Spinner />
      ) : (
        <div className="mt-12 grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = subscribed && user?.plan === plan.id;
            const highlight = plan.id === "gestor";
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 transition-all duration-200 ${
                  highlight
                    ? "border-brand/30 shadow-elevated lg:-translate-y-2"
                    : "border-slate-100 shadow-card hover:shadow-soft"
                }`}
              >
                {highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-2xs font-bold uppercase tracking-wide text-white shadow-sm">
                    Más popular
                  </span>
                )}
                <h3 className={`text-sm font-bold uppercase tracking-wide ${accents[plan.id]}`}>{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-ink">{eur(plan.price, 0)}</span>
                  <span className="text-sm text-slate-400">/mes</span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-slate-500">
                  {plan.maxProperties === null ? "Propiedades ilimitadas" : `Hasta ${plan.maxProperties} propiedades`}
                </p>

                <div className="my-5 h-px bg-slate-100" />

                <ul className="flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <svg className="mt-0.5 shrink-0 text-positive" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => selectPlan(plan.id)}
                  disabled={isCurrent || changing === plan.id}
                  className={`mt-7 w-full ${highlight ? "btn-primary" : "btn-ghost"} ${isCurrent ? "!opacity-60" : ""}`}
                >
                  {isCurrent
                    ? "Plan actual"
                    : changing === plan.id
                    ? "Procesando…"
                    : publicView || !user
                    ? "Prueba 14 días gratis"
                    : subscribed
                    ? "Cambiar a este plan"
                    : "Empezar prueba"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Garantía */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-400">
        {["Sin permanencia", "Cancela cuando quieras", "Soporte en español", "Tus datos siempre a salvo"].map((g) => (
          <span key={g} className="inline-flex items-center gap-1.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-positive"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {g}
          </span>
        ))}
      </div>

      {/* FAQ */}
      <div className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-center text-2xl font-bold tracking-tight text-ink">Preguntas frecuentes</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group card px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-ink">
                {q}
                <svg className="text-slate-400 transition group-open:rotate-45" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );

  if (publicView) {
    return (
      <div className="min-h-screen bg-canvas">
        <header className="border-b border-slate-100 bg-white/80 backdrop-blur">
          <div className="section flex items-center justify-between py-4">
            <Link to="/"><Logo size={28} /></Link>
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-brand">Iniciar sesión</Link>
              <Link to="/registro" className="btn-primary btn-sm">Prueba 14 días gratis</Link>
            </div>
          </div>
        </header>
        <div className="px-4 py-14 sm:px-6">{content}</div>
        <SiteFooter />
      </div>
    );
  }

  return content;
}
