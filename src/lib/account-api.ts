import type { AccountResponse } from "@/features/agent-builder/domain/api-contracts";
export class AccountApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = "AccountApiError"; }
}
export async function getAccount(): Promise<AccountResponse> {
  const response = await fetch("/api/orbibots/me", { method: "GET", cache: "no-store", credentials: "same-origin",
    headers: { Accept: "application/json, application/problem+json" } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new AccountApiError(body?.detail || body?.title || "Não foi possível consultar sua sessão.", response.status);
  return body as AccountResponse;
}
