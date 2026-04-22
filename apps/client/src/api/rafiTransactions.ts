import { apiClient } from "./client";
import type { ApiOk } from "./types";
import type { RafiTransaction, CreateRafiTransactionInput, UpdateRafiTransactionInput } from "@tracksheet/shared";

export interface RafiSummary {
  totalUsdReceived: number;
  totalUsdConversion: number;
  totalBdtConversion: number;
  totalBdtSent: number;
  totalUsdSent: number;
  remainingUsd: number;
  remainingBdt: number;
}

export interface RafiListData {
  transactions: RafiTransaction[];
  summary: RafiSummary;
}

export const rafiKeys = {
  all: () => ["rafi-transactions"] as const,
  list: () => ["rafi-transactions", "list"] as const,
};

export async function getRafiTransactions(): Promise<RafiListData> {
  const { data } = await apiClient.get<ApiOk<RafiListData>>("/rafi-transactions");
  return data.data;
}

export async function createRafiTransaction(body: CreateRafiTransactionInput): Promise<RafiTransaction> {
  const { data } = await apiClient.post<ApiOk<RafiTransaction>>("/rafi-transactions", body);
  return data.data;
}

export async function updateRafiTransaction(id: string, body: UpdateRafiTransactionInput): Promise<RafiTransaction> {
  const { data } = await apiClient.patch<ApiOk<RafiTransaction>>(`/rafi-transactions/${id}`, body);
  return data.data;
}

export async function deleteRafiTransaction(id: string): Promise<void> {
  await apiClient.delete(`/rafi-transactions/${id}`);
}
