import { apiClient } from "./client";
import type { ApiOk, PaymentListParams, Paginated } from "./types";
import type { Payment, CreatePaymentInput, UpdatePaymentInput } from "@tracksheet/shared";

interface PaymentListData extends Paginated<Payment> {
  payments: Payment[];
}

export const paymentKeys = {
  all:        ()                      => ["payments"]                      as const,
  list:       (p?: PaymentListParams) => ["payments", "list", p]           as const,
  byInvoice:  (serial: string)        => ["payments", "invoice", serial]   as const,
  detail:     (id: string)            => ["payments", "detail", id]        as const,
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
