import type { OrderStatus } from "@tracksheet/shared";

interface Packs {
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  p5?: number;
  p6?: number;
}

export function calcTotalUnits(packs: Packs): number {
  const p5 = packs.p5 ?? 0;
  return (packs.p1 ?? 0) * 1 + (packs.p2 ?? 0) * 2 + (packs.p3 ?? 0) * 3 + (packs.p4 ?? 0) * 4 + p5 * 5 + (packs.p6 ?? 0) * 6;
}

export function calcManualUnits(units: Packs): number {
  return (
    (units.p1 ?? 0) * 1 +
    (units.p2 ?? 0) * 2 +
    (units.p3 ?? 0) * 3 +
    (units.p4 ?? 0) * 4 +
    (units.p5 ?? 0) * 5 +
    (units.p6 ?? 0) * 6
  );
}

export function calcPackBoxes(packs: Packs): number {
  const p5 = packs.p5 ?? 0;
  return (packs.p1 ?? 0) + (packs.p2 ?? 0) + (packs.p3 ?? 0) + (packs.p4 ?? 0) + p5 + (packs.p6 ?? 0);
}

export function calcOrderFields(params: {
  packs: Packs;
  units?: Packs;
  unitPrice: number;
  shippingCost: number;
  packagingCost?: number;
  previousDue: number;
  totalPaid: number;
}): {
  totalBoxes: number;
  productTotal: number;
  grandTotal: number;
  balanceDue: number;
  status: OrderStatus;
} {
  const totalBoxes = calcPackBoxes(params.packs);
  const totalUnits = params.units ? calcManualUnits(params.units) : calcTotalUnits(params.packs);
  const productTotal = totalUnits * params.unitPrice;
  const grandTotal = productTotal + (params.shippingCost ?? 0) + (params.packagingCost ?? 0) + (params.previousDue ?? 0);
  const balanceDue = grandTotal - params.totalPaid;
  const status: OrderStatus =
    balanceDue <= 0 ? "PAID" : params.totalPaid > 0 ? "PARTIAL" : "DUE";
  return { totalBoxes, productTotal, grandTotal, balanceDue, status };
}
