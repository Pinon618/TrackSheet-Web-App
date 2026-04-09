import { Router } from "express";
import { validate } from "../middlewares/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { CreateBrandSchema, UpdateBrandSchema } from "@tracksheet/shared";
import {
  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../controllers/brand.controller";

const router = Router();

router.get("/", asyncHandler(getBrands));
router.get("/:id", asyncHandler(getBrand));
router.post("/", validate("body", CreateBrandSchema), asyncHandler(createBrand));
router.patch("/:id", validate("body", UpdateBrandSchema), asyncHandler(updateBrand));
router.delete("/:id", asyncHandler(deleteBrand));

export default router;
