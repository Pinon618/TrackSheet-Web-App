import { z } from "zod";

export const BrandSchema = z.object({
  _id: z.string(),
  name: z.string().min(1, "Brand name is required"),
  notes: z.string().optional(),
  isDeleted: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Brand = z.infer<typeof BrandSchema>;

export const CreateBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  notes: z.string().optional(),
});

export type CreateBrandInput = z.infer<typeof CreateBrandSchema>;

export const UpdateBrandSchema = CreateBrandSchema.partial();

export type UpdateBrandInput = z.infer<typeof UpdateBrandSchema>;
