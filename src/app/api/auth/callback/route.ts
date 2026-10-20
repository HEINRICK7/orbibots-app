import { timingSafeEqual } from "node:crypto";
import { verifyCognitoIdToken } from "@/lib/cognito-id-token";
import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, authClientId, authRedirectUri, cognitoLoginBase, frontendOrigin,
  OAUTH_STATE_COOKIE, REFRESH_COOKIE, TENANT_COOKIE, clearCookieOptions, originMatches, sessionCookieOptions } from "@/lib/session-cookies";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type OAuthTransaction = { state: string; verifier: string; nonce: string };
type CognitoTokens = { access_token?: string; refresh_token?: string; id_token?: string; expires_in?: number };
function validEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
function fail(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login?error=login_failed", frontendOrigin(request.url, request.headers)));
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, TENANT_COOKIE, OAUTH_STATE_COOKIE]) response.cookies.set(name, "", clearCookieOptions());
  return response;
}
export async function GET(request: NextRequest) {
  const base = cognitoLoginBase();
  const clientId = authClientId();
  const issuer = process.env.COGNITO_ISSUER_URI || "";
  const origin = frontendOrigin(request.url, request.headers);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const rawTransaction = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!base || !clientId || !issuer || !originMatches(request) || !code || !state || !rawTransaction) return fail(request);
  let transaction: OAuthTransaction;
  try { transaction = JSON.parse(Buffer.from(rawTransaction, "base64url").toString("utf8")) as OAuthTransaction; }
  catch { return fail(request); }
  if (!transaction.state || !transaction.verifier || !transaction.nonce || !validEqual(state, transaction.state)) return fail(request);
  try {
    const tokenResponse = await fetch(base + "/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code", client_id: clientId, code,
        redirect_uri: authRedirectUri(origin), code_verifier: transaction.verifier,
      }),
      cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok) return fail(request);
    const tokens = await tokenResponse.json() as CognitoTokens;
    if (!tokens.access_token || !tokens.refresh_token || !Number.isInteger(tokens.expires_in) ||
        (tokens.expires_in ?? 0) <= 0 ||
        !(await verifyCognitoIdToken(tokens.id_token || "", { issuer, clientId, nonce: transaction.nonce }))) return fail(request);
    const response = NextResponse.redirect(new URL("/", origin));
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(ACCESS_COOKIE, tokens.access_token, sessionCookieOptions(tokens.expires_in!));
    response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, sessionCookieOptions(30 * 24 * 60 * 60));
    response.cookies.set(OAUTH_STATE_COOKIE, "", sessionCookieOptions(0));
    return response;
  } catch { return fail(request); }
}
