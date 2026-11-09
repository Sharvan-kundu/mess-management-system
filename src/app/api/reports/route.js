import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, handleZod } from "@/lib/guard";
import { reportQuerySchema } from "@/lib/validators";
import { monthRange, escapeRegex, monthStr, todayStr, toDayDate } from "@/lib/utils";
import { MEALS } from "@/lib/meals";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import Holiday from "@/models/Holiday";

// GET /api/reports?month=YYYY-MM&q=search
// Present / Absent counts per student per meal.
// Absent = open days elapsed in the month minus Present.
export async function GET(req) {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const parsed = reportQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  const bad = handleZod(parsed);
  if (bad) return bad;
  const month = parsed.data.month || monthStr(0);
  const q = parsed.data.q;

  await connectDB();
  const { start, end, elapsedDays } = monthRange(month);

  const filter = { role: "student" };
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { rollNumber: rx }];
  }
  filter.isActive = { $ne: false };
  const [students, holidays] = await Promise.all([
    User.find(filter).sort({ rollNumber: 1 }).select("name rollNumber").lean(),
    Holiday.find({ date: { $gte: start, $lt: end } }).select("date").lean(),
  ]);
  const closedDates = holidays.map((holiday) => holiday.date);
  const today = toDayDate(todayStr());
  const closedElapsedDays = holidays.filter((holiday) => holiday.date <= today).length;
  const openDays = Math.max(elapsedDays - closedElapsedDays, 0);

  const grouped = await Attendance.aggregate([
    {
      $match: {
        date: { $gte: start, $lt: end },
        ...(closedDates.length ? { date: { $gte: start, $lt: end, $nin: closedDates } } : {}),
        status: "Present",
        studentId: { $in: students.map((s) => s._id) },
      },
    },
    { $group: { _id: { studentId: "$studentId", mealType: "$mealType" }, count: { $sum: 1 } } },
  ]);

  const presentMap = new Map(
    grouped.map((g) => [`${g._id.studentId}:${g._id.mealType}`, g.count])
  );

  const rows = students.map((s) => {
    const row = { _id: s._id, name: s.name, rollNumber: s.rollNumber };
    for (const meal of MEALS) {
      const present = Math.min(presentMap.get(`${s._id}:${meal}`) || 0, openDays);
      row[meal] = { present, absent: Math.max(openDays - present, 0) };
    }
    return row;
  });

  return NextResponse.json({ month, elapsedDays: openDays, closedDays: closedElapsedDays, rows });
}
