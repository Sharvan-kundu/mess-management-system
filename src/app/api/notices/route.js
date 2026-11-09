import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, handleZod, parseJson } from "@/lib/guard";
import { noticeSchema } from "@/lib/validators";
import Notice from "@/models/Notice";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  await connectDB();
  const notices = await Notice.find({}).sort({ createdAt: -1 }).limit(5).select("title message createdAt").lean();
  return NextResponse.json({ notices });
}

export async function POST(req) {
  const { error } = await requireAuth("admin");
  if (error) return error;
  const { data, error: bodyError } = await parseJson(req);
  if (bodyError) return bodyError;
  const parsed = noticeSchema.safeParse(data);
  const bad = handleZod(parsed);
  if (bad) return bad;

  await connectDB();
  const notice = await Notice.create(parsed.data);
  return NextResponse.json({ notice }, { status: 201 });
}
