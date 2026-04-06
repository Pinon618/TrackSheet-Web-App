import { Router } from "express";
import { validate } from "../middlewares/validate";
import { CreateUserSchema, UpdateUserSchema } from "@tracksheet/shared";
import {
  getUsers,
  getUser,
  getUserByUid,
  createUser,
  updateUser,
} from "../controllers/user.controller";

const router = Router();

router.get(  "/",        getUsers);
router.get(  "/uid/:uid", getUserByUid);  // must be before /:id to avoid conflict
router.get(  "/:id",     getUser);
router.post( "/",        validate("body", CreateUserSchema), createUser);
router.patch("/:id",     validate("body", UpdateUserSchema), updateUser);

export default router;
