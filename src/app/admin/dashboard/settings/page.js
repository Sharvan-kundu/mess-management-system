"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { api, todayStr } from "@/lib/utils";
import { holidaySchema, noticeSchema } from "@/lib/validators";

export default function SettingsPage() {
  const [notices, setNotices] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const noticeForm = useForm({
    resolver: zodResolver(noticeSchema),
    defaultValues: { title: "", message: "" },
  });
  const holidayForm = useForm({
    resolver: zodResolver(holidaySchema),
    defaultValues: { date: todayStr(), reason: "" },
  });

  async function load() {
    setLoading(true);
    try {
      const [noticeData, holidayData] = await Promise.all([api("/api/notices"), api("/api/holidays")]);
      setNotices(noticeData.notices);
      setHolidays(holidayData.holidays);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submitNotice(values) {
    try {
      await api("/api/notices", { method: "POST", body: values });
      toast.success("Notice posted to bulletin");
      noticeForm.reset();
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function deleteNotice(notice) {
    if (!confirm(`Delete the notice "${notice.title}"?`)) return;
    try {
      await api(`/api/notices/${notice._id}`, { method: "DELETE" });
      toast.success("Notice removed");
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function submitHoliday(values) {
    try {
      await api("/api/holidays", { method: "POST", body: values });
      toast.success("Mess closed date recorded");
      holidayForm.reset({ date: todayStr(), reason: "" });
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function deleteHoliday(holiday) {
    if (!confirm(`Remove the closure on ${holiday.date}?`)) return;
    try {
      await api("/api/holidays", { method: "DELETE", body: { date: holiday.date } });
      toast.success("Closure date removed");
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Notices & Mess Closures</h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Publish student notices to the dashboard bulletin and mark holidays or maintenance closure days.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        {/* Notice Section */}
        <div className="card flex flex-col justify-between">
          <div>
            <div className="border-b border-stone-100 pb-3 mb-4">
              <h2 className="text-sm font-bold text-stone-900">Post Announcement</h2>
              <p className="text-xs text-stone-500">Notice appears at the top of every student's dashboard.</p>
            </div>

            <form onSubmit={noticeForm.handleSubmit(submitNotice)} className="space-y-3.5" noValidate>
              <div>
                <label className="label" htmlFor="notice-title">Announcement Title</label>
                <input id="notice-title" placeholder="e.g. Special Holiday Dinner Menu" className="input text-xs" maxLength={120} {...noticeForm.register("title")} />
                {noticeForm.formState.errors.title && <p className="field-error">{noticeForm.formState.errors.title.message}</p>}
              </div>
              <div>
                <label className="label" htmlFor="notice-message">Notice Message</label>
                <textarea id="notice-message" placeholder="Details of the announcement..." rows={3} maxLength={2000} className="input text-xs resize-y" {...noticeForm.register("message")} />
                {noticeForm.formState.errors.message && <p className="field-error">{noticeForm.formState.errors.message.message}</p>}
              </div>
              <button type="submit" disabled={noticeForm.formState.isSubmitting} className="btn-primary text-xs py-2">
                {noticeForm.formState.isSubmitting ? "Posting..." : "Publish Notice"}
              </button>
            </form>

            <div className="mt-6 border-t border-stone-100 pt-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Active Bulletin Notices</h3>
              {loading ? (
                <p className="text-xs text-stone-400">Loading notices...</p>
              ) : notices.length === 0 ? (
                <p className="text-xs text-stone-400 italic">No notices currently published.</p>
              ) : (
                <div className="space-y-2.5">
                  {notices.map((notice) => (
                    <article key={notice._id} className="rounded-lg border border-stone-200 bg-stone-50/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-stone-900 leading-tight">{notice.title}</h4>
                          <p className="mt-1 whitespace-pre-wrap text-xs text-stone-600 leading-relaxed">{notice.message}</p>
                          <p className="mt-1.5 text-[10px] font-mono text-stone-400">
                            {new Date(notice.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                          onClick={() => deleteNotice(notice)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Holiday / Mess Closure Section */}
        <div className="card flex flex-col justify-between">
          <div>
            <div className="border-b border-stone-100 pb-3 mb-4">
              <h2 className="text-sm font-bold text-stone-900">Schedule Mess Closure</h2>
              <p className="text-xs text-stone-500">Mess closures halt attendance counts for that calendar day.</p>
            </div>

            <form onSubmit={holidayForm.handleSubmit(submitHoliday)} className="space-y-3.5" noValidate>
              <div>
                <label className="label" htmlFor="holiday-date">Closure Date</label>
                <input id="holiday-date" type="date" className="input text-xs" {...holidayForm.register("date")} />
                {holidayForm.formState.errors.date && <p className="field-error">{holidayForm.formState.errors.date.message}</p>}
              </div>
              <div>
                <label className="label" htmlFor="holiday-reason">Reason for Closure</label>
                <input id="holiday-reason" placeholder="e.g. Diwali Festival Break / Deep Cleaning" className="input text-xs" maxLength={200} {...holidayForm.register("reason")} />
                {holidayForm.formState.errors.reason && <p className="field-error">{holidayForm.formState.errors.reason.message}</p>}
              </div>
              <button type="submit" disabled={holidayForm.formState.isSubmitting} className="btn-primary text-xs py-2">
                {holidayForm.formState.isSubmitting ? "Saving..." : "Record Closed Date"}
              </button>
            </form>

            <div className="mt-6 border-t border-stone-100 pt-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Scheduled Closures</h3>
              {loading ? (
                <p className="text-xs text-stone-400">Loading closures...</p>
              ) : holidays.length === 0 ? (
                <p className="text-xs text-stone-400 italic">No closure dates scheduled.</p>
              ) : (
                <div className="space-y-2">
                  {holidays.map((holiday) => (
                    <div
                      key={holiday._id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 text-xs"
                    >
                      <div>
                        <p className="font-mono font-bold text-stone-900">{holiday.date}</p>
                        <p className="text-stone-600 mt-0.5">{holiday.reason || "Mess closed"}</p>
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                        onClick={() => deleteHoliday(holiday)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
