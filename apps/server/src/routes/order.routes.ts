import { Router } from "express";
import { validate } from "../middlewares/validate";
import { CreateOrderSchema, UpdateOrderSchema } from "@tracksheet/shared";
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
} from "../controllers/order.controller";

const router = Router();

router.get(   "/",    getOrders);
router.get(   "/:id", getOrder);
router.post(  "/",    validate("body", CreateOrderSchema), createOrder);
router.patch( "/:id", validate("body", UpdateOrderSchema), updateOrder);
router.delete("/:id", deleteOrder);

export default router;
