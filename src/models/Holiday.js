import mongoose from "mongoose";

const HolidaySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true },
    reason: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

export default mongoose.models.Holiday || mongoose.model("Holiday", HolidaySchema);
