import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";

type RequestPart = "body" | "query" | "params";

/**
 * Zod validation middleware.
 *
 * Usage:
 *   router.post("/orders", validate("body", CreateOrderSchema), handler)
 *   router.get("/orders/:id", validate("params", z.object({ id: z.string() })), handler)
 */
export function validate(part: RequestPart, schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Replace with coerced/parsed data (e.g. string → Date conversions)
    req[part] = result.data as never;
    next();
  };
}
