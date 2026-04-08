import { apiClient } from "./client";
import type { ApiOk } from "./types";
import type { User, CreateUserInput, UpdateUserInput } from "@tracksheet/shared";

export const userKeys = {
  all:    ()             => ["users"]               as const,
  detail: (id: string)  => ["users", "detail", id] as const,
  uid:    (uid: string) => ["users", "uid", uid]   as const,
};

export async function getUsers(): Promise<User[]> {
  const { data } = await apiClient.get<ApiOk<User[]>>("/users");
  return data.data;
}

export async function getUser(id: string): Promise<User> {
  const { data } = await apiClient.get<ApiOk<User>>(`/users/${id}`);
  return data.data;
}

export async function getUserByUid(uid: string): Promise<User> {
  const { data } = await apiClient.get<ApiOk<User>>(`/users/uid/${uid}`);
  return data.data;
}

export async function createUser(body: CreateUserInput): Promise<User> {
  const { data } = await apiClient.post<ApiOk<User>>("/users", body);
  return data.data;
}

export async function updateUser(id: string, body: UpdateUserInput): Promise<User> {
  const { data } = await apiClient.patch<ApiOk<User>>(`/users/${id}`, body);
  return data.data;
}
