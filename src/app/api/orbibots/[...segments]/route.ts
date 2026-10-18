import { NextRequest, NextResponse } from "next/server";
import { isSupportedApiProxyRequest } from "@/features/agent-builder/infrastructure/proxy-policy";
import { ACCESS_COOKIE, REFRESH_COOKIE, TENANT_COOKIE, authClientId, cognitoLoginBase,
  clearCookieOptions, frontendOrigin, sessionCookieOptions } from "@/lib/session-cookies";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ segments: string[] }> };
type RefreshedTokens = { access_token?: string; refresh_token?: string; expires_in?: number };
function problem(status: number, title: string, detail: string, code: string) {
  return NextResponse.json({ type: "https://orbibots.com/problems/" + code, title, status, detail, code }, {
    status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store" },
  });
}
function sameOriginPost(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expected = frontendOrigin(request.url);
  return Boolean(origin && origin === expected && expected === request.nextUrl.origin);
}
async function refreshAccessToken(refreshToken: string): Promise<RefreshedTokens | null> {
  const base = cognitoLoginBase();
  const clientId = authClientId();
  if (!base || !clientId) return null;
  try {
    const response = await fetch(base + "/oauth2/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ grant_type: "refresh_token", client_id: clientId, refresh_token: refreshToken }),
      cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const tokens = await response.json() as RefreshedTokens;
    return tokens.access_token && tokens.refresh_token && Number.isInteger(tokens.expires_in) && (tokens.expires_in ?? 0) > 0 ? tokens : null;
  } catch { return null; }
}
async function proxy(request: NextRequest, context: RouteContext) {
  const { segments } = await context.params;
  if (!isSupportedApiProxyRequest(request.method, segments))
    return problem(404, "Not Found", "Esta operação não está disponível no BFF.", "proxy_route_not_supported");
  if (request.method === "POST" && !sameOriginPost(request))
    return problem(403, "Forbidden", "A origem da solicitação não foi autorizada.", "csrf_origin_rejected");
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!accessToken) return problem(401, "Unauthorized", "Entre para continuar.", "authentication_required");
  const origin = process.env.ORBIBOTS_API_ORIGIN?.replace(/\/+$/, "");
  if (!origin) return problem(503, "Service Unavailable", "ORBIBOTS_API_ORIGIN não está configurado.", "backend_origin_missing");
  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
    if (!["http:", "https:"].includes(parsedOrigin.protocol) || parsedOrigin.username || parsedOrigin.password ||
        parsedOrigin.pathname !== "/" || parsedOrigin.search || parsedOrigin.hash) throw new Error("invalid origin");
  } catch { return problem(503, "Service Unavailable", "A origem do backend é inválida.", "backend_origin_invalid"); }
  const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join("/");
  const target = parsedOrigin.origin + "/api/v1/" + encodedPath + request.nextUrl.search;
  const body = request.method === "POST" ? await request.arrayBuffer() : undefined;
  const upstreamHeaders = new Headers({ Accept: "application/json, application/problem+json" });
  for (const name of ["Content-Type", "If-Match", "Idempotency-Key", "X-Correlation-ID"]) {
    const value = request.headers.get(name);
    if (value) upstreamHeaders.set(name, value);
  }
  const selectedTenant = request.cookies.get(TENANT_COOKIE)?.value;
  if (selectedTenant) upstreamHeaders.set("X-Tenant-ID", selectedTenant);
  const send = (token: string) => {
    upstreamHeaders.set("Authorization", "Bearer " + token);
    return fetch(target, { method: request.method, headers: upstreamHeaders, body,
      cache: "no-store", signal: AbortSignal.timeout(120_000) });
  };
  let upstream: Response;
  let rotated: RefreshedTokens | null = null;
  try {
    upstream = await send(accessToken);
    if (upstream.status === 401 && refreshToken) {
      rotated = await refreshAccessToken(refreshToken);
      if (rotated?.access_token) upstream = await send(rotated.access_token);
    }
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return problem(timedOut ? 504 : 502, timedOut ? "Gateway Timeout" : "Bad Gateway",
      timedOut ? "O backend não respondeu antes do limite." : "Não foi possível alcançar o backend.",
      timedOut ? "backend_timeout" : "backend_unreachable");
  }
  if (upstream.status === 401 && refreshToken && !rotated) {
    const expired = problem(401, "Unauthorized", "Sua sessão expirou. Entre novamente.", "session_expired");
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, TENANT_COOKIE]) expired.cookies.set(name, "", clearCookieOptions());
    return expired;
  }
  const responseHeaders = new Headers({ "Cache-Control": "no-store" });
  for (const name of ["Content-Type", "X-Correlation-ID", "Retry-After"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  const response = new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
  if (rotated?.access_token) {
    response.cookies.set(ACCESS_COOKIE, rotated.access_token, sessionCookieOptions(rotated.expires_in || 300));
    if (rotated.refresh_token) response.cookies.set(REFRESH_COOKIE, rotated.refresh_token, sessionCookieOptions(30 * 24 * 60 * 60));
  }
  if (upstream.status === 401) {
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, TENANT_COOKIE]) response.cookies.set(name, "", clearCookieOptions());
  }
  return response;
}
export async function GET(request: NextRequest, context: RouteContext) { return proxy(request, context); }
export async function POST(request: NextRequest, context: RouteContext) { return proxy(request, context); }
