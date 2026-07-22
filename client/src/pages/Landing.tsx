import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";

// FAQs de la home: rebaten las objeciones más frecuentes antes de llegar a precios.
const HOME_FAQ: [string, string][] = [
  ["¿No puedo ver esto en mi PMS?", "Los PMS como Hostaway, Guesty o Lodgify te dicen cuántas reservas tienes y cuánto ingresas. Rentrik te dice cuánto ganas de verdad — descontando todos tus gastos reales. Son herramientas complementarias, no lo mismo."],
  ["¿No hace esto PriceLabs?", "PriceLabs optimiza tus precios para que ingreses más. Rentrik te dice cuánto te queda después de todos los gastos. PriceLabs trabaja en los ingresos, Rentrik trabaja en la rentabilidad neta real. Son cosas distintas."],
  ["¿No puedo hacer esto con ChatGPT o Claude?", "Puedes intentarlo, pero tendrías que exportar tus datos, formatearlos, escribir los prompts correctos y hacer los cálculos manualmente cada mes. Rentrik lo hace automáticamente en 5 minutos, con informes listos para tu gestor o banco, sin que tengas que tocar nada."],
];

const PAIN_POINTS = [
  "¿Sabes cuánto te cuesta realmente cada limpieza?",
  "¿Conoces el margen neto de cada propiedad después de comisiones?",
  "¿Tienes un informe listo para enviárselo a tu banco o gestor?",
  "¿Sabes qué propiedad te da más rentabilidad real?",
];

const features = [
  {
    title: "Sube tus ingresos de cualquier OTA",
    desc: "Airbnb, Booking, VRBO, Expedia, Holidu y más. Sube el CSV y Rentrik detecta el formato automáticamente.",
    icon: "M12 3v12m0 0l4-4m-4 4l-4-4M4 21h16",
  },
  {
    title: "Introduce tus gastos reales",
    desc: "Gastos fijos, variables, comisiones y gestión. Organizados en cuatro bloques claros.",
    icon: "M4 6h16M4 12h16M4 18h10",
  },
  {
    title: "Beneficio neto real, al instante",
    desc: "Deja de calcular en Excel. Ve exactamente cuánto gana cada propiedad después de todo.",
    icon: "M3 17l6-6 4 4 8-8",
  },
  {
    title: "Informes PDF profesionales",
    desc: "Un informe para el propietario y otro para la gestora. Listos para enviar.",
    icon: "M7 3h7l5 5v13H7zM14 3v5h5",
  },
];

const steps = [
  { n: "01", title: "Crea tu propiedad", desc: "Añade tu apartamento o casa en segundos." },
  { n: "02", title: "Sube ingresos y gastos", desc: "Importa el CSV de tu OTA e introduce tus gastos reales." },
  { n: "03", title: "Descarga el informe", desc: "Obtén el dashboard y los PDFs para propietario y gestora." },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Cerrar el menú móvil con Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-white text-slate-700">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-lg">
        <div className="section flex items-center justify-between py-4">
          <Logo size={28} />
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#producto" className="text-sm font-medium text-slate-500 transition hover:text-brand">Producto</a>
            <a href="#como-funciona" className="text-sm font-medium text-slate-500 transition hover:text-brand">Cómo funciona</a>
            <Link to="/precios-publico" className="text-sm font-medium text-slate-500 transition hover:text-brand">Precios</Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="hidden text-sm font-semibold text-slate-600 hover:text-brand sm:block">
              Iniciar sesión
            </Link>
            <Link to="/registro" className="btn-primary btn-sm sm:!px-4 sm:!py-2">
              Prueba 14 días gratis
            </Link>
            {/* Menú móvil: sin él, en el móvil no había forma de iniciar sesión. */}
            <button
              type="button"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              aria-controls="menu-movil"
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 md:hidden"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="menu-movil" className="border-t border-slate-100 bg-white md:hidden">
            <div className="section flex flex-col py-2">
              <a href="#producto" onClick={() => setMenuOpen(false)} className="rounded-lg px-1 py-3 text-sm font-medium text-slate-600 transition hover:text-brand">
                Producto
              </a>
              <a href="#como-funciona" onClick={() => setMenuOpen(false)} className="rounded-lg px-1 py-3 text-sm font-medium text-slate-600 transition hover:text-brand">
                Cómo funciona
              </a>
              <Link to="/precios-publico" onClick={() => setMenuOpen(false)} className="rounded-lg px-1 py-3 text-sm font-medium text-slate-600 transition hover:text-brand">
                Precios
              </Link>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="rounded-lg border-t border-slate-100 px-1 py-3 text-sm font-semibold text-brand">
                Iniciar sesión
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-radial">
        <div className="pointer-events-none absolute inset-0 bg-hero-grid [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="section relative pb-10 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="eyebrow animate-fadeUp">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" />
              Para gestores y propietarios de alquiler vacacional
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-[1.75rem] font-extrabold leading-[1.15] tracking-tight text-ink animate-fadeUp min-[420px]:text-[2rem] sm:text-5xl sm:leading-[1.08] sm:tracking-tightest">
              ¿Estás{" "}
              <span className="relative whitespace-nowrap text-brand">
                ganando dinero
                <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 200 10" fill="none" preserveAspectRatio="none">
                  <path d="M2 7C50 2 150 2 198 6" stroke="#2ECC71" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>{" "}
              con tu alquiler vacacional o solo lo crees?
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-slate-500 animate-fadeUp">
              Rentrik analiza tus ingresos reales, descuenta todos tus gastos y te dice exactamente
              si tu propiedad está optimizada o estás perdiendo dinero sin saberlo. En minutos, sin
              Excel, sin complicaciones.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 animate-fadeUp sm:flex-row">
              <Link to="/registro" className="btn-primary btn-lg w-full sm:w-auto">
                Prueba 14 días gratis
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
              <Link to="/precios-publico" className="btn-ghost btn-lg w-full sm:w-auto">
                Ver planes y precios
              </Link>
            </div>
            <p className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5"><Check /> Cancela cuando quieras</span>
              <span className="inline-flex items-center gap-1.5"><Check /> Configúralo en minutos</span>
            </p>
          </div>

          {/* Product mockup */}
          <div id="producto" className="relative mx-auto mt-14 max-w-4xl animate-fadeUp">
            <div className="absolute -inset-x-8 -top-8 bottom-0 rounded-[2rem] bg-brand-gradient opacity-[0.08] blur-2xl" />
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* Pain points */}
      <section className="section py-16 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <span className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" />
            Pregúntate esto
          </span>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Si no sabes responder, estás perdiendo dinero
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-500">
            Cuatro preguntas que todo propietario debería saber contestar sobre su alquiler.
          </p>
          <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
            {PAIN_POINTS.map((q) => (
              <div
                key={q}
                className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/8 text-lg font-extrabold text-brand">
                  ?
                </span>
                <p className="text-base font-semibold leading-snug text-ink">{q}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-slate-100 bg-white">
        <div className="section py-8">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/8 text-brand">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V5a2 2 0 012-2h5.6L19 8.4V18a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="text-lg font-bold tracking-tight text-ink">Compatible con cualquier plataforma</p>
            <p className="text-sm leading-relaxed text-slate-500">
              Si exportas a CSV o Excel, Rentrik lo importa. Airbnb, Booking, tu gestor, tu Excel propio
              — da igual el origen.
            </p>
          </div>
        </div>
      </section>

      {/* Problema */}
      <section className="section py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">El problema</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Ingresas dinero, pero… ¿ganas dinero?
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {[
            ["Sabes cuánto ingresas", "Lo ves en tu alquiler vacacional, sin problema.", "M12 8v8m-4-4h8"],
            ["Pero no cuánto ganas", "Después de gastos reales, es un misterio.", "M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z"],
            ["Y no tienes informes", "Nada profesional que enviar al propietario.", "M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V5a2 2 0 012-2h5.6L19 8.4V18a2 2 0 01-2 2z"],
          ].map(([t, d, icon]) => (
            <div key={t} className="card card-hover p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/8 text-brand">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d={icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h3 className="mt-4 font-semibold text-ink">{t}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-canvas py-20">
        <div className="section">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">La solución</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Todo lo que necesitas, nada que no
            </h2>
            <p className="mt-4 text-slate-500">
              Rentrik hace una sola cosa y la hace bien: decirte si cada propiedad gana dinero.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="group card card-hover flex gap-5 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d={f.icon} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="section py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Cómo funciona</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            De tus datos a un informe, en 3 pasos
          </h2>
        </div>
        <div className="relative mt-14 grid gap-8 sm:grid-cols-3">
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent sm:block" />
          {steps.map((s) => (
            <div key={s.n} className="relative text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/15 bg-white text-lg font-extrabold text-brand shadow-soft">
                {s.n}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats band */}
      <section className="section pb-6">
        <div className="overflow-hidden rounded-3xl bg-brand-gradient px-8 py-12">
          <div className="grid gap-8 text-center sm:grid-cols-3">
            {[
              ["100%", "de tus gastos, en un solo sitio"],
              ["2 PDFs", "propietario y gestora, automáticos"],
              ["Minutos", "no horas peleándote con Excel"],
            ].map(([big, small]) => (
              <div key={small}>
                <p className="text-4xl font-extrabold tracking-tight text-white">{big}</p>
                <p className="mt-1 text-sm text-brand-100">{small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — rebate objeciones antes de precios */}
      <section className="section py-16 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Sí, Rentrik es diferente
          </h2>
          <p className="mt-3 text-center text-slate-500">
            Las dudas que todo el mundo tiene antes de probarlo.
          </p>
          <div className="mt-8 space-y-3">
            {HOME_FAQ.map(([q, a]) => (
              <details key={q} className="group card px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink">
                  {q}
                  <svg className="shrink-0 text-slate-400 transition group-open:rotate-45" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="section py-20">
        <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white px-6 py-14 text-center shadow-soft">
          <div className="pointer-events-none absolute inset-0 bg-brand-radial" />
          <div className="relative">
            <h2 className="mx-auto max-w-xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Empieza a saber si tus propiedades ganan dinero
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-slate-500">
              14 días de prueba gratuita. Cancela cuando quieras. Configúralo hoy mismo.
            </p>
            <Link to="/registro" className="btn-primary btn-lg mt-8">
              Crear mi cuenta gratis
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="section flex flex-col items-center justify-between gap-4 py-10 sm:flex-row">
          <Logo />
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} Rentrik · Rentabilidad de alquiler vacacional
          </p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-400">
            <Link to="/precios-publico" className="hover:text-brand">Precios</Link>
            <Link to="/aviso-legal" className="hover:text-brand">Aviso Legal</Link>
            <Link to="/privacidad" className="hover:text-brand">Privacidad</Link>
            <Link to="/cookies" className="hover:text-brand">Cookies</Link>
            <Link to="/terminos" className="hover:text-brand">Términos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-positive">
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Maqueta estilizada del dashboard para el hero. */
function DashboardMockup() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-elevated">
      {/* barra superior */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <div className="ml-3 h-5 w-40 rounded-md bg-slate-200/70" />
        <div className="ml-auto flex items-center gap-2">
          <div className="h-6 w-20 rounded-md bg-slate-200/70" />
          <div className="h-6 w-6 rounded-full bg-brand" />
        </div>
      </div>
      <div className="p-5">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Ingresos", "5.378 €", "text-brand"],
            ["Gastos", "4.556 €", "text-negative"],
            // 5.378 − 4.556 = 822. Debe cuadrar: el visitante hace la resta.
            ["Beneficio neto", "822 €", "text-positive"],
            ["Ocupación", "62,4 %", "text-ink"],
          ].map(([l, v, c]) => (
            <div key={l} className="rounded-xl border border-slate-100 bg-white p-3 shadow-card">
              <p className="text-2xs font-semibold uppercase tracking-wide text-slate-400">{l}</p>
              <p className={`mt-1 text-lg font-bold ${c}`}>{v}</p>
            </div>
          ))}
        </div>
        {/* chart + pie */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-card sm:col-span-2">
            <div className="mb-3 h-3 w-40 rounded bg-slate-200/70" />
            <svg viewBox="0 0 320 110" className="h-28 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="mk-rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2ECC71" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#2ECC71" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 70 C60 55 90 40 140 45 C200 52 240 25 320 30 L320 110 L0 110 Z" fill="url(#mk-rev)" />
              <path d="M0 70 C60 55 90 40 140 45 C200 52 240 25 320 30" fill="none" stroke="#16A34A" strokeWidth="2.5" />
              <path d="M0 88 C60 84 120 86 180 82 C240 78 280 80 320 76" fill="none" stroke="#E74C3C" strokeWidth="2.5" />
            </svg>
          </div>
          <div className="flex items-center justify-center rounded-xl border border-slate-100 bg-white p-4 shadow-card">
            <svg viewBox="0 0 42 42" className="h-24 w-24">
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="#1E3A5F" strokeWidth="6" strokeDasharray="45 55" strokeDashoffset="25" />
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="#2C5282" strokeWidth="6" strokeDasharray="25 75" strokeDashoffset="-20" />
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="#C79A3C" strokeWidth="6" strokeDasharray="12 88" strokeDashoffset="-45" />
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="#94A3B8" strokeWidth="6" strokeDasharray="18 82" strokeDashoffset="-57" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
