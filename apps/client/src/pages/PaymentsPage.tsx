import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPayments, createPayment, updatePayment, deletePayment, paymentKeys,
} from "../api/payments";
import { orderKeys } from "../api/orders";
import { ApiError, toFieldErrors } from "../api/types";
import { useToast } from "../context/ToastContext";
import { SkeletonRow } from "../components/ui/Skeleton";
import { CreatePaymentSchema, UpdatePaymentSchema } from "@tracksheet/shared";
import type { CreatePaymentInput, UpdatePaymentInput, Payment } from "@tracksheet/shared";
import styles from "./PaymentsPage.module.css";

const PAYMENT_TYPES = ["Bank Transfer", "Cash", "Mobile Banking", "Other"] as const;

const EMPTY_CREATE: CreatePaymentInput = {
  invoiceSerial: "",
  supplier:      "",
  paymentDate:   new Date(),
  amount:        0,
  paymentType:   "Bank Transfer",
  referenceNo:   "",
  notes:         "",
};

type FieldErrors = Partial<Record<string, string>>;

export default function PaymentsPage() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  const defaultInvoice  = searchParams.get("invoiceSerial") ?? "";
  const defaultSupplier = searchParams.get("supplier") ?? "";

  const [filterInvoice, setFilterInvoice] = useState(defaultInvoice);
  const [showCreate,    setShowCreate]    = useState(!!defaultInvoice);
  const [editingId,     setEditingId]     = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreatePaymentInput>({
    ...EMPTY_CREATE,
    invoiceSerial: defaultInvoice,
    supplier:      defaultSupplier,
  });
  const [editForm,   setEditForm]   = useState<UpdatePaymentInput>({});
  const [createErrors, setCreateErrors] = useState<FieldErrors>({});
  const [editErrors,   setEditErrors]   = useState<FieldErrors>({});

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: paymentKeys.list({ invoiceSerial: filterInvoice || undefined }),
    queryFn:  () => getPayments({ invoiceSerial: filterInvoice || undefined }),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: paymentKeys.all() });
      void qc.invalidateQueries({ queryKey: orderKeys.all() });
      setShowCreate(false);
      setCreateForm({ ...EMPTY_CREATE });
      setCreateErrors({});
      addToast("Payment logged", "success");
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        setCreateErrors(toFieldErrors(err.fieldErrors));
      }
      addToast(err.message, "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentInput }) =>
      updatePayment(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: paymentKeys.all() });
      void qc.invalidateQueries({ queryKey: orderKeys.all() });
      setEditingId(null);
      setEditErrors({});
      addToast("Payment updated", "success");
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        setEditErrors(toFieldErrors(err.fieldErrors));
      }
      addToast(err.message, "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: paymentKeys.all() });
      void qc.invalidateQueries({ queryKey: orderKeys.all() });
      addToast("Payment deleted", "success");
    },
    onError: (err: Error) => addToast(err.message, "error"),
  });

  // ── Zod submit handlers ───────────────────────────────────────────────────
  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateErrors({});

    const result = CreatePaymentSchema.safeParse(createForm);
    if (!result.success) {
      const errs: FieldErrors = {};
      result.error.errors.forEach((err) => {
        const key = err.path.join(".");
        if (!errs[key]) errs[key] = err.message;
      });
      setCreateErrors(errs);
      return;
    }
    createMutation.mutate(result.data);
  }

  function handleEditSubmit(e: React.FormEvent, id: string) {
    e.preventDefault();
    setEditErrors({});

    const result = UpdatePaymentSchema.safeParse(editForm);
    if (!result.success) {
      const errs: FieldErrors = {};
      result.error.errors.forEach((err) => {
        const key = err.path.join(".");
        if (!errs[key]) errs[key] = err.message;
      });
      setEditErrors(errs);
      return;
    }
    updateMutation.mutate({ id, data: result.data });
  }

  function openEdit(p: Payment) {
    setEditingId(p._id);
    setEditForm({
      paymentDate: new Date(p.paymentDate),
      amount:      p.amount,
      paymentType: p.paymentType,
      referenceNo: p.referenceNo ?? "",
      notes:       p.notes ?? "",
    });
    setEditErrors({});
  }

  const payments = data?.payments ?? [];

  const dateStr = (d: Date | string) =>
    (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Payments</h1>
        <button
          className={styles.btnPrimary}
          onClick={() => { setShowCreate((v) => !v); setCreateErrors({}); }}
        >
          {showCreate ? "Cancel" : "+ Log Payment"}
        </button>
      </div>

      {/* ── Create form ──────────────────────────────────────────────────── */}
      {showCreate && (
        <form className={styles.panel} onSubmit={handleCreateSubmit} noValidate>
          <h3 className={styles.panelTitle}>Log New Payment</h3>
          <div className={styles.formGrid}>
            <FormField label="Invoice Serial *" error={createErrors["invoiceSerial"]}>
              <input className={styles.input} value={createForm.invoiceSerial}
                onChange={(e) => setCreateForm((f) => ({ ...f, invoiceSerial: e.target.value }))} />
            </FormField>
            <FormField label="Supplier *" error={createErrors["supplier"]}>
              <input className={styles.input} value={createForm.supplier}
                onChange={(e) => setCreateForm((f) => ({ ...f, supplier: e.target.value }))} />
            </FormField>
            <FormField label="Payment Date *" error={createErrors["paymentDate"]}>
              <input type="date" className={styles.input} value={dateStr(createForm.paymentDate)}
                onChange={(e) => setCreateForm((f) => ({ ...f, paymentDate: new Date(e.target.value) }))} />
            </FormField>
            <FormField label="Amount (৳) *" error={createErrors["amount"]}>
              <input type="number" className={styles.input} value={createForm.amount}
                min={0.01} step="0.01"
                onChange={(e) => setCreateForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
            </FormField>
            <FormField label="Payment Type *" error={createErrors["paymentType"]}>
              <select className={styles.input} value={createForm.paymentType}
                onChange={(e) => setCreateForm((f) => ({
                  ...f, paymentType: e.target.value as CreatePaymentInput["paymentType"],
                }))}>
                {PAYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Reference No" error={createErrors["referenceNo"]}>
              <input className={styles.input} value={createForm.referenceNo ?? ""}
                onChange={(e) => setCreateForm((f) => ({ ...f, referenceNo: e.target.value }))} />
            </FormField>
            <FormField label="Notes" error={createErrors["notes"]} wide>
              <input className={styles.input} value={createForm.notes ?? ""}
                onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))} />
            </FormField>
          </div>
          <button type="submit" className={styles.btnSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving…" : "Log Payment"}
          </button>
        </form>
      )}

      {/* ── Filter ───────────────────────────────────────────────────────── */}
      <div className={styles.filterRow}>
        <input
          className={styles.input}
          placeholder="Filter by invoice serial…"
          value={filterInvoice}
          onChange={(e) => setFilterInvoice(e.target.value)}
        />
        {filterInvoice && (
          <button className={styles.btnSecondary} onClick={() => setFilterInvoice("")}>Clear</button>
        )}
      </div>

      {isError && (
        <div className={styles.errorBanner}>Failed to load payments.</div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice</th>
              <th>Supplier</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Reference</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
              : payments.length === 0
              ? (
                <tr>
                  <td colSpan={8} className={styles.empty}>
                    {filterInvoice ? "No payments for this invoice." : "No payments logged yet."}
                  </td>
                </tr>
              )
              : payments.map((p) =>
                editingId === p._id ? (
                  // ── Inline edit row ─────────────────────────────────────
                  <tr key={p._id} className={styles.editRow}>
                    <td colSpan={8}>
                      <form onSubmit={(e) => handleEditSubmit(e, p._id)} className={styles.editForm} noValidate>
                        <div className={styles.formGrid}>
                          <FormField label="Date *" error={editErrors["paymentDate"]}>
                            <input type="date" className={styles.input}
                              value={dateStr(editForm.paymentDate ?? p.paymentDate)}
                              onChange={(e) => setEditForm((f) => ({ ...f, paymentDate: new Date(e.target.value) }))} />
                          </FormField>
                          <FormField label="Amount (৳) *" error={editErrors["amount"]}>
                            <input type="number" className={styles.input}
                              value={editForm.amount ?? p.amount} min={0.01} step="0.01"
                              onChange={(e) => setEditForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
                          </FormField>
                          <FormField label="Type *" error={editErrors["paymentType"]}>
                            <select className={styles.input}
                              value={editForm.paymentType ?? p.paymentType}
                              onChange={(e) => setEditForm((f) => ({
                                ...f, paymentType: e.target.value as Payment["paymentType"],
                              }))}>
                              {PAYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                            </select>
                          </FormField>
                          <FormField label="Reference" error={editErrors["referenceNo"]}>
                            <input className={styles.input}
                              value={editForm.referenceNo ?? p.referenceNo ?? ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, referenceNo: e.target.value }))} />
                          </FormField>
                          <FormField label="Notes" error={editErrors["notes"]} wide>
                            <input className={styles.input}
                              value={editForm.notes ?? p.notes ?? ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
                          </FormField>
                        </div>
                        <div className={styles.editActions}>
                          <button type="submit" className={styles.btnSubmit} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? "Saving…" : "Save"}
                          </button>
                          <button type="button" className={styles.btnSecondary}
                            onClick={() => { setEditingId(null); setEditErrors({}); }}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  // ── Normal row ──────────────────────────────────────────
                  <tr key={p._id}>
                    <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/orders?search=${p.invoiceSerial}`} className={styles.invoiceLink}>
                        {p.invoiceSerial}
                      </Link>
                    </td>
                    <td>{p.supplier}</td>
                    <td className={styles.amount}>৳ {p.amount.toLocaleString()}</td>
                    <td>{p.paymentType}</td>
                    <td>{p.referenceNo ?? "—"}</td>
                    <td>{p.notes ?? "—"}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.btnEdit} onClick={() => openEdit(p)}>Edit</button>
                        <button
                          className={styles.btnDelete}
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm("Delete this payment? The order balance will be recalculated.")) {
                              deleteMutation.mutate(p._id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
          </tbody>
        </table>
      </div>

      {data && (
        <p className={styles.meta}>{data.total} payment(s) total</p>
      )}
    </div>
  );
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
