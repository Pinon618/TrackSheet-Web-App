import mongoose, { type Schema as SchemaType } from "mongoose";
import type { RafiTransactionType, RafiExchanger } from "@tracksheet/shared";

export interface IRafiTransaction {
  date: Date;
  type: RafiTransactionType;
  usdAmount: number;
  rate: number;
  bdtAmount: number;
  person?: string;
  exchanger?: RafiExchanger;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const rafiTransactionSchema: SchemaType<IRafiTransaction> = new mongoose.Schema(
  {
    date:       { type: Date, required: true },
    type:       { type: String, enum: ["Received", "Sent", "Conversion"], required: true },
    usdAmount:  { type: Number, default: 0 },
    rate:       { type: Number, default: 0 },
    bdtAmount:  { type: Number, default: 0 },
    person:     { type: String },
    exchanger:  { type: String, enum: ["Binance", "Bitget", "Bybit", "Other"] },
    notes:      { type: String },
    isDeleted:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

rafiTransactionSchema.index({ date: -1 });
rafiTransactionSchema.index({ type: 1 });
rafiTransactionSchema.index({ isDeleted: 1 });

export const RafiTransactionModel = mongoose.model<IRafiTransaction>("RafiTransaction", rafiTransactionSchema);
