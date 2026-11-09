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
      toast.success(`Attendance updated for ${student.name}`);
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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <p className="text-sm text-slate-500">Mark all three meals. Attendance can be edited for today and the previous two days.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {MEALS.map((mealType) => (
          <div key={mealType} className={`card !p-4 ${mealType === currentMeal ? "border-brand-500 ring-2 ring-brand-100" : ""}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Today's {MEAL_CONFIG[mealType].label} <span className="font-normal normal-case">· {MEAL_CONFIG[mealType].time}</span>
            </p>
            <p className="mt-1 text-xl font-semibold text-brand-700">
              {stats.todayPresentCounts[mealType]}<span className="text-sm font-normal text-slate-500"> / {stats.totalStudents} present</span>
            </p>
          </div>
        ))}
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={date}
            min={dateOffsetStr(today, -2)}
            max={today}
            disabled={pending.size > 0 || bulkPending.size > 0}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="input !w-auto"
          />
          <input
            value={query}
            disabled={pending.size > 0 || bulkPending.size > 0}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or roll number..."
            aria-label="Search students"
            className="input min-w-56 flex-1"
          />
          <span className="text-sm text-slate-500">{filteredTotal} students</span>
        </div>
        {closedDay && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Mess closed: {closedDay}</p>}
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[820px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Roll No.</th>
              <th className="th">Name</th>
              {MEALS.map((mealType) => {
                const config = MEAL_CONFIG[mealType];
                const highlighted = mealType === currentMeal;
                return (
                  <th key={mealType} className={`th min-w-44 text-center ${highlighted ? "bg-brand-50" : ""}`}>
                    <div className="text-slate-800">{config.label} <span className="font-normal text-slate-500">· {config.time}</span></div>
                    <div className="mt-1 text-xs font-medium text-brand-700">
                      {stats.presentCounts[mealType]} / {stats.totalStudents} present
                    </div>
                    <div className="mt-2 flex justify-center gap-1">
                      <button
                        type="button"
                        disabled={loading || bulkPending.has(mealType) || !!closedDay || filteredStudentIds.length === 0}
                        onClick={() => markFiltered(mealType, "Present")}
                        className="rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                      >
                        Mark all present
                      </button>
                      <button
                        type="button"
                        disabled={loading || bulkPending.has(mealType) || !!closedDay || filteredStudentIds.length === 0}
                        onClick={() => markFiltered(mealType, "Absent")}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        Clear
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={5} className="td text-center text-slate-400">Loading...</td></tr>}
            {!loading && students.length === 0 && (
              <tr><td colSpan={5} className="td text-center text-slate-400">No active students found</td></tr>
            )}
            {!loading && students.map((student) => (
              <tr key={student._id}>
                <td className="td font-mono">{student.rollNumber}</td>
                <td className="td font-medium">{student.name}</td>
                {MEALS.map((mealType) => {
                  const present = student[mealType] === "Present";
                  const key = `${student._id}:${mealType}`;
                  return (
                    <td key={mealType} className={`td text-center ${mealType === currentMeal ? "bg-brand-50/60" : ""}`}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={present}
                        aria-label={`${student.name}, ${MEAL_CONFIG[mealType].label}: ${student[mealType]}`}
                        disabled={pending.has(key) || bulkPending.has(mealType) || loading || !!closedDay}
                        onClick={() => toggle(student, mealType)}
                        className={`min-h-11 min-w-14 rounded-lg border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          present
                            ? "border-green-200 bg-green-100 text-green-800 hover:bg-green-200"
                            : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled={page <= 1 || loading || bulkPending.size > 0} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <button className="btn-secondary" disabled={page >= totalPages || loading || bulkPending.size > 0} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      </div>
      <p className="text-xs text-slate-500">A = Absent · P = Present. No record defaults to Absent.</p>
    </div>
  );
}
