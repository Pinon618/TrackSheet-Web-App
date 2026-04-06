import { z } from "zod";

// ── Role ─────────────────────────────────────────────────────────────────────

export const UserRoleSchema = z.enum(["admin", "viewer"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

// ── Full User (as stored in MongoDB, linked to Firebase UID) ─────────────────

export const UserSchema = z.object({
  _id: z.string(),
  uid: z.string().min(1, "Firebase UID is required"),   // Firebase Auth UID
  email: z.string().email("Invalid email address"),
  displayName: z.string().optional(),
  role: UserRoleSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;

// ── Create User ───────────────────────────────────────────────────────────────
// Called server-side on first login to provision the MongoDB user document.

export const CreateUserSchema = z.object({
  uid: z.string().min(1, "Firebase UID is required"),
  email: z.string().email("Invalid email address"),
  displayName: z.string().optional(),
  role: UserRoleSchema.default("viewer"),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

// ── Update User ───────────────────────────────────────────────────────────────
// uid and email are excluded — they are identity fields and must not change.

export const UpdateUserSchema = z.object({
  displayName: z.string().optional(),
  role: UserRoleSchema.optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
