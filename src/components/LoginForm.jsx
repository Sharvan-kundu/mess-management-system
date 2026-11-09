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
      const res = await signIn("credentials", { ...values, redirect: false });
      if (res?.error) {
        toast.error("Invalid email or password");
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
    <form onSubmit={handleSubmit(onSubmit)} className="card w-full max-w-sm space-y-4" noValidate>
      <div className="text-center">
        <h1 className="text-xl font-semibold">Mess Management System</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in with your college account</p>
      </div>

      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" className="input" {...register("email")} />
        {errors.email && <p className="field-error">{errors.email.message}</p>}
      </div>

      <div>
        <label className="label" htmlFor="password">Password</label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="input pr-11"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            {showPassword ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.8 4.4 9.8 6-.4.7-1.4 2-2.9 3.2M6.2 6.2C3.9 7.7 2.5 9.7 2.2 11c.5.8 4.1 6 9.8 6 1 0 2-.2 2.9-.5" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.2 12S5.8 6 12 6s9.8 6 9.8 6-3.6 6-9.8 6-9.8-6z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && <p className="field-error">{errors.password.message}</p>}
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "Signing in..." : "Sign in"}
      </button>

      {/* Demo Credentials Helper Box */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-2">
        <p className="font-semibold text-slate-700">Demo Credentials:</p>
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
          <div>
            <span className="font-medium text-slate-800">Admin:</span>{" "}
            <code className="text-slate-700 font-mono">b423052@iiit-bh.ac.in</code>
          </div>
          <button
            type="button"
            onClick={() => handleQuickFill("b423052@iiit-bh.ac.in", "123456")}
            className="ml-2 font-medium text-brand-600 hover:text-brand-700 hover:underline"
          >
            Auto-fill
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
          <div>
            <span className="font-medium text-slate-800">Student:</span>{" "}
            <code className="text-slate-700 font-mono">diya@college.edu</code>
          </div>
          <button
            type="button"
            onClick={() => handleQuickFill("diya@college.edu", "123456")}
            className="ml-2 font-medium text-brand-600 hover:text-brand-700 hover:underline"
          >
            Auto-fill
          </button>
        </div>

        <div className="pt-0.5">
          <span className="font-medium text-slate-800">Password:</span>{" "}
          <code className="text-slate-700 font-mono">123456</code>
        </div>
      </div>
    </form>
  );
}