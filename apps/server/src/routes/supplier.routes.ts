import { Router } from "express";
import { validate } from "../middlewares/validate";
import { CreateSupplierSchema, UpdateSupplierSchema } from "@tracksheet/shared";
import {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplier.controller";

const router = Router();

router.get(   "/",    getSuppliers);   // supports ?search= filter
router.get(   "/:id", getSupplier);
router.post(  "/",    validate("body", CreateSupplierSchema), createSupplier);
router.patch( "/:id", validate("body", UpdateSupplierSchema), updateSupplier);
router.delete("/:id", deleteSupplier);

export default router;
