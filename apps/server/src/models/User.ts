import mongoose, { type Schema as SchemaType } from "mongoose";
import type { UserRole } from "@tracksheet/shared";

export interface IUser {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema: SchemaType<IUser> = new mongoose.Schema(
  {
    uid:         { type: String, required: true, unique: true },
    email:       { type: String, required: true, unique: true },
    displayName: { type: String },
    role:        { type: String, enum: ["admin", "viewer"], default: "viewer" },
  },
  { timestamps: true }
);

// uid and email already indexed via unique:true above

export const UserModel = mongoose.model<IUser>("User", userSchema);
