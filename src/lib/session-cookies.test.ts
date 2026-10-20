import { afterEach, describe, expect, it } from "vitest";
import { browserOriginAllowed, frontendOrigin, originMatches } from "./session-cookies";

const PUBLIC = "https://main.example.amplifyapp.com";

function headers(values: Record<string, string>) {
  const lower = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return { get(name: string) { return lower[name.toLowerCase()] ?? null; } };
}

function request(extra: Record<string, string>, nextOrigin = "http://localhost:3000") {
  return { url: nextOrigin + "/api/auth/login", nextUrl: { origin: nextOrigin }, headers: headers(extra) };
}

describe("frontend origin behind the public proxy", () => {
  afterEach(() => { delete process.env.ORBIBOTS_FRONTEND_ORIGIN; });

  it("accepts the configured origin when Next sees the compute host and the proxy host matches", () => {
    process.env.ORBIBOTS_FRONTEND_ORIGIN = PUBLIC;
    const current = request({ "x-forwarded-host": "main.example.amplifyapp.com", "x-forwarded-proto": "https" });
    expect(originMatches(current)).toBe(true);
    expect(frontendOrigin(current.url, current.headers)).toBe(PUBLIC);
  });

  it("rejects a forwarded host that is not the configured frontend", () => {
    process.env.ORBIBOTS_FRONTEND_ORIGIN = PUBLIC;
    expect(originMatches(request({ "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" }))).toBe(false);
  });

  it("requires the browser Origin to equal the configured frontend", () => {
    process.env.ORBIBOTS_FRONTEND_ORIGIN = PUBLIC;
    const shared = { "x-forwarded-host": "main.example.amplifyapp.com", "x-forwarded-proto": "https" };
    expect(browserOriginAllowed(request({ ...shared, origin: PUBLIC }))).toBe(true);
    expect(browserOriginAllowed(request({ ...shared, origin: "https://evil.example" }))).toBe(false);
  });

  it("keeps a direct request on its own origin when no public origin is configured", () => {
    expect(originMatches(request({}))).toBe(true);
  });
});
