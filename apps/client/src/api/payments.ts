import { apiClient } from "./client";
import type { ApiOk, PaymentListParams, Paginated } from "./types";
import type { Payment, BulkPayment, CreatePaymentInput, UpdatePaymentInput, SupplierBulkPaymentInput } from "@tracksheet/shared";

interface PaymentListData extends Paginated<Payment> {
  payments: Payment[];
}

interface BulkPaymentListData extends Paginated<BulkPayment> {
  bulkPayments: BulkPayment[];
}

export interface BulkPaymentListParams {
  supplier?: string;
  page?: number;
  limit?: number;
}

export const paymentKeys = {
  all:        ()                          => ["payments"]                      as const,
  list:       (p?: PaymentListParams)     => ["payments", "list", p]           as const,
  byInvoice:  (serial: string)            => ["payments", "invoice", serial]   as const,
  detail:     (id: string)                => ["payments", "detail", id]        as const,
  bulkAll:    ()                          => ["payments", "bulk"]              as const,
  bulkList:   (p?: BulkPaymentListParams) => ["payments", "bulk", "list", p]   as const,
  bulkDetail: (id: string)                => ["payments", "bulk", "detail", id] as const,
};

export async function getPayments(params?: PaymentListParams): Promise<PaymentListData> {
  const { data } = await apiClient.get<ApiOk<PaymentListData>>("/payments", { params });
  return data.data;
}

export async function getPayment(id: string): Promise<Payment> {
  const { data } = await apiClient.get<ApiOk<Payment>>(`/payments/${id}`);
  return data.data;
}

export async function createPayment(body: CreatePaymentInput): Promise<Payment> {
  const { data } = await apiClient.post<ApiOk<Payment>>("/payments", body);
  return data.data;
}

export async function updatePayment(id: string, body: UpdatePaymentInput): Promise<Payment> {
  const { data } = await apiClient.patch<ApiOk<Payment>>(`/payments/${id}`, body);
  return data.data;
}

export async function deletePayment(id: string): Promise<void> {
  await apiClient.delete(`/payments/${id}`);
}

export interface SupplierBulkPaymentResult {
  bulkPayment: BulkPayment;
  payments: Payment[];
  totalApplied: number;
  surplus: number;
}

export async function supplierBulkPayment(body: SupplierBulkPaymentInput): Promise<SupplierBulkPaymentResult> {
  const { data } = await apiClient.post<ApiOk<SupplierBulkPaymentResult>>("/payments/supplier-bulk", body);
  return data.data;
}

export async function getBulkPayments(params?: BulkPaymentListParams): Promise<BulkPaymentListData> {
  const { data } = await apiClient.get<ApiOk<BulkPaymentListData>>("/payments/bulk", { params });
  return data.data;
}

export interface BulkPaymentDetail {
  bulkPayment: BulkPayment;
  allocations: Payment[];
}

export async function getBulkPayment(id: string): Promise<BulkPaymentDetail> {
  const { data } = await apiClient.get<ApiOk<BulkPaymentDetail>>(`/payments/bulk/${id}`);
  return data.data;
}

export interface BulkPaymentDeleteResult {
  message: string;
  childrenReversed: number;
  creditReversed: number;
  creditClamped: number;
}

export async function deleteBulkPayment(id: string): Promise<BulkPaymentDeleteResult> {
  const { data } = await apiClient.delete<ApiOk<BulkPaymentDeleteResult>>(`/payments/bulk/${id}`);
  return data.data;
}
