import mongoose, { type Schema as SchemaType } from "mongoose";
import type { OrderStatus } from "@tracksheet/shared";

export interface IOrder {
  invoiceSerial: string;
  orderDate: Date;
  supplier: string;
  brand: string;
  packs: { p1: number; p2: number; p3: number; p4: number; p5: number; p6: number };
  units: { p1: number; p2: number; p3: number; p4: number; p5: number; p6: number };
  totalBoxes: number;
  unitPrice: number;
  shippingCost: number;
  packagingCost: number;
  previousDue: number;
  productTotal: number;
  grandTotal: number;
  totalPaid: number;
  balanceDue: number;
  status: OrderStatus;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const packsSchema = new mongoose.Schema(
  {
    p1: { type: Number, default: 0, min: 0 },
    p2: { type: Number, default: 0, min: 0 },
    p3: { type: Number, default: 0, min: 0 },
    p4: { type: Number, default: 0, min: 0 },
    p5: { type: Number, default: 0, min: 0 },
    p6: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const orderSchema: SchemaType<IOrder> = new mongoose.Schema(
  {
    invoiceSerial: { type: String, required: true, unique: true, trim: true },
    orderDate:     { type: Date,   required: true },
    supplier:      { type: String, required: true, trim: true },
    brand:         { type: String, required: true, trim: true },
    packs:         { type: packsSchema, default: () => ({}) },
    units:         { type: packsSchema, default: () => ({}) },
    totalBoxes:    { type: Number, default: 0, min: 0 },
    unitPrice:     { type: Number, required: true, min: 0 },
    shippingCost:  { type: Number, default: 0, min: 0 },
    packagingCost: { type: Number, default: 0, min: 0 },
    previousDue:   { type: Number, default: 0, min: 0 },
    productTotal:  { type: Number, default: 0, min: 0 },
    grandTotal:    { type: Number, default: 0, min: 0 },
    totalPaid:     { type: Number, default: 0, min: 0 },
    balanceDue:    { type: Number, default: 0, min: 0 },
    status:        { type: String, enum: ["PAID", "PARTIAL", "DUE"], default: "DUE" },
    notes:         { type: String },
    isDeleted:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes per PRD non-functional requirements
orderSchema.index({ supplier: 1 });
orderSchema.index({ brand: 1 });
orderSchema.index({ orderDate: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ isDeleted: 1 });

export const OrderModel = mongoose.model<IOrder>("Order", orderSchema);
