import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authClientId, authRedirectUri, cognitoLoginBase, frontendOrigin, OAUTH_STATE_COOKIE, originMatches, sessionCookieOptions } from "@/lib/session-cookies";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const base = cognitoLoginBase();
  const clientId = authClientId();
  const origin = frontendOrigin(request.url, request.headers);
  if (!base || !clientId || !originMatches(request)) {
    return NextResponse.json({ code: "cognito_auth_not_configured", detail: "A autenticação Cognito não está configurada para este frontend." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const verifier = randomBytes(32).toString("base64url");
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const redirectUri = authRedirectUri(origin);
  const authorize = new URL(base + "/oauth2/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "openid email");
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("nonce", nonce);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");
  const response = NextResponse.redirect(authorize);
  response.cookies.set(OAUTH_STATE_COOKIE, Buffer.from(JSON.stringify({ state, verifier, nonce }), "utf8").toString("base64url"),
    sessionCookieOptions(600));
  return response;
}
