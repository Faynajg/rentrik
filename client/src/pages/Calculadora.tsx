import { useMemo, useState } from "react";
import { eur, pct } from "../lib/format";

/** Feature 6 — calculadora de inversión (ROI, payback, rentabilidad). Cálculo 100 % en cliente. */
export default function Calculadora() {
  const [purchasePrice, setPurchasePrice] = useState("180000");
  const [reformCosts, setReformCosts] = useState("15000");
  const [monthlyIncome, setMonthlyIncome] = useState("2200");
  const [occupancy, setOccupancy] = useState("70");
  const [monthlyExpenses, setMonthlyExpenses] = useState("900");

  const r = useMemo(() => {
    const purchase = num(purchasePrice);
    const reform = num(reformCosts);
    const income = num(monthlyIncome);
    const occ = Math.min(100, Math.max(0, num(occupancy)));
    const expenses = num(monthlyExpenses);

    const totalInvestment = purchase + reform;
    const effectiveMonthlyIncome = (income * occ) / 100;
    const annualIncome = effectiveMonthlyIncome * 12;
    const annualExpenses = expenses * 12;
    const annualNetProfit = annualIncome - annualExpenses;
    const roi = totalInvestment > 0 ? (annualNetProfit / totalInvestment) * 100 : 0;
    const grossYield = totalInvestment > 0 ? (annualIncome / totalInvestment) * 100 : 0;
    const paybackYears = annualNetProfit > 0 ? totalInvestment / annualNetProfit : Infinity;
    const profitable = annualNetProfit > 0;

    return {
      totalInvestment,
      effectiveMonthlyIncome,
      annualIncome,
      annualExpenses,
      annualNetProfit,
      roi,
      grossYield,
      paybackYears,
      profitable,
    };
  }, [purchasePrice, reformCosts, monthlyIncome, occupancy, monthlyExpenses]);

  const verdict = r.roi >= 7 ? "excelente" : r.roi >= 4 ? "buena" : r.profitable ? "ajustada" : "no rentable";
  const verdictStyle = {
    excelente: "bg-positive-soft text-positive border-positive/25",
    buena: "bg-positive-soft text-positive border-positive/25",
    ajustada: "bg-gold-soft text-gold border-gold/30",
    "no rentable": "bg-negative-soft text-negative border-negative/25",
  }[verdict];

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-ink">Calculadora de inversión</h1>
        <p className="text-sm text-slate-500">
          Evalúa si comprar una propiedad para alquiler vacacional es rentable: ROI, años de recuperación y rentabilidad.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Entradas */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-700">Datos de la inversión</h2>
          <div className="mt-4 space-y-4">
            <Field label="Precio de compra del inmueble" value={purchasePrice} onChange={setPurchasePrice} suffix="€" />
            <Field label="Gastos de reforma y puesta a punto" value={reformCosts} onChange={setReformCosts} suffix="€" />
            <Field label="Ingresos mensuales potenciales (100 % ocupación)" value={monthlyIncome} onChange={setMonthlyIncome} suffix="€" />
            <div>
              <label className="label">Ocupación estimada</label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={100} value={occupancy} onChange={(e) => setOccupancy(e.target.value)} className="flex-1 accent-[#1E3A5F]" />
                <span className="w-14 text-right text-sm font-semibold text-brand">{occupancy} %</span>
              </div>
            </div>
            <Field label="Gastos mensuales estimados (hipoteca, gestión, suministros…)" value={monthlyExpenses} onChange={setMonthlyExpenses} suffix="€" />
          </div>
        </div>

        {/* Resultados */}
        <div className="space-y-4">
          <div className={`rounded-2xl border p-6 ${verdictStyle}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Rentabilidad de la inversión</p>
            <p className="mt-1 text-3xl font-extrabold capitalize">{verdict}</p>
            <p className="mt-1 text-sm opacity-80">
              ROI anual del {pct(r.roi)} · {r.profitable ? `beneficio de ${eur(r.annualNetProfit)}/año` : `pérdida de ${eur(Math.abs(r.annualNetProfit))}/año`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Result label="Inversión total" value={eur(r.totalInvestment)} />
            <Result label="Beneficio neto anual" value={eur(r.annualNetProfit)} accent={r.profitable ? "text-positive" : "text-negative"} />
            <Result label="ROI anual" value={pct(r.roi)} accent="text-brand" />
            <Result
              label="Años de recuperación"
              value={isFinite(r.paybackYears) ? `${r.paybackYears.toFixed(1)} años` : "—"}
            />
            <Result label="Rentabilidad bruta" value={pct(r.grossYield)} />
            <Result label="Ingreso mensual real" value={eur(r.effectiveMonthlyIncome)} sub={`al ${occupancy} % ocupación`} />
          </div>

          <p className="text-xs text-slate-400">
            Cálculo orientativo. No incluye impuestos ni financiación; consulta con un asesor antes de invertir.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input className="input pr-8" type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{suffix}</span>}
      </div>
    </div>
  );
}

function Result({ label, value, sub, accent = "text-ink" }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="card p-4">
      <p className="stat-label">{label}</p>
      <p className={`mt-1.5 text-xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function num(s: string): number {
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}
