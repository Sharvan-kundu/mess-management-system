import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, jsonError } from "@/lib/guard";
import User from "@/models/User";

// GET /api/me -> the logged-in user's registered details
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  await connectDB();
  const user = await User.findById(session.user.id)
    .select("name email rollNumber phone room isActive role createdAt").lean();
  if (!user) return jsonError("User not found", 404);
  return NextResponse.json({ user });
}
