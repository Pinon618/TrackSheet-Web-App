import { z } from "zod";

// ── Full Supplier (as stored in DB / returned from API) ──────────────────────

export const SupplierSchema = z.object({
  _id: z.string(),
  name: z.string().min(1, "Supplier name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  countryRegion: z.string().optional(),
  notes: z.string().optional(),
  isDeleted: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Supplier = z.infer<typeof SupplierSchema>;

// ── Create Supplier ──────────────────────────────────────────────────────────

export const CreateSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  countryRegion: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;

// ── Update Supplier ──────────────────────────────────────────────────────────

export const UpdateSupplierSchema = CreateSupplierSchema.partial();

export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;
