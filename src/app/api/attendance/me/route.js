import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAuth, jsonError } from "@/lib/guard";
import { monthString } from "@/lib/validators";
import { monthRange, fromDayDate, monthStr } from "@/lib/utils";
import Attendance from "@/models/Attendance";
import Holiday from "@/models/Holiday";

// GET /api/attendance/me?month=YYYY-MM
// A student's own records for a month. Days with no record are treated as Absent
// on the client for every day up to today.
export async function GET(req) {
  const { session, error } = await requireAuth("student");
  if (error) return error;

  const month = new URL(req.url).searchParams.get("month") || monthStr(0);
  if (!monthString.safeParse(month).success) return jsonError("Invalid month", 400);

  await connectDB();
  const { start, end, daysInMonth, elapsedDays } = monthRange(month);
  const [rows, holidays] = await Promise.all([
    Attendance.find({
      studentId: new mongoose.Types.ObjectId(session.user.id),
      date: { $gte: start, $lt: end },
    }).select("date mealType status").lean(),
    Holiday.find({ date: { $gte: start, $lt: end } }).select("date reason").lean(),
  ]);

  return NextResponse.json({
    month,
    daysInMonth,
    elapsedDays,
    closedDates: holidays.map((holiday) => ({
      date: fromDayDate(holiday.date),
      reason: holiday.reason,
    })),
    records: rows.map((r) => ({
      date: fromDayDate(r.date),
      mealType: r.mealType,
      status: r.status,
    })),
  });
}
