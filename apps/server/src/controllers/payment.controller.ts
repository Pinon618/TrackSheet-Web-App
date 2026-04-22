import type { Request, Response, NextFunction } from "express";
import { PaymentModel } from "../models/Payment";
import { BulkPaymentModel } from "../models/BulkPayment";
import { OrderModel } from "../models/Order";
import { SupplierModel } from "../models/Supplier";
import { calcOrderFields } from "../lib/orderCalc";
import { syncOrderTotals } from "../lib/syncOrderTotals";
import { AppError } from "../middlewares/errorHandler";
import type { CreatePaymentInput, UpdatePaymentInput, SupplierBulkPaymentInput } from "@tracksheet/shared";

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

// POST /api/v1/payments/supplier-bulk
// Distribute a lump-sum payment across a supplier's unpaid orders (oldest first).
export async function supplierBulkPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as SupplierBulkPaymentInput;

    const supplier = await SupplierModel.findOne({
      name: body.supplier,
      isDeleted: false,
    });
    if (!supplier) {
      throw new AppError(404, `Supplier '${body.supplier}' not found`);
    }

    // Create the parent transaction record up front so children can link to it.
    const bulk = await BulkPaymentModel.create({
      supplier:      body.supplier,
      paymentDate:   body.paymentDate,
      amount:        body.amount,
      paymentType:   body.paymentType,
      referenceNo:   body.referenceNo,
      notes:         body.notes,
      totalApplied:  0,
      creditApplied: 0,
    });

    // Fetch all unpaid/partial orders for this supplier, oldest first
    const orders = await OrderModel.find({
      supplier: body.supplier,
      isDeleted: false,
      status: { $in: ["DUE", "PARTIAL"] },
    }).sort({ orderDate: 1, createdAt: 1 });

    let remaining = body.amount;
    const createdPayments: unknown[] = [];

    for (const order of orders) {
      if (remaining <= 0) break;

      // Only apply to remaining debt
      const due = Math.max(order.balanceDue, 0);
      const apply = Math.min(remaining, due);
      if (apply <= 0) continue;

      const payment = await PaymentModel.create({
        invoiceSerial: order.invoiceSerial,
        supplier:      body.supplier,
        paymentDate:   body.paymentDate,
        amount:        apply,
        paymentType:   body.paymentType,
        referenceNo:   body.referenceNo,
        notes:         body.notes,
        bulkPaymentId: bulk._id,
      });

      createdPayments.push(payment.toObject());
      await syncOrderTotals(order.invoiceSerial);
      remaining -= apply;
    }

    const totalApplied = body.amount - remaining;
    await BulkPaymentModel.findByIdAndUpdate(bulk._id, {
      totalApplied,
      creditApplied: remaining,
    });

    const finalBulk = await BulkPaymentModel.findById(bulk._id).lean();

    res.status(201).json({
      success: true,
      data: {
        bulkPayment: finalBulk,
        payments: createdPayments,
        totalApplied,
        surplus: remaining,
      },
    });
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

// GET /api/v1/payments/bulk
export async function getBulkPayments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { supplier, page = "1", limit = "50" } = req.query as Record<string, string | undefined>;

    const filter: Record<string, unknown> = { isDeleted: false };
    if (supplier) filter["supplier"] = supplier;

    const pageNum  = Math.max(1, parseInt(page  ?? "1"));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit ?? "50")));
    const skip     = (pageNum - 1) * limitNum;

    const [bulkPayments, total] = await Promise.all([
      BulkPaymentModel.find(filter).sort({ paymentDate: -1, createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      BulkPaymentModel.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { bulkPayments, total, page: pageNum, limit: limitNum },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/payments/bulk/:id  (returns bulk + its allocations)
export async function getBulkPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bulk = await BulkPaymentModel.findOne({
      _id: req.params["id"],
      isDeleted: false,
    }).lean();
    if (!bulk) throw new AppError(404, "Bulk payment not found");

    const allocations = await PaymentModel.find({
      bulkPaymentId: req.params["id"],
      isDeleted: false,
    }).sort({ createdAt: 1 }).lean();

    res.json({ success: true, data: { bulkPayment: bulk, allocations } });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/payments/bulk/:id
// Cascade: reverses all child allocations (re-syncs affected orders) and
// backs the credit out of the supplier. Supplier credit is clamped at 0 if
// the credit has since been consumed by new orders.
export async function deleteBulkPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bulk = await BulkPaymentModel.findOne({
      _id: req.params["id"],
      isDeleted: false,
    });
    if (!bulk) throw new AppError(404, "Bulk payment not found");

    const children = await PaymentModel.find({
      bulkPaymentId: bulk._id,
      isDeleted: false,
    });

    // Mark children deleted first
    await PaymentModel.updateMany(
      { bulkPaymentId: bulk._id, isDeleted: false },
      { isDeleted: true }
    );

    // Re-sync every affected order
    const invoices = [...new Set(children.map((c) => c.invoiceSerial))];
    for (const invoiceSerial of invoices) {
      await syncOrderTotals(invoiceSerial);
    }

    await BulkPaymentModel.findByIdAndUpdate(bulk._id, { isDeleted: true });

    res.json({
      success: true,
      data: {
        message: "Bulk payment deleted",
        childrenReversed: children.length,
      },
    });
  } catch (err) {
    next(err);
  }
}
