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
    toast.success("Report CSV downloaded");
  }

  return (
    <div className="space-y-6">
      {/* Header and Export Action */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">Attendance Reports</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Aggregated monthly meal attendance. Absent count is computed from elapsed open days ({data.elapsedDays}).
          </p>
        </div>
        <button
          className="btn-primary text-xs py-2"
          onClick={exportCsv}
          disabled={loading || data.rows.length === 0}
        >
          Export CSV Spreadsheet
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="report-month" className="text-xs font-semibold uppercase tracking-wider text-stone-500 shrink-0">
            Month:
          </label>
          <select
            id="report-month"
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
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter report by student name or roll number..."
          className="input flex-1 text-xs py-1.5"
        />
      </div>

      {/* Report Table Card */}
      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead className="border-b border-stone-200 bg-stone-50/70">
            <tr>
              <th className="th border-r border-stone-200" rowSpan={2}>
                Roll No.
              </th>
              <th className="th border-r border-stone-200" rowSpan={2}>
                Student Name
              </th>
              {MEALS.map((m) => (
                <th key={m} className="th text-center border-r border-stone-200 last:border-r-0" colSpan={2}>
                  {MEAL_CONFIG[m].label}
                </th>
              ))}
            </tr>
            <tr className="border-t border-stone-200/60">
              {MEALS.flatMap((m) => [
                <th key={`${m}p`} className="th text-center !py-1 text-emerald-800 font-mono text-[10px]">
                  P
                </th>,
                <th key={`${m}a`} className="th text-center !py-1 text-rose-700 font-mono text-[10px] border-r border-stone-200 last:border-r-0">
                  A
                </th>,
              ])}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {loading && (
              <tr>
                <td colSpan={8} className="td text-center text-stone-400 py-8">
                  Generating report records...
                </td>
              </tr>
            )}
            {!loading && data.rows.length === 0 && (
              <tr>
                <td colSpan={8} className="td text-center text-stone-400 py-8">
                  No student records found for this period.
                </td>
              </tr>
            )}
            {!loading &&
              data.rows.map((r) => (
                <tr key={r._id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="td font-mono text-xs font-semibold text-stone-700 border-r border-stone-100">
                    {r.rollNumber}
                  </td>
                  <td className="td font-medium text-stone-900 border-r border-stone-100">
                    {r.name}
                  </td>
                  {MEALS.flatMap((m) => [
                    <td key={`${m}p`} className="td text-center font-mono font-semibold text-xs text-emerald-700">
                      {r[m].present}
                    </td>,
                    <td key={`${m}a`} className="td text-center font-mono text-xs text-stone-500 border-r border-stone-100 last:border-r-0">
                      {r[m].absent}
                    </td>,
                  ])}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
