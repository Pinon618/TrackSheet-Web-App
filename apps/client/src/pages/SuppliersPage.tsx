import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier, supplierKeys,
} from "../api/suppliers";
import { getOrders, orderKeys } from "../api/orders";
import { ApiError, toFieldErrors } from "../api/types";
import { useToast } from "../context/ToastContext";
import { SkeletonRow } from "../components/ui/Skeleton";
import { CreateSupplierSchema, UpdateSupplierSchema } from "@tracksheet/shared";
import type { CreateSupplierInput, UpdateSupplierInput, Supplier } from "@tracksheet/shared";
import styles from "./SuppliersPage.module.css";

const EMPTY: CreateSupplierInput = {
  name: "", contactPerson: "", phone: "", countryRegion: "", notes: "",
};

type FieldErrors = Partial<Record<string, string>>;

export default function SuppliersPage() {
  const qc = useQueryClient();
  const { addToast } = useToast();

  const [search,   setSearch]   = useState("");
  const [editing,  setEditing]  = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState<CreateSupplierInput>(EMPTY);
  const [errors,   setErrors]   = useState<FieldErrors>({});

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: suppliers, isLoading: loadingSuppliers } = useQuery({
    queryKey: supplierKeys.list({ search: search || undefined }),
    queryFn:  () => getSuppliers({ search: search || undefined }),
  });

  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: orderKeys.list({ limit: 10000 }),
    queryFn:  () => getOrders({ limit: 10000 }),
  });

  // Compute per-supplier stats from order data
  const supplierStats = useMemo(() => {
    const map = new Map<string, { orderCount: number; balanceDue: number }>();
    for (const order of ordersData?.orders ?? []) {
      const existing = map.get(order.supplier) ?? { orderCount: 0, balanceDue: 0 };
      map.set(order.supplier, {
        orderCount: existing.orderCount + 1,
        balanceDue: existing.balanceDue + order.balanceDue,
      });
    }
    return map;
  }, [ordersData]);

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: editing
      ? (data: UpdateSupplierInput) => updateSupplier(editing._id, data)
      : (data: CreateSupplierInput) => createSupplier(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supplierKeys.all() });
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY);
      setErrors({});
      addToast(editing ? "Supplier updated" : "Supplier created", "success");
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        setErrors(toFieldErrors(err.fieldErrors));
      }
      addToast(err.message, "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess:  () => {
      void qc.invalidateQueries({ queryKey: supplierKeys.all() });
      addToast("Supplier deleted", "success");
    },
    onError: (err: Error) => addToast(err.message, "error"),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setShowForm(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name:          s.name,
      contactPerson: s.contactPerson ?? "",
      phone:         s.phone         ?? "",
      countryRegion: s.countryRegion  ?? "",
      notes:         s.notes         ?? "",
    });
    setErrors({});
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const schema = editing ? UpdateSupplierSchema : CreateSupplierSchema;
    const result = schema.safeParse(form);

    if (!result.success) {
      const errs: FieldErrors = {};
      result.error.errors.forEach((err) => {
        const key = err.path.join(".");
        if (!errs[key]) errs[key] = err.message;
      });
      setErrors(errs);
      return;
    }

    saveMutation.mutate(result.data as CreateSupplierInput);
  }

  const isLoading = loadingSuppliers || loadingOrders;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Suppliers</h1>
        <button
          className={styles.btnPrimary}
          onClick={() => { if (showForm && !editing) { setShowForm(false); } else { openCreate(); } }}
        >
          {showCreate(showForm, editing) ? "Cancel" : "+ New Supplier"}
        </button>
      </div>

      {/* ── Create / Edit form ─────────────────────────────────────────────── */}
      {showForm && (
        <form className={styles.panel} onSubmit={handleSubmit} noValidate>
          <h3 className={styles.panelTitle}>{editing ? "Edit Supplier" : "New Supplier"}</h3>
          <div className={styles.formGrid}>
            <FormField label="Name *" error={errors["name"]}>
              <input
                className={styles.input}
                value={form.name}
                placeholder="e.g. Acme Supplies"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </FormField>
            <FormField label="Contact Person" error={errors["contactPerson"]}>
              <input
                className={styles.input}
                value={form.contactPerson ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
              />
            </FormField>
            <FormField label="Phone" error={errors["phone"]}>
              <input
                className={styles.input}
                value={form.phone ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </FormField>
            <FormField label="Country / Region" error={errors["countryRegion"]}>
              <input
                className={styles.input}
                value={form.countryRegion ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, countryRegion: e.target.value }))}
              />
            </FormField>
            <FormField label="Notes" error={errors["notes"]} wide>
              <input
                className={styles.input}
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </FormField>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.btnSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : editing ? "Save Changes" : "Create"}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => { setShowForm(false); setEditing(null); setErrors({}); }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Search ────────────────────────────────────────────────────────────── */}
      <div className={styles.filterRow}>
        <input
          className={styles.input}
          placeholder="Search suppliers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.btnSecondary} onClick={() => setSearch("")}>Clear</button>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────────── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Region</th>
              <th className={styles.numHead}>Orders</th>
              <th className={styles.numHead}>Balance Due</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
              : !suppliers?.length
              ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    {search ? "No suppliers match your search." : "No suppliers yet."}
                  </td>
                </tr>
              )
              : suppliers.map((s) => {
                const stats = supplierStats.get(s.name);
                return (
                  <tr key={s._id}>
                    <td className={styles.nameCell}>{s.name}</td>
                    <td>{s.contactPerson ?? "—"}</td>
                    <td>{s.phone ?? "—"}</td>
                    <td>{s.countryRegion ?? "—"}</td>
                    <td className={styles.num}>{stats?.orderCount ?? 0}</td>
                    <td className={`${styles.num} ${(stats?.balanceDue ?? 0) > 0 ? styles.red : styles.green}`}>
                      ৳ {(stats?.balanceDue ?? 0).toLocaleString()}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.btnEdit} onClick={() => openEdit(s)}>Edit</button>
                        <button
                          className={styles.btnDelete}
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`Delete supplier "${s.name}"? This will fail if they have active orders.`)) {
                              deleteMutation.mutate(s._id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {suppliers && (
        <p className={styles.meta}>{suppliers.length} supplier(s)</p>
      )}
    </div>
  );
}

// Helper to compute button label
function showCreate(showForm: boolean, editing: Supplier | null): boolean {
  return showForm && !editing;
}

function FormField({
  label,
  error,
  wide,
  children,
}: {
  label: string;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`${styles.formField} ${wide ? styles.wide : ""}`}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {error && <span className={styles.fieldError}>{error}</span>}
    </label>
  );
}
