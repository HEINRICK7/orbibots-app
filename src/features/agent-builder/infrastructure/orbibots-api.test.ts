import { describe, expect, it, vi } from "vitest";
import { allowEvolutionSender, bindEvolutionChannel, createSpecialist, loadEvolutionAllowedSenders,
  loadEvolutionChannel, loadEvolutionInbox, loadEvolutionMessages, OrbiBotsApiError, publishRevision,
  removeEvolutionSender, sendMessage, uploadDocument } from "./orbibots-api";

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

  it("sends the personal tech profile only when the chat asks for it", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ id: "specialist-2", tenantId: "tenant-1", name: "Personal Tech Agent", status: "DRAFT" }, { status: 201 }),
    );

    await createSpecialist("Personal Tech Agent", "PERSONAL_TECH", fetcher);

    expect(fetcher).toHaveBeenCalledWith("/api/orbibots/specialists", expect.objectContaining({
      body: JSON.stringify({ name: "Personal Tech Agent", profileKind: "PERSONAL_TECH" }),
    }));
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

  it("binds an Evolution instance through the authenticated BFF", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ connected: true }));
    const webhookToken = "x".repeat(43);

    await bindEvolutionChannel("specialist-1", "demo", webhookToken, fetcher);

    expect(fetcher).toHaveBeenCalledWith("/api/orbibots/specialists/specialist-1/evolution", expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({ instanceName: "demo", webhookToken }),
    }));
  });

  it("manages paginated allowed Evolution senders through the same-origin BFF", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ items: [], page: 0, size: 20, total: 0 }))
      .mockResolvedValueOnce(Response.json({ id: "sender-1", phoneNumber: "+5511999999999", createdAt: "2026-10-22T00:00:00Z" }, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await loadEvolutionAllowedSenders("specialist-1", 0, 20, fetcher);
    await allowEvolutionSender("specialist-1", "+5511999999999", fetcher);
    await removeEvolutionSender("specialist-1", "sender-1", fetcher);

    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "/api/orbibots/specialists/specialist-1/evolution/allowed-senders?page=0&size=20",
      "/api/orbibots/specialists/specialist-1/evolution/allowed-senders",
      "/api/orbibots/specialists/specialist-1/evolution/allowed-senders/sender-1",
    ]);
    expect(fetcher.mock.calls[1][1]).toEqual(expect.objectContaining({ method: "POST", body: JSON.stringify({ phoneNumber: "+5511999999999" }) }));
    expect(fetcher.mock.calls[2][1]).toEqual(expect.objectContaining({ method: "DELETE", credentials: "same-origin" }));
  });

  it("reads connection and paginated web conversations without posting replies to WhatsApp", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ items: [], page: 0, size: 20, total: 0 }),
    );

    await loadEvolutionChannel("specialist-1", fetcher);
    await loadEvolutionInbox("specialist-1", 0, 20, fetcher);
    await loadEvolutionMessages("specialist-1", "conversation-1", 0, 50, fetcher);

    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "/api/orbibots/specialists/specialist-1/evolution",
      "/api/orbibots/specialists/specialist-1/evolution/conversations?page=0&size=20",
      "/api/orbibots/specialists/specialist-1/evolution/conversations/conversation-1/messages?page=0&size=50",
    ]);
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
