import { useMemo } from "react";
import { Reservation } from "../types";
import { monthLabel } from "../lib/format";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

/** Calendario visual de ocupación del mes: resalta las noches ocupadas. */
export function OccupancyCalendar({ month, reservations }: { month: string; reservations: Reservation[] }) {
  const [year, m] = month.split("-").map(Number);

  const occupied = useMemo(() => {
    const set = new Set<number>();
    for (const r of reservations) {
      const start = new Date(r.checkIn);
      const end = new Date(r.checkOut);
      // Cada noche va desde la fecha de entrada hasta la de salida (sin incluirla).
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() + 1 === m) set.add(d.getDate());
      }
    }
    return set;
  }, [reservations, year, m]);

  const daysInMonth = new Date(year, m, 0).getDate();
  const firstWeekday = (new Date(year, m - 1, 1).getDay() + 6) % 7; // lunes = 0
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const occupancyRate = Math.round((occupied.size / daysInMonth) * 100);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Calendario de ocupación</h3>
        <span className="text-xs text-slate-400 capitalize">{monthLabel(month)}</span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-center text-2xs font-semibold uppercase tracking-wide text-slate-400">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const isOccupied = occupied.has(day);
          return (
            <div
              key={day}
              className={`flex aspect-square items-center justify-center rounded-lg text-xs font-medium transition ${
                isOccupied ? "bg-brand text-white shadow-sm" : "bg-slate-50 text-slate-400"
              }`}
              title={isOccupied ? `Día ${day} · ocupado` : `Día ${day} · libre`}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <span className="h-3 w-3 rounded bg-brand" /> Ocupado
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <span className="h-3 w-3 rounded bg-slate-100" /> Libre
          </span>
        </div>
        <span className="font-semibold text-brand">
          {occupied.size}/{daysInMonth} noches · {occupancyRate} %
        </span>
      </div>
    </div>
  );
}
