import { NextRequest, NextResponse } from "next/server";
import type { AccountResponse } from "@/features/agent-builder/domain/api-contracts";
import { activeSessionWindow, clearCognitoSession, persistRefreshedCognitoSession, refreshCognitoSession,
  type ActiveSessionWindow, type RefreshedCognitoTokens } from "@/lib/cognito-session";
import { ACCESS_COOKIE, REFRESH_COOKIE, SESSION_STARTED_COOKIE, browserOriginAllowed, secureCookie,
  TENANT_COOKIE } from "@/lib/session-cookies";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function problem(status: number, code: string, detail: string) {
  return NextResponse.json({ status, code, detail }, { status, headers: { "Cache-Control": "no-store", "Content-Type": "application/problem+json" } });
}
export async function POST(request: NextRequest) {
  if (!browserOriginAllowed(request))
    return problem(403, "csrf_origin_rejected", "A origem da solicitação não foi autorizada.");
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value || "";
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value || "";
  const apiOrigin = process.env.ORBIBOTS_API_ORIGIN?.replace(/\/+$/, "");
  if (!apiOrigin) return problem(503, "backend_origin_missing", "A origem do backend não está configurada.");
  if (!accessToken && !refreshToken) {
    const response = problem(401, "authentication_required", "Entre novamente para selecionar uma empresa.");
    clearCognitoSession(response);
    return response;
  }
  const sessionWindow: ActiveSessionWindow | null = activeSessionWindow(
    request.cookies.get(SESSION_STARTED_COOKIE)?.value, refreshToken);
  if (!sessionWindow) {
    const response = problem(401, "session_expired", "Sua sessão expirou. Entre novamente.");
    clearCognitoSession(response);
    return response;
  }
  let tenantId: string;
  try { tenantId = (await request.json() as { tenantId?: string }).tenantId || ""; }
  catch { return problem(400, "invalid_request", "Informe um workspace válido."); }
  if (!/^[0-9a-fA-F-]{36}$/.test(tenantId)) return problem(400, "invalid_tenant_id", "Workspace inválido.");
  const fetchAccount = (token: string) => fetch(apiOrigin + "/api/v1/me", {
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    cache: "no-store", signal: AbortSignal.timeout(10_000),
  });
  let rotated: RefreshedCognitoTokens | null = null;
  if (!accessToken && refreshToken) {
    rotated = await refreshCognitoSession(refreshToken);
    if (!rotated) {
      const response = problem(401, "session_expired", "Sua sessão expirou. Entre novamente.");
      clearCognitoSession(response);
      return response;
    }
    accessToken = rotated.access_token;
  }
  try {
    let upstream = await fetchAccount(accessToken);
    if (upstream.status === 401 && refreshToken && !rotated) {
      rotated = await refreshCognitoSession(refreshToken);
      if (rotated) upstream = await fetchAccount(rotated.access_token);
    }
    if (upstream.status === 401) {
      const response = problem(401, "session_expired", "Sua sessão expirou. Entre novamente.");
      clearCognitoSession(response);
      return response;
    }
    if (!upstream.ok) {
      const response = problem(502, "workspace_check_failed", "Não foi possível confirmar a associação ao workspace.");
      if (rotated && refreshToken) persistRefreshedCognitoSession(response, rotated, refreshToken, sessionWindow);
      return response;
    }
    const account = await upstream.json() as AccountResponse;
    const member = account.memberships?.find((item) => item.tenantId === tenantId);
    if (!member || !["TENANT_ADMIN", "TENANT_EDITOR"].includes(member.role)) {
      const response = problem(403, "tenant_membership_required", "Você não tem permissão para abrir esse workspace.");
      if (rotated && refreshToken) persistRefreshedCognitoSession(response, rotated, refreshToken, sessionWindow);
      return response;
    }
    const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    response.cookies.set(TENANT_COOKIE, tenantId, {
      httpOnly: true, secure: secureCookie(), sameSite: "strict", path: "/", maxAge: 30 * 24 * 60 * 60,
    });
    if (rotated && refreshToken) persistRefreshedCognitoSession(response, rotated, refreshToken, sessionWindow);
    return response;
  } catch {
    const response = problem(502, "backend_unreachable", "O backend não respondeu ao validar o workspace.");
    if (rotated && refreshToken) persistRefreshedCognitoSession(response, rotated, refreshToken, sessionWindow);
    return response;
  }
}
