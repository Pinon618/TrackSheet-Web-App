import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import { getEnv, getEnvList, requireEnv } from "./env";

const mongoClient = new MongoClient(requireEnv("MONGODB_URI"), {
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
  tlsAllowInvalidCertificates: getEnv("NODE_ENV") !== "production",
});
const authDbName = getEnv("MONGODB_DB");
const clientOrigins = [
  ...getEnvList("CLIENT_ORIGIN", ["http://localhost:5173"]),
  "http://127.0.0.1:5173",
];
const localDevOrigins = [
  ...Array.from({ length: 10 }, (_, index) => `http://localhost:${5173 + index}`),
  ...Array.from({ length: 10 }, (_, index) => `http://127.0.0.1:${5173 + index}`),
];

export const auth = betterAuth({
  appName: "TrackSheet",
  baseURL: requireEnv("BETTER_AUTH_URL"),
  secret: requireEnv("BETTER_AUTH_SECRET"),
  database: mongodbAdapter(mongoClient.db(authDbName)),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
  trustedOrigins: [...new Set([...clientOrigins, ...localDevOrigins])],
});
