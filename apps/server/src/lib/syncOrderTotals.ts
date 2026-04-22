import { OrderModel } from "../models/Order";
import { PaymentModel } from "../models/Payment";
import { calcOrderFields } from "./orderCalc";

/**
 * Re-derive totalPaid + order calc fields for a specific order.
 * This is the canonical way to keep Order.totalPaid and balanceDue in sync
 * with the actual Payment records.
 */
export async function syncOrderTotals(invoiceSerial: string): Promise<void> {
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
