import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { connectDB } from "./db";
import { getEnv, getEnvList } from "./env";
import { errorHandler } from "./middlewares/errorHandler";
import { asyncHandler } from "./lib/asyncHandler";
import { requireAuth } from "./middlewares/requireAuth";
import orderRoutes    from "./routes/order.routes";
import paymentRoutes  from "./routes/payment.routes";
import brandRoutes    from "./routes/brand.routes";
import supplierRoutes from "./routes/supplier.routes";
import userRoutes     from "./routes/user.routes";
import rafiTransactionRoutes from "./routes/rafiTransaction.routes";

const app  = express();
const PORT = getEnv("PORT") ?? 3001;
const CLIENT_ORIGINS = getEnvList("CLIENT_ORIGIN", ["http://localhost:5173"]);
const LOCAL_DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;
const authHandler = toNodeHandler(auth);

// ── Global middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || CLIENT_ORIGINS.includes(origin) || LOCAL_DEV_ORIGIN.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
}));

app.all("/api/auth/*", (req, res, next) => {
  authHandler(req, res).catch(next);
});

app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1/orders",    asyncHandler(requireAuth), orderRoutes);
app.use("/api/v1/payments",  asyncHandler(requireAuth), paymentRoutes);
app.use("/api/v1/brands",    asyncHandler(requireAuth), brandRoutes);
app.use("/api/v1/suppliers", asyncHandler(requireAuth), supplierRoutes);
app.use("/api/v1/users",     asyncHandler(requireAuth), userRoutes);
app.use("/api/v1/rafi-transactions", asyncHandler(requireAuth), rafiTransactionRoutes);

// ── Static files & SPA Catch-all ─────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");

app.use(express.static(clientDistPath));

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use("/api/*", (_req, res) => {
  res.status(404).json({ success: false, error: "API Route not found" });
});

// ── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.warn(`Server running on http://localhost:${PORT}`);
});

connectDB().catch((err: unknown) => {
  console.error("Fatal: could not connect to MongoDB", err);
  process.exit(1);
});
