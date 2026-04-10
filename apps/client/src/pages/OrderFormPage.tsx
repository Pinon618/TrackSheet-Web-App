import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrder, createOrder, updateOrder, orderKeys } from "../api/orders";
import { getBrands, brandKeys } from "../api/brands";
import { getSuppliers, supplierKeys } from "../api/suppliers";
import { calcManualUnits, calcPackBoxes } from "../api/orderCalcClient";
import { ApiError, toFieldErrors } from "../api/types";
import { useToast } from "../context/ToastContext";
import { CreateOrderSchema } from "@tracksheet/shared";
import type { Brand, CreateOrderInput, Supplier } from "@tracksheet/shared";
import styles from "./OrderFormPage.module.css";

type PackKey = keyof CreateOrderInput["packs"];
type PackQuantityField = "packs" | "units";
type FieldErrors = Partial<Record<string, string>>;

const PACK_SIZES: { key: PackKey; label: string }[] = [
  { key: "p1", label: "1-Pack" },
  { key: "p2", label: "2-Pack" },
  { key: "p3", label: "3-Pack" },
  { key: "p4", label: "4-Pack" },
  { key: "p5", label: "5-Pack" },
  { key: "p6", label: "6-Pack" },
];

const EMPTY_PACK_QUANTITIES = { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 };

function unitsFromBoxes(packs: CreateOrderInput["packs"]): CreateOrderInput["units"] {
  return {
    p1: packs.p1,
    p2: packs.p2,
    p3: packs.p3,
    p4: packs.p4,
    p5: packs.p5,
    p6: packs.p6,
  };
}

const EMPTY: CreateOrderInput = {
  invoiceSerial: "",
  orderDate:     new Date(),
  supplier:      "",
  brand:         "",
  packs:         EMPTY_PACK_QUANTITIES,
  units:         EMPTY_PACK_QUANTITIES,
  totalBoxes:    0,
  unitPrice:     0,
  shippingCost:  0,
  packagingCost: 0,
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

  function safeNumber(value: number | undefined): number {
    return Number.isFinite(value) ? (value as number) : 0;
  }

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

  const { data: brands } = useQuery<Brand[]>({
    queryKey: brandKeys.list(),
    queryFn:  () => getBrands(),
  });

  useEffect(() => {
    if (existing) {
      const packs = { ...EMPTY_PACK_QUANTITIES, ...existing.packs };
      setForm({
        invoiceSerial: existing.invoiceSerial,
        orderDate:     new Date(existing.orderDate),
        supplier:      existing.supplier,
        brand:         existing.brand,
        packs,
        units:         existing.units ? { ...EMPTY_PACK_QUANTITIES, ...existing.units } : unitsFromBoxes(packs),
        totalBoxes:    existing.totalBoxes ?? calcPackBoxes(existing.packs),
        unitPrice:     existing.unitPrice ?? 0,
        shippingCost:  existing.shippingCost ?? 0,
        packagingCost: existing.packagingCost ?? 0,
        previousDue:   existing.previousDue ?? 0,
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
  const totalUnits   = calcManualUnits(form.units, form.packs);
  const totalBoxes   = calcPackBoxes(form.packs);
  const unitPrice     = safeNumber(form.unitPrice);
  const shippingCost  = safeNumber(form.shippingCost);
  const packagingCost = safeNumber(form.packagingCost);
  const previousDue   = safeNumber(form.previousDue);
  const productTotal  = totalUnits * unitPrice;
  const grandTotal    = productTotal + shippingCost + packagingCost + previousDue;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function num(v: string) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  function int(v: string) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  function handleNumberFieldChange<K extends keyof CreateOrderInput>(
    key: K,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const n = num(e.currentTarget.value);
    e.currentTarget.value = String(n);
    setField(key, n as CreateOrderInput[K]);
  }

  function setField<K extends keyof CreateOrderInput>(key: K, val: CreateOrderInput[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handlePackChange(
    field: PackQuantityField,
    key: PackKey,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const n = int(e.currentTarget.value);
    e.currentTarget.value = String(n);
    setForm((f) => ({ ...f, [field]: { ...f[field], [key]: n } }));
    setErrors((e) => ({ ...e, [`${field}.${key}`]: undefined }));
  }

  // ── Zod validation on submit ──────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = CreateOrderSchema.safeParse({
      ...form,
      unitPrice,
      shippingCost,
      packagingCost,
      previousDue,
      totalBoxes,
    });

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
        <div className={styles.row4}>
          <Field label="Invoice Serial *" error={errors["invoiceSerial"]}>
            <input
              className={styles.input}
              value={form.invoiceSerial}
              readOnly={isEdit}
              required={!isEdit}
              minLength={1}
              placeholder="e.g. OZI78967"
              onChange={(e) => setField("invoiceSerial", e.target.value)}
            />
          </Field>
          <Field label="Order Date *" error={errors["orderDate"]}>
            <input
              type="date"
              className={styles.input}
              value={dateStr}
              required
              onChange={(e) => setField("orderDate", new Date(e.target.value))}
            />
          </Field>
          <Field label="Supplier *" error={errors["supplier"]}>
            <select
              className={styles.input}
              value={form.supplier}
              required
              onChange={(e) => setField("supplier", e.target.value)}
            >
              <option value="">Select supplier…</option>
              {suppliers?.map((s) => (
                <option key={s._id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Brand *" error={errors["brand"]}>
            <select
              className={styles.input}
              value={form.brand}
              required
              onChange={(e) => setField("brand", e.target.value)}
            >
              <option value="">Select brand…</option>
              {brands?.map((b) => (
                <option key={b._id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* ── Pack quantities ───────────────────────────────────────────── */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Pack Quantities</legend>
          <div className={styles.packRow}>
            {PACK_SIZES.map(({ key, label }) => {
              const boxes = form.packs[key] ?? 0;
              const units = form.units[key] ?? 0;
              return (
                <div key={key} className={styles.packCol}>
                  <label className={styles.packLabel}>{label}</label>
                  <label className={styles.packInputGroup}>
                    <span className={styles.packInputLabel}>Units</span>
                    <input
                      type="number"
                      className={styles.input}
                      value={units}
                      min={0}
                      onChange={(e) => handlePackChange("units", key, e)}
                    />
                  </label>
                  <label className={styles.packInputGroup}>
                    <span className={styles.packInputLabel}>Boxes</span>
                    <input
                      type="number"
                      className={styles.input}
                      value={boxes}
                      min={0}
                      onChange={(e) => handlePackChange("packs", key, e)}
                    />
                  </label>
                </div>
              );
            })}
          </div>
          <div className={styles.totalBoxesRow}>
            <Field label="Total Boxes" error={errors["totalBoxes"]}>
              <input
                type="number"
                className={styles.input}
                value={totalBoxes}
                min={0}
                readOnly
              />
            </Field>
          </div>
        </fieldset>

        {/* ── Pricing ───────────────────────────────────────────────────── */}
        <div className={styles.row4}>
          <Field label="Unit Price ($) *" error={errors["unitPrice"]}>
            <input
              type="number"
              className={styles.input}
              value={unitPrice}
              min={0}
              step="0.01"
              required
              onChange={(e) => handleNumberFieldChange("unitPrice", e)}
            />
          </Field>
          <Field label="Shipping Cost ($)" error={errors["shippingCost"]}>
            <input
              type="number"
              className={styles.input}
              value={shippingCost}
              min={0}
              step="0.01"
              onChange={(e) => handleNumberFieldChange("shippingCost", e)}
            />
          </Field>
          <Field label="Packaging Cost ($)" error={errors["packagingCost"]}>
            <input
              type="number"
              className={styles.input}
              value={packagingCost}
              min={0}
              step="0.01"
              onChange={(e) => handleNumberFieldChange("packagingCost", e)}
            />
          </Field>
          <Field label="Previous Due ($)" error={errors["previousDue"]}>
            <input
              type="number"
              className={styles.input}
              value={previousDue}
              min={0}
              step="0.01"
              onChange={(e) => handleNumberFieldChange("previousDue", e)}
            />
          </Field>
        </div>

        {/* ── Live calculation preview ──────────────────────────────────── */}
        <div className={styles.calcRow}>
          <CalcBox label="Total Units"   value={totalUnits} />
          <CalcBox label="Product Total" value={`$ ${productTotal.toLocaleString()}`} />
          <CalcBox label="Grand Total"   value={`$ ${grandTotal.toLocaleString()}`}  highlight />
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
