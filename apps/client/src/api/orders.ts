import { apiClient } from "./client";
import type { ApiOk, OrderListParams, Paginated } from "./types";
import type { Order, CreateOrderInput, UpdateOrderInput } from "@tracksheet/shared";

interface OrderListData extends Paginated<Order> {
  orders: Order[];
}

// Query key factory — used for TanStack Query cache invalidation
export const orderKeys = {
  all:    ()               => ["orders"]              as const,
  list:   (p?: OrderListParams) => ["orders", "list", p] as const,
  detail: (id: string)    => ["orders", "detail", id] as const,
};

export async function getOrders(params?: OrderListParams): Promise<OrderListData> {
  const { data } = await apiClient.get<ApiOk<OrderListData>>("/orders", { params });
  return data.data;
}

export async function getOrder(id: string): Promise<Order> {
  const { data } = await apiClient.get<ApiOk<Order>>(`/orders/${id}`);
  return data.data;
}

export async function createOrder(body: CreateOrderInput): Promise<Order> {
  const { data } = await apiClient.post<ApiOk<Order>>("/orders", body);
  return data.data;
}

export async function updateOrder(id: string, body: UpdateOrderInput): Promise<Order> {
  const { data } = await apiClient.patch<ApiOk<Order>>(`/orders/${id}`, body);
  return data.data;
}

export async function deleteOrder(id: string): Promise<void> {
  await apiClient.delete(`/orders/${id}`);
}
