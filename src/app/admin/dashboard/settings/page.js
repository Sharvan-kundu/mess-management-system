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
      toast.success("Notice posted");
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
      toast.success("Notice deleted");
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function submitHoliday(values) {
    try {
      await api("/api/holidays", { method: "POST", body: values });
      toast.success("Closed day added");
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
      toast.success("Closed day removed");
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notices & Closures</h1>
        <p className="text-sm text-slate-500">Share updates and mark days when the mess is closed.</p>
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-semibold">Post a notice</h2>
          <form onSubmit={noticeForm.handleSubmit(submitNotice)} className="space-y-3" noValidate>
            <div>
              <label className="label" htmlFor="notice-title">Title</label>
              <input id="notice-title" className="input" maxLength={120} {...noticeForm.register("title")} />
              {noticeForm.formState.errors.title && <p className="field-error">{noticeForm.formState.errors.title.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="notice-message">Message</label>
              <textarea id="notice-message" rows={4} maxLength={2000} className="input" {...noticeForm.register("message")} />
              {noticeForm.formState.errors.message && <p className="field-error">{noticeForm.formState.errors.message.message}</p>}
            </div>
            <button type="submit" disabled={noticeForm.formState.isSubmitting} className="btn-primary">
              {noticeForm.formState.isSubmitting ? "Posting..." : "Post notice"}
            </button>
          </form>

          <div className="mt-5 space-y-3">
            <h3 className="text-sm font-medium text-slate-700">Recent notices</h3>
            {loading ? <p className="text-sm text-slate-400">Loading...</p> : notices.length === 0 ? (
              <p className="text-sm text-slate-400">No notices yet.</p>
            ) : notices.map((notice) => (
              <article key={notice._id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-medium">{notice.title}</h4>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{notice.message}</p>
                  </div>
                  <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => deleteNotice(notice)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 font-semibold">Mark a mess-closed day</h2>
          <form onSubmit={holidayForm.handleSubmit(submitHoliday)} className="space-y-3" noValidate>
            <div>
              <label className="label" htmlFor="holiday-date">Date</label>
              <input id="holiday-date" type="date" className="input" {...holidayForm.register("date")} />
              {holidayForm.formState.errors.date && <p className="field-error">{holidayForm.formState.errors.date.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="holiday-reason">Reason</label>
              <input id="holiday-reason" className="input" maxLength={200} {...holidayForm.register("reason")} />
              {holidayForm.formState.errors.reason && <p className="field-error">{holidayForm.formState.errors.reason.message}</p>}
            </div>
            <button type="submit" disabled={holidayForm.formState.isSubmitting} className="btn-primary">
              {holidayForm.formState.isSubmitting ? "Saving..." : "Add closed day"}
            </button>
          </form>

          <div className="mt-5 space-y-2">
            <h3 className="text-sm font-medium text-slate-700">Scheduled closures</h3>
            {loading ? <p className="text-sm text-slate-400">Loading...</p> : holidays.length === 0 ? (
              <p className="text-sm text-slate-400">No closed days scheduled.</p>
            ) : holidays.map((holiday) => (
              <div key={holiday._id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium">{holiday.date}</p>
                  <p className="text-sm text-slate-500">{holiday.reason}</p>
                </div>
                <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => deleteHoliday(holiday)}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
