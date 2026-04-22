import { z } from "zod";

// ── Pack sizes ──────────────────────────────────────────────────────────────

export const PacksSchema = z.object({
  p1: z.number().int().min(0).default(0), // 1-pack boxes
  p2: z.number().int().min(0).default(0), // 2-pack boxes
  p3: z.number().int().min(0).default(0), // 3-pack boxes
  p4: z.number().int().min(0).default(0), // 4-pack boxes
  p5: z.number().int().min(0).default(0), // 5-pack boxes
  p6: z.number().int().min(0).default(0), // 6-pack boxes
});

export type Packs = z.infer<typeof PacksSchema>;
export type PackQuantities = z.infer<typeof PacksSchema>;

// ── Status ──────────────────────────────────────────────────────────────────

export const OrderStatusSchema = z.enum(["PAID", "PARTIAL", "DUE"]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

// ── Full Order (as stored in DB / returned from API) ────────────────────────

export const OrderSchema = z.object({
  _id: z.string(),
  invoiceSerial: z.string().min(1, "Invoice serial is required"),
  orderDate: z.coerce.date(),
  supplier: z.string().min(1, "Supplier is required"),
  brand: z.string().min(1, "Brand is required"),
  packs: PacksSchema,
  units: PacksSchema,
  totalBoxes: z.number().int().min(0).default(0),
  unitPrice: z.number().nonnegative(),
  shippingCost: z.number().nonnegative().default(0),
  packagingCost: z.number().nonnegative().default(0),
  previousDue: z.number().nonnegative().default(0),

  // Calculated — written by server, read-only on client
  productTotal: z.number().nonnegative(),
  grandTotal: z.number().nonnegative(),
  totalPaid: z.number().nonnegative(),
  balanceDue: z.number(),
  status: OrderStatusSchema,

  notes: z.string().optional(),
  isDeleted: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Order = z.infer<typeof OrderSchema>;

// ── Create Order (client → server) ──────────────────────────────────────────
// Calculated fields are omitted — server derives them.

export const CreateOrderSchema = z.object({
  invoiceSerial: z.string().min(1, "Invoice serial is required"),
  orderDate: z.coerce.date(),
  supplier: z.string().min(1, "Supplier is required"),
  brand: z.string().min(1, "Brand is required"),
  packs: PacksSchema,
  units: PacksSchema,
  totalBoxes: z.number().int().min(0, "Total boxes must be >= 0").default(0),
  unitPrice: z.number().nonnegative("Unit price must be ≥ 0"),
  shippingCost: z.number().nonnegative("Shipping cost must be ≥ 0").default(0),
  packagingCost: z.number().nonnegative("Packaging cost must be >= 0").default(0),
  previousDue: z.number().nonnegative("Previous due must be ≥ 0").default(0),
  notes: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

// ── Update Order ─────────────────────────────────────────────────────────────
// invoiceSerial is intentionally excluded — read-only after creation.

export const UpdateOrderSchema = CreateOrderSchema.omit({
  invoiceSerial: true,
}).partial();

export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>;
