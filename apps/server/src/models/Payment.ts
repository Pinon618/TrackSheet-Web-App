import mongoose, { type Schema as SchemaType } from "mongoose";
import type { PaymentType } from "@tracksheet/shared";

export interface IPayment {
  invoiceSerial: string;
  supplier: string;
  paymentDate: Date;
  amount: number;
  paymentType: PaymentType;
  referenceNo?: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema: SchemaType<IPayment> = new mongoose.Schema(
  {
    invoiceSerial: { type: String, required: true },
    supplier:      { type: String, required: true },
    paymentDate:   { type: Date,   required: true },
    amount:        { type: Number, required: true, min: 0.01 },
    paymentType:   {
      type: String,
      enum: ["Bank Transfer", "Cash", "Mobile Banking", "Other"],
      required: true,
    },
    referenceNo:   { type: String },
    notes:         { type: String },
    isDeleted:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

paymentSchema.index({ invoiceSerial: 1 });
paymentSchema.index({ isDeleted: 1 });
paymentSchema.index({ paymentDate: -1 });

export const PaymentModel = mongoose.model<IPayment>("Payment", paymentSchema);
