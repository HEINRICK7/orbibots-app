import type { ApiProblem, CompanyCreatedResponse, CompanyPage, OwnerInvitationResponse } from "@/features/agent-builder/domain/api-contracts";
export class AdminApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string | null) { super(message); this.name = "AdminApiError"; }
}
async function call<T>(path: string, method: "GET" | "POST", body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch("/api/orbibots/" + path, {
    method, credentials: "same-origin", cache: "no-store",
    headers: { Accept: "application/json, application/problem+json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null) as (ApiProblem & Record<string, unknown>) | null;
  if (!response.ok) throw new AdminApiError(payload?.detail || payload?.title || "A API respondeu com HTTP " + response.status + ".",
    response.status, payload?.code ?? null);
  return payload as T;
}
export function listCompanies(page: number, size: number) {
  return call<CompanyPage>("platform/tenants?page=" + page + "&size=" + size, "GET");
}
export function createCompany(name: string, segment: string, idempotencyKey: string) {
  return call<CompanyCreatedResponse>("platform/tenants", "POST", { name, segment }, { "Idempotency-Key": idempotencyKey });
}
export function inviteOwner(tenantId: string, email: string, idempotencyKey: string) {
  return call<OwnerInvitationResponse>("platform/tenants/" + encodeURIComponent(tenantId) + "/owner-invitation",
    "POST", { email }, { "Idempotency-Key": idempotencyKey });
}
