import { MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react";

/**
 * Menú de acciones (⋯) de una tarjeta de propiedad.
 *
 * La tarjeta es un <Link>, así que cada clic del menú corta la navegación
 * (preventDefault + stopPropagation). Los modales de editar/eliminar los
 * monta el Dashboard fuera del enlace: si vivieran aquí dentro, el
 * preventDefault necesario para el <Link> bloquearía el submit del formulario.
 */
export function PropertyCardMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera o al pulsar Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /** Impide que el clic navegue a la ficha de la propiedad. */
  function stop(e: ReactMouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function choose(e: ReactMouseEvent, action: () => void) {
    stop(e);
    setOpen(false);
    action();
  }

  return (
    <div ref={boxRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Opciones de la propiedad"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          stop(e);
          setOpen((o) => !o);
        }}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 text-left shadow-elevated"
        >
          <button
            type="button"
            role="menuitem"
            onClick={(e) => choose(e, onEdit)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Editar propiedad
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(e) => choose(e, onDelete)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-negative transition hover:bg-negative-soft"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
            Eliminar propiedad
          </button>
        </div>
      )}
    </div>
  );
}
