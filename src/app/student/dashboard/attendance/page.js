"use client";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api, monthLabel, monthStr, todayStr } from "@/lib/utils";
import { MEAL_CONFIG, MEALS } from "@/lib/meals";
import { monthString } from "@/lib/validators";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StudentAttendancePage() {
  const months = [monthStr(0), monthStr(1)];
  const [month, setMonth] = useState(months[0]);
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    const parsed = monthString.safeParse(month);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid month");
      return;
    }
    api(`/api/attendance/me?month=${parsed.data}`)
      .then(setData)
      .catch((e) => toast.error(e.message));
  }, [month]);

  const { cells, totals } = useMemo(() => {
    if (!data) return { cells: [], totals: {} };
    const [y, m] = month.split("-").map(Number);
    const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Monday-first grid
    const lookup = new Map(data.records.map((r) => [`${r.date}:${r.mealType}`, r.status]));
    const closedLookup = new Map(data.closedDates.map((holiday) => [holiday.date, holiday.reason]));
    const today = todayStr();
    const totals = Object.fromEntries(MEALS.map((meal) => [meal, { present: 0, absent: 0 }]));

    const cells = Array(offset).fill(null);
    for (let d = 1; d <= data.daysInMonth; d++) {
      const date = `${month}-${String(d).padStart(2, "0")}`;
      const meals = {};
      const closedReason = closedLookup.get(date);
      for (const meal of MEALS) {
        // No record on a past/current day == Absent (default); future days are blank
        const status = closedReason
          ? "Closed"
          : lookup.get(`${date}:${meal}`) || (date <= today ? "Absent" : null);
        meals[meal] = status;
        if (status === "Present") totals[meal].present++;
        if (status === "Absent") totals[meal].absent++;
      }
      cells.push({ d, date, meals, closedReason });
    }
    return { cells, totals };
  }, [data, month]);

  const chip = (status) =>
    status === "Present"
      ? "bg-green-100 text-green-700"
      : status === "Absent"
      ? "bg-red-100 text-red-600"
      : status === "Closed"
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-100 text-slate-300";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My Attendance</h1>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            {MEALS.map((meal) => <span key={meal}>{MEAL_CONFIG[meal].shortLabel} = {MEAL_CONFIG[meal].label} ({MEAL_CONFIG[meal].time})</span>)}
            <span>Amber = Closed</span>
          </div>
        </div>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="input !w-auto">
          {months.map((m, i) => (
            <option key={m} value={m}>{monthLabel(m)} {i === 0 ? "(current)" : "(previous)"}</option>
          ))}
        </select>
      </div>

      {!data ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {MEALS.map((meal) => (
              <div key={meal} className="card !p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{MEAL_CONFIG[meal].label}</p>
                <p className="mt-1 text-sm">
                  <span className="text-xl font-semibold text-green-700">{totals[meal].present}</span> present ·{" "}
                  <span className="text-xl font-semibold text-red-600">{totals[meal].absent}</span> absent
                </p>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-slate-400">
              {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((c, i) =>
                c ? (
                  <div key={c.date} className={`rounded-lg border p-1.5 ${c.date === todayStr() ? "border-brand-500" : "border-slate-200"}`}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                      <span>{c.d}</span>
                      {c.closedReason && <span className="font-medium text-amber-700" title={c.closedReason}>Closed</span>}
                    </div>
                    <div className="flex justify-between gap-0.5">
                      {MEALS.map((meal) => (
                        <span
                          key={meal}
                          title={`${MEAL_CONFIG[meal].label}: ${c.meals[meal] || "—"}`}
                          className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold ${chip(c.meals[meal])}`}
                        >
                          {c.meals[meal] === "Closed" ? "C" : MEAL_CONFIG[meal].shortLabel}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div key={`e${i}`} />
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
