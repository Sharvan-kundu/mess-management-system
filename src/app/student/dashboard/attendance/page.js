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
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : status === "Absent"
      ? "bg-rose-100 text-rose-700 border-rose-200"
      : status === "Closed"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-stone-100 text-stone-300 border-stone-200";

  return (
    <div className="space-y-6">
      {/* Header & Month Selector */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">Attendance Log</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Your recorded presence across all meal windows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="month-select" className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Month:
          </label>
          <select
            id="month-select"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input !w-auto text-xs py-1.5 font-medium"
          >
            {months.map((m, i) => (
              <option key={m} value={m}>
                {monthLabel(m)} {i === 0 ? "(Current)" : "(Previous)"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!data ? (
        <div className="card p-8 text-center text-sm text-stone-400">Loading attendance data...</div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid gap-3.5 sm:grid-cols-3">
            {MEALS.map((meal) => {
              const present = totals[meal]?.present || 0;
              const absent = totals[meal]?.absent || 0;
              const total = present + absent;
              const pct = total > 0 ? Math.round((present / total) * 100) : 0;
              return (
                <div key={meal} className="card !p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                      {MEAL_CONFIG[meal].label}
                    </p>
                    <span className="font-mono text-xs text-stone-400">{pct}% rate</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-emerald-700 font-mono">
                      {present}
                    </span>
                    <span className="text-xs text-stone-500 font-medium">present</span>
                    <span className="text-stone-300">/</span>
                    <span className="text-base font-semibold text-rose-600 font-mono">
                      {absent}
                    </span>
                    <span className="text-xs text-stone-500 font-medium">absent</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Grid Card */}
          <div className="card">
            {/* Legend */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 text-xs text-stone-500">
              <div className="flex flex-wrap items-center gap-3">
                {MEALS.map((meal) => (
                  <span key={meal} className="font-medium">
                    <strong className="text-stone-700">{MEAL_CONFIG[meal].shortLabel}</strong>: {MEAL_CONFIG[meal].label} ({MEAL_CONFIG[meal].time})
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Present
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Absent
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Closed
                </span>
              </div>
            </div>

            {/* Weekday Header */}
            <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-stone-400">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((c, i) =>
                c ? (
                  <div
                    key={c.date}
                    className={`rounded-lg border p-1.5 transition ${
                      c.date === todayStr()
                        ? "border-brand-500 ring-1 ring-brand-500/30 bg-brand-50/20"
                        : "border-stone-200/90 bg-white"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between text-xs font-mono">
                      <span className={`font-semibold ${c.date === todayStr() ? "text-brand-700" : "text-stone-700"}`}>
                        {c.d}
                      </span>
                      {c.closedReason && (
                        <span className="text-[10px] font-medium text-amber-700 uppercase tracking-tight" title={c.closedReason}>
                          Closed
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between gap-1">
                      {MEALS.map((meal) => (
                        <span
                          key={meal}
                          title={`${MEAL_CONFIG[meal].label}: ${c.meals[meal] || "Upcoming"}`}
                          className={`flex h-5 w-full items-center justify-center rounded border text-[10px] font-bold ${chip(
                            c.meals[meal]
                          )}`}
                        >
                          {c.meals[meal] === "Closed" ? "C" : MEAL_CONFIG[meal].shortLabel}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div key={`empty-${i}`} className="rounded-lg bg-stone-50/50 p-1.5" />
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
