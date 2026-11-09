import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, jsonError, handleZod, parseJson } from "@/lib/guard";
import { attendanceBulkSchema } from "@/lib/validators";
import { dateOffsetStr, todayStr, toDayDate } from "@/lib/utils";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import Holiday from "@/models/Holiday";

export async function POST(req) {
  const { session, error } = await requireAuth("admin");
  if (error) return error;
  const { data, error: bodyError } = await parseJson(req);
  if (bodyError) return bodyError;
  const parsed = attendanceBulkSchema.safeParse(data);
  const bad = handleZod(parsed);
  if (bad) return bad;
  const { date, mealType, status, studentIds } = parsed.data;
  const today = todayStr();
  if (date > today || date < dateOffsetStr(today, -2)) {
    return jsonError("Attendance can only be edited for today and the previous two days", 400);
  }

  await connectDB();
  const day = toDayDate(date);
  const holiday = await Holiday.findOne({ date: day }).select("_id").lean();
  if (holiday) return jsonError("Attendance cannot be marked on a closed day", 400);
  const activeCount = await User.countDocuments({
    _id: { $in: studentIds },
    role: "student",
    isActive: { $ne: false },
  });
  if (activeCount !== studentIds.length) return jsonError("One or more students are inactive or not found", 400);

  const markedAt = new Date();
  const result = await Attendance.bulkWrite(
    studentIds.map((studentId) => ({
      updateOne: {
        filter: { studentId, date: day, mealType },
        update: {
          $set: { status, markedBy: session.user.id, markedAt },
          $setOnInsert: { studentId, date: day, mealType },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  const activeIds = await User.find({ role: "student", isActive: { $ne: false } }).distinct("_id");
  const [presentCount, totalStudents] = await Promise.all([
    Attendance.countDocuments({ date: day, mealType, status: "Present", studentId: { $in: activeIds } }),
    Promise.resolve(activeIds.length),
  ]);
  return NextResponse.json({
    ok: true,
    count: studentIds.length,
    modifiedCount: result.modifiedCount + result.upsertedCount,
    presentCount,
    totalStudents,
  });
}
