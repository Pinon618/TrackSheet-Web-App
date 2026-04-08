import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrder, createOrder, updateOrder, orderKeys } from "../api/orders";
import { getSuppliers, supplierKeys } from "../api/suppliers";
import { calcTotalUnits } from "../api/orderCalcClient";
import { ApiError, toFieldErrors } from "../api/types";
import { useToast } from "../context/ToastContext";
import { CreateOrderSchema } from "@tracksheet/shared";
import type { CreateOrderInput, Supplier } from "@tracksheet/shared";
import styles from "./OrderFormPage.module.css";

type PackKey = keyof CreateOrderInput["packs"];
type FieldErrors = Partial<Record<string, string>>;

const PACK_SIZES: { key: PackKey; label: string; mult: number }[] = [
  { key: "p1", label: "1-Pack", mult: 1 },
  { key: "p2", label: "2-Pack", mult: 2 },
  { key: "p3", label: "3-Pack", mult: 3 },
  { key: "p4", label: "4-Pack", mult: 4 },
  { key: "p6", label: "6-Pack", mult: 6 },
];

const EMPTY: CreateOrderInput = {
  invoiceSerial: "",
  orderDate:     new Date(),
  supplier:      "",
  packs:         { p1: 0, p2: 0, p3: 0, p4: 0, p6: 0 },
  unitPrice:     0,
  shippingCost:  0,
  previousDue:   0,
  notes:         "",
};

export default function OrderFormPage() {
  const { id }   = useParams<{ id: string }>();
  const isEdit   = !!id;
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const { addToast } = useToast();

  const [form, setForm]       = useState<CreateOrderInput>(EMPTY);
  const [errors, setErrors]   = useState<FieldErrors>({});

  // ── Prefill on edit ──────────────────────────────────────────────────────
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: orderKeys.detail(id ?? ""),
    queryFn:  () => getOrder(id ?? ""),
    enabled:  isEdit,
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: supplierKeys.list(),
    queryFn:  () => getSuppliers(),
  });

  useEffect(() => {
    if (existing) {
      setForm({
        invoiceSerial: existing.invoiceSerial,
        orderDate:     new Date(existing.orderDate),
        supplier:      existing.supplier,
        packs:         existing.packs,
        unitPrice:     existing.unitPrice,
        shippingCost:  existing.shippingCost,
        previousDue:   existing.previousDue,
        notes:         existing.notes ?? "",
      });
    }
  }, [existing]);

  // ── Mutation ──────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: isEdit
      ? (data: CreateOrderInput) => updateOrder(id, data)
      : createOrder,
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: orderKeys.all() });
      addToast(isEdit ? "Order updated" : "Order created", "success");
      void navigate(`/orders/${saved._id}`);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        setErrors(toFieldErrors(err.fieldErrors));
      }
      addToast(err.message, "error");
    },
  });

  // ── Live calcs ────────────────────────────────────────────────────────────
  const totalUnits   = calcTotalUnits(form.packs);
  const productTotal = totalUnits * form.unitPrice;
  const grandTotal   = productTotal + form.shippingCost + form.previousDue;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function num(v: string) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

  function setField<K extends keyof CreateOrderInput>(key: K, val: CreateOrderInput[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handlePackChange(key: PackKey, val: string) {
    const n = Math.max(0, parseInt(val) || 0);
    setForm((f) => ({ ...f, packs: { ...f.packs, [key]: n } }));
    setErrors((e) => ({ ...e, [`packs.${key}`]: undefined }));
  }

  // ── Zod validation on submit ──────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = CreateOrderSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.errors.forEach((err) => {
        const key = err.path.join(".");
        if (!fieldErrors[key]) fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      addToast("Please fix the errors below", "error");
      return;
    }

    mutation.mutate(result.data);
  }

  if (isEdit && loadingExisting) {
    return <p className={styles.loading}>Loading order…</p>;
  }

  const dateStr = form.orderDate instanceof Date
    ? form.orderDate.toISOString().slice(0, 10)
    : String(form.orderDate).slice(0, 10);

  return (
    <div className={styles.page}>
      <Link to={isEdit ? `/orders/${id}` : "/orders"} className={styles.back}>
        ← {isEdit ? "Order Detail" : "Orders"}
      </Link>
      <h1 className={styles.heading}>{isEdit ? "Edit Order" : "New Order"}</h1>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>

        {/* ── Identity ──────────────────────────────────────────────────── */}
        <div className={styles.row3}>
          <Field label="Invoice Serial *" error={errors["invoiceSerial"]}>
            <input
              className={styles.input}
              value={form.invoiceSerial}
              readOnly={isEdit}
              placeholder="e.g. OZI78967"
              onChange={(e) => setField("invoiceSerial", e.target.value)}
            />
          </Field>
          <Field label="Order Date *" error={errors["orderDate"]}>
            <input
              type="date"
              className={styles.input}
              value={dateStr}
              onChange={(e) => setField("orderDate", new Date(e.target.value))}
            />
          </Field>
          <Field label="Supplier *" error={errors["supplier"]}>
            <select
              className={styles.input}
              value={form.supplier}
              onChange={(e) => setField("supplier", e.target.value)}
            >
              <option value="">Select supplier…</option>
              {suppliers?.map((s) => (
                <option key={s._id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* ── Pack quantities ───────────────────────────────────────────── */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Pack Quantities (boxes)</legend>
          <div className={styles.packRow}>
            {PACK_SIZES.map(({ key, label, mult }) => {
              const boxes = form.packs[key];
              return (
                <div key={key} className={styles.packCol}>
                  <label className={styles.packLabel}>{label}</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={boxes}
                    min={0}
                    onChange={(e) => handlePackChange(key, e.target.value)}
                  />
                  <span className={styles.packUnits}>
                    {boxes * mult} units
                  </span>
                </div>
              );
            })}
          </div>
        </fieldset>

        {/* ── Pricing ───────────────────────────────────────────────────── */}
        <div className={styles.row3}>
          <Field label="Unit Price (৳) *" error={errors["unitPrice"]}>
            <input
              type="number"
              className={styles.input}
              value={form.unitPrice}
              min={0}
              step="0.01"
              onChange={(e) => setField("unitPrice", num(e.target.value))}
            />
          </Field>
          <Field label="Shipping Cost (৳)" error={errors["shippingCost"]}>
            <input
              type="number"
              className={styles.input}
              value={form.shippingCost}
              min={0}
              step="0.01"
              onChange={(e) => setField("shippingCost", num(e.target.value))}
            />
          </Field>
          <Field label="Previous Due (৳)" error={errors["previousDue"]}>
            <input
              type="number"
              className={styles.input}
              value={form.previousDue}
              min={0}
              step="0.01"
              onChange={(e) => setField("previousDue", num(e.target.value))}
            />
          </Field>
        </div>

        {/* ── Live calculation preview ──────────────────────────────────── */}
        <div className={styles.calcRow}>
          <CalcBox label="Total Units"   value={totalUnits} />
          <CalcBox label="Product Total" value={`৳ ${productTotal.toLocaleString()}`} />
          <CalcBox label="Grand Total"   value={`৳ ${grandTotal.toLocaleString()}`}  highlight />
        </div>

        {/* ── Notes ────────────────────────────────────────────────────── */}
        <Field label="Notes" error={errors["notes"]}>
          <textarea
            className={styles.textarea}
            rows={3}
            value={form.notes ?? ""}
            onChange={(e) => setField("notes", e.target.value)}
          />
        </Field>

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.btnSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? "Saving…"
              : isEdit ? "Save Changes" : "Create Order"}
          </button>
          <Link
            to={isEdit ? `/orders/${id}` : "/orders"}
            className={styles.btnCancel}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {error && <span className={styles.fieldError}>{error}</span>}
    </label>
  );
}

function CalcBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className={`${styles.calcBox} ${highlight ? styles.highlight : ""}`}>
      <span className={styles.calcLabel}>{label}</span>
      <span className={styles.calcValue}>{value}</span>
    </div>
  );
}
