import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, authClientId, authLogoutUri, cognitoLoginBase, clearCookieOptions,
  frontendOrigin, OAUTH_STATE_COOKIE, originMatches, REFRESH_COOKIE, TENANT_COOKIE } from "@/lib/session-cookies";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function revokeRefreshToken(base: string, clientId: string, refreshToken: string) {
  try {
    await fetch(base + "/oauth2/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken, client_id: clientId }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Local cookies are still cleared even when remote revocation is unavailable.
  }
}

export async function GET(request: NextRequest) {
  const base = cognitoLoginBase();
  const clientId = authClientId();
  const origin = frontendOrigin(request.url, request.headers);
  const validOrigin = originMatches(request);
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (base && clientId && refreshToken) await revokeRefreshToken(base, clientId, refreshToken);

  if (!base || !clientId || !validOrigin) {
    const response = NextResponse.redirect(new URL("/login", origin));
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, TENANT_COOKIE, OAUTH_STATE_COOKIE]) response.cookies.set(name, "", clearCookieOptions());
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const signout = new URL(base + "/logout");
  signout.searchParams.set("client_id", clientId);
  signout.searchParams.set("logout_uri", authLogoutUri(origin));
  const response = NextResponse.redirect(signout);
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, TENANT_COOKIE, OAUTH_STATE_COOKIE]) response.cookies.set(name, "", clearCookieOptions());
  response.headers.set("Cache-Control", "no-store");
  return response;
}
