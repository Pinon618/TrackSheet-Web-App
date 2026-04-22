import mongoose, { type Schema as SchemaType } from "mongoose";
import type { PaymentType } from "@tracksheet/shared";

export interface IBulkPayment {
  supplier: string;
  paymentDate: Date;
  amount: number;
  paymentType: PaymentType;
  referenceNo?: string;
  notes?: string;
  totalApplied: number;
  creditApplied: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bulkPaymentSchema: SchemaType<IBulkPayment> = new mongoose.Schema(
  {
    supplier:      { type: String, required: true, trim: true },
    paymentDate:   { type: Date,   required: true },
    amount:        { type: Number, required: true, min: 0.01 },
    paymentType:   {
      type: String,
      enum: ["Bank Transfer", "Cash", "Mobile Banking", "Other"],
      required: true,
    },
    referenceNo:   { type: String },
    notes:         { type: String },
    totalApplied:  { type: Number, required: true, min: 0, default: 0 },
    creditApplied: { type: Number, required: true, min: 0, default: 0 },
    isDeleted:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

bulkPaymentSchema.index({ supplier: 1 });
bulkPaymentSchema.index({ paymentDate: -1 });
bulkPaymentSchema.index({ isDeleted: 1 });

export const BulkPaymentModel = mongoose.model<IBulkPayment>("BulkPayment", bulkPaymentSchema);
