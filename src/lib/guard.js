import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

/**
 * Use at the top of every API route.
 *   const { session, error } = await requireAuth("admin");
 *   if (error) return error;
 */
export async function requireAuth(role) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }
  if (role && session.user.role !== role) {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export function jsonError(message, status = 400, extra = {}) {
  return NextResponse.json({ message, ...extra }, { status });
}

export async function parseJson(req) {
  try {
    return { data: await req.json() };
  } catch {
    return { error: jsonError("Request body must be valid JSON", 400) };
  }
}

export function handleZod(result) {
  if (result.success) return null;
  const first = result.error.issues[0];
  return jsonError(first?.message || "Invalid input", 400, {
    issues: result.error.issues,
  });
}
