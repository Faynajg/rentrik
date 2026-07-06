import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { SiteFooter } from "./SiteFooter";
import { useOwnerAuth } from "../context/OwnerAuthContext";

export function PortalShell({ children }: { children: ReactNode }) {
  const { owner, logout } = useOwnerAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo size={26} />
            <span className="hidden rounded-full border border-brand/15 bg-brand/5 px-2.5 py-1 text-2xs font-semibold text-brand sm:inline-block">
              Portal del propietario
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-semibold text-slate-600 sm:block">{owner?.name}</span>
            <button
              onClick={() => {
                logout();
                navigate("/portal/login");
              }}
              className="btn-ghost btn-sm"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
