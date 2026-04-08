import "dotenv/config";
import { MongoClient } from "mongodb";
import { auth } from "../auth";
import { getEnv, requireEnv } from "../env";

const email = requireEnv("ADMIN_EMAIL").toLowerCase();
const password = requireEnv("ADMIN_PASSWORD");
const name = getEnv("ADMIN_NAME") ?? "TrackSheet Admin";
const mongodbUri = requireEnv("MONGODB_URI");
const dbName = getEnv("MONGODB_DB");

if (password.length < 8) {
  throw new Error("ADMIN_PASSWORD must be at least 8 characters");
}

const mongoClient = new MongoClient(mongodbUri);

try {
  console.warn(`Creating or reusing Better Auth user: ${email}`);
  await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    },
  });
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  if (!message.toLowerCase().includes("already")) {
    throw err;
  }
}

console.warn("Updating admin role in MongoDB");
await mongoClient.connect();
const db = mongoClient.db(dbName);

const result = await db.collection("user").updateOne(
  { email },
  {
    $set: {
      name,
      role: "admin",
      banned: false,
      banReason: null,
      banExpires: null,
      updatedAt: new Date(),
    },
  }
);

await mongoClient.close();

if (result.matchedCount === 0) {
  throw new Error(`Admin user ${email} was not found after sign-up`);
}

console.warn(`Admin user ready: ${email}`);
process.exit(0);
