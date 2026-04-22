import { Router } from "express";
import { validate } from "../middlewares/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { CreateRafiTransactionSchema, UpdateRafiTransactionSchema } from "@tracksheet/shared";
import {
  getRafiTransactions,
  createRafiTransaction,
  updateRafiTransaction,
  deleteRafiTransaction
} from "../controllers/rafiTransaction.controller";

const router = Router();

router.get("/", asyncHandler(getRafiTransactions));
router.post("/", validate("body", CreateRafiTransactionSchema), asyncHandler(createRafiTransaction));
router.patch("/:id", validate("body", UpdateRafiTransactionSchema), asyncHandler(updateRafiTransaction));
router.delete("/:id", asyncHandler(deleteRafiTransaction));

export default router;
