import { useNavigate } from "react-router-dom";
import { SetupStatus } from "../types";

interface Step {
  key: string;
  title: string;
  desc: string;
  cta: string;
  done: boolean;
  action: () => void;
  disabled?: boolean;
}

export function OnboardingChecklist({
  setup,
  userName,
  onCreateProperty,
}: {
  setup: SetupStatus;
  userName: string;
  onCreateProperty: () => void;
}) {
  const navigate = useNavigate();
  const pid = setup.firstPropertyId;

  const steps: Step[] = [
    {
      key: "property",
      title: "Crea tu primera propiedad",
      desc: "Añade el apartamento o casa que quieres analizar.",
      cta: "Crear propiedad",
      done: setup.hasProperty,
      action: onCreateProperty,
    },
    {
      key: "income",
      title: "Sube tus ingresos",
      desc: "Importa el CSV de Airbnb, Booking o cualquier OTA.",
      cta: "Subir CSV",
      done: setup.hasReservations,
      action: () => pid && navigate(`/propiedades/${pid}?upload=1`),
      disabled: !setup.hasProperty,
    },
    {
      key: "expenses",
      title: "Introduce tus gastos",
      desc: "Gastos fijos, variables, comisiones y gestión.",
      cta: "Añadir gastos",
      done: setup.hasExpenses,
      action: () => pid && navigate(`/propiedades/${pid}?expenses=1`),
      disabled: !setup.hasProperty,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const progress = Math.round((doneCount / steps.length) * 100);
  const currentIndex = steps.findIndex((s) => !s.done);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand/15 bg-white shadow-soft">
      <div className="absolute inset-x-0 top-0 h-1 bg-slate-100">
        <div className="h-full bg-positive transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1.4fr] lg:p-8">
        {/* Bienvenida */}
        <div>
          <span className="eyebrow">Primeros pasos</span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink">
            ¡Bienvenido, {userName}! 👋
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Configura Rentrik en 3 sencillos pasos y obtén el beneficio neto real de tu propiedad,
            con informes PDF listos para enviar.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-semibold text-brand">{doneCount}/{steps.length}</span>
          </div>
        </div>

        {/* Pasos */}
        <ol className="space-y-2.5">
          {steps.map((step, i) => {
            const isCurrent = i === currentIndex;
            return (
              <li
                key={step.key}
                className={`flex items-center gap-4 rounded-xl border p-3.5 transition ${
                  step.done
                    ? "border-positive/20 bg-positive-soft/40"
                    : isCurrent
                    ? "border-brand/25 bg-brand/[0.03] shadow-sm"
                    : "border-slate-100 bg-white"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    step.done ? "bg-positive text-white" : isCurrent ? "bg-brand text-white" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {step.done ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${step.done ? "text-slate-500 line-through" : "text-ink"}`}>{step.title}</p>
                  <p className="truncate text-xs text-slate-400">{step.desc}</p>
                </div>
                {!step.done && (
                  <button
                    onClick={step.action}
                    disabled={step.disabled}
                    className={`shrink-0 ${isCurrent ? "btn-primary btn-sm" : "btn-ghost btn-sm"}`}
                  >
                    {step.cta}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
