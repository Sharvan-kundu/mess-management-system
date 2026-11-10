"use client";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api, dateOffsetStr, todayStr } from "@/lib/utils";
import { MEAL_CONFIG, MEALS, getCurrentMeal } from "@/lib/meals";
import { useDebounce } from "@/lib/useDebounce";
import { attendanceBulkSchema, attendanceListQuerySchema, attendanceMarkSchema } from "@/lib/validators";

const PAGE_SIZE = 20;

export default function AttendancePage() {
  const [currentMeal, setCurrentMeal] = useState(getCurrentMeal());
  const [date, setDate] = useState(todayStr());
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 350);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentCounts: { breakfast: 0, lunch: 0, dinner: 0 },
    todayPresentCounts: { breakfast: 0, lunch: 0, dinner: 0 },
  });
  const [filteredStudentIds, setFilteredStudentIds] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [closedDay, setClosedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(new Set());
  const [bulkPending, setBulkPending] = useState(new Set());
  const reqId = useRef(0);
  const today = todayStr();

  useEffect(() => {
    const timer = setInterval(() => setCurrentMeal(getCurrentMeal()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => setPage(1), [debounced, date]);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    const parsedParams = attendanceListQuerySchema.safeParse({ date, q: debounced, page });
    if (!parsedParams.success) {
      toast.error(parsedParams.error.issues[0]?.message || "Invalid attendance search");
      setLoading(false);
      return;
    }
    const params = new URLSearchParams({
      date: parsedParams.data.date,
      q: parsedParams.data.q,
      page: String(parsedParams.data.page),
    });
    api(`/api/attendance?${params}`)
      .then((data) => {
        if (id !== reqId.current) return;
        setStudents(data.students);
        setStats({
          totalStudents: data.totalStudents,
          presentCounts: data.presentCounts,
          todayPresentCounts: data.todayPresentCounts,
        });
        setFilteredStudentIds(data.filteredStudentIds);
        setFilteredTotal(data.filteredTotal);
        setTotalPages(Math.max(data.totalPages, 1));
        setClosedDay(data.closed ? data.holidayReason || "Mess closed" : null);
      })
      .catch((e) => id === reqId.current && toast.error(e.message))
      .finally(() => id === reqId.current && setLoading(false));
  }, [debounced, date, page]);

  async function toggle(student, mealType) {
    const current = student[mealType];
    const next = current === "Present" ? "Absent" : "Present";
    const parsed = attendanceMarkSchema.safeParse({
      studentId: student._id,
      date,
      mealType,
      status: next,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid attendance update");
      return;
    }
    const key = `${student._id}:${mealType}`;
    setStudents((list) => list.map((item) => item._id === student._id ? { ...item, [mealType]: next } : item));
    setStats((value) => ({
      ...value,
      presentCounts: {
        ...value.presentCounts,
        [mealType]: value.presentCounts[mealType] + (next === "Present" ? 1 : -1),
      },
      ...(date === today ? {
        todayPresentCounts: {
          ...value.todayPresentCounts,
          [mealType]: value.todayPresentCounts[mealType] + (next === "Present" ? 1 : -1),
        },
      } : {}),
    }));
    setPending((items) => new Set(items).add(key));
    try {
      await api("/api/attendance", {
        method: "POST",
        body: parsed.data,
      });
      toast.success(`Updated: ${student.name} (${MEAL_CONFIG[mealType].label})`);
    } catch (e) {
      setStudents((list) => list.map((item) => item._id === student._id ? { ...item, [mealType]: current } : item));
      setStats((value) => ({
        ...value,
        presentCounts: {
          ...value.presentCounts,
          [mealType]: value.presentCounts[mealType] + (current === "Present" ? 1 : -1),
        },
        ...(date === today ? {
          todayPresentCounts: {
            ...value.todayPresentCounts,
            [mealType]: value.todayPresentCounts[mealType] + (current === "Present" ? 1 : -1),
          },
        } : {}),
      }));
      toast.error(e.message);
    } finally {
      setPending((items) => {
        const nextItems = new Set(items);
        nextItems.delete(key);
        return nextItems;
      });
    }
  }

  async function markFiltered(mealType, status) {
    if (!filteredStudentIds.length) return;
    const label = MEAL_CONFIG[mealType].label;
    const action = status === "Present" ? "mark present" : "clear to absent";
    if (!confirm(`${action} for all ${filteredStudentIds.length} filtered students for ${label}?`)) return;
    const parsed = attendanceBulkSchema.safeParse({ date, mealType, status, studentIds: filteredStudentIds });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid bulk attendance update");
      return;
    }

    const originalStudents = students;
    const originalCount = stats.presentCounts[mealType];
    setBulkPending((meals) => new Set(meals).add(mealType));
    setStudents((list) => list.map((student) => ({ ...student, [mealType]: status })));
    setPending((items) => new Set([...items, ...students.map((student) => `${student._id}:${mealType}`)]));
    try {
      const result = await api("/api/attendance/bulk", {
        method: "POST",
        body: parsed.data,
      });
      setStats((value) => ({
        ...value,
        presentCounts: { ...value.presentCounts, [mealType]: result.presentCount },
        ...(date === today ? {
          todayPresentCounts: { ...value.todayPresentCounts, [mealType]: result.presentCount },
        } : {}),
      }));
      toast.success(`${label} marked for ${result.count} students`);
    } catch (e) {
      setStudents(originalStudents);
      setStats((value) => ({
        ...value,
        presentCounts: { ...value.presentCounts, [mealType]: originalCount },
        ...(date === today ? {
          todayPresentCounts: { ...value.todayPresentCounts, [mealType]: originalCount },
        } : {}),
      }));
      toast.error(e.message);
    } finally {
      setBulkPending((meals) => {
        const nextMeals = new Set(meals);
        nextMeals.delete(mealType);
        return nextMeals;
      });
      setPending((items) => {
        const nextItems = new Set(items);
        for (const student of students) nextItems.delete(`${student._id}:${mealType}`);
        return nextItems;
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Attendance Log</h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Record attendance per meal session. Records can be edited for today and the previous two days.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        {MEALS.map((mealType) => {
          const isCurrent = mealType === currentMeal;
          return (
            <div
              key={mealType}
              className={`card !p-4 transition ${
                isCurrent ? "!border-brand-500 ring-1 ring-brand-500/30 bg-brand-50/20" : "border-stone-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  {MEAL_CONFIG[mealType].label}
                </p>
                {isCurrent && (
                  <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Live Session
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-mono text-stone-400">{MEAL_CONFIG[mealType].time}</p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-stone-900 font-mono">
                  {stats.todayPresentCounts[mealType]}
                </span>
                <span className="text-xs text-stone-500 font-mono">
                  / {stats.totalStudents} present today
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Date Bar */}
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="attendance-date" className="text-xs font-semibold uppercase tracking-wider text-stone-500 shrink-0">
              Date:
            </label>
            <input
              id="attendance-date"
              type="date"
              value={date}
              min={dateOffsetStr(today, -2)}
              max={today}
              disabled={pending.size > 0 || bulkPending.size > 0}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="input !w-auto text-xs py-1.5 font-medium"
            />
          </div>

          <input
            value={query}
            disabled={pending.size > 0 || bulkPending.size > 0}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by student name or roll number..."
            aria-label="Search students"
            className="input min-w-56 flex-1 text-xs py-1.5"
          />

          <span className="text-xs font-medium text-stone-500 whitespace-nowrap">
            {filteredTotal} students found
          </span>
        </div>

        {closedDay && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs font-medium text-amber-900">
            Mess closed on this date: {closedDay}
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[820px]">
          <thead className="border-b border-stone-200 bg-stone-50/70">
            <tr>
              <th className="th w-32">Roll No.</th>
              <th className="th">Name</th>
              {MEALS.map((mealType) => {
                const config = MEAL_CONFIG[mealType];
                const highlighted = mealType === currentMeal;
                return (
                  <th
                    key={mealType}
                    className={`th min-w-44 text-center ${highlighted ? "bg-brand-50/40" : ""}`}
                  >
                    <div className="text-stone-900 font-bold">{config.label}</div>
                    <div className="text-[10px] font-normal text-stone-400 font-mono">{config.time}</div>
                    <div className="mt-1 text-xs font-mono font-semibold text-brand-700">
                      {stats.presentCounts[mealType]} / {stats.totalStudents} present
                    </div>
                    <div className="mt-2 flex justify-center gap-1.5">
                      <button
                        type="button"
                        disabled={loading || bulkPending.has(mealType) || !!closedDay || filteredStudentIds.length === 0}
                        onClick={() => markFiltered(mealType, "Present")}
                        className="rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 transition"
                      >
                        All Present
                      </button>
                      <button
                        type="button"
                        disabled={loading || bulkPending.has(mealType) || !!closedDay || filteredStudentIds.length === 0}
                        onClick={() => markFiltered(mealType, "Absent")}
                        className="rounded-md border border-stone-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition"
                      >
                        Clear
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {loading && (
              <tr>
                <td colSpan={5} className="td text-center text-stone-400 py-8">
                  Loading attendance records...
                </td>
              </tr>
            )}
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={5} className="td text-center text-stone-400 py-8">
                  No active students matched the query.
                </td>
              </tr>
            )}
            {!loading &&
              students.map((student) => (
                <tr key={student._id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="td font-mono font-semibold text-xs text-stone-700">{student.rollNumber}</td>
                  <td className="td font-medium text-stone-900">{student.name}</td>
                  {MEALS.map((mealType) => {
                    const present = student[mealType] === "Present";
                    const key = `${student._id}:${mealType}`;
                    return (
                      <td
                        key={mealType}
                        className={`td text-center ${mealType === currentMeal ? "bg-brand-50/20" : ""}`}
                      >
                        <button
                          type="button"
                          role="switch"
                          aria-checked={present}
                          aria-label={`${student.name}, ${MEAL_CONFIG[mealType].label}: ${student[mealType]}`}
                          disabled={pending.has(key) || bulkPending.has(mealType) || loading || !!closedDay}
                          onClick={() => toggle(student, mealType)}
                          className={`min-h-10 min-w-14 rounded-md border px-3 text-xs font-bold font-mono transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            present
                              ? "border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "border-stone-200 bg-stone-100 text-stone-500 hover:bg-stone-200/70"
                          }`}
                        >
                          {present ? "P" : "A"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-stone-200 pt-3">
        <p className="text-xs text-stone-500 font-mono">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            className="btn-secondary text-xs py-1.5"
            disabled={page <= 1 || loading || bulkPending.size > 0}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </button>
          <button
            className="btn-secondary text-xs py-1.5"
            disabled={page >= totalPages || loading || bulkPending.size > 0}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      </div>
      <p className="text-[11px] text-stone-400 font-mono">
        Status Reference: P = Present · A = Absent. Unmarked records default to Absent.
      </p>
    </div>
  );
}
