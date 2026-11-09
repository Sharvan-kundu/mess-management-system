import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireAuth, jsonError, handleZod, parseJson } from "@/lib/guard";
import { changePasswordSchema } from "@/lib/validators";
import User from "@/models/User";

// PUT /api/me/password  { currentPassword, newPassword, confirmPassword }
export async function PUT(req) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { data, error: bodyError } = await parseJson(req);
  if (bodyError) return bodyError;
  const parsed = changePasswordSchema.safeParse(data);
  const bad = handleZod(parsed);
  if (bad) return bad;

  await connectDB();
  const user = await User.findById(session.user.id).select("+password");
  if (!user) return jsonError("User not found", 404);

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!ok) return jsonError("Current password is incorrect", 400);

  user.password = await bcrypt.hash(parsed.data.newPassword, 10);
  await user.save();
  return NextResponse.json({ ok: true });
}
