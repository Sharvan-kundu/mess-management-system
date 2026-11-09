/* Seeds an admin, sample students and a sample weekly menu.
 * Usage: npm run seed   (reads MONGODB_URI from .env.local)
 * Safe to re-run: uses upserts. */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Minimal .env.local loader (no extra dependency)
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MENU = {
  breakfast: ["Poha", "Boiled egg / banana", "Tea"],
  lunch: ["Rice", "Dal", "Seasonal sabzi", "Roti", "Salad"],
  dinner: ["Roti", "Paneer curry", "Jeera rice", "Kheer"],
};
const STUDENTS = [
  ["Aarav Sharma", "aarav@college.edu", "b423052"],
  ["Diya Patel", "diya@college.edu", "b123081"],
  ["Rohan Das", "rohan@college.edu", "b223014"],
  ["Sneha Nair", "sneha@college.edu", "b323027"],
  ["Kabir Singh", "kabir@college.edu", "b523035"],
  ["Ananya Verma", "ananya@college.edu", "b123091"],
  ["Vivek Kumar", "vivek@college.edu", "b223076"],
  ["Priya Iyer", "priya@college.edu", "b323044"],
  ["Arjun Mehta", "arjun@college.edu", "b423063"],
  ["Neha Gupta", "neha@college.edu", "b523088"],
];

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
  const { SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;
  if (!SEED_ADMIN_NAME || !SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
    throw new Error("Set SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, and SEED_ADMIN_PASSWORD before seeding");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(SEED_ADMIN_EMAIL)) {
    throw new Error("SEED_ADMIN_EMAIL must be a valid email address");
  }

  const seedDemoData = process.env.SEED_DEMO_DATA === "true";
  const studentPassword = process.env.SEED_STUDENT_PASSWORD;
  if (seedDemoData && !studentPassword) {
    throw new Error("Set SEED_STUDENT_PASSWORD when SEED_DEMO_DATA=true");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const users = mongoose.connection.collection("users");
    const menus = mongoose.connection.collection("menus");
    const now = new Date();

    const upsertUser = async (doc, plain) =>
      users.updateOne(
        { email: doc.email },
        {
          $set: { ...doc, password: await bcrypt.hash(plain, 10), updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );

    const adminName = SEED_ADMIN_NAME.trim();
    const adminEmail = SEED_ADMIN_EMAIL.toLowerCase().trim();
    await upsertUser({ name: adminName, email: adminEmail, role: "admin" }, SEED_ADMIN_PASSWORD);
    console.log("Admin account ready.");

    if (seedDemoData) {
      for (const [name, email, rollNumber] of STUDENTS) {
        await upsertUser({
          name, email, rollNumber, phone: "", room: "", isActive: true, role: "student",
        }, studentPassword);
      }
      for (const dayOfWeek of DAYS) {
        for (const mealType of Object.keys(MENU)) {
          await menus.updateOne(
            { dayOfWeek, mealType },
            { $set: { items: MENU[mealType], updatedAt: now }, $setOnInsert: { createdAt: now } },
            { upsert: true }
          );
        }
      }
      console.log("Demo data loaded with the configured SEED_STUDENT_PASSWORD.");
    }
    console.log("Seed complete.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
