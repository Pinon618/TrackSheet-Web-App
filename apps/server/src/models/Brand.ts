import mongoose, { type Schema as SchemaType } from "mongoose";

export interface IBrand {
  name: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const brandSchema: SchemaType<IBrand> = new mongoose.Schema(
  {
    name:      { type: String, required: true, unique: true, trim: true },
    notes:     { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

brandSchema.index({ isDeleted: 1 });

export const BrandModel = mongoose.model<IBrand>("Brand", brandSchema);
