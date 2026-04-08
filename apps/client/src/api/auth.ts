import { createAuthClient } from "better-auth/react";

const authUrl = import.meta.env["VITE_AUTH_URL"] as string | undefined;
const apiUrl = import.meta.env["VITE_API_URL"] as string | undefined;

function resolveAuthUrl(): string {
  if (authUrl) return authUrl;
  if (apiUrl) return new URL("../..", apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`).origin;
  return window.location.origin;
}

export const authClient = createAuthClient({
  baseURL: resolveAuthUrl(),
});
