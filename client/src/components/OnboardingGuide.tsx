import { ReactNode, useEffect, useState } from "react";

/**
 * Guía de bienvenida del dashboard: 4 pasos navegables que se muestran la
 * primera vez que el usuario entra. El estado "ya vista" lo persiste el
 * Dashboard en la base de datos (PATCH /auth/me { hasSeenOnboarding: true }),
 * así que este componente solo se ocupa de la navegación y de avisar por
 * callbacks de la acción elegida (crear propiedad, ver demo, terminar).
 */

interface Step {
  key: string;
  icon: ReactNode;
  title: string;
  body: string;
  cta: string;
}

const STEPS: Step[] = [
  {
    key: "propiedad",
    title: "Añade tu primera propiedad",
    body: "Solo necesitas el nombre. En 30 segundos está lista.",
    cta: "Crear propiedad ahora",
    icon: (
      <path d="M6 22V12l9-4.5L24 12v10M11 22v-6h8v6" />
    ),
  },
  {
    key: "csv",
    title: "Importa tus reservas",
    body: "Exporta el CSV de Airbnb, Booking o cualquier OTA. Lo detectamos automáticamente.",
    cta: "Subir CSV",
    icon: (
      <path d="M14 3v5h5M8 3h7l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM9 13l3 3 3-3M12 16v-6" />
    ),
  },
  {
    key: "gastos",
    title: "Mete tus gastos reales",
    body: "Limpieza, mantenimiento, comisiones. Todo lo que te cuesta la propiedad.",
    cta: "Añadir gastos",
    icon: (
      <path d="M12 3v18M8 21h8M15.5 7.5A3.5 3 0 0 0 12 5H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H10a3.5 3 0 0 1-3.5-2.5" />
    ),
  },
  {
    key: "informe",
    title: "Descarga tu informe",
    body: "Rentabilidad neta real lista para tu gestor o banco.",
    cta: "Ver mi dashboard",
    icon: (
      <path d="M4 20V4h16v16zM8 16v-4M12 16V8M16 16v-6" />
    ),
  },
];

export function OnboardingGuide({
  onCreateProperty,
  onLoadDemo,
  onComplete,
  onSkip,
}: {
  /** Paso 1: cerrar la guía y abrir el modal de crear propiedad. */
  onCreateProperty: () => void;
  /** Último paso, "Ver demo": marca vista, cierra y carga datos de ejemplo. */
  onLoadDemo: () => void;
  /** Último paso, "Ver mi dashboard": marca vista y cierra (guía completada). */
  onComplete: () => void;
  /** Saltar guía / X / Escape: cierra SIN marcar vista (se puede reabrir). */
  onSkip: () => void;
}) {
  const [i, setI] = useState(0);
  // Dirección de la animación: 1 avanzar, -1 retroceder.
  const [dir, setDir] = useState<1 | -1>(1);
  const [anim, setAnim] = useState(false);
  const step = STEPS[i];
  const isFirst = i === 0;
  const isLast = i === STEPS.length - 1;

  function go(next: number, direction: 1 | -1) {
    if (next < 0 || next >= STEPS.length || next === i) return;
    setDir(direction);
    setAnim(true);
    setI(next);
  }
  const prev = () => go(i - 1, -1);
  const next = () => go(i + 1, 1);

  // Reinicia la animación de entrada tras cada cambio de paso.
  useEffect(() => {
    if (!anim) return;
    const t = window.setTimeout(() => setAnim(false), 260);
    return () => window.clearTimeout(t);
  }, [i, anim]);

  // Navegación con teclado: flechas y Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onSkip();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  /** Acción principal del paso actual. */
  function primaryAction() {
    if (isFirst) onCreateProperty();
    else if (isLast) onComplete();
    else next();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm">
      <div className="card relative my-auto w-full max-w-lg overflow-hidden shadow-elevated">
        {/* Saltar guía (arriba a la derecha) — cierra sin marcar vista. */}
        <button
          type="button"
          onClick={onSkip}
          aria-label="Saltar guía"
          className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Saltar guía
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {/* Cabecera con degradado de marca + ilustración */}
        <div className="relative flex flex-col items-center bg-brand-gradient px-8 pb-8 pt-12 text-center">
          <div className="pointer-events-none absolute inset-0 bg-hero-grid [background-size:32px_32px] opacity-20" />
          <div
            key={`icon-${step.key}`}
            className={`relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20 ${
              anim ? (dir === 1 ? "animate-fadeInRight" : "animate-fadeInLeft") : ""
            }`}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2ECC71"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {step.icon}
            </svg>
          </div>
          <span className="relative mt-4 text-xs font-semibold uppercase tracking-widest text-white/70">
            Paso {i + 1} de {STEPS.length}
          </span>
        </div>

        {/* Cuerpo del paso */}
        <div className="px-8 py-7 text-center">
          <div key={`text-${step.key}`} className={anim ? (dir === 1 ? "animate-fadeInRight" : "animate-fadeInLeft") : ""}>
            <h2 className="text-xl font-bold tracking-tight text-ink">{step.title}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{step.body}</p>
          </div>

          <button type="button" onClick={primaryAction} className="btn-primary btn-lg mt-6 w-full">
            {step.cta}
          </button>

          {isLast && (
            <button
              type="button"
              onClick={onLoadDemo}
              className="mt-3 w-full rounded-xl border border-brand/20 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-100"
            >
              Ver demo con datos de ejemplo
            </button>
          )}
        </div>

        {/* Navegación: flechas + puntos de progreso */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={prev}
            disabled={isFirst}
            aria-label="Paso anterior"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            {STEPS.map((s, idx) => (
              <button
                key={s.key}
                type="button"
                aria-label={`Ir al paso ${idx + 1}`}
                aria-current={idx === i}
                onClick={() => go(idx, idx > i ? 1 : -1)}
                className={`h-2 rounded-full transition-all ${
                  idx === i ? "w-6 bg-brand" : "w-2 bg-slate-200 hover:bg-slate-300"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            disabled={isLast}
            aria-label="Paso siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
