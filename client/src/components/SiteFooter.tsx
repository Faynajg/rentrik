import { Link } from "react-router-dom";

const LEGAL = [
  { to: "/aviso-legal", label: "Aviso Legal" },
  { to: "/privacidad", label: "Privacidad" },
  { to: "/cookies", label: "Cookies" },
  { to: "/terminos", label: "Términos" },
];

/** Pie de página con enlaces legales, presente en todas las pantallas. */
export function SiteFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-6 text-sm text-slate-400 sm:flex-row sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} Rentrik · Rentabilidad de alquiler vacacional</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {LEGAL.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-brand">{l.label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
