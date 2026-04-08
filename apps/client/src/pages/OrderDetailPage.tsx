import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrder, deleteOrder, orderKeys } from "../api/orders";
import { getPayments, deletePayment, paymentKeys } from "../api/payments";
import styles from "./OrderDetailPage.module.css";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: orderKeys.detail(id!),
    queryFn:  () => getOrder(id!),
    enabled:  !!id,
  });

  const { data: paymentData, isLoading: loadingPayments } = useQuery({
    queryKey: paymentKeys.list({ invoiceSerial: order?.invoiceSerial }),
    queryFn:  () => getPayments({ invoiceSerial: order?.invoiceSerial }),
    enabled:  !!order?.invoiceSerial,
  });

  const deleteOrderMutation = useMutation({
    mutationFn: () => deleteOrder(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.all() });
      void navigate("/orders");
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: deletePayment,
    onSuccess:  () => {
      void qc.invalidateQueries({ queryKey: paymentKeys.all() });
      void qc.invalidateQueries({ queryKey: orderKeys.detail(id!) });
    },
  });

  if (loadingOrder) return <p className={styles.muted}>Loading…</p>;
  if (!order)       return <p className={styles.muted}>Order not found.</p>;

  const payments = paymentData?.payments ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Link to="/orders" className={styles.back}>← Orders</Link>
          <h1 className={styles.heading}>{order.invoiceSerial}</h1>
        </div>
        <div className={styles.headerActions}>
          <Link to={`/orders/${id}/edit`} className={styles.btnEdit}>Edit Order</Link>
          <button
            className={styles.btnDelete}
            onClick={() => {
              if (confirm("Delete this order and all its payments?")) {
                deleteOrderMutation.mutate();
              }
            }}
            disabled={deleteOrderMutation.isPending}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Order summary */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Order Details</h2>
        <div className={styles.grid}>
          <Field label="Supplier"      value={order.supplier} />
          <Field label="Order Date"    value={new Date(order.orderDate).toLocaleDateString()} />
          <Field label="Unit Price"    value={`৳ ${order.unitPrice.toLocaleString()}`} />
          <Field label="Shipping"      value={`৳ ${order.shippingCost.toLocaleString()}`} />
          <Field label="Previous Due"  value={`৳ ${order.previousDue.toLocaleString()}`} />
          <Field label="Product Total" value={`৳ ${order.productTotal.toLocaleString()}`} />
          <Field label="Grand Total"   value={`৳ ${order.grandTotal.toLocaleString()}`} />
          <Field label="Total Paid"    value={`৳ ${order.totalPaid.toLocaleString()}`} />
          <Field label="Balance Due"   value={`৳ ${order.balanceDue.toLocaleString()}`} />
          <Field
            label="Status"
            value={
              <span className={`${styles.badge} ${styles[order.status.toLowerCase() as "paid" | "partial" | "due"]}`}>
                {order.status}
              </span>
            }
          />
          {order.notes && <Field label="Notes" value={order.notes} />}
        </div>
      </section>

      {/* Pack breakdown */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Pack Breakdown</h2>
        <div className={styles.packGrid}>
          {(["p1", "p2", "p3", "p4", "p6"] as const).map((key) => {
            const size = key === "p6" ? 6 : parseInt(key[1]!);
            const boxes = order.packs[key];
            const units = boxes * size;
            return (
              <div key={key} className={styles.packCard}>
                <span className={styles.packLabel}>{size}-Pack</span>
                <span className={styles.packBoxes}>{boxes} boxes</span>
                <span className={styles.packUnits}>{units} units</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Payment history */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Payment History</h2>
          <Link
            to={`/payments/new?invoiceSerial=${order.invoiceSerial}&supplier=${order.supplier}`}
            className={styles.btnPrimary}
          >
            + Log Payment
          </Link>
        </div>
        {loadingPayments ? (
          <p className={styles.muted}>Loading payments…</p>
        ) : payments.length === 0 ? (
          <p className={styles.muted}>No payments logged yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                  <td>৳ {p.amount.toLocaleString()}</td>
                  <td>{p.paymentType}</td>
                  <td>{p.referenceNo ?? "—"}</td>
                  <td>{p.notes ?? "—"}</td>
                  <td>
                    <button
                      className={styles.btnDelete}
                      onClick={() => {
                        if (confirm("Delete this payment?")) {
                          deletePaymentMutation.mutate(p._id);
                        }
                      }}
                      disabled={deletePaymentMutation.isPending}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value}</span>
    </div>
  );
}
