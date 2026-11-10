"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, todayDayName } from "@/lib/utils";
import { DAYS } from "@/lib/validators";
import { MEAL_CONFIG, MEALS } from "@/lib/meals";

export default function StudentMenuPage() {
  const [menu, setMenu] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [notice, setNotice] = useState(null);
  const today = todayDayName();

  useEffect(() => {
    api("/api/menu")
      .then(({ menus }) => {
        const map = {};
        for (const m of menus) (map[m.dayOfWeek] ||= {})[m.mealType] = m.items;
        setMenu(map);
      })
      .catch((e) => toast.error(e.message));
    api("/api/attendance/today").then(setTodayData).catch((e) => toast.error(e.message));
    api("/api/notices").then(({ notices }) => setNotice(notices[0] || null)).catch((e) => toast.error(e.message));
  }, []);

  const renderStatusBadge = (status) => {
    const config = {
      Present: {
        bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
        dot: "bg-emerald-500",
      },
      Absent: {
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        dot: "bg-rose-500",
      },
      "Not yet": {
        bg: "bg-stone-100 text-stone-600 border-stone-200",
        dot: "bg-stone-400",
      },
      Closed: {
        bg: "bg-amber-50 text-amber-800 border-amber-200",
        dot: "bg-amber-500",
      },
    }[status] || {
      bg: "bg-stone-100 text-stone-600 border-stone-200",
      dot: "bg-stone-400",
    };

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.bg}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Pinned Notice */}
      {notice && (
        <section className="card border-l-4 border-l-brand-600 border-stone-200 bg-brand-50/30">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
              Notice Board
            </span>
            <span className="text-xs text-stone-400 font-mono">
              {new Date(notice.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <h2 className="mt-1.5 text-base font-semibold tracking-tight text-stone-900">{notice.title}</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600 leading-relaxed">{notice.message}</p>
        </section>
      )}

      {/* Today's Meals Section */}
      <section className="space-y-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">Today's Meals</h1>
          <p className="text-xs text-stone-500">Live meal schedule, menu items, and your attendance status.</p>
        </div>

        {!todayData ? (
          <div className="card p-6 text-center text-sm text-stone-400">Loading today's schedule...</div>
        ) : (
          <>
            {todayData.closed && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3.5 text-sm text-amber-900 font-medium">
                Mess is closed today{todayData.holidayReason ? `: ${todayData.holidayReason}` : "."}
              </div>
            )}
            <div className="grid gap-3.5 md:grid-cols-3">
              {todayData.meals.map((meal) => (
                <article key={meal.key} className="card flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">{meal.label}</h2>
                        <p className="text-xs font-mono text-stone-500">{meal.time}</p>
                      </div>
                      {renderStatusBadge(meal.status)}
                    </div>
                    <div className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1">
                        Menu
                      </p>
                      <p className="text-sm text-stone-700 leading-normal">
                        {meal.items.length ? meal.items.join(" · ") : <span className="text-stone-400 italic">No menu published</span>}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Weekly Menu Section */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-stone-900">Weekly Menu</h2>
          <p className="text-xs text-stone-500">Scheduled menu for the recurring 7-day cycle.</p>
        </div>

        {!menu ? (
          <div className="card p-6 text-center text-sm text-stone-400">Loading weekly menu...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
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
                    <h3 className="font-bold text-stone-900">{day}</h3>
                    {isToday && (
                      <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        Today
                      </span>
                    )}
                  </div>
                  <dl className="space-y-3">
                    {MEALS.map((meal) => {
                      const items = menu[day]?.[meal] || [];
                      return (
                        <div key={meal} className="text-sm">
                          <dt className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 flex items-center justify-between">
                            <span>{MEAL_CONFIG[meal].label}</span>
                            <span className="font-mono text-stone-400 font-normal">{MEAL_CONFIG[meal].time}</span>
                          </dt>
                          <dd className="mt-0.5 text-stone-700">
                            {items.length ? (
                              items.join(" · ")
                            ) : (
                              <span className="text-stone-400 italic text-xs">Not set</span>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
