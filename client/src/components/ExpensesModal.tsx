import { useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../api/client";
import { Expense, ExpenseCategory } from "../types";
import { eur, monthLabel } from "../lib/format";
import { Alert, Modal } from "./ui";

interface Row {
  category: ExpenseCategory;
  concept: string;
  amount: number;
  isPercent: boolean;
}

const TEMPLATE: { category: ExpenseCategory; title: string; concepts: string[]; percentConcepts?: string[] }[] = [
  {
    category: "fijo",
    title: "Gastos fijos mensuales",
    concepts: [
      "Hipoteca / alquiler",
      "Comunidad de propietarios",
      "Seguro del hogar",
      "WiFi",
      "Suministros (luz, agua, gas)",
      "Suscripciones",
      "Herramientas de gestión (PMS)",
      "Otros gastos fijos",
    ],
  },
  {
    category: "variable",
    title: "Gastos variables por estancia",
    concepts: ["Limpieza", "Lavandería", "Consumibles y amenities", "Mantenimiento y reparaciones", "Otros variables"],
  },
  {
    category: "plataforma",
    title: "Costes de plataforma",
    concepts: ["Comisión Airbnb", "Comisión Booking", "Comisión VRBO", "Publicidad en OTAs"],
  },
  {
    category: "gestion",
    title: "Costes de gestión",
    concepts: ["Comisión de gestora", "Pagos a terceros", "Publicidad propia", "Otros costes de gestión"],
    percentConcepts: ["Comisión de gestora"],
  },
];

/** Construye las filas iniciales fusionando la plantilla con los gastos ya guardados. */
function buildRows(existing: Expense[]): Row[] {
  const rows: Row[] = [];
  for (const block of TEMPLATE) {
    for (const concept of block.concepts) {
      const match = existing.find((e) => e.category === block.category && e.concept === concept);
      rows.push({
        category: block.category,
        concept,
        amount: match?.amount ?? 0,
        isPercent: match?.isPercent ?? block.percentConcepts?.includes(concept) ?? false,
      });
    }
  }
  // Conceptos personalizados que no estén en la plantilla.
  for (const e of existing) {
    const inTemplate = TEMPLATE.some((b) => b.category === e.category && b.concepts.includes(e.concept));
    if (!inTemplate) {
      rows.push({ category: e.category, concept: e.concept, amount: e.amount, isPercent: e.isPercent });
    }
  }
  return rows;
}

export function ExpensesModal({
  open,
  propertyId,
  month,
  grossRevenue,
  onClose,
  onSaved,
}: {
  open: boolean;
  propertyId: string;
  month: string;
  grossRevenue: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    api
      .get<{ expenses: Expense[] }>(`/properties/${propertyId}/expenses`, { params: { month } })
      .then((res) => setRows(buildRows(res.data.expenses)))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [open, propertyId, month]);

  function setAmount(index: number, value: number) {
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, amount: value } : r)));
  }

  const total = useMemo(
    () =>
      rows.reduce((sum, r) => sum + (r.isPercent ? (grossRevenue * r.amount) / 100 : r.amount), 0),
    [rows, grossRevenue]
  );

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api.put(`/properties/${propertyId}/expenses/bulk`, {
        month,
        expenses: rows
          .filter((r) => r.amount > 0)
          .map((r) => ({ category: r.category, concept: r.concept, amount: r.amount, isPercent: r.isPercent })),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  let idx = -1;

  return (
    <Modal open={open} onClose={onClose} title={`Gastos · ${monthLabel(month)}`} wide>
      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Cargando gastos…</p>
      ) : (
        <div className="space-y-5">
          {error && <Alert kind="error">{error}</Alert>}
          <p className="text-sm text-slate-500">
            Introduce los gastos reales del mes. Los importes en 0 no se guardan.
          </p>

          {TEMPLATE.map((block) => (
            <div key={block.category}>
              <h4 className="mb-2 text-sm font-semibold text-brand">{block.title}</h4>
              <div className="space-y-2">
                {block.concepts.map((concept) => {
                  idx++;
                  const rowIndex = rows.findIndex((r) => r.category === block.category && r.concept === concept);
                  const row = rows[rowIndex];
                  if (!row) return null;
                  return (
                    <div key={concept} className="flex items-center gap-3">
                      <span className="flex-1 text-sm text-slate-600">{concept}</span>
                      <div className="relative w-36">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="input !py-1.5 pr-8 text-right"
                          value={row.amount || ""}
                          onChange={(e) => setAmount(rowIndex, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          {row.isPercent ? "%" : "€"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs text-slate-400">Total gastos del mes</p>
              <p className="text-xl font-bold text-negative">{eur(total)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-ghost">Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? "Guardando…" : "Guardar gastos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
