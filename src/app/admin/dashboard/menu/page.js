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
      toast.error(parsed.error.issues[0]?.message || "Invalid menu configuration");
      return;
    }
    try {
      await api("/api/menu", { method: "PUT", body: parsed.data });
      toast.success("Weekly menu published successfully");
      reset(values);
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header and Save Action */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">Weekly Menu Planner</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Set dishes served for each meal window. Enter one item per line or separated by commas.
          </p>
        </div>
        <button
          type="submit"
          disabled={isSubmitting || loading || !isDirty}
          className="btn-primary text-xs py-2"
        >
          {isSubmitting ? "Saving..." : isDirty ? "Save Menu Changes *" : "Menu Up to Date"}
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-stone-400">Loading published menu...</div>
      ) : (
        <div className="space-y-4">
          {DAYS.map((day) => {
            const isToday = day === today;
            return (
              <div
                key={day}
                className={`card transition ${
                  isToday ? "!border-brand-500 ring-1 ring-brand-500/30 bg-white" : "border-stone-200"
                }`}
              >
                <div className="mb-3.5 flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <h2 className="font-bold text-stone-900">{day}</h2>
                  {isToday && (
                    <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                      Current Day
                    </span>
                  )}
                </div>
                <div className="grid gap-3.5 md:grid-cols-3">
                  {MEALS.map((meal) => (
                    <div key={meal}>
                      <label className="label flex items-center justify-between" htmlFor={`${day}-${meal}`}>
                        <span>{MEAL_CONFIG[meal].label}</span>
                        <span className="font-mono text-stone-400 font-normal lowercase text-[10px]">
                          {MEAL_CONFIG[meal].time}
                        </span>
                      </label>
                      <textarea
                        id={`${day}-${meal}`}
                        rows={3}
                        className="input resize-y font-mono text-xs"
                        placeholder="e.g. Dal Makhani&#10;Steamed Rice&#10;Roti"
                        {...register(`${day}.${meal}`)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </form>
  );
}
