import type {
  ApiProblem, EvolutionChannelResponse, EvolutionInboxConversation, EvolutionInboxMessage, IngestDocumentResponse,
  MessageAnswerResponse, PageResponse, PersonalTechWorkspaceResponse, PublishRevisionResponse,
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
export async function loadPersonalTech(fetcher: Fetcher = fetch): Promise<PersonalTechWorkspaceResponse | null> {
  let response: Response;
  try {
    response = await fetcher("/api/orbibots/personal-tech", {
      method: "GET", headers: { Accept: "application/json, application/problem+json" },
      cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new OrbiBotsApiError("Não foi possível consultar o Personal Tech Agent.", null, "backend_unreachable", null, true);
  }
  if (response.status === 404) return null;
  const payload = (await response.json().catch(() => null)) as ApiProblem | PersonalTechWorkspaceResponse | null;
  if (!response.ok) {
    const problem = payload as ApiProblem | null;
    throw new OrbiBotsApiError(problem?.detail || problem?.title || "A API respondeu com HTTP " + response.status + ".",
      response.status, problem?.code ?? null, problem?.correlationId ?? response.headers.get("X-Correlation-ID"), response.status >= 500);
  }
  return payload as PersonalTechWorkspaceResponse;
}
async function get<T>(path: string, fetcher: Fetcher = fetch): Promise<T> {
  let response: Response;
  try {
    response = await fetcher("/api/orbibots/" + path, {
      method: "GET", headers: { Accept: "application/json, application/problem+json" },
      cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new OrbiBotsApiError("Não foi possível consultar o inbox do WhatsApp.", null, "backend_unreachable", null, true);
  }
  const payload = (await response.json().catch(() => null)) as ApiProblem | T | null;
  if (!response.ok) {
    const problem = payload as ApiProblem | null;
    throw new OrbiBotsApiError(problem?.detail || problem?.title || "A API respondeu com HTTP " + response.status + ".",
      response.status, problem?.code ?? null, problem?.correlationId ?? response.headers.get("X-Correlation-ID"), response.status >= 500);
  }
  return payload as T;
}
function evolutionPath(specialistId: string) {
  return "specialists/" + encodeURIComponent(specialistId) + "/evolution";
}
export function loadEvolutionChannel(specialistId: string, fetcher?: Fetcher) {
  return get<EvolutionChannelResponse>(evolutionPath(specialistId), fetcher);
}
export function bindEvolutionChannel(specialistId: string, instanceName: string, webhookToken: string, fetcher?: Fetcher) {
  return post<EvolutionChannelResponse>(evolutionPath(specialistId), { instanceName, webhookToken }, {}, fetcher);
}
export function loadEvolutionInbox(specialistId: string, page = 0, size = 20, fetcher?: Fetcher) {
  return get<PageResponse<EvolutionInboxConversation>>(
    evolutionPath(specialistId) + "/conversations?page=" + page + "&size=" + size, fetcher);
}
export function loadEvolutionMessages(specialistId: string, conversationId: string, page = 0, size = 50, fetcher?: Fetcher) {
  return get<PageResponse<EvolutionInboxMessage>>(
    evolutionPath(specialistId) + "/conversations/" + encodeURIComponent(conversationId) +
    "/messages?page=" + page + "&size=" + size, fetcher);
}
export function createSpecialist(name: string, profileOrFetcher?: string | Fetcher, fetcher?: Fetcher) {
  const profileKind = typeof profileOrFetcher === "string" ? profileOrFetcher : undefined;
  const client = typeof profileOrFetcher === "function" ? profileOrFetcher : fetcher;
  return post<SpecialistResponse>("specialists", profileKind ? { name, profileKind } : { name }, {}, client);
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
