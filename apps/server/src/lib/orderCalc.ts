import type { OrderStatus } from "@tracksheet/shared";

interface Packs {
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p6: number;
}

export function calcTotalUnits(packs: Packs): number {
  return packs.p1 * 1 + packs.p2 * 2 + packs.p3 * 3 + packs.p4 * 4 + packs.p6 * 6;
}

export function calcOrderFields(params: {
  packs: Packs;
  unitPrice: number;
  shippingCost: number;
  previousDue: number;
  totalPaid: number;
}): {
  productTotal: number;
  grandTotal: number;
  balanceDue: number;
  status: OrderStatus;
} {
  const productTotal = calcTotalUnits(params.packs) * params.unitPrice;
  const grandTotal = productTotal + params.shippingCost + params.previousDue;
  const balanceDue = Math.max(grandTotal - params.totalPaid, 0);
  const status: OrderStatus =
    balanceDue === 0 ? "PAID" : params.totalPaid > 0 ? "PARTIAL" : "DUE";
  return { productTotal, grandTotal, balanceDue, status };
}
