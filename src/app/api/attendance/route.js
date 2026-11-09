import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, jsonError, handleZod, parseJson } from "@/lib/guard";
import { attendanceListQuerySchema, attendanceMarkSchema } from "@/lib/validators";
import { dateOffsetStr, escapeRegex, toDayDate, todayStr } from "@/lib/utils";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import Holiday from "@/models/Holiday";

const PAGE_SIZE = 20;

function isEditableDate(date) {
  const today = todayStr();
  return date <= today && date >= dateOffsetStr(today, -2);
}

async function ensureOpenDate(date) {
  const holiday = await Holiday.findOne({ date: toDayDate(date) }).select("_id").lean();
  return !holiday;
}

export async function GET(req) {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const parsed = attendanceListQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  const bad = handleZod(parsed);
  if (bad) return bad;
  const { date, page, q: query } = parsed.data;

  await connectDB();
  const day = toDayDate(date);
  const activeFilter = { role: "student", isActive: { $ne: false } };
  const filter = { ...activeFilter };
  if (query) {
    const rx = new RegExp(escapeRegex(query), "i");
    filter.$or = [{ name: rx }, { rollNumber: rx }];
  }

  const [students, filteredTotal, activeIds, holiday] = await Promise.all([
    User.find(filter).sort({ rollNumber: 1, _id: 1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
      .select("name rollNumber phone room").lean(),
    User.countDocuments(filter),
    User.find(activeFilter).distinct("_id"),
    Holiday.findOne({ date: day }).select("reason").lean(),
  ]);
  const pageIds = students.map((student) => student._id);
  const [records, grouped] = await Promise.all([
    Attendance.find({ date: day, studentId: { $in: pageIds } }).select("studentId mealType status").lean(),
    Attendance.aggregate([
      { $match: { date: day, status: "Present", studentId: { $in: activeIds } } },
      { $group: { _id: "$mealType", count: { $sum: 1 } } },
    ]),
  ]);
  const statusByKey = new Map(
    records.map((record) => [`${record.studentId}:${record.mealType}`, record.status])
  );
  const presentCounts = { breakfast: 0, lunch: 0, dinner: 0 };
  for (const row of grouped) presentCounts[row._id] = row.count;
  const today = todayStr();
  const todayPresentCounts = date === today
    ? presentCounts
    : { breakfast: 0, lunch: 0, dinner: 0 };
  if (date !== today) {
    const [todayHoliday, todayGrouped] = await Promise.all([
      Holiday.findOne({ date: toDayDate(today) }).select("_id").lean(),
      Attendance.aggregate([
        { $match: { date: toDayDate(today), status: "Present", studentId: { $in: activeIds } } },
        { $group: { _id: "$mealType", count: { $sum: 1 } } },
      ]),
    ]);
    if (!todayHoliday) {
      for (const row of todayGrouped) todayPresentCounts[row._id] = row.count;
    }
  }
  if (holiday) {
    presentCounts.breakfast = 0;
    presentCounts.lunch = 0;
    presentCounts.dinner = 0;
  }

  return NextResponse.json({
    date,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(filteredTotal / PAGE_SIZE),
    totalStudents: activeIds.length,
    filteredTotal,
    presentCounts,
    todayPresentCounts,
    filteredStudentIds: await User.find(filter).distinct("_id"),
    closed: !!holiday,
    holidayReason: holiday?.reason || null,
    students: students.map((student) => ({
      _id: student._id,
      name: student.name,
      rollNumber: student.rollNumber,
      phone: student.phone || "",
      room: student.room || "",
      breakfast: statusByKey.get(`${student._id}:breakfast`) || "Absent",
      lunch: statusByKey.get(`${student._id}:lunch`) || "Absent",
      dinner: statusByKey.get(`${student._id}:dinner`) || "Absent",
    })),
  });
}

export async function POST(req) {
  const { session, error } = await requireAuth("admin");
  if (error) return error;

  const { data, error: bodyError } = await parseJson(req);
  if (bodyError) return bodyError;
  const parsed = attendanceMarkSchema.safeParse(data);
  const bad = handleZod(parsed);
  if (bad) return bad;
  const { studentId, date, mealType, status } = parsed.data;
  if (!isEditableDate(date)) return jsonError("Attendance can only be edited for today and the previous two days", 400);

  await connectDB();
  if (!(await ensureOpenDate(date))) return jsonError("Attendance cannot be marked on a closed day", 400);
  const student = await User.findOne({ _id: studentId, role: "student", isActive: { $ne: false } })
    .select("name").lean();
  if (!student) return jsonError("Active student not found", 404);

  const markedAt = new Date();
  await Attendance.findOneAndUpdate(
    { studentId, date: toDayDate(date), mealType },
    { $set: { status, markedBy: session.user.id, markedAt } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return NextResponse.json({ ok: true, name: student.name, status });
}
