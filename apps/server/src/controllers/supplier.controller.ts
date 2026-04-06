import type { Request, Response, NextFunction } from "express";
import { SupplierModel } from "../models/Supplier";
import { OrderModel } from "../models/Order";
import { AppError } from "../middlewares/errorHandler";
import type { CreateSupplierInput, UpdateSupplierInput } from "@tracksheet/shared";

// GET /api/v1/suppliers
export async function getSuppliers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { search } = req.query as Record<string, string | undefined>;

    const filter: Record<string, unknown> = { isDeleted: false };
    if (search) filter["name"] = { $regex: search, $options: "i" };

    const suppliers = await SupplierModel.find(filter).sort({ name: 1 }).lean();

    res.json({ success: true, data: suppliers });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/suppliers/:id
export async function getSupplier(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const supplier = await SupplierModel.findOne({
      _id: req.params["id"],
      isDeleted: false,
    }).lean();

    if (!supplier) throw new AppError(404, "Supplier not found");

    res.json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/suppliers
export async function createSupplier(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as CreateSupplierInput;

    const exists = await SupplierModel.findOne({
      name: { $regex: `^${body.name}$`, $options: "i" },
    });
    if (exists) throw new AppError(409, `Supplier '${body.name}' already exists`);

    const supplier = await SupplierModel.create(body);

    res.status(201).json({ success: true, data: supplier.toObject() });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/suppliers/:id
export async function updateSupplier(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const existing = await SupplierModel.findOne({
      _id: req.params["id"],
      isDeleted: false,
    });
    if (!existing) throw new AppError(404, "Supplier not found");

    const body = req.body as UpdateSupplierInput;

    if (body.name && body.name !== existing.name) {
      const nameConflict = await SupplierModel.findOne({
        name: { $regex: `^${body.name}$`, $options: "i" },
        _id: { $ne: req.params["id"] },
      });
      if (nameConflict) throw new AppError(409, `Supplier '${body.name}' already exists`);
    }

    const updated = await SupplierModel.findByIdAndUpdate(
      req.params["id"],
      body,
      { new: true, lean: true }
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/suppliers/:id
// Blocked if supplier has existing (non-deleted) orders; soft-deleted otherwise
export async function deleteSupplier(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const supplier = await SupplierModel.findOne({
      _id: req.params["id"],
      isDeleted: false,
    });
    if (!supplier) throw new AppError(404, "Supplier not found");

    const orderCount = await OrderModel.countDocuments({
      supplier: supplier.name,
      isDeleted: false,
    });
    if (orderCount > 0) {
      throw new AppError(
        409,
        `Cannot delete supplier with ${orderCount} existing order(s). Remove orders first.`
      );
    }

    await SupplierModel.findByIdAndUpdate(req.params["id"], { isDeleted: true });

    res.json({ success: true, data: { message: "Supplier deleted" } });
  } catch (err) {
    next(err);
  }
}
