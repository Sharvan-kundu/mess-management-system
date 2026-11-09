import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, handleZod, parseJson } from "@/lib/guard";
import { menuSaveSchema } from "@/lib/validators";
import Menu from "@/models/Menu";

// GET /api/menu  -> full weekly menu (any logged-in user)
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  await connectDB();
  const menus = await Menu.find({}).select("dayOfWeek mealType items").lean();
  return NextResponse.json({ menus });
}

// PUT /api/menu  { menus: [{ dayOfWeek, mealType, items: [] }] }  (admin only)
export async function PUT(req) {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const { data, error: bodyError } = await parseJson(req);
  if (bodyError) return bodyError;
  const parsed = menuSaveSchema.safeParse(data);
  const bad = handleZod(parsed);
  if (bad) return bad;

  await connectDB();
  await Menu.bulkWrite(
    parsed.data.menus.map((m) => ({
      updateOne: {
        filter: { dayOfWeek: m.dayOfWeek, mealType: m.mealType },
        update: { $set: { items: m.items } },
        upsert: true,
      },
    }))
  );
  return NextResponse.json({ ok: true });
}
