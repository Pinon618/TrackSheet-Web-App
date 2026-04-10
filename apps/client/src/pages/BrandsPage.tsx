import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBrands, createBrand, updateBrand, deleteBrand, brandKeys,
} from "../api/brands";
import { ApiError, toFieldErrors } from "../api/types";
import { useToast } from "../context/ToastContext";
import { SkeletonRow } from "../components/ui/Skeleton";
import { CreateBrandSchema, UpdateBrandSchema } from "@tracksheet/shared";
import type { Brand, CreateBrandInput, UpdateBrandInput } from "@tracksheet/shared";
import styles from "./SuppliersPage.module.css";

const EMPTY: CreateBrandInput = { name: "", notes: "" };
type FieldErrors = Partial<Record<string, string>>;

export default function BrandsPage() {
  const qc = useQueryClient();
  const { addToast } = useToast();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Brand | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateBrandInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});

  const { data: brands, isLoading } = useQuery({
    queryKey: brandKeys.list({ search: search || undefined }),
    queryFn: () => getBrands({ search: search || undefined }),
  });

  const saveMutation = useMutation({
    mutationFn: editing
      ? (data: UpdateBrandInput) => updateBrand(editing._id, data)
      : (data: CreateBrandInput) => createBrand(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: brandKeys.all() });
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY);
      setErrors({});
      addToast(editing ? "Brand updated" : "Brand created", "success");
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) setErrors(toFieldErrors(err.fieldErrors));
      addToast(err.message, "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBrand,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: brandKeys.all() });
      addToast("Brand deleted", "success");
    },
    onError: (err: Error) => addToast(err.message, "error"),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setShowForm(true);
  }

  function openEdit(brand: Brand) {
    setEditing(brand);
    setForm({ name: brand.name, notes: brand.notes ?? "" });
    setErrors({});
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const schema = editing ? UpdateBrandSchema : CreateBrandSchema;
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

    saveMutation.mutate(result.data as CreateBrandInput);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Brands</h1>
        <button
          className={styles.btnPrimary}
          onClick={() => { if (showForm && !editing) { setShowForm(false); } else { openCreate(); } }}
        >
          {showForm && !editing ? "Cancel" : "+ New Brand"}
        </button>
      </div>

      {showForm && (
        <form className={styles.panel} onSubmit={handleSubmit} noValidate>
          <h3 className={styles.panelTitle}>{editing ? "Edit Brand" : "New Brand"}</h3>
          <div className={styles.formGrid}>
            <FormField label="Name *" error={errors["name"]}>
              <input
                className={styles.input}
                value={form.name}
                placeholder="e.g. Acme"
                required
                minLength={1}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((er) => ({ ...er, name: undefined })); }}
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

      <div className={styles.filterRow}>
        <input
          className={styles.input}
          placeholder="Search brands…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.btnSecondary} onClick={() => setSearch("")}>Clear</button>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={3} />)
              : !brands?.length
              ? (
                <tr><td colSpan={3} className={styles.empty}>{search ? "No brands match your search." : "No brands yet."}</td></tr>
              )
              : brands.map((brand) => (
                <tr key={brand._id}>
                  <td className={styles.nameCell}>{brand.name}</td>
                  <td>{brand.notes ?? "—"}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.btnEdit} onClick={() => openEdit(brand)}>Edit</button>
                      <button
                        className={styles.btnDelete}
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm(`Delete brand "${brand.name}"? This will fail if it has active orders.`)) {
                            deleteMutation.mutate(brand._id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {brands && <p className={styles.meta}>{brands.length} brand(s)</p>}
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
