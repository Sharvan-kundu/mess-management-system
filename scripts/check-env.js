/* Verifies .env.local and tests the MongoDB connection.
 * Usage: npm run check */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const envPath = path.join(__dirname, "..", ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("X .env.local not found. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const ok = (msg) => console.log("  OK  " + msg);
const warn = (msg) => console.log("  !!  " + msg);
const fail = (msg) => {
  console.log("  X   " + msg);
  failed = true;
};
let failed = false;

const { MONGODB_URI, NEXTAUTH_URL, NEXTAUTH_SECRET } = process.env;
console.log("Checking configuration...");

if (!MONGODB_URI) fail("MONGODB_URI is missing");
else if (!/^mongodb(\+srv)?:\/\//.test(MONGODB_URI)) fail("MONGODB_URI must start with mongodb:// or mongodb+srv://");
else if (/<(user|password|cluster)>/i.test(MONGODB_URI)) fail("MONGODB_URI still contains <placeholders>");
else ok("MONGODB_URI format looks right");

if (!NEXTAUTH_URL) fail("NEXTAUTH_URL is missing");
else {
  let url;
  try {
    url = new URL(NEXTAUTH_URL);
  } catch {}
  if (!url || !["http:", "https:"].includes(url.protocol) || url.pathname !== "/" || url.search || url.hash) {
    fail("NEXTAUTH_URL must be a valid http(s) origin with no path, query, or fragment");
  } else {
    ok("NEXTAUTH_URL format looks right");
  }
  if (url?.protocol === "http:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    warn("NEXTAUTH_URL is plain http on a public host - use https in production");
  }
}

if (!NEXTAUTH_SECRET) fail("NEXTAUTH_SECRET is missing");
else if (NEXTAUTH_SECRET.length < 32) fail("NEXTAUTH_SECRET should be at least 32 characters");
else if (/replace|dev-only|change-me|placeholder/i.test(NEXTAUTH_SECRET)) fail("NEXTAUTH_SECRET is still a placeholder; generate a random secret");
else ok("NEXTAUTH_SECRET is set");

(async () => {
  if (MONGODB_URI && !failed) {
    try {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
      const db = mongoose.connection.db;
      const users = await db.collection("users").countDocuments().catch(() => 0);
      ok(`Connected to MongoDB database "${db.databaseName}" (${users} users)`);
    } catch (e) {
      fail("Could not connect to MongoDB: " + e.message);
    } finally {
      await mongoose.disconnect();
    }
  }
  console.log(failed ? "\nFix the items marked X and run again." : "\nAll good. Run `npm run dev`.");
  process.exitCode = failed ? 1 : 0;
})();
