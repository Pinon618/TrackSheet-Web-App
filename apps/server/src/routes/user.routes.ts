import { Router } from "express";
import { validate } from "../middlewares/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { CreateUserSchema, UpdateUserSchema } from "@tracksheet/shared";
import {
  getUsers,
  getUser,
  getUserByUid,
  createUser,
  updateUser,
} from "../controllers/user.controller";

const router = Router();

router.get(  "/",        asyncHandler(getUsers));
router.get(  "/uid/:uid", asyncHandler(getUserByUid));  // must be before /:id to avoid conflict
router.get(  "/:id",     asyncHandler(getUser));
router.post( "/",        validate("body", CreateUserSchema), asyncHandler(createUser));
router.patch("/:id",     validate("body", UpdateUserSchema), asyncHandler(updateUser));

export default router;
