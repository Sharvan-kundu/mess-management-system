import mongoose from "mongoose";

const MenuSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      required: true,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    },
    mealType: { type: String, required: true, enum: ["breakfast", "lunch", "dinner"] },
    items: { type: [String], default: [] },
  },
  { timestamps: true }
);

// One menu entry per day + meal
MenuSchema.index({ dayOfWeek: 1, mealType: 1 }, { unique: true });

export default mongoose.models.Menu || mongoose.model("Menu", MenuSchema);
