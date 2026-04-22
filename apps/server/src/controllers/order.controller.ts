import type { Request, Response, NextFunction } from "express";

import { OrderModel } from "../models/Order";
import { PaymentModel } from "../models/Payment";
import { calcOrderFields } from "../lib/orderCalc";
import { syncOrderTotals } from "../lib/syncOrderTotals";
import { AppError } from "../middlewares/errorHandler";
import type { CreateOrderInput, UpdateOrderInput } from "@tracksheet/shared";

// GET /api/v1/orders/sync-all
export async function syncAllOrders(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orders = await OrderModel.find({ isDeleted: false });
    for (const order of orders) {
      await syncOrderTotals(order.invoiceSerial);
    }
    res.json({ success: true, message: `Synced ${orders.length} orders` });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/orders
// Query: supplier, status, search, from, to, page, limit
export async function getOrders(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      supplier,
      status,
      search,
      from,
      to,
      page = "1",
      limit = "50",
    } = req.query as Record<string, string | undefined>;

    const filter: Record<string, unknown> = { isDeleted: false };

    if (supplier) filter["supplier"] = supplier;
    if (status)   filter["status"]   = status;
    if (search)   filter["invoiceSerial"] = { $regex: search, $options: "i" };
    if (from ?? to) {
      filter["orderDate"] = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to   ? { $lte: new Date(to)   } : {}),
      };
    }

    const pageNum  = Math.max(1, parseInt(page  ?? "1"));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit ?? "50")));
    const skip     = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      OrderModel.find(filter).sort({ orderDate: -1 }).skip(skip).limit(limitNum).lean(),
      OrderModel.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { orders, total, page: pageNum, limit: limitNum },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/orders/:id
export async function getOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const order = await OrderModel.findOne({
      _id: req.params["id"],
      isDeleted: false,
    }).lean();

    if (!order) throw new AppError(404, "Order not found");

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/orders
export async function createOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as CreateOrderInput;

    const exists = await OrderModel.findOne({ invoiceSerial: body.invoiceSerial });
    if (exists) {
      throw new AppError(409, `Invoice serial '${body.invoiceSerial}' already exists`);
    }

    const calc = calcOrderFields({ ...body, totalPaid: 0 });

    const order = await OrderModel.create({ ...body, totalPaid: 0, ...calc });

    res.status(201).json({ success: true, data: order.toObject() });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/orders/:id
export async function updateOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const existing = await OrderModel.findOne({
      _id: req.params["id"],
      isDeleted: false,
    });
    if (!existing) throw new AppError(404, "Order not found");

    const body = req.body as UpdateOrderInput;

    const calc = calcOrderFields({
      packs:        body.packs        ?? existing.packs,
      units:        body.units        ?? existing.units,
      unitPrice:    body.unitPrice    ?? existing.unitPrice,
      shippingCost: body.shippingCost ?? existing.shippingCost,
      packagingCost: body.packagingCost ?? existing.packagingCost,
      previousDue:  body.previousDue  ?? existing.previousDue,
      totalPaid:    existing.totalPaid, // totalPaid is managed by payments only
    });

    const updated = await OrderModel.findByIdAndUpdate(
      req.params["id"],
      { ...body, ...calc },
      { new: true, lean: true }
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/orders/:id  (soft delete — cascades to payments)
export async function deleteOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const order = await OrderModel.findOne({
      _id: req.params["id"],
      isDeleted: false,
    });
    if (!order) throw new AppError(404, "Order not found");

    await Promise.all([
      OrderModel.findByIdAndUpdate(req.params["id"], { isDeleted: true }),
      PaymentModel.updateMany({ invoiceSerial: order.invoiceSerial }, { isDeleted: true }),
    ]);

    res.json({ success: true, data: { message: "Order deleted" } });
  } catch (err) {
    next(err);
  }
}
