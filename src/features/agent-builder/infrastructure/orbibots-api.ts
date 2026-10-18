import type {
  ApiProblem, IngestDocumentResponse, MessageAnswerResponse, PublishRevisionResponse,
  SourceConnectionResponse, SpecialistResponse, StartConversationResponse, SyncRunResponse,
} from "../domain/api-contracts";

export class OrbiBotsApiError extends Error {
  constructor(message: string, readonly status: number | null, readonly code: string | null,
    readonly correlationId: string | null, readonly mayHaveCommitted: boolean) {
    super(message);
    this.name = "OrbiBotsApiError";
  }
}
type Fetcher = typeof fetch;
type TextDocumentRequest = { documentKey: string; title: string; format: "MARKDOWN" | "TEXT"; content: string };
export type BinaryDocumentFormat = "PDF" | "DOCX";

async function post<T>(path: string, body: unknown | FormData | undefined,
  extraHeaders: Record<string, string> = {}, fetcher: Fetcher = fetch): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = { Accept: "application/json, application/problem+json", ...extraHeaders };
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  let response: Response;
  try {
    response = await fetcher("/api/orbibots/" + path, {
      method: "POST", headers, body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new OrbiBotsApiError("Não foi possível confirmar a resposta do backend. Confira a conexão antes de repetir a operação.",
      null, "backend_unreachable", null, true);
  }
  const payload = (await response.json().catch(() => null)) as ApiProblem | T | null;
  if (!response.ok) {
    const problem = payload as ApiProblem | null;
    throw new OrbiBotsApiError(problem?.detail || problem?.title || "A API respondeu com HTTP " + response.status + ".",
      response.status, problem?.code ?? null,
      problem?.correlationId ?? response.headers.get("X-Correlation-ID"), response.status >= 500);
  }
  return payload as T;
}
export function createSpecialist(name: string, fetcher?: Fetcher) {
  return post<SpecialistResponse>("specialists", { name }, {}, fetcher);
}
export function ingestTextDocument(specialistId: string, document: TextDocumentRequest, fetcher?: Fetcher) {
  return post<IngestDocumentResponse>("specialists/" + encodeURIComponent(specialistId) + "/documents", document, {}, fetcher);
}
export function uploadDocument(specialistId: string, file: File, documentKey: string, title: string,
  format: "MARKDOWN" | "TEXT" | BinaryDocumentFormat, fetcher?: Fetcher) {
  const form = new FormData();
  form.set("file", file); form.set("documentKey", documentKey); form.set("title", title); form.set("format", format);
  return post<IngestDocumentResponse>("specialists/" + encodeURIComponent(specialistId) + "/documents", form, {}, fetcher);
}
export function createDocesProductsSource(specialistId: string, fetcher?: Fetcher) {
  return post<SourceConnectionResponse>("specialists/" + encodeURIComponent(specialistId) + "/sources",
    { kind: "DOCES_PUBLIC_PRODUCTS" }, {}, fetcher);
}
export function syncSource(specialistId: string, sourceId: string, fetcher?: Fetcher) {
  return post<SyncRunResponse>("specialists/" + encodeURIComponent(specialistId) + "/sources/" +
    encodeURIComponent(sourceId) + "/sync-runs", undefined, {}, fetcher);
}
export function publishRevision(specialistId: string, revisionId: string, expectedVersion: number, fetcher?: Fetcher) {
  return post<PublishRevisionResponse>("specialists/" + encodeURIComponent(specialistId) + "/revisions/" +
    encodeURIComponent(revisionId) + "/publish", undefined, { "If-Match": String(expectedVersion) }, fetcher);
}
export function startConversation(specialistId: string, fetcher?: Fetcher) {
  return post<StartConversationResponse>("specialists/" + encodeURIComponent(specialistId) + "/conversations",
    undefined, {}, fetcher);
}
export function sendMessage(conversationId: string, text: string, idempotencyKey: string, fetcher?: Fetcher) {
  return post<MessageAnswerResponse>("conversations/" + encodeURIComponent(conversationId) + "/messages",
    { text }, { "Idempotency-Key": idempotencyKey }, fetcher);
}
