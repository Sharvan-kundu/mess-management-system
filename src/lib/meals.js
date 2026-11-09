export const MEALS = ["breakfast", "lunch", "dinner"];
export const MEAL_TIME_ZONE = "Asia/Kolkata";

export const MEAL_CONFIG = {
  breakfast: {
    key: "breakfast",
    label: "Morning",
    shortLabel: "B",
    time: "07:00-10:00",
    start: "07:00",
    end: "10:00",
  },
  lunch: {
    key: "lunch",
    label: "Afternoon",
    shortLabel: "L",
    time: "12:00-15:00",
    start: "12:00",
    end: "15:00",
  },
  dinner: {
    key: "dinner",
    label: "Night",
    shortLabel: "D",
    time: "19:30-22:30",
    start: "19:30",
    end: "22:30",
  },
};

export function getCurrentMeal(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MEAL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const minutes = Number(values.hour) * 60 + Number(values.minute);
  for (const meal of MEALS) {
    const [startHour, startMinute] = MEAL_CONFIG[meal].start.split(":").map(Number);
    const [endHour, endMinute] = MEAL_CONFIG[meal].end.split(":").map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    if (minutes >= start && minutes <= end) return meal;
    if (minutes < start) return meal;
  }
  return "dinner";
}

export function hasMealWindowEnded(mealType, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MEAL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const [hour, minute] = MEAL_CONFIG[mealType].end.split(":").map(Number);
  return Number(values.hour) * 60 + Number(values.minute) >= hour * 60 + minute;
}
