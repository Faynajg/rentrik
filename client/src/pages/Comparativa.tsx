import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, downloadFile, errorMessage } from "../api/client";
import { DashboardData, PropertyWithKpis } from "../types";
import { eur, monthLabel, pct } from "../lib/format";
import { Alert, EmptyState, ProfitBadge, Spinner } from "../components/ui";

type SortKey = "name" | "grossRevenue" | "totalExpenses" | "netProfit" | "profitMargin" | "occupancyRate" | "adr";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "name", label: "Propiedad", align: "left" },
  { key: "grossRevenue", label: "Ingresos", align: "right" },
  { key: "totalExpenses", label: "Gastos", align: "right" },
  { key: "netProfit", label: "Beneficio neto", align: "right" },
  { key: "profitMargin", label: "Margen", align: "right" },
  { key: "occupancyRate", label: "Ocupación", align: "right" },
  { key: "adr", label: "ADR", align: "right" },
];

export default function Comparativa() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("netProfit");
  const [asc, setAsc] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<DashboardData>("/dashboard", { params: { month } });
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>(data?.availableMonths ?? []);
    set.add(month);
    set.add(currentMonth());
    return Array.from(set).sort().reverse();
  }, [data, month]);

  const rows = useMemo(() => {
    const list = [...(data?.properties ?? [])];
    list.sort((a, b) => {
      const av = sortKey === "name" ? a.name : (a.kpis[sortKey] as number);
      const bv = sortKey === "name" ? b.name : (b.kpis[sortKey] as number);
      if (typeof av === "string" && typeof bv === "string") return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      return asc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [data, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "name");
    }
  }

  const totals = useMemo(() => {
    const ps = data?.properties ?? [];
    return {
      gross: ps.reduce((a, p) => a + p.kpis.grossRevenue, 0),
      expenses: ps.reduce((a, p) => a + p.kpis.totalExpenses, 0),
      net: ps.reduce((a, p) => a + p.kpis.netProfit, 0),
    };
  }, [data]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Comparativa</h1>
          <p className="text-sm text-slate-500">Todas tus propiedades lado a lado · {monthLabel(month)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input !w-auto !py-2" value={month} onChange={(e) => setMonth(e.target.value)}>
            {monthOptions.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <button
            onClick={() => downloadFile(`/export/dashboard.csv?month=${month}`, `rentrik-comparativa-${month}.csv`)}
            className="btn-ghost"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {error && <div className="mt-4"><Alert kind="error">{error}</Alert></div>}

      {loading && !data ? (
        <Spinner label="Cargando comparativa…" />
      ) : rows.length === 0 ? (
        <div className="mt-8"><EmptyState title="Sin propiedades" description="Añade propiedades para compararlas aquí." /></div>
      ) : (
        <div className="mt-6 card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                  {COLUMNS.map((c) => (
                    <th key={c.key} className={`px-4 py-3 ${c.align === "right" ? "text-right" : "text-left"}`}>
                      <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 font-semibold hover:text-brand">
                        {c.label}
                        <span className={sortKey === c.key ? "text-brand" : "text-slate-300"}>
                          {sortKey === c.key ? (asc ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <Row key={p.id} p={p} month={month} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-100 font-semibold text-ink">
                  <td className="px-4 py-3">Total ({rows.length})</td>
                  <td className="px-4 py-3 text-right">{eur(totals.gross)}</td>
                  <td className="px-4 py-3 text-right text-negative">{eur(totals.expenses)}</td>
                  <td className={`px-4 py-3 text-right ${totals.net >= 0 ? "text-positive" : "text-negative"}`}>{eur(totals.net)}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ p, month }: { p: PropertyWithKpis; month: string }) {
  const k = p.kpis;
  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link to={`/propiedades/${p.id}?month=${month}`} className="font-medium text-ink hover:text-brand">{p.name}</Link>
          <ProfitBadge profit={k.netProfit} />
        </div>
      </td>
      <td className="px-4 py-3 text-right text-slate-600">{eur(k.grossRevenue)}</td>
      <td className="px-4 py-3 text-right text-negative">{eur(k.totalExpenses)}</td>
      <td className={`px-4 py-3 text-right font-semibold ${k.netProfit >= 0 ? "text-positive" : "text-negative"}`}>{eur(k.netProfit)}</td>
      <td className="px-4 py-3 text-right text-slate-600">{pct(k.profitMargin)}</td>
      <td className="px-4 py-3 text-right text-slate-600">{pct(k.occupancyRate)}</td>
      <td className="px-4 py-3 text-right text-slate-600">{eur(k.adr, 0)}</td>
      <td className="px-4 py-3 text-right">
        <Link to={`/propiedades/${p.id}?month=${month}`} className="text-xs font-medium text-brand hover:underline">Ver →</Link>
      </td>
    </tr>
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
