"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, getSession } from "next-auth/react";
import toast from "react-hot-toast";
import { loginSchema } from "@/lib/validators";

export default function LoginForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const handleQuickFill = (email, password) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", password, { shouldValidate: true });
  };

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      const email = values.email ? values.email.trim().toLowerCase() : "";
      const res = await signIn("credentials", { ...values, email, redirect: false });
      if (res?.error) {
        if (res.error.includes("DatabaseConnectionError")) {
          toast.error("Database connection failed. Please check MongoDB Atlas IP access.");
        } else {
          toast.error("Invalid email or password");
        }
        return;
      }
      const session = await getSession();
      toast.success(`Welcome, ${session?.user?.name || "back"}!`);
      router.replace(session?.user?.role === "admin" ? "/admin/dashboard" : "/student/dashboard");
      router.refresh();
    } catch {
      toast.error("Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white font-bold text-lg shadow-sm">
          M
        </div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">
          Campus Mess Portal
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Sign in to view daily menus, meal times, and attendance
        </p>
      </div>

      {/* Main Login Card */}
      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 shadow-elevated" noValidate>
        <div>
          <label className="label" htmlFor="email">
            College Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="e.g. name@college.edu"
            className="input"
            {...register("email")}
          />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="input pr-11"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-stone-400 hover:text-stone-700 transition-colors focus-visible:outline-none"
            >
              {showPassword ? (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.8 4.4 9.8 6-.4.7-1.4 2-2.9 3.2M6.2 6.2C3.9 7.7 2.5 9.7 2.2 11c.5.8 4.1 6 9.8 6 1 0 2-.2 2.9-.5" />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.2 12S5.8 6 12 6s9.8 6 9.8 6-3.6 6-9.8 6-9.8-6z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && <p className="field-error">{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
          {submitting ? "Signing in..." : "Sign in to account"}
        </button>

        {/* Demo Credentials Helper Box */}
        <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50/70 p-3.5 text-xs text-stone-600 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-800 text-[11px] uppercase tracking-wider">
              Test Accounts
            </span>
            <span className="text-[11px] text-stone-400 font-mono">Password: 123456</span>
          </div>

          <div className="flex items-center justify-between border-t border-stone-200/80 pt-2">
            <div className="min-w-0 pr-2">
              <span className="font-semibold text-stone-900">Admin</span>
              <p className="truncate font-mono text-[11px] text-stone-600">b423056@iiit-bh.ac.in</p>
            </div>
            <button
              type="button"
              onClick={() => handleQuickFill("b423056@iiit-bh.ac.in", "123456")}
              className="shrink-0 rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-400 shadow-sm transition"
            >
              Fill
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-stone-200/80 pt-2">
            <div className="min-w-0 pr-2">
              <span className="font-semibold text-stone-900">Student</span>
              <p className="truncate font-mono text-[11px] text-stone-600">diya@college.edu</p>
            </div>
            <button
              type="button"
              onClick={() => handleQuickFill("diya@college.edu", "123456")}
              className="shrink-0 rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-400 shadow-sm transition"
            >
              Fill
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
