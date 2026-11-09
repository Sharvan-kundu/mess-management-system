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

  const statusClass = {
    Present: "bg-green-100 text-green-800",
    Absent: "bg-red-100 text-red-700",
    "Not yet": "bg-slate-100 text-slate-600",
    Closed: "bg-amber-100 text-amber-800",
  };

  return (
    <div className="space-y-5">
      {notice && (
        <section className="card border-brand-100 bg-brand-50/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Latest notice</p>
          <h2 className="mt-1 font-semibold">{notice.title}</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{notice.message}</p>
          <p className="mt-2 text-xs text-slate-400">{new Date(notice.createdAt).toLocaleDateString()}</p>
        </section>
      )}

      <section className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold">Today</h1>
          <p className="text-sm text-slate-500">Today's meals, timings, menu and attendance.</p>
        </div>
        {!todayData ? (
          <p className="text-slate-400">Loading today's meals...</p>
        ) : (
          <>
            {todayData.closed && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Mess closed today{todayData.holidayReason ? `: ${todayData.holidayReason}` : "."}
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              {todayData.meals.map((meal) => (
                <article key={meal.key} className="card !p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">{meal.label}</h2>
                      <p className="text-xs text-slate-500">{meal.time}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[meal.status]}`}>
                      {meal.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {meal.items.length ? meal.items.join(" · ") : "Menu not set"}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <div>
        <h2 className="text-xl font-semibold">This Week's Menu</h2>
        <p className="text-sm text-slate-500">Today's menu is highlighted.</p>
      </div>

      {!menu ? (
        <p className="text-slate-400">Loading weekly menu...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {DAYS.map((day) => (
            <div key={day} className={`card ${day === today ? "!border-brand-500 ring-2 ring-brand-100" : ""}`}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">{day}</h2>
                {day === today && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">Today</span>
                )}
              </div>
              <dl className="space-y-3">
                {MEALS.map((meal) => {
                  const items = menu[day]?.[meal] || [];
                  return (
                    <div key={meal}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {MEAL_CONFIG[meal].label} <span className="font-normal normal-case">{MEAL_CONFIG[meal].time}</span>
                      </dt>
                      <dd className="text-sm">
                        {items.length ? items.join(" • ") : <span className="text-slate-400">Not set</span>}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
