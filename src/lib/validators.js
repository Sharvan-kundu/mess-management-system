import { z } from "zod";
import { MEALS } from "@/lib/meals";

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export { MEALS } from "@/lib/meals";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const base = {
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  rollNumber: z.string().trim().min(1, "Roll number is required"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  room: z.string().trim().max(30).optional().or(z.literal("")),
};

export const studentCreateSchema = z.object({
  ...base,
  password: z.string().min(1, "Password is required"),
  isActive: z.boolean().optional().default(true),
});

// On update the password is optional (blank = keep the existing one)
export const studentUpdateSchema = z.object({
  ...base,
  password: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(1, "New password is required"),
    confirmPassword: z.string().min(1, "Please confirm the new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Date must be a real calendar date");
export const monthString = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM");

export const attendanceMarkSchema = z.object({
  studentId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid student id"),
  date: dateString,
  mealType: z.enum(MEALS),
  status: z.enum(["Present", "Absent"]),
});

export const attendanceBulkSchema = z.object({
  date: dateString,
  mealType: z.enum(MEALS),
  status: z.enum(["Present", "Absent"]),
  studentIds: z.array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid student id")).min(1).max(10000),
}).refine((value) => new Set(value.studentIds).size === value.studentIds.length, {
  message: "Student ids must be unique",
  path: ["studentIds"],
});
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
export const searchPageSchema = z.object({
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
export const attendanceListQuerySchema = z.object({
  date: dateString,
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
export const reportQuerySchema = z.object({
  month: monthString.optional(),
  q: z.string().trim().max(100).default(""),
});
export const holidayListQuerySchema = z.object({ month: monthString.optional() });

export const noticeSchema = z.object({
  title: z.string().trim().min(2).max(120),
  message: z.string().trim().min(2).max(2000),
});

export const holidaySchema = z.object({
  date: dateString,
  reason: z.string().trim().min(2).max(200),
});

export const holidayDeleteSchema = z.object({ date: dateString });

export const menuSaveSchema = z.object({
  menus: z
    .array(
      z.object({
        dayOfWeek: z.enum(DAYS),
        mealType: z.enum(MEALS),
        items: z.array(z.string().trim().min(1)).max(30),
      })
    )
    .max(21),
});
