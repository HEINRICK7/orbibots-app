import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, SESSION_STARTED_COOKIE, TENANT_COOKIE, authClientId,
  clearCookieOptions, cognitoLoginBase, sessionCookieOptions } from "@/lib/session-cookies";

export const REFRESH_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export type RefreshedCognitoTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

export type ActiveSessionWindow = { issuedAt: number; remainingSeconds: number };

export function createSessionMarker(issuedAt: number, refreshToken: string) {
  const signature = createHmac("sha256", refreshToken).update(String(issuedAt)).digest("base64url");
  return `${issuedAt}.${signature}`;
}

export function activeSessionWindow(marker: string | undefined, refreshToken: string | undefined): ActiveSessionWindow | null {
  if (!marker || !refreshToken) return null;
  const separator = marker.indexOf(".");
  if (separator <= 0 || separator === marker.length - 1) return null;
  const issuedAtText = marker.slice(0, separator);
  const issuedAt = Number(issuedAtText);
  if (!/^\d+$/.test(issuedAtText) || !Number.isSafeInteger(issuedAt)) return null;
  const expected = Buffer.from(createSessionMarker(issuedAt, refreshToken));
  const supplied = Buffer.from(marker);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (issuedAt > now + 60) return null;
  const elapsed = Math.max(0, now - issuedAt);
  const remainingSeconds = REFRESH_SESSION_MAX_AGE_SECONDS - elapsed;
  return remainingSeconds > 0 ? { issuedAt, remainingSeconds } : null;
}

export async function refreshCognitoSession(refreshToken: string): Promise<RefreshedCognitoTokens | null> {
  const base = cognitoLoginBase();
  const clientId = authClientId();
  if (!base || !clientId) return null;

  try {
    const response = await fetch(base + "/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ grant_type: "refresh_token", client_id: clientId, refresh_token: refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const tokens = await response.json() as Partial<RefreshedCognitoTokens>;
    if (!tokens.access_token || !Number.isInteger(tokens.expires_in) || (tokens.expires_in ?? 0) <= 0) return null;
    return tokens as RefreshedCognitoTokens;
  } catch {
    return null;
  }
}

export function persistRefreshedCognitoSession(
  response: NextResponse,
  tokens: RefreshedCognitoTokens,
  previousRefreshToken: string,
  window: ActiveSessionWindow,
) {
  const refreshToken = tokens.refresh_token || previousRefreshToken;
  response.cookies.set(ACCESS_COOKIE, tokens.access_token, sessionCookieOptions(tokens.expires_in));
  response.cookies.set(REFRESH_COOKIE, refreshToken, sessionCookieOptions(window.remainingSeconds));
  response.cookies.set(SESSION_STARTED_COOKIE, createSessionMarker(window.issuedAt, refreshToken),
    sessionCookieOptions(window.remainingSeconds));
}

export function clearCognitoSession(response: NextResponse) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, SESSION_STARTED_COOKIE, TENANT_COOKIE]) {
    response.cookies.set(name, "", clearCookieOptions());
  }
}
