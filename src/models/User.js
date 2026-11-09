import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false }, // bcrypt hash
    // Admins don't need a roll number; sparse unique allows many "missing" values
    rollNumber: { type: String, trim: true, unique: true, sparse: true, index: true },
    phone: { type: String, trim: true, default: "" },
    room: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    role: { type: String, enum: ["admin", "student"], default: "student" },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
