import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrders, orderKeys } from "../api/orders";
import { getSuppliers, supplierKeys } from "../api/suppliers";
import { getBrands, brandKeys } from "../api/brands";
import { StatusBadge } from "../components/ui/Badge";
import { SkeletonCard, SkeletonRow } from "../components/ui/Skeleton";
import { calcTotalBoxes, calcTotalUnits } from "../api/orderCalcClient";
import type { Supplier } from "@tracksheet/shared";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: allOrderData, isLoading: loadingOrders } = useQuery({
    queryKey: orderKeys.list({ limit: 10000 }),
    queryFn:  () => getOrders({ limit: 10000 }),
  });

  const { data: suppliers, isLoading: loadingSuppliers } = useQuery<Supplier[]>({
    queryKey: supplierKeys.list(),
    queryFn:  () => getSuppliers(),
  });

  const { data: brands, isLoading: loadingBrands } = useQuery({
    queryKey: brandKeys.list(),
    queryFn: () => getBrands(),
  });

  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const allOrders = allOrderData?.orders ?? [];

  const orders = useMemo(() => {
    return allOrders.filter((o) => {
      if (filterSupplier && o.supplier !== filterSupplier) return false;
      if (filterBrand && o.brand !== filterBrand) return false;
      if (filterDateFrom && new Date(o.orderDate) < new Date(filterDateFrom)) return false;
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (new Date(o.orderDate) > toDate) return false;
      }
      return true;
    });
  }, [allOrders, filterSupplier, filterBrand, filterDateFrom, filterDateTo]);

  // ── Aggregate stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalBoxes = 0;
    let totalUnits = 0;
    let productValue = 0;
    let shipping = 0;
    let packaging = 0;
    let grandTotal = 0;
    let paid = 0;
    let balanceDue = 0;

    for (const o of orders) {
      totalBoxes  += calcTotalBoxes(o.packs, o.totalBoxes);
      totalUnits  += calcTotalUnits(o.packs, o.units);
      productValue += o.productTotal;
      shipping    += o.shippingCost;
      packaging   += o.packagingCost ?? 0;
      grandTotal  += o.grandTotal;
      paid        += o.totalPaid;
      balanceDue  += o.balanceDue;
    }

    return { totalBoxes, totalUnits, productValue, shipping, packaging, grandTotal, paid, balanceDue };
  }, [orders]);

  // ── Supplier breakdown ─────────────────────────────────────────────────────
  const supplierBreakdown = useMemo(() => {
    const map = new Map<string, { orders: number; grandTotal: number; paid: number; due: number }>();
    for (const o of orders) {
      const entry = map.get(o.supplier) ?? { orders: 0, grandTotal: 0, paid: 0, due: 0 };
      entry.orders    += 1;
      entry.grandTotal += o.grandTotal;
      entry.paid       += o.totalPaid;
      entry.due        += o.balanceDue;
      map.set(o.supplier, entry);
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.due - a.due);
  }, [orders]);

  // ── Recent orders ──────────────────────────────────────────────────────────
  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()).slice(0, 5),
    [orders]
  );

  const fmt = (n: number) => `$ ${n.toLocaleString()}`;

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Dashboard</h1>
        
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Supplier</label>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              disabled={loadingSuppliers}
            >
              <option value="">All Suppliers</option>
              {suppliers?.map((s) => (
                <option key={s._id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label>Brand</label>
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              disabled={loadingBrands}
            >
              <option value="">All Brands</option>
              {brands?.map((b) => (
                <option key={b._id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label>From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
            />
          </div>
          
          <div className={styles.filterGroup}>
            <label>To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
            />
          </div>
          
          {(filterSupplier || filterBrand || filterDateFrom || filterDateTo) && (
            <button
              className={styles.clearBtn}
              onClick={() => {
                setFilterSupplier("");
                setFilterBrand("");
                setFilterDateFrom("");
                setFilterDateTo("");
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <section className={styles.cards}>
        {loadingOrders ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Orders"       value={allOrderData?.total ?? 0} />
            <StatCard label="Total Suppliers"    value={suppliers?.length ?? 0} loading={loadingSuppliers} />
            <StatCard label="Total Boxes"        value={stats.totalBoxes} />
            <StatCard label="Total Units"        value={stats.totalUnits} />
            <StatCard label="Product Value"      value={fmt(stats.productValue)} />
            <StatCard label="Total Shipping"     value={fmt(stats.shipping)} />
            <StatCard label="Total Packaging"    value={fmt(stats.packaging)} />
            <StatCard label="Grand Total"        value={fmt(stats.grandTotal)} />
            <StatCard label="Total Paid"         value={fmt(stats.paid)}       accent="green" />
            <StatCard label="Balance Due"        value={fmt(stats.balanceDue)} accent={stats.balanceDue > 0 ? "red" : undefined} />
          </>
        )}
      </section>

      <div className={styles.columns}>
        {/* ── Recent orders ──────────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Orders</h2>
            <Link to="/orders" className={styles.viewAll}>View all →</Link>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Supplier</th>
                <th>Grand Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingOrders
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                : recentOrders.length === 0
                ? (
                  <tr><td colSpan={4} className={styles.empty}>No orders yet.</td></tr>
                )
                : recentOrders.map((o) => (
                  <tr
                    key={o._id}
                    className={styles.clickable}
                    onClick={() => { void navigate(`/orders/${o._id}`); }}
                  >
                    <td className={styles.invoice}>{o.invoiceSerial}</td>
                    <td>{o.supplier}</td>
                    <td>{fmt(o.grandTotal)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>

        {/* ── Supplier breakdown ─────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Supplier Breakdown</h2>
            <Link to="/suppliers" className={styles.viewAll}>Manage →</Link>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Orders</th>
                <th>Grand Total</th>
                <th>Paid</th>
                <th>Balance Due</th>
              </tr>
            </thead>
            <tbody>
              {loadingOrders
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                : supplierBreakdown.length === 0
                ? (
                  <tr><td colSpan={5} className={styles.empty}>No data yet.</td></tr>
                )
                : supplierBreakdown.map((s) => (
                  <tr
                    key={s.name}
                    className={styles.clickable}
                    onClick={() => { void navigate(`/orders?supplier=${encodeURIComponent(s.name)}`); }}
                  >
                    <td className={styles.supplierName}>{s.name}</td>
                    <td>{s.orders}</td>
                    <td>{fmt(s.grandTotal)}</td>
                    <td className={styles.paid}>{fmt(s.paid)}</td>
                    <td className={s.due > 0 ? styles.due : styles.paid}>{fmt(s.due)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  loading,
}: {
  label: string;
  value: string | number;
  accent?: "green" | "red";
  loading?: boolean;
}) {
  return (
    <div className={`${styles.card} ${accent ? styles[accent] : ""}`}>
      <span className={styles.cardLabel}>{label}</span>
      <span className={styles.cardValue}>{loading ? "—" : value}</span>
    </div>
  );
}
