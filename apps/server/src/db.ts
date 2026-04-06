import mongoose from "mongoose";

const MONGODB_URI = process.env["MONGODB_URI"];
const IS_DEV = process.env["NODE_ENV"] !== "production";

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

// Narrowed to string after the guard above
const uri: string = MONGODB_URI;

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(uri, {
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
