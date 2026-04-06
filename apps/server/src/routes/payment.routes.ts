import { Router } from "express";
import { validate } from "../middlewares/validate";
import { CreatePaymentSchema, UpdatePaymentSchema } from "@tracksheet/shared";
import {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
} from "../controllers/payment.controller";

const router = Router();

router.get(   "/",    getPayments);   // supports ?invoiceSerial= filter
router.get(   "/:id", getPayment);
router.post(  "/",    validate("body", CreatePaymentSchema), createPayment);
router.patch( "/:id", validate("body", UpdatePaymentSchema), updatePayment);
router.delete("/:id", deletePayment);

export default router;
