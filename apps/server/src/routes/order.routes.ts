import { Router } from "express";
import { validate } from "../middlewares/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { CreateOrderSchema, UpdateOrderSchema } from "@tracksheet/shared";
import {
  getOrders,
  getOrder,
  syncAllOrders,
  createOrder,
  updateOrder,
  deleteOrder,
} from "../controllers/order.controller";

const router = Router();

router.get(   "/",         asyncHandler(getOrders));
router.get(   "/sync-all", asyncHandler(syncAllOrders));
router.get(   "/:id",      asyncHandler(getOrder));
router.post(  "/",    validate("body", CreateOrderSchema), asyncHandler(createOrder));
router.patch( "/:id", validate("body", UpdateOrderSchema), asyncHandler(updateOrder));
router.delete("/:id", asyncHandler(deleteOrder));

export default router;
