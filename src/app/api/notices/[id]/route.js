import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, jsonError } from "@/lib/guard";
import { objectIdSchema } from "@/lib/validators";
import Notice from "@/models/Notice";

export async function DELETE(_req, { params }) {
  const { error } = await requireAuth("admin");
  if (error) return error;
  const { id } = await params;
  if (!objectIdSchema.safeParse(id).success) return jsonError("Invalid notice id", 400);

  await connectDB();
  const notice = await Notice.findByIdAndDelete(id).lean();
  if (!notice) return jsonError("Notice not found", 404);
  return NextResponse.json({ ok: true });
}
