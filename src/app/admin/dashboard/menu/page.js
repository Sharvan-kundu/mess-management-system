"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { api, todayDayName } from "@/lib/utils";
import { DAYS, MEALS } from "@/lib/validators";
import { MEAL_CONFIG } from "@/lib/meals";
import { menuSaveSchema } from "@/lib/validators";

const emptyValues = () =>
  Object.fromEntries(DAYS.map((d) => [d, Object.fromEntries(MEALS.map((m) => [m, ""]))]));

export default function MenuPage() {
  const [loading, setLoading] = useState(true);
  const today = todayDayName();
  const { register, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm({
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    api("/api/menu")
      .then(({ menus }) => {
        const values = emptyValues();
        for (const m of menus) values[m.dayOfWeek][m.mealType] = m.items.join("\n");
        reset(values);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [reset]);

  async function onSubmit(values) {
    // One item per line (commas also split items)
    const menus = DAYS.flatMap((day) =>
      MEALS.map((mealType) => ({
        dayOfWeek: day,
        mealType,
        items: (values[day][mealType] || "")
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean),
      }))
    );
    const parsed = menuSaveSchema.safeParse({ menus });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid menu");
      return;
    }
    try {
      await api("/api/menu", { method: "PUT", body: parsed.data });
      toast.success("Menu saved");
      reset(values);
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Weekly Menu</h1>
          <p className="text-sm text-slate-500">One item per line. This menu repeats every week.</p>
        </div>
        <button type="submit" disabled={isSubmitting || loading || !isDirty} className="btn-primary">
          {isSubmitting ? "Saving..." : "Save menu"}
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <div className="space-y-4">
          {DAYS.map((day) => (
            <div key={day} className={`card ${day === today ? "!border-brand-500 ring-2 ring-brand-100" : ""}`}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">{day}</h2>
                {day === today && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">Today</span>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {MEALS.map((meal) => (
                  <div key={meal}>
                    <label className="label" htmlFor={`${day}-${meal}`}>
                      {MEAL_CONFIG[meal].label} <span className="font-normal text-slate-400">{MEAL_CONFIG[meal].time}</span>
                    </label>
                    <textarea
                      id={`${day}-${meal}`}
                      rows={4}
                      className="input resize-y"
                      placeholder="e.g. Poha&#10;Tea"
                      {...register(`${day}.${meal}`)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
