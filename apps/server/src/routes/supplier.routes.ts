import { Router } from "express";
import { validate } from "../middlewares/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { CreateSupplierSchema, UpdateSupplierSchema } from "@tracksheet/shared";
import {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplier.controller";

const router = Router();

router.get(   "/",    asyncHandler(getSuppliers));   // supports ?search= filter
router.get(   "/:id", asyncHandler(getSupplier));
router.post(  "/",    validate("body", CreateSupplierSchema), asyncHandler(createSupplier));
router.patch( "/:id", validate("body", UpdateSupplierSchema), asyncHandler(updateSupplier));
router.delete("/:id", asyncHandler(deleteSupplier));

export default router;
