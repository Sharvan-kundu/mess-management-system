"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, monthLabel, monthStr } from "@/lib/utils";
import { MEALS, MEAL_CONFIG } from "@/lib/meals";
import { reportQuerySchema } from "@/lib/validators";
import { useDebounce } from "@/lib/useDebounce";

export default function ReportsPage() {
  const months = [monthStr(0), monthStr(1)];
  const [month, setMonth] = useState(months[0]);
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 350);
  const [data, setData] = useState({ rows: [], elapsedDays: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const parsed = reportQuerySchema.safeParse({ month, q: debounced });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid report filter");
      setLoading(false);
      return;
    }
    setLoading(true);
    api(`/api/reports?month=${parsed.data.month}&q=${encodeURIComponent(parsed.data.q)}`)
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [month, debounced]);

  function exportCsv() {
    const csvValue = (value) => {
      const text = String(value);
      const safe = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const header = [
      "Roll Number",
      "Name",
      ...MEALS.flatMap((m) => [`${MEAL_CONFIG[m].label} Present`, `${MEAL_CONFIG[m].label} Absent`]),
    ];
    const lines = data.rows.map((r) => [
      r.rollNumber,
      r.name,
      ...MEALS.flatMap((m) => [r[m].present, r[m].absent]),
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map(csvValue).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `mess-attendance-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Monthly Reports</h1>
          <p className="text-sm text-slate-500">
            Absent = open days elapsed ({data.elapsedDays}) minus days marked present.
          </p>
        </div>
        <button className="btn-primary" onClick={exportCsv} disabled={loading || data.rows.length === 0}>
          Export CSV
        </button>
      </div>

      <div className="card flex flex-wrap gap-3">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="input !w-auto">
          {months.map((m, i) => (
            <option key={m} value={m}>
              {monthLabel(m)} {i === 0 ? "(current)" : "(previous)"}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or roll number..."
          className="input flex-1"
        />
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th" rowSpan={2}>Roll No.</th>
              <th className="th" rowSpan={2}>Name</th>
              {MEALS.map((m) => (
                <th key={m} className="th text-center" colSpan={2}>{MEAL_CONFIG[m].label}</th>
              ))}
            </tr>
            <tr>
              {MEALS.flatMap((m) => [
                <th key={`${m}p`} className="th text-center !pt-0 text-green-700">P</th>,
                <th key={`${m}a`} className="th text-center !pt-0 text-red-600">A</th>,
              ])}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={8} className="td text-center text-slate-400">Loading...</td></tr>}
            {!loading && data.rows.length === 0 && (
              <tr><td colSpan={8} className="td text-center text-slate-400">No students found</td></tr>
            )}
            {!loading &&
              data.rows.map((r) => (
                <tr key={r._id}>
                  <td className="td font-mono">{r.rollNumber}</td>
                  <td className="td font-medium">{r.name}</td>
                  {MEALS.flatMap((m) => [
                    <td key={`${m}p`} className="td text-center text-green-700">{r[m].present}</td>,
                    <td key={`${m}a`} className="td text-center text-red-600">{r[m].absent}</td>,
                  ])}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
