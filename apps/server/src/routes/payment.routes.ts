import { Router } from "express";
import { validate } from "../middlewares/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { CreatePaymentSchema, UpdatePaymentSchema } from "@tracksheet/shared";
import {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
} from "../controllers/payment.controller";

const router = Router();

router.get(   "/",    asyncHandler(getPayments));   // supports ?invoiceSerial= filter
router.get(   "/:id", asyncHandler(getPayment));
router.post(  "/",    validate("body", CreatePaymentSchema), asyncHandler(createPayment));
router.patch( "/:id", validate("body", UpdatePaymentSchema), asyncHandler(updatePayment));
router.delete("/:id", asyncHandler(deletePayment));

export default router;
