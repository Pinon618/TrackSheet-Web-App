import type { Request, Response, NextFunction } from "express";
import { UserModel } from "../models/User";
import { AppError } from "../middlewares/errorHandler";
import type { CreateUserInput, UpdateUserInput } from "@tracksheet/shared";

// GET /api/v1/users
export async function getUsers(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const users = await UserModel.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/users/:id
export async function getUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await UserModel.findById(req.params["id"]).lean();
    if (!user) throw new AppError(404, "User not found");
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/users/uid/:uid  (look up by Firebase UID)
export async function getUserByUid(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await UserModel.findOne({ uid: req.params["uid"] }).lean();
    if (!user) throw new AppError(404, "User not found");
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/users  (upsert — called server-side on first Firebase login)
export async function createUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as CreateUserInput;

    const user = await UserModel.findOneAndUpdate(
      { uid: body.uid },
      { $setOnInsert: body },
      { upsert: true, new: true, lean: true }
    );

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/users/:id
export async function updateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const existing = await UserModel.findById(req.params["id"]);
    if (!existing) throw new AppError(404, "User not found");

    const body = req.body as UpdateUserInput;

    const updated = await UserModel.findByIdAndUpdate(
      req.params["id"],
      body,
      { new: true, lean: true }
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
