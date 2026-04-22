import type { Request, Response, NextFunction } from "express";
import { RafiTransactionModel } from "../models/RafiTransaction";
import { AppError } from "../middlewares/errorHandler";
import type { CreateRafiTransactionInput, UpdateRafiTransactionInput } from "@tracksheet/shared";

// GET /api/v1/rafi-transactions
export async function getRafiTransactions(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filter = { isDeleted: false };
    
    const [transactions, stats] = await Promise.all([
      RafiTransactionModel.find(filter).sort({ date: -1, createdAt: -1 }).lean(),
      RafiTransactionModel.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalUsdReceived: {
              $sum: { $cond: [{ $eq: ["$type", "Received"] }, "$usdAmount", 0] }
            },
            totalUsdConversion: {
              $sum: { $cond: [{ $eq: ["$type", "Conversion"] }, "$usdAmount", 0] }
            },
            totalBdtConversion: {
              $sum: { $cond: [{ $eq: ["$type", "Conversion"] }, "$bdtAmount", 0] }
            },
            totalBdtSent: {
              $sum: { $cond: [{ $eq: ["$type", "Sent"] }, "$bdtAmount", 0] }
            },
            totalUsdSent: {
              $sum: { $cond: [{ $eq: ["$type", "Sent"] }, "$usdAmount", 0] }
            }
          }
        }
      ])
    ]);

    const summary = stats[0] || {
      totalUsdReceived: 0,
      totalUsdConversion: 0,
      totalBdtConversion: 0,
      totalBdtSent: 0,
      totalUsdSent: 0
    };

    // Calculations based on user logic:
    // Remaining USD = Total Received USD - Total Conversion USD - Total Sent USD
    const remainingUsd = summary.totalUsdReceived - summary.totalUsdConversion - summary.totalUsdSent;
    // Remaining Bank BDT = Total BDT Conversion - Total BDT Sent
    const remainingBdt = summary.totalBdtConversion - summary.totalBdtSent;

    res.json({
      success: true,
      data: {
        transactions,
        summary: {
          ...summary,
          remainingUsd,
          remainingBdt
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/rafi-transactions
export async function createRafiTransaction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as CreateRafiTransactionInput;
    const transaction = await RafiTransactionModel.create(body);
    res.status(201).json({ success: true, data: transaction.toObject() });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/rafi-transactions/:id
export async function updateRafiTransaction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body as UpdateRafiTransactionInput;
    
    const updated = await RafiTransactionModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      body,
      { new: true, lean: true }
    );
    
    if (!updated) throw new AppError(404, "Transaction not found");
    
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/rafi-transactions/:id
export async function deleteRafiTransaction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await RafiTransactionModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );
    
    if (!deleted) throw new AppError(404, "Transaction not found");
    
    res.json({ success: true, data: { message: "Transaction deleted" } });
  } catch (err) {
    next(err);
  }
}
