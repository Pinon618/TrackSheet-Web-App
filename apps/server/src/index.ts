import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db";
import { errorHandler } from "./middlewares/errorHandler";
import orderRoutes    from "./routes/order.routes";
import paymentRoutes  from "./routes/payment.routes";
import supplierRoutes from "./routes/supplier.routes";
import userRoutes     from "./routes/user.routes";

const app  = express();
const PORT = process.env["PORT"] ?? 3001;

// ── Global middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1/orders",    orderRoutes);
app.use("/api/v1/payments",  paymentRoutes);
app.use("/api/v1/suppliers", supplierRoutes);
app.use("/api/v1/users",     userRoutes);

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
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
