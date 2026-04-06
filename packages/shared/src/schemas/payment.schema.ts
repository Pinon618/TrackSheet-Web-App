import { z } from "zod";

// ── Payment Type ─────────────────────────────────────────────────────────────

export const PaymentTypeSchema = z.enum([
  "Bank Transfer",
  "Cash",
  "Mobile Banking",
  "Other",
]);

export type PaymentType = z.infer<typeof PaymentTypeSchema>;

// ── Full Payment (as stored in DB / returned from API) ───────────────────────

export const PaymentSchema = z.object({
  _id: z.string(),
  invoiceSerial: z.string().min(1, "Invoice serial is required"),
  supplier: z.string().min(1, "Supplier is required"),
  paymentDate: z.coerce.date(),
  amount: z.number().positive("Payment amount must be greater than 0"),
  paymentType: PaymentTypeSchema,
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
  isDeleted: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Payment = z.infer<typeof PaymentSchema>;

// ── Create Payment ───────────────────────────────────────────────────────────

export const CreatePaymentSchema = z.object({
  invoiceSerial: z.string().min(1, "Invoice serial is required"),
  supplier: z.string().min(1, "Supplier is required"),
  paymentDate: z.coerce.date(),
  amount: z.number().positive("Payment amount must be greater than 0"),
  paymentType: PaymentTypeSchema,
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

// ── Update Payment ───────────────────────────────────────────────────────────
// invoiceSerial and supplier are intentionally excluded — they identify the
// parent order and must not change after creation.

export const UpdatePaymentSchema = CreatePaymentSchema.omit({
  invoiceSerial: true,
  supplier: true,
}).partial();

export type UpdatePaymentInput = z.infer<typeof UpdatePaymentSchema>;
