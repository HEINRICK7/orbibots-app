import { describe, expect, it, vi } from "vitest";
import { createSpecialist, OrbiBotsApiError, publishRevision, sendMessage, uploadDocument } from "./orbibots-api";

describe("OrbiBots API client", () => {
  it("sends create-specialist through the same-origin BFF without exposing a bearer token", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ id: "specialist-1", tenantId: "tenant-1", name: "Atendimento", status: "DRAFT" }, { status: 201 }),
    );

    const result = await createSpecialist("Atendimento", fetcher);

    expect(result.id).toBe("specialist-1");
    expect(fetcher).toHaveBeenCalledWith("/api/orbibots/specialists", expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      headers: expect.objectContaining({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name: "Atendimento" }),
    }));
    expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty("Authorization");
  });

  it("uses the backend idempotency key for chat messages", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ messageId: "message-1", text: "Resposta real", evidence: [], actions: [] }),
    );

    await sendMessage("conversation-1", "Olá", "request-1", fetcher);

    expect(fetcher).toHaveBeenCalledWith("/api/orbibots/conversations/conversation-1/messages", expect.objectContaining({
      headers: expect.objectContaining({ "Idempotency-Key": "request-1" }),
    }));
  });

  it("sends multipart documents without overriding the browser boundary", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ sourceId: "source-1", specialistId: "specialist-1", revisionId: "revision-1", status: "staged", sectionCount: 1 }),
    );
    const file = new File(["# FAQ"], "faq.md", { type: "text/markdown" });

    await uploadDocument("specialist-1", file, "faq", "FAQ", "MARKDOWN", fetcher);

    const [, request] = fetcher.mock.calls[0];
    const form = request?.body as FormData;
    expect(request?.headers).not.toHaveProperty("Content-Type");
    expect(form.get("file")).toBe(file);
    expect(form.get("format")).toBe("MARKDOWN");
  });

  it("publishes with the backend's optimistic version header", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ specialistId: "specialist-1", revisionId: "revision-1", version: 1, publishedAt: "2026-10-17T12:00:00Z" }),
    );

    await publishRevision("specialist-1", "revision-1", 0, fetcher);

    expect(fetcher).toHaveBeenCalledWith("/api/orbibots/specialists/specialist-1/revisions/revision-1/publish", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "If-Match": "0" }),
    }));
  });

  it("surfaces RFC 7807 details and correlation IDs from the backend", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ detail: "Sem permissão", code: "insufficient_role", correlationId: "trace-1" }, { status: 403 }),
    );

    await expect(createSpecialist("Atendimento", fetcher)).rejects.toMatchObject({
      message: "Sem permissão",
      status: 403,
      code: "insufficient_role",
      correlationId: "trace-1",
      mayHaveCommitted: false,
    });
  });
});
