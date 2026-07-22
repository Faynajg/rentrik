import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const KEY = "rentrik_cookie_consent";

/**
 * Banner de consentimiento de cookies (RGPD).
 *
 * Rentrik solo usa almacenamiento esencial (el token de sesión en localStorage)
 * y NO cookies de análisis, seguimiento ni publicidad. Las cookies estrictamente
 * necesarias están exentas de consentimiento, así que basta con informar y que el
 * usuario lo reconozca ("Aceptar"), con enlace a la política completa.
 *
 * Se muestra solo la primera vez: al aceptar se guarda la decisión y no reaparece.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      // Modo privado / almacenamiento bloqueado: no mostramos el banner.
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ status: "accepted", at: new Date().toISOString() }));
    } catch {
      // Si no se puede guardar, al menos lo ocultamos en esta sesión.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-elevated backdrop-blur sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <p className="flex-1 text-sm leading-relaxed text-slate-600">
          Usamos solo <strong className="text-ink">almacenamiento esencial</strong> para que la aplicación
          funcione (mantener tu sesión iniciada). No usamos cookies de análisis, seguimiento ni publicidad.{" "}
          <Link to="/cookies" className="font-semibold text-brand hover:underline">
            Política de cookies
          </Link>
        </p>
        <button onClick={accept} className="btn-primary w-full shrink-0 sm:w-auto">
          Aceptar
        </button>
      </div>
    </div>
  );
}
