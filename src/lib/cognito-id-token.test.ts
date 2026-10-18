import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { verifyCognitoIdToken } from "./cognito-id-token";

const issuer = "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_example";
const clientId = "orbibots-client";
const nonce = "nonce-1";
const now = 1_800_000_000;
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "key-1", use: "sig", alg: "RS256" };

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
function signedToken(claims: Record<string, unknown>) {
  const header = encode({ alg: "RS256", kid: "key-1", typ: "JWT" });
  const payload = encode(claims);
  const content = header + "." + payload;
  return content + "." + sign("RSA-SHA256", Buffer.from(content), privateKey).toString("base64url");
}
function fetcherFor(key: unknown = jwk) {
  return vi.fn<typeof fetch>().mockResolvedValue(Response.json({ keys: [key] }));
}
function claims(overrides: Record<string, unknown> = {}) {
  return {
    iss: issuer,
    aud: clientId,
    token_use: "id",
    nonce,
    sub: "cognito-subject",
    iat: now - 10,
    exp: now + 300,
    ...overrides,
  };
}

describe("Cognito ID token verification", () => {
  it("checks the RS256 signature, issuer, client, expiry, token use, and nonce", async () => {
    const token = signedToken(claims());
    const fetcher = fetcherFor();

    await expect(verifyCognitoIdToken(token, { issuer, clientId, nonce, nowSeconds: now }, fetcher)).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledWith(issuer + "/.well-known/jwks.json", expect.any(Object));
  });

  it("rejects mismatched claims and altered signatures", async () => {
    const invalidClient = signedToken(claims({ aud: "another-client" }));
    const alteredSignature = signedToken(claims()).split(".");
    alteredSignature[2] = Buffer.from("invalid").toString("base64url");

    await expect(verifyCognitoIdToken(invalidClient, { issuer, clientId, nonce, nowSeconds: now }, fetcherFor())).resolves.toBe(false);
    await expect(verifyCognitoIdToken(alteredSignature.join("."), { issuer, clientId, nonce, nowSeconds: now }, fetcherFor())).resolves.toBe(false);
  });
});
