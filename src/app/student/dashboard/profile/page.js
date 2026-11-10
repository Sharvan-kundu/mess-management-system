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
      toast.success("Password updated successfully");
      reset();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const Row = ({ label, value }) => (
    <div className="flex items-center justify-between border-b border-stone-100 py-2.5 last:border-0">
      <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</dt>
      <dd className="text-sm font-medium text-stone-900 font-mono">{value || "—"}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Profile & Security</h1>
        <p className="text-xs text-stone-500 mt-0.5">
          View registered hostel and dining information or update your password.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Student Details Card */}
        <div className="card flex flex-col justify-between">
          <div>
            <div className="border-b border-stone-100 pb-3 mb-3">
              <h2 className="text-sm font-bold text-stone-900">Student Information</h2>
              <p className="text-xs text-stone-500">Official records registered with the mess office.</p>
            </div>
            {user ? (
              <dl className="divide-y divide-stone-100">
                {Row({ label: "Full Name", value: user.name })}
                {Row({ label: "Roll Number", value: user.rollNumber })}
                {Row({ label: "Phone", value: user.phone })}
                {Row({ label: "Room Allotment", value: user.room })}
                {Row({ label: "Email Address", value: user.email })}
                {Row({ label: "System Role", value: user.role })}
              </dl>
            ) : (
              <p className="text-stone-400 py-6 text-center text-sm">Loading profile...</p>
            )}
          </div>
          <p className="mt-4 border-t border-stone-100 pt-3 text-[11px] text-stone-400">
            Need to update registration details? Please visit the mess office administrator.
          </p>
        </div>

        {/* Change Password Card */}
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4" noValidate>
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-sm font-bold text-stone-900">Change Password</h2>
            <p className="text-xs text-stone-500">Choose a secure password with at least 6 characters.</p>
          </div>

          {[
            ["currentPassword", "Current Password"],
            ["newPassword", "New Password"],
            ["confirmPassword", "Confirm New Password"],
          ].map(([name, label]) => (
            <div key={name}>
              <label className="label" htmlFor={name}>
                {label}
              </label>
              <input
                id={name}
                type="password"
                className="input"
                autoComplete="off"
                {...register(name)}
              />
              {errors[name] && <p className="field-error">{errors[name].message}</p>}
            </div>
          ))}

          <div className="pt-1">
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
