import type { Request, Response, NextFunction } from "express";
import { PaymentModel } from "../models/Payment";
import { OrderModel } from "../models/Order";
import { calcOrderFields } from "../lib/orderCalc";
import { AppError } from "../middlewares/errorHandler";
import type { CreatePaymentInput, UpdatePaymentInput } from "@tracksheet/shared";

// After any payment change, re-derive totalPaid + order calc fields
async function syncOrderTotals(invoiceSerial: string): Promise<void> {
  const order = await OrderModel.findOne({ invoiceSerial, isDeleted: false });
  if (!order) return;

  const payments = await PaymentModel.find({ invoiceSerial, isDeleted: false });
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const calc = calcOrderFields({
    packs:        order.packs,
    units:        order.units,
    unitPrice:    order.unitPrice,
    shippingCost: order.shippingCost,
    packagingCost: order.packagingCost,
    previousDue:  order.previousDue,
    totalPaid,
  });

  await OrderModel.findByIdAndUpdate(order._id, { totalPaid, ...calc });
}

// GET /api/v1/payments
export async function getPayments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { invoiceSerial, page = "1", limit = "50" } = req.query as Record<string, string | undefined>;

    const filter: Record<string, unknown> = { isDeleted: false };
    if (invoiceSerial) filter["invoiceSerial"] = invoiceSerial;

    const pageNum  = Math.max(1, parseInt(page  ?? "1"));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit ?? "50")));
    const skip     = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
      PaymentModel.find(filter).sort({ paymentDate: -1 }).skip(skip).limit(limitNum).lean(),
      PaymentModel.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { payments, total, page: pageNum, limit: limitNum },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/payments/:id
export async function getPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payment = await PaymentModel.findOne({
      _id: req.params["id"],
      isDeleted: false,
    }).lean();

    if (!payment) throw new AppError(404, "Payment not found");

    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/payments
export async function createPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as CreatePaymentInput;

    const orderExists = await OrderModel.findOne({
      invoiceSerial: body.invoiceSerial,
      isDeleted: false,
    });
    if (!orderExists) {
      throw new AppError(404, `Order with invoice serial '${body.invoiceSerial}' not found`);
    }

    const payment = await PaymentModel.create(body);
    await syncOrderTotals(body.invoiceSerial);

    res.status(201).json({ success: true, data: payment.toObject() });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/payments/:id
export async function updatePayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const existing = await PaymentModel.findOne({
      _id: req.params["id"],
      isDeleted: false,
    });
    if (!existing) throw new AppError(404, "Payment not found");

    const body = req.body as UpdatePaymentInput;

    const updated = await PaymentModel.findByIdAndUpdate(
      req.params["id"],
      body,
      { new: true, lean: true }
    );

    await syncOrderTotals(existing.invoiceSerial);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/payments/:id  (soft delete — recalculates parent order)
export async function deletePayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payment = await PaymentModel.findOne({
      _id: req.params["id"],
      isDeleted: false,
    });
    if (!payment) throw new AppError(404, "Payment not found");

    await PaymentModel.findByIdAndUpdate(req.params["id"], { isDeleted: true });
    await syncOrderTotals(payment.invoiceSerial);

    res.json({ success: true, data: { message: "Payment deleted" } });
  } catch (err) {
    next(err);
  }
}
