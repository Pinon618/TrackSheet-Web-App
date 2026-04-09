import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrders, deleteOrder, orderKeys } from "../api/orders";
import { getSuppliers, supplierKeys } from "../api/suppliers";
import { calcTotalBoxes, calcTotalUnits } from "../api/orderCalcClient";
import { StatusBadge } from "../components/ui/Badge";
import { SkeletonRow } from "../components/ui/Skeleton";
import { useToast } from "../context/ToastContext";
import type { OrderListParams } from "../api/types";
import type { Supplier } from "@tracksheet/shared";
import styles from "./OrdersPage.module.css";

export default function OrdersPage() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [params, setParams] = useState<OrderListParams>({
    supplier: searchParams.get("supplier") ?? undefined,
    status:   searchParams.get("status")   ?? undefined,
    search:   searchParams.get("search")   ?? undefined,
    from:     searchParams.get("from")     ?? undefined,
    to:       searchParams.get("to")       ?? undefined,
    page:     1,
    limit:    50,
  });

  // Sync URL params → filter state on initial load
  useEffect(() => {
    const supplier = searchParams.get("supplier");
    if (supplier) setParams((p) => ({ ...p, supplier }));
  }, [searchParams]);

  const { data, isLoading, isError } = useQuery({
    queryKey: orderKeys.list(params),
    queryFn:  () => getOrders(params),
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: supplierKeys.list(),
    queryFn:  () => getSuppliers(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.all() });
      addToast("Order deleted", "success");
    },
    onError: (err: Error) => addToast(err.message, "error"),
  });

  function set<K extends keyof OrderListParams>(key: K, val: OrderListParams[K]) {
    setParams((p) => ({ ...p, [key]: val, page: 1 }));
  }

  function resetFilters() {
    setParams({ page: 1, limit: 50 });
    setSearchParams({});
  }

  function handleDelete(id: string, serial: string) {
    if (confirm(`Delete order ${serial}? This also removes all its payments.`)) {
      deleteMutation.mutate(id);
    }
  }

  const orders = data?.orders ?? [];
  const hasFilter = !!(params.supplier ?? params.status ?? params.search ?? params.from ?? params.to);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Orders</h1>
        <Link to="/orders/new" className={styles.btnPrimary}>+ New Order</Link>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className={styles.filters}>
        <input
          className={styles.input}
          placeholder="Search invoice serial…"
          value={params.search ?? ""}
          onChange={(e) => set("search", e.target.value || undefined)}
        />
        <select
          className={styles.select}
          value={params.supplier ?? ""}
          onChange={(e) => set("supplier", e.target.value || undefined)}
        >
          <option value="">All suppliers</option>
          {suppliers?.map((s) => (
            <option key={s._id} value={s.name}>{s.name}</option>
          ))}
        </select>
        <select
          className={styles.select}
          value={params.status ?? ""}
          onChange={(e) => set("status", e.target.value || undefined)}
        >
          <option value="">All statuses</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
          <option value="DUE">Due</option>
        </select>
        <input
          type="date"
          className={styles.input}
          title="From date"
          value={params.from ?? ""}
          onChange={(e) => set("from", e.target.value || undefined)}
        />
        <input
          type="date"
          className={styles.input}
          title="To date"
          value={params.to ?? ""}
          onChange={(e) => set("to", e.target.value || undefined)}
        />
        {hasFilter && (
          <button className={styles.btnReset} onClick={resetFilters}>Reset</button>
        )}
      </div>

      {isError && (
        <div className={styles.errorBanner}>Failed to load orders. Check your connection.</div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.sticky}>Invoice</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Brand</th>
              <th title="1-Pack boxes">1P</th>
              <th title="2-Pack boxes">2P</th>
              <th title="3-Pack boxes">3P</th>
              <th title="4-Pack boxes">4P</th>
              <th title="5-Pack boxes">5P</th>
              <th title="6-Pack boxes">6P</th>
              <th>Boxes</th>
              <th>Units</th>
              <th>Unit Price</th>
              <th>Product Total</th>
              <th>Shipping</th>
              <th>Packaging</th>
              <th>Prev Due</th>
              <th>Grand Total</th>
              <th>Paid</th>
              <th>Balance Due</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={23} />)
              : orders.length === 0
              ? (
                <tr>
                  <td colSpan={23} className={styles.empty}>
                    {hasFilter ? "No orders match your filters." : "No orders yet. "}
                    {!hasFilter && <Link to="/orders/new" className={styles.link}>Create one →</Link>}
                  </td>
                </tr>
              )
              : orders.map((o) => {
                const totalBoxes = calcTotalBoxes(o.packs, o.totalBoxes);
                const totalUnits = calcTotalUnits(o.packs, o.units);
                return (
                  <tr key={o._id}>
                    <td className={`${styles.sticky} ${styles.invoiceCell}`}>
                      <Link to={`/orders/${o._id}`} className={styles.link}>{o.invoiceSerial}</Link>
                    </td>
                    <td>{new Date(o.orderDate).toLocaleDateString()}</td>
                    <td>{o.supplier}</td>
                    <td>{o.brand}</td>
                    <td className={styles.num}>{o.packs.p1}</td>
                    <td className={styles.num}>{o.packs.p2}</td>
                    <td className={styles.num}>{o.packs.p3}</td>
                    <td className={styles.num}>{o.packs.p4}</td>
                    <td className={styles.num}>{o.packs.p5 ?? 0}</td>
                    <td className={styles.num}>{o.packs.p6}</td>
                    <td className={styles.num}>{totalBoxes}</td>
                    <td className={styles.num}>{totalUnits}</td>
                    <td className={styles.money}>৳{o.unitPrice.toLocaleString()}</td>
                    <td className={styles.money}>৳{o.productTotal.toLocaleString()}</td>
                    <td className={styles.money}>৳{o.shippingCost.toLocaleString()}</td>
                    <td className={styles.money}>৳{(o.packagingCost ?? 0).toLocaleString()}</td>
                    <td className={styles.money}>৳{o.previousDue.toLocaleString()}</td>
                    <td className={styles.money}>৳{o.grandTotal.toLocaleString()}</td>
                    <td className={`${styles.money} ${styles.green}`}>৳{o.totalPaid.toLocaleString()}</td>
                    <td className={`${styles.money} ${o.balanceDue > 0 ? styles.red : styles.green}`}>
                      ৳{o.balanceDue.toLocaleString()}
                    </td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className={styles.notes}>{o.notes ?? "—"}</td>
                    <td>
                      <div className={styles.actions}>
                        <Link to={`/orders/${o._id}/edit`} className={styles.btnEdit}>Edit</Link>
                        <button
                          className={styles.btnDelete}
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDelete(o._id, o.invoiceSerial)}
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {data && data.total > (params.limit ?? 50) && (
        <div className={styles.pagination}>
          <button
            className={styles.btnPage}
            disabled={(params.page ?? 1) <= 1}
            onClick={() => set("page", (params.page ?? 1) - 1)}
          >
            ← Prev
          </button>
          <span className={styles.pageInfo}>
            Page {params.page ?? 1} of {Math.ceil(data.total / (params.limit ?? 50))}
          </span>
          <button
            className={styles.btnPage}
            disabled={(params.page ?? 1) >= Math.ceil(data.total / (params.limit ?? 50))}
            onClick={() => set("page", (params.page ?? 1) + 1)}
          >
            Next →
          </button>
        </div>
      )}

      <p className={styles.meta}>
        {isLoading ? "" : `${data?.total ?? 0} orders total`}
        {hasFilter && ` · filtered`}
      </p>
    </div>
  );
}
