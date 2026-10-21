export const ACCESS_COOKIE = "orbibots_access";
export const REFRESH_COOKIE = "orbibots_refresh";
export const SESSION_STARTED_COOKIE = "orbibots_session_started";
export const TENANT_COOKIE = "orbibots_tenant";
export const OAUTH_STATE_COOKIE = "orbibots_oauth";
export function secureCookie() { return process.env.NODE_ENV === "production"; }
export function sessionCookieOptions(maxAge: number) {
  return { httpOnly: true, secure: secureCookie(), sameSite: "lax" as const, path: "/", maxAge };
}
export function clearCookieOptions() {
  return { httpOnly: true, secure: secureCookie(), sameSite: "lax" as const, path: "/", maxAge: 0 };
}
type HeaderSource = { get(name: string): string | null };

function headerValue(headers: HeaderSource, name: string) {
  return headers.get(name)?.split(",")[0]?.trim() ?? "";
}

export function configuredFrontendOrigin() {
  const value = process.env.ORBIBOTS_FRONTEND_ORIGIN;
  if (!value) return "";
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password ||
        url.pathname !== "/" || url.search || url.hash) return "";
    return url.origin;
  } catch { return ""; }
}

export function forwardedOrigin(headers: HeaderSource) {
  const host = headerValue(headers, "x-forwarded-host");
  if (!host || /[\s/\\]/.test(host)) return "";
  const proto = headerValue(headers, "x-forwarded-proto") || "https";
  if (proto !== "https" && proto !== "http") return "";
  try {
    const url = new URL(`${proto}://${host}`);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return "";
    return url.origin;
  } catch { return ""; }
}

export function frontendOrigin(requestUrl: string, headers?: HeaderSource) {
  return configuredFrontendOrigin() || (headers ? forwardedOrigin(headers) : "") || new URL(requestUrl).origin;
}

export function originMatches(request: { url: string; nextUrl: { origin: string }; headers: HeaderSource }) {
  const expected = new URL(frontendOrigin(request.url, request.headers)).origin;
  const configured = configuredFrontendOrigin();
  if (configured) {
    const forwarded = forwardedOrigin(request.headers);
    return expected === configured && (expected === request.nextUrl.origin || expected === forwarded);
  }
  return expected === request.nextUrl.origin;
}

export function browserOriginAllowed(request: { url: string; nextUrl: { origin: string }; headers: HeaderSource }) {
  const origin = request.headers.get("origin");
  if (!origin || !originMatches(request)) return false;
  try { return new URL(origin).origin === new URL(frontendOrigin(request.url, request.headers)).origin; }
  catch { return false; }
}
export function cognitoLoginBase() {
  const value = process.env.COGNITO_MANAGED_LOGIN_URL?.replace(/\/+$/, "");
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) return null;
    return url.origin;
  } catch { return null; }
}
export function authClientId() { return process.env.COGNITO_APP_CLIENT_ID || ""; }
export function authRedirectUri(origin: string) { return new URL("/api/auth/callback", origin).toString(); }
export function authLogoutUri(origin: string) { return new URL("/", origin).toString(); }
