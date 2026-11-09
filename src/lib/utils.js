// ---------- Shared helpers (safe on server and client) ----------
import { MEAL_TIME_ZONE } from "@/lib/meals";

/** "YYYY-MM-DD" -> Date at 00:00:00 UTC (the "normalized to midnight" value stored in MongoDB) */
export function toDayDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Date -> "YYYY-MM-DD" using the UTC calendar day (matches toDayDate) */
export function fromDayDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/** Today's date as "YYYY-MM-DD" in the *local* timezone of whoever calls this */
export function todayStr() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** "YYYY-MM" for the current month, or offset months back (1 = previous month) */
export function monthStr(offset = 0) {
  const [y, m] = todayStr().split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - offset, 1));
  return d.toISOString().slice(0, 7);
}

export function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Range info for a "YYYY-MM" month, plus how many days have elapsed (for absent counts) */
export function monthRange(month, today = todayStr()) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1)); // exclusive
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const [ty, tm, td] = today.split("-").map(Number);
  let elapsedDays;
  if (y === ty && m === tm) elapsedDays = td;
  else if (y * 12 + m < ty * 12 + tm) elapsedDays = daysInMonth;
  else elapsedDays = 0;
  return { start, end, daysInMonth, elapsedDays };
}

/** Name of today's weekday in the same format used by the Menu model */
export function todayDayName() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: MEAL_TIME_ZONE }).format(new Date());
}

export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function dateOffsetStr(dateStr, offset) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10);
}

/** fetch wrapper: parses JSON and throws Error(message) on non-2xx */
export async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}
