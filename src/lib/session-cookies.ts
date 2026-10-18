export const ACCESS_COOKIE = "orbibots_access";
export const REFRESH_COOKIE = "orbibots_refresh";
export const TENANT_COOKIE = "orbibots_tenant";
export const OAUTH_STATE_COOKIE = "orbibots_oauth";
export function secureCookie() { return process.env.NODE_ENV === "production"; }
export function sessionCookieOptions(maxAge: number) {
  return { httpOnly: true, secure: secureCookie(), sameSite: "lax" as const, path: "/", maxAge };
}
export function clearCookieOptions() {
  return { httpOnly: true, secure: secureCookie(), sameSite: "lax" as const, path: "/", maxAge: 0 };
}
export function frontendOrigin(requestUrl: string) {
  return process.env.ORBIBOTS_FRONTEND_ORIGIN || new URL(requestUrl).origin;
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
