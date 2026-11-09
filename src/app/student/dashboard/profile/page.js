"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { api } from "@/lib/utils";
import { changePasswordSchema } from "@/lib/validators";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(changePasswordSchema) });

  useEffect(() => {
    api("/api/me").then((d) => setUser(d.user)).catch((e) => toast.error(e.message));
  }, []);

  async function onSubmit(values) {
    try {
      await api("/api/me/password", { method: "PUT", body: values });
      toast.success("Password updated");
      reset();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const Row = ({ label, value }) => (
    <div className="flex justify-between border-b border-slate-100 py-2 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Profile & Settings</h1>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-semibold">Registered details</h2>
          {user ? (
            <dl>
              {Row({ label: "Name", value: user.name })}
              {Row({ label: "Roll number", value: user.rollNumber })}
              {Row({ label: "Phone", value: user.phone })}
              {Row({ label: "Room", value: user.room })}
              {Row({ label: "Email", value: user.email })}
              {Row({ label: "Role", value: user.role })}
            </dl>
          ) : (
            <p className="text-slate-400">Loading...</p>
          )}
          <p className="mt-3 text-xs text-slate-400">To change these, contact the mess admin.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-3" noValidate>
          <h2 className="font-semibold">Change password</h2>
          {[
            ["currentPassword", "Current password"],
            ["newPassword", "New password"],
            ["confirmPassword", "Confirm new password"],
          ].map(([name, label]) => (
            <div key={name}>
              <label className="label" htmlFor={name}>{label}</label>
              <input id={name} type="password" className="input" autoComplete="off" {...register(name)} />
              {errors[name] && <p className="field-error">{errors[name].message}</p>}
            </div>
          ))}
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
