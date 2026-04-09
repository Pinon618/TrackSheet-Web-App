import { apiClient } from "./client";
import type { ApiOk, SupplierListParams } from "./types";
import type { Brand, CreateBrandInput, UpdateBrandInput } from "@tracksheet/shared";

export const brandKeys = {
  all:    ()                       => ["brands"] as const,
  list:   (p?: SupplierListParams) => ["brands", "list", p] as const,
  detail: (id: string)             => ["brands", "detail", id] as const,
};

export async function getBrands(params?: SupplierListParams): Promise<Brand[]> {
  const { data } = await apiClient.get<ApiOk<Brand[]>>("/brands", { params });
  return data.data;
}

export async function getBrand(id: string): Promise<Brand> {
  const { data } = await apiClient.get<ApiOk<Brand>>(`/brands/${id}`);
  return data.data;
}

export async function createBrand(body: CreateBrandInput): Promise<Brand> {
  const { data } = await apiClient.post<ApiOk<Brand>>("/brands", body);
  return data.data;
}

export async function updateBrand(id: string, body: UpdateBrandInput): Promise<Brand> {
  const { data } = await apiClient.patch<ApiOk<Brand>>(`/brands/${id}`, body);
  return data.data;
}

export async function deleteBrand(id: string): Promise<void> {
  await apiClient.delete(`/brands/${id}`);
}
