"use client";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";
import { api } from "@/lib/utils";
import { useDebounce } from "@/lib/useDebounce";
import { searchPageSchema, studentCreateSchema, studentUpdateSchema } from "@/lib/validators";

function StudentForm({ student, onDone, onCancel }) {
  const editing = !!student;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editing ? studentUpdateSchema : studentCreateSchema),
    defaultValues: {
      name: student?.name || "",
      email: student?.email || "",
      rollNumber: student?.rollNumber || "",
      phone: student?.phone || "",
      room: student?.room || "",
      isActive: student?.isActive !== false,
      password: "",
    },
  });

  async function onSubmit(values) {
    try {
      await api(editing ? `/api/students/${student._id}` : "/api/students", {
        method: editing ? "PUT" : "POST",
        body: values,
      });
      toast.success(editing ? `${values.name} updated` : `${values.name} registered`);
      onDone();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const Field = ({ name, label, type = "text", placeholder }) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} type={type} placeholder={placeholder} className="input" {...register(name)} />
      {errors[name] && <p className="field-error">{errors[name].message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      {Field({ name: "name", label: "Full name" })}
      {Field({ name: "rollNumber", label: "Roll number" })}
      {Field({ name: "email", label: "Email", type: "email" })}
      {Field({ name: "phone", label: "Phone" })}
      {Field({ name: "room", label: "Room" })}
      {Field({
        name: "password",
        label: editing ? "New password (leave blank to keep)" : "Password",
        type: "password",
      })}
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register("isActive")} />
        Active (included in attendance and reports)
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? "Saving..." : editing ? "Save changes" : "Register"}
        </button>
      </div>
    </form>
  );
}

export default function StudentsPage() {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 350);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, student: null });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);

  const load = useCallback(() => {
    const parsed = searchPageSchema.safeParse({ q: debounced, page });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid student search");
      setLoading(false);
      return;
    }
    setLoading(true);
    api(`/api/students?q=${encodeURIComponent(parsed.data.q)}&page=${parsed.data.page}`)
      .then((d) => {
        setStudents(d.students);
        setTotalPages(Math.max(d.totalPages, 1));
        setTotalStudents(d.totalStudents);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [debounced, page]);

  useEffect(load, [load]);
  useEffect(() => setPage(1), [debounced]);

  async function remove(s) {
    if (!confirm(`Remove ${s.name} (${s.rollNumber})? Their attendance records will be deleted too.`)) return;
    try {
      await api(`/api/students/${s._id}`, { method: "DELETE" });
      toast.success(`${s.name} removed`);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const close = () => setModal({ open: false, student: null });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Students</h1>
          <p className="text-sm text-slate-500">Register, edit or remove students. {totalStudents} total.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true, student: null })}>
          + Add student
        </button>
      </div>

      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder="Search by name or roll number..."
        className="input"
      />

      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Roll No.</th>
              <th className="th">Name</th>
              <th className="th">Email</th>
              <th className="th">Phone</th>
              <th className="th">Room</th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={7} className="td text-center text-slate-400">Loading...</td></tr>}
            {!loading && students.length === 0 && (
              <tr><td colSpan={7} className="td text-center text-slate-400">No students found</td></tr>
            )}
            {!loading &&
              students.map((s) => (
                <tr key={s._id}>
                  <td className="td font-mono">{s.rollNumber}</td>
                  <td className="td font-medium">{s.name}</td>
                  <td className="td text-slate-500">{s.email}</td>
                  <td className="td text-slate-500">{s.phone || "—"}</td>
                  <td className="td text-slate-500">{s.room || "—"}</td>
                  <td className="td">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${s.isActive === false ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"}`}>
                      {s.isActive === false ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td className="td space-x-3 text-right">
                    <button className="text-sm font-medium text-brand-600 hover:underline" onClick={() => setModal({ open: true, student: s })}>
                      Edit
                    </button>
                    <button className="text-sm font-medium text-red-600 hover:underline" onClick={() => remove(s)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <button className="btn-secondary" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      </div>

      <Modal open={modal.open} onClose={close} title={modal.student ? "Edit student" : "Register student"}>
        <StudentForm
          key={modal.student?._id || "new"}
          student={modal.student}
          onCancel={close}
          onDone={() => {
            close();
            load();
          }}
        />
      </Modal>
    </div>
  );
}
