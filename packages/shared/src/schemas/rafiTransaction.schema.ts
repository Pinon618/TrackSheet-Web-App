import { z } from "zod";

export const RafiTransactionTypeSchema = z.enum(["Received", "Sent", "Conversion"]);
export type RafiTransactionType = z.infer<typeof RafiTransactionTypeSchema>;

export const RafiExchangerSchema = z.enum(["Binance", "Bitget", "Bybit", "Other"]);
export type RafiExchanger = z.infer<typeof RafiExchangerSchema>;

export const RafiTransactionSchema = z.object({
  _id: z.string(),
  date: z.coerce.date(),
  type: RafiTransactionTypeSchema,
  usdAmount: z.number().default(0),
  rate: z.number().default(0),
  bdtAmount: z.number().default(0),
  person: z.string().optional(),
  exchanger: RafiExchangerSchema.optional(),
  notes: z.string().optional(),
  isDeleted: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type RafiTransaction = z.infer<typeof RafiTransactionSchema>;

export const CreateRafiTransactionSchema = z.object({
  date: z.coerce.date(),
  type: RafiTransactionTypeSchema,
  usdAmount: z.number().nonnegative().default(0),
  rate: z.number().nonnegative().default(0),
  bdtAmount: z.number().nonnegative().default(0),
  person: z.string().optional(),
  exchanger: RafiExchangerSchema.optional(),
  notes: z.string().optional(),
});

export type CreateRafiTransactionInput = z.infer<typeof CreateRafiTransactionSchema>;

export const UpdateRafiTransactionSchema = CreateRafiTransactionSchema.partial();
export type UpdateRafiTransactionInput = z.infer<typeof UpdateRafiTransactionSchema>;
