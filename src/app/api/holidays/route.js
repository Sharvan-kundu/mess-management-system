import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, jsonError, handleZod, parseJson } from "@/lib/guard";
import { holidayDeleteSchema, holidayListQuerySchema, holidaySchema } from "@/lib/validators";
import { fromDayDate, monthRange, toDayDate } from "@/lib/utils";
import Holiday from "@/models/Holiday";

export async function GET(req) {
  const { error } = await requireAuth();
  if (error) return error;
  const parsed = holidayListQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  const bad = handleZod(parsed);
  if (bad) return bad;
  const { month } = parsed.data;

  await connectDB();
  const filter = month
    ? (() => {
        const { start, end } = monthRange(month);
        return { date: { $gte: start, $lt: end } };
      })()
    : {};
  const holidays = await Holiday.find(filter).sort({ date: -1 }).limit(120).select("date reason").lean();
  return NextResponse.json({
    holidays: holidays.map((holiday) => ({ ...holiday, date: fromDayDate(holiday.date) })),
  });
}

export async function POST(req) {
  const { error } = await requireAuth("admin");
  if (error) return error;
  const { data, error: bodyError } = await parseJson(req);
  if (bodyError) return bodyError;
  const parsed = holidaySchema.safeParse(data);
  const bad = handleZod(parsed);
  if (bad) return bad;

  await connectDB();
  const date = toDayDate(parsed.data.date);
  const existing = await Holiday.findOne({ date }).lean();
  if (existing) return jsonError("That date is already marked closed", 409);
  const holiday = await Holiday.create({ date, reason: parsed.data.reason });
  return NextResponse.json({ holiday: { ...holiday.toObject(), date: parsed.data.date } }, { status: 201 });
}

export async function DELETE(req) {
  const { error } = await requireAuth("admin");
  if (error) return error;
  const { data, error: bodyError } = await parseJson(req);
  if (bodyError) return bodyError;
  const parsed = holidayDeleteSchema.safeParse(data);
  const bad = handleZod(parsed);
  if (bad) return bad;

  await connectDB();
  const holiday = await Holiday.findOneAndDelete({ date: toDayDate(parsed.data.date) }).lean();
  if (!holiday) return jsonError("Closed day not found", 404);
  return NextResponse.json({ ok: true });
}
