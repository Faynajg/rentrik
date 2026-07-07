import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { SiteFooter } from "./SiteFooter";
import { useAuth } from "../context/AuthContext";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const links = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/comparativa", label: "Comparativa" },
    { to: "/estacionalidad", label: "Estacionalidad" },
    { to: "/historico", label: "Histórico" },
    { to: "/propietarios", label: "Propietarios" },
    { to: "/calculadora", label: "Calculadora" },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-8">
            <Link to="/dashboard">
              <Logo size={26} />
            </Link>
            <nav className="hidden items-center gap-1 lg:flex">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                      isActive ? "bg-brand/8 text-brand" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-gold/30 bg-gold-soft px-2.5 py-1 text-2xs font-semibold text-gold sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              Plan {user?.planInfo.name}
            </span>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-100"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
                  {user?.name?.[0]?.toUpperCase() ?? "U"}
                </span>
                <span className="hidden text-sm font-semibold text-slate-700 sm:block">{user?.name?.split(" ")[0]}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-slate-400"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-100 bg-white py-1.5 shadow-cardHover animate-fadeIn">
                  <div className="border-b border-slate-100 px-4 py-2.5">
                    <p className="text-sm font-semibold text-slate-700">{user?.name}</p>
                    <p className="truncate text-xs text-slate-400">{user?.email}</p>
                  </div>
                  <div className="border-b border-slate-100 py-1 lg:hidden">
                    {links.map((l) => (
                      <Link key={l.to} to={l.to} className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>
                        {l.label}
                      </Link>
                    ))}
                  </div>
                  <Link to="/cuenta" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>
                    Mi cuenta
                  </Link>
                  <Link to="/precios" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>
                    Planes y facturación
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-negative hover:bg-negative-soft/50"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {user?.subscriptionStatus === "trialing" && <TrialBanner daysLeft={user.trialDaysLeft} />}

      <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}

function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const urgent = daysLeft <= 3;
  return (
    <div className={`border-b ${urgent ? "border-negative/20 bg-negative-soft" : "border-brand/15 bg-brand/[0.04]"}`}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
        <p className="flex items-center gap-2 text-sm">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full ${urgent ? "bg-negative text-white" : "bg-brand text-white"}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className={urgent ? "font-semibold text-negative" : "text-slate-600"}>
            {daysLeft > 0
              ? `Te quedan ${daysLeft} ${daysLeft === 1 ? "día" : "días"} de prueba gratuita`
              : "Tu periodo de prueba ha finalizado"}
          </span>
        </p>
        <Link to="/precios" className={`btn-sm ${urgent ? "btn-primary" : "btn-ghost"}`}>
          {daysLeft > 0 ? "Elegir un plan" : "Suscribirme ahora"}
        </Link>
      </div>
    </div>
  );
}
