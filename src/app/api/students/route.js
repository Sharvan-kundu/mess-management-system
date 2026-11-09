import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireAuth, jsonError, handleZod, parseJson } from "@/lib/guard";
import { searchPageSchema, studentCreateSchema } from "@/lib/validators";
import { escapeRegex } from "@/lib/utils";
import User from "@/models/User";

const PAGE_SIZE = 20;

export async function GET(req) {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const parsed = searchPageSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  const bad = handleZod(parsed);
  if (bad) return bad;
  const { q, page } = parsed.data;
  await connectDB();
  const filter = { role: "student" };
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { rollNumber: rx }];
  }
  const [students, totalStudents] = await Promise.all([
    User.find(filter).sort({ rollNumber: 1, _id: 1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
      .select("name email rollNumber phone room isActive").lean(),
    User.countDocuments(filter),
  ]);
  return NextResponse.json({ students, page, pageSize: PAGE_SIZE, totalStudents, totalPages: Math.ceil(totalStudents / PAGE_SIZE) });
}

// POST /api/students  -> register a new student
export async function POST(req) {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const { data, error: bodyError } = await parseJson(req);
  if (bodyError) return bodyError;
  const parsed = studentCreateSchema.safeParse(data);
  const bad = handleZod(parsed);
  if (bad) return bad;

  await connectDB();
  const { name, email, rollNumber, phone, room, password, isActive } = parsed.data;

  const clash = await User.findOne({ $or: [{ email }, { rollNumber }] }).lean();
  if (clash) {
    return jsonError(
      clash.email === email ? "A user with this email already exists" : "Roll number already in use",
      409
    );
  }

  const hash = await bcrypt.hash(password, 10);
  const student = await User.create({
    name, email, rollNumber, phone, room, password: hash, role: "student", isActive,
  });
  return NextResponse.json(
    { student: { _id: student._id, name, email, rollNumber, phone, room, isActive, role: "student" } },
    { status: 201 }
  );
}
