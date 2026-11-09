import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireAuth, jsonError, handleZod, parseJson } from "@/lib/guard";
import { objectIdSchema, studentUpdateSchema } from "@/lib/validators";
import User from "@/models/User";
import Attendance from "@/models/Attendance";

// PUT /api/students/:id  -> update details (password optional)
export async function PUT(req, { params }) {
  const { error } = await requireAuth("admin");
  if (error) return error;
  const { id } = await params;
  if (!objectIdSchema.safeParse(id).success) return jsonError("Invalid student id", 400);

  const { data, error: bodyError } = await parseJson(req);
  if (bodyError) return bodyError;
  const parsed = studentUpdateSchema.safeParse(data);
  const bad = handleZod(parsed);
  if (bad) return bad;

  await connectDB();
  const { name, email, rollNumber, phone, room, password, isActive } = parsed.data;

  const clash = await User.findOne({
    _id: { $ne: id },
    $or: [{ email }, { rollNumber }],
  }).lean();
  if (clash) {
    return jsonError(
      clash.email === email ? "A user with this email already exists" : "Roll number already in use",
      409
    );
  }

  const update = { name, email, rollNumber, phone, room };
  if (isActive !== undefined) update.isActive = isActive;
  if (password) update.password = await bcrypt.hash(password, 10);

  const student = await User.findOneAndUpdate(
    { _id: id, role: "student" },
    update,
    { new: true }
  ).lean();
  if (!student) return jsonError("Student not found", 404);
  return NextResponse.json({ student });
}

// DELETE /api/students/:id  -> remove student and their attendance
export async function DELETE(_req, { params }) {
  const { error } = await requireAuth("admin");
  if (error) return error;
  const { id } = await params;
  if (!objectIdSchema.safeParse(id).success) return jsonError("Invalid student id", 400);

  await connectDB();
  const student = await User.findOneAndDelete({ _id: id, role: "student" }).lean();
  if (!student) return jsonError("Student not found", 404);
  await Attendance.deleteMany({ studentId: id });
  return NextResponse.json({ ok: true, name: student.name });
}
