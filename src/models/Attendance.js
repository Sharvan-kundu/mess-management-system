import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Normalized to midnight UTC of the calendar day (see lib/utils.js -> toDayDate)
    date: { type: Date, required: true },
    mealType: { type: String, required: true, enum: ["breakfast", "lunch", "dinner"] },
    status: { type: String, enum: ["Present", "Absent"], default: "Absent" },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevent duplicate attendance rows for the same student, day and meal
AttendanceSchema.index({ studentId: 1, date: 1, mealType: 1 }, { unique: true });
// Speeds up "who is present for this meal today" and monthly reports
AttendanceSchema.index({ date: 1, mealType: 1 });

export default mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);
