import { describe, expect, it } from "vitest";
import { isSupportedApiProxyRequest } from "./proxy-policy";

describe("BFF API allowlist", () => {
  it("allows confirmed identity and company onboarding routes", () => {
    const id = "123e4567-e89b-42d3-a456-426614174000";
    expect(isSupportedApiProxyRequest("GET", ["me"])).toBe(true);
    expect(isSupportedApiProxyRequest("GET", ["platform", "tenants"])).toBe(true);
    expect(isSupportedApiProxyRequest("GET", ["personal-tech"])).toBe(true);
    expect(isSupportedApiProxyRequest("GET", ["specialists", id, "evolution"])).toBe(true);
    expect(isSupportedApiProxyRequest("GET", ["specialists", id, "evolution", "allowed-senders"])).toBe(true);
    expect(isSupportedApiProxyRequest("GET", ["specialists", id, "evolution", "conversations"])).toBe(true);
    expect(isSupportedApiProxyRequest("GET", ["specialists", id, "evolution", "conversations", id, "messages"])).toBe(true);
    expect(isSupportedApiProxyRequest("POST", ["specialists", id, "evolution"])).toBe(true);
    expect(isSupportedApiProxyRequest("POST", ["specialists", id, "evolution", "allowed-senders"])).toBe(true);
    expect(isSupportedApiProxyRequest("DELETE", ["specialists", id, "evolution", "allowed-senders", id])).toBe(true);
    expect(isSupportedApiProxyRequest("POST", ["platform", "tenants"])).toBe(true);
    expect(isSupportedApiProxyRequest("POST", ["platform", "tenants", id, "owner-invitation"])).toBe(true);
  });
  it("keeps existing agent routes and blocks unsupported methods and paths", () => {
    const id = "123e4567-e89b-42d3-a456-426614174000";
    expect(isSupportedApiProxyRequest("POST", ["specialists"])).toBe(true);
    expect(isSupportedApiProxyRequest("POST", ["specialists", id, "documents"])).toBe(true);
    expect(isSupportedApiProxyRequest("GET", ["specialists"])).toBe(false);
    expect(isSupportedApiProxyRequest("PATCH", ["platform", "tenants", id])).toBe(false);
    expect(isSupportedApiProxyRequest("POST", ["..", "platform", "tenants"])).toBe(false);
    expect(isSupportedApiProxyRequest("POST", ["specialists", id, "evolution", "conversations", id, "messages"])).toBe(false);
    expect(isSupportedApiProxyRequest("GET", ["specialists", id, "evolution", "secrets"])).toBe(false);
    expect(isSupportedApiProxyRequest("DELETE", ["specialists", id, "evolution", "allowed-senders", "not-a-uuid"])).toBe(false);
  });
});
