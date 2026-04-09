import type { Request, Response, NextFunction } from "express";
import { BrandModel } from "../models/Brand";
import { OrderModel } from "../models/Order";
import { AppError } from "../middlewares/errorHandler";
import type { CreateBrandInput, UpdateBrandInput } from "@tracksheet/shared";

export async function getBrands(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { search } = req.query as Record<string, string | undefined>;

    const filter: Record<string, unknown> = { isDeleted: false };
    if (search) filter["name"] = { $regex: search, $options: "i" };

    const brands = await BrandModel.find(filter).sort({ name: 1 }).lean();
    res.json({ success: true, data: brands });
  } catch (err) {
    next(err);
  }
}

export async function getBrand(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const brand = await BrandModel.findOne({ _id: req.params["id"], isDeleted: false }).lean();
    if (!brand) throw new AppError(404, "Brand not found");

    res.json({ success: true, data: brand });
  } catch (err) {
    next(err);
  }
}

export async function createBrand(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as CreateBrandInput;

    const exists = await BrandModel.findOne({
      name: { $regex: `^${body.name}$`, $options: "i" },
    });
    if (exists) throw new AppError(409, `Brand '${body.name}' already exists`);

    const brand = await BrandModel.create(body);
    res.status(201).json({ success: true, data: brand.toObject() });
  } catch (err) {
    next(err);
  }
}

export async function updateBrand(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const existing = await BrandModel.findOne({ _id: req.params["id"], isDeleted: false });
    if (!existing) throw new AppError(404, "Brand not found");

    const body = req.body as UpdateBrandInput;

    if (body.name && body.name !== existing.name) {
      const conflict = await BrandModel.findOne({
        name: { $regex: `^${body.name}$`, $options: "i" },
        _id: { $ne: req.params["id"] },
      });
      if (conflict) throw new AppError(409, `Brand '${body.name}' already exists`);
    }

    const updated = await BrandModel.findByIdAndUpdate(req.params["id"], body, { new: true, lean: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteBrand(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const brand = await BrandModel.findOne({ _id: req.params["id"], isDeleted: false });
    if (!brand) throw new AppError(404, "Brand not found");

    const orderCount = await OrderModel.countDocuments({
      brand: brand.name,
      isDeleted: false,
    });
    if (orderCount > 0) {
      throw new AppError(
        409,
        `Cannot delete brand with ${orderCount} existing order(s). Remove orders first.`
      );
    }

    await BrandModel.findByIdAndUpdate(req.params["id"], { isDeleted: true });
    res.json({ success: true, data: { message: "Brand deleted" } });
  } catch (err) {
    next(err);
  }
}
