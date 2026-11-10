import mongoose from "mongoose";

// Cache the connection across hot reloads in dev
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null, uri: null };
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Please define MONGODB_URI in .env.local");
  }
  if (cached.conn && cached.uri === uri) return cached.conn;
  if (cached.conn && cached.uri !== uri) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
  if (!cached.promise) {
    cached.uri = uri;
    cached.promise = mongoose
      .connect(uri, { bufferCommands: false })
      .then((m) => m)
      .catch((error) => {
        cached.promise = null;
        cached.conn = null;
        cached.uri = null;
        throw error;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
