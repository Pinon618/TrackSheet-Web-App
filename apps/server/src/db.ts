import mongoose from "mongoose";
import { getEnv, requireEnv } from "./env";

const MONGODB_URI = requireEnv("MONGODB_URI");
const IS_DEV = getEnv("NODE_ENV") !== "production";

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      // Bun on Windows doesn't trust the Atlas CA bundle.
      // On production (Linux/Node.js on Render) this is not needed.
      tlsAllowInvalidCertificates: IS_DEV,
    });
    console.warn(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.warn("MongoDB reconnected");
});
