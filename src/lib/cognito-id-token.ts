import { createPublicKey, verify as verifySignature } from "node:crypto";

type CognitoJwk = JsonWebKey & { kid?: string; use?: string; alg?: string };
type CognitoJwks = { keys?: CognitoJwk[] };
type IdTokenExpectation = { issuer: string; clientId: string; nonce: string; nowSeconds?: number };
type Fetcher = typeof fetch;

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as Record<string, unknown>;
}

export async function verifyCognitoIdToken(
  token: string,
  expectation: IdTokenExpectation,
  fetcher: Fetcher = fetch,
): Promise<boolean> {
  try {
    const issuerUrl = new URL(expectation.issuer);
    if (issuerUrl.protocol !== "https:" || issuerUrl.username || issuerUrl.password ||
        issuerUrl.search || issuerUrl.hash || !expectation.clientId || !expectation.nonce) return false;

    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) return false;
    const header = decodeSegment(parts[0]);
    const claims = decodeSegment(parts[1]);
    if (header.alg !== "RS256" || typeof header.kid !== "string") return false;

    const jwksUrl = expectation.issuer.replace(/\/+$/, "") + "/.well-known/jwks.json";
    const response = await fetcher(jwksUrl, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) return false;
    const jwks = await response.json() as CognitoJwks;
    const key = jwks.keys?.find((candidate) => candidate.kid === header.kid &&
      candidate.kty === "RSA" && (!candidate.use || candidate.use === "sig") &&
      (!candidate.alg || candidate.alg === "RS256"));
    if (!key) return false;

    const publicKey = createPublicKey({ key, format: "jwk" });
    const signedContent = Buffer.from(parts[0] + "." + parts[1], "ascii");
    const signature = Buffer.from(parts[2], "base64url");
    if (!verifySignature("RSA-SHA256", signedContent, publicKey, signature)) return false;

    const now = expectation.nowSeconds ?? Math.floor(Date.now() / 1000);
    return claims.iss === expectation.issuer &&
      claims.aud === expectation.clientId &&
      claims.token_use === "id" &&
      claims.nonce === expectation.nonce &&
      typeof claims.sub === "string" && claims.sub.length > 0 &&
      typeof claims.exp === "number" && claims.exp > now &&
      typeof claims.iat === "number" && claims.iat <= now + 60 &&
      claims.exp > claims.iat;
  } catch {
    return false;
  }
}
