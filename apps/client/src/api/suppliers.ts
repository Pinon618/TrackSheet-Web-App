import { apiClient } from "./client";
import type { ApiOk, SupplierListParams } from "./types";
import type { Supplier, CreateSupplierInput, UpdateSupplierInput } from "@tracksheet/shared";

export const supplierKeys = {
  all:    ()                        => ["suppliers"]              as const,
  list:   (p?: SupplierListParams)  => ["suppliers", "list", p]  as const,
  detail: (id: string)              => ["suppliers", "detail", id] as const,
};

export async function getSuppliers(params?: SupplierListParams): Promise<Supplier[]> {
  const { data } = await apiClient.get<ApiOk<Supplier[]>>("/suppliers", { params });
  return data.data;
}

export async function getSupplier(id: string): Promise<Supplier> {
  const { data } = await apiClient.get<ApiOk<Supplier>>(`/suppliers/${id}`);
  return data.data;
}

export async function createSupplier(body: CreateSupplierInput): Promise<Supplier> {
  const { data } = await apiClient.post<ApiOk<Supplier>>("/suppliers", body);
  return data.data;
}

export async function updateSupplier(id: string, body: UpdateSupplierInput): Promise<Supplier> {
  const { data } = await apiClient.patch<ApiOk<Supplier>>(`/suppliers/${id}`, body);
  return data.data;
}

export async function deleteSupplier(id: string): Promise<void> {
  await apiClient.delete(`/suppliers/${id}`);
}
