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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
      {Field({ name: "name", label: "Full Name", placeholder: "e.g. Rahul Sharma" })}
      {Field({ name: "rollNumber", label: "Roll Number", placeholder: "e.g. B12345" })}
      {Field({ name: "email", label: "College Email", type: "email", placeholder: "e.g. rahul@college.edu" })}
      {Field({ name: "phone", label: "Phone Number", placeholder: "e.g. 9876543210" })}
      {Field({ name: "room", label: "Hostel Room Allotment", placeholder: "e.g. B-204" })}
      {Field({
        name: "password",
        label: editing ? "New Password (leave blank to retain current)" : "Initial Password",
        type: "password",
        placeholder: "At least 6 characters",
      })}
      <label className="flex items-center gap-2 pt-1 text-xs font-medium text-stone-700 cursor-pointer">
        <input type="checkbox" className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500" {...register("isActive")} />
        Active enrollment (included in attendance & reports)
      </label>
      <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
        <button type="button" onClick={onCancel} className="btn-secondary text-xs">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
          {isSubmitting ? "Saving..." : editing ? "Save Changes" : "Register Student"}
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
    if (!confirm(`Remove ${s.name} (${s.rollNumber})? Their attendance records will also be permanently deleted.`)) return;
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
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">Student Directory</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Register, edit details, or manage student mess accounts. {totalStudents} total students.
          </p>
        </div>
        <button className="btn-primary text-xs py-2" onClick={() => setModal({ open: true, student: null })}>
          + Register Student
        </button>
      </div>

      {/* Search Input */}
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder="Search student by name, roll number, or room..."
        className="input text-xs py-2"
      />

      {/* Directory Table */}
      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead className="border-b border-stone-200 bg-stone-50/70">
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
          <tbody className="divide-y divide-stone-100">
            {loading && (
              <tr>
                <td colSpan={7} className="td text-center text-stone-400 py-8">
                  Loading directory...
                </td>
              </tr>
            )}
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={7} className="td text-center text-stone-400 py-8">
                  No students found matching your search.
                </td>
              </tr>
            )}
            {!loading &&
              students.map((s) => (
                <tr key={s._id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="td font-mono text-xs font-semibold text-stone-700">{s.rollNumber}</td>
                  <td className="td font-medium text-stone-900">{s.name}</td>
                  <td className="td font-mono text-xs text-stone-500">{s.email}</td>
                  <td className="td font-mono text-xs text-stone-500">{s.phone || "—"}</td>
                  <td className="td font-mono text-xs text-stone-500">{s.room || "—"}</td>
                  <td className="td">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        s.isActive === false
                          ? "bg-stone-100 text-stone-500 border-stone-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          s.isActive === false ? "bg-stone-400" : "bg-emerald-500"
                        }`}
                      />
                      {s.isActive === false ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td className="td space-x-3 text-right">
                    <button
                      className="text-xs font-semibold text-brand-700 hover:text-brand-900 hover:underline"
                      onClick={() => setModal({ open: true, student: s })}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                      onClick={() => remove(s)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-stone-200 pt-3">
        <p className="text-xs text-stone-500 font-mono">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            className="btn-secondary text-xs py-1.5"
            disabled={page <= 1 || loading}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </button>
          <button
            className="btn-secondary text-xs py-1.5"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      </div>

      <Modal open={modal.open} onClose={close} title={modal.student ? "Edit Student Details" : "Register New Student"}>
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
