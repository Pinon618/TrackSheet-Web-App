import mongoose, { type Schema as SchemaType } from "mongoose";

export interface ISupplier {
  name: string;
  contactPerson?: string;
  phone?: string;
  countryRegion?: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema: SchemaType<ISupplier> = new mongoose.Schema(
  {
    name:          { type: String, required: true, unique: true, trim: true },
    contactPerson: { type: String },
    phone:         { type: String },
    countryRegion: { type: String },
    notes:         { type: String },
    isDeleted:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

supplierSchema.index({ isDeleted: 1 });

export const SupplierModel = mongoose.model<ISupplier>("Supplier", supplierSchema);
