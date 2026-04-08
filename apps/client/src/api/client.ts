import axios from "axios";
import { ApiError } from "./types";
import type { ApiErr } from "./types";

const apiUrl = import.meta.env["VITE_API_URL"] as string | undefined;

if (!apiUrl) {
  throw new Error("VITE_API_URL is not set");
}

export const apiClient = axios.create({
  baseURL: apiUrl,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
  withCredentials: true,
});

// Auth token injection — will be populated once Firebase auth is wired up
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// Normalise error shape so callers always get a readable message and field errors.
apiClient.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    if (axios.isAxiosError(err)) {
      const serverError = err.response?.data as ApiErr | undefined;
      throw new ApiError(
        serverError?.error ?? err.message,
        serverError?.errors ?? []
      );
    }
    return Promise.reject(err);
  }
);
