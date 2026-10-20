import { NextRequest, NextResponse } from "next/server";
import type { AccountResponse } from "@/features/agent-builder/domain/api-contracts";
import { ACCESS_COOKIE, browserOriginAllowed, secureCookie, TENANT_COOKIE } from "@/lib/session-cookies";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function problem(status: number, code: string, detail: string) {
  return NextResponse.json({ status, code, detail }, { status, headers: { "Cache-Control": "no-store", "Content-Type": "application/problem+json" } });
}
export async function POST(request: NextRequest) {
  if (!browserOriginAllowed(request))
    return problem(403, "csrf_origin_rejected", "A origem da solicitação não foi autorizada.");
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const apiOrigin = process.env.ORBIBOTS_API_ORIGIN?.replace(/\/+$/, "");
  if (!accessToken) return problem(401, "authentication_required", "Entre novamente para selecionar uma empresa.");
  if (!apiOrigin) return problem(503, "backend_origin_missing", "A origem do backend não está configurada.");
  let tenantId: string;
  try { tenantId = (await request.json() as { tenantId?: string }).tenantId || ""; }
  catch { return problem(400, "invalid_request", "Informe um workspace válido."); }
  if (!/^[0-9a-fA-F-]{36}$/.test(tenantId)) return problem(400, "invalid_tenant_id", "Workspace inválido.");
  try {
    const upstream = await fetch(apiOrigin + "/api/v1/me", {
      headers: { Authorization: "Bearer " + accessToken, Accept: "application/json" },
      cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) return problem(upstream.status === 401 ? 401 : 502, "workspace_check_failed",
      "Não foi possível confirmar a associação ao workspace.");
    const account = await upstream.json() as AccountResponse;
    const member = account.memberships?.find((item) => item.tenantId === tenantId);
    if (!member || !["TENANT_ADMIN", "TENANT_EDITOR"].includes(member.role))
      return problem(403, "tenant_membership_required", "Você não tem permissão para abrir esse workspace.");
    const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    response.cookies.set(TENANT_COOKIE, tenantId, {
      httpOnly: true, secure: secureCookie(), sameSite: "strict", path: "/", maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch { return problem(502, "backend_unreachable", "O backend não respondeu ao validar o workspace."); }
}
