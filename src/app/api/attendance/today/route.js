import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/guard";
import { MEAL_CONFIG, MEALS, hasMealWindowEnded } from "@/lib/meals";
import { todayDayName, todayStr, toDayDate } from "@/lib/utils";
import Attendance from "@/models/Attendance";
import Holiday from "@/models/Holiday";
import Menu from "@/models/Menu";

export async function GET() {
  const { session, error } = await requireAuth("student");
  if (error) return error;

  await connectDB();
  const date = todayStr();
  const day = toDayDate(date);
  const now = new Date();
  const [records, menus, holiday] = await Promise.all([
    Attendance.find({ studentId: session.user.id, date: day }).select("mealType status").lean(),
    Menu.find({ dayOfWeek: todayDayName() }).select("mealType items").lean(),
    Holiday.findOne({ date: day }).select("reason").lean(),
  ]);
  const recordByMeal = new Map(records.map((record) => [record.mealType, record.status]));
  const menuByMeal = new Map(menus.map((menu) => [menu.mealType, menu.items]));

  return NextResponse.json({
    date,
    closed: !!holiday,
    holidayReason: holiday?.reason || null,
    meals: MEALS.map((mealType) => ({
      ...MEAL_CONFIG[mealType],
      items: menuByMeal.get(mealType) || [],
      status: holiday
        ? "Closed"
        : recordByMeal.get(mealType) || (hasMealWindowEnded(mealType, now) ? "Absent" : "Not yet"),
    })),
  });
}
