"use client";

import { useMemo, useState } from "react";
import { Alert, Button, ConfigProvider, Tabs, Tag, Typography, theme } from "antd";
import {
  createDocesProductsSource,
  createSpecialist,
  ingestTextDocument,
  OrbiBotsApiError,
  publishRevision,
  sendMessage,
  startConversation,
  syncSource,
  uploadDocument,
} from "../infrastructure/orbibots-api";
import type {
  IngestDocumentResponse,
  MessageAnswerResponse,
  PublishRevisionResponse,
  SourceConnectionResponse,
  SpecialistResponse,
  StartConversationResponse,
  SyncRunResponse,
  TenantMembershipResponse,
} from "../domain/api-contracts";
import { createDocumentKey, validateDocumentFile } from "../application/document-upload";
import { PERSONAL_TECH_MEMORY, PERSONAL_TECH_NAME } from "../application/personal-tech-memory";
import type { ApiOperation } from "../application/api-operation";
import { Glyph } from "./Glyph";
import { BehaviorTab } from "./BehaviorTab";
import { IdentityTab } from "./IdentityTab";
import { KnowledgeTab } from "./KnowledgeTab";
import { Playground } from "./Playground";
import { PublicationTab } from "./PublicationTab";
import { ToolsTab } from "./ToolsTab";
import styles from "./AgentBuilder.module.css";

const { Text } = Typography;

type BuilderTab = "identity" | "knowledge" | "behavior" | "tools" | "publication";
type RevisionCandidate = {
  revisionId: string;
  status: string;
  sourceId: string;
  itemCount: number;
  itemLabel: string;
};
type PlaygroundEntry = {
  id: string;
  role: "user" | "assistant";
  text: string;
  messageId?: string;
  type?: string;
  evidence: MessageAnswerResponse["evidence"];
};
const operationLabels: Record<ApiOperation, string> = {
  "specialist-create": "criar especialista",
  "document-text": "enviar documento de texto",
  "document-upload": "enviar arquivo",
  "source-create": "conectar catálogo",
  "source-sync": "sincronizar catálogo",
  publish: "publicar revisão",
  "conversation-start": "iniciar conversa",
  "message-send": "enviar mensagem",
};

export function AgentBuilder({ workspace }: { workspace: TenantMembershipResponse }) {
  const [activeTab, setActiveTab] = useState<BuilderTab>("identity");
  const [specialistName, setSpecialistName] = useState("");
  const [specialist, setSpecialist] = useState<SpecialistResponse | null>(null);
  const [source, setSource] = useState<SourceConnectionResponse | null>(null);
  const [candidate, setCandidate] = useState<RevisionCandidate | null>(null);
  const [publication, setPublication] = useState<PublishRevisionResponse | null>(null);
  const [specialistVersion, setSpecialistVersion] = useState(0);
  const [conversation, setConversation] = useState<StartConversationResponse | null>(null);
  const [messages, setMessages] = useState<PlaygroundEntry[]>([]);
  const [pendingChat, setPendingChat] = useState<{ text: string; idempotencyKey: string } | null>(null);
  const [busyOperation, setBusyOperation] = useState<ApiOperation | null>(null);
  const [uncertainOperations, setUncertainOperations] = useState<Set<ApiOperation>>(() => new Set());
  const [apiError, setApiError] = useState<OrbiBotsApiError | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [apiState, setApiState] = useState<"not-checked" | "ok" | "error">("ok");

  async function invoke<T>(
    operation: ApiOperation,
    request: () => Promise<T>,
    retryUsesIdempotency = false,
  ): Promise<T | null> {
    setApiError(null);
    setLocalError(null);
    if (busyOperation) return null;
    if (uncertainOperations.has(operation)) {
      setLocalError(`A API pode ter concluído a operação de ${operationLabels[operation]}, mas a resposta não foi confirmada. Não há leitura para reconciliar esse estado; recarregar a página não cria uma nova operação.`);
      return null;
    }

    setBusyOperation(operation);
    try {
      const result = await request();
      setApiState("ok");
      return result;
    } catch (error) {
      setApiState("error");
      if (error instanceof OrbiBotsApiError) {
        setApiError(error);
        if (error.mayHaveCommitted && !retryUsesIdempotency) {
          setUncertainOperations((current) => new Set(current).add(operation));
        }
      } else {
        setLocalError(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
      }
      return null;
    } finally {
      setBusyOperation(null);
    }
  }

  async function handleCreateSpecialist() {
    const result = await invoke("specialist-create", () => createSpecialist(specialistName.trim()));
    if (result) {
      setSpecialist(result);
      setCandidate(null);
      setPublication(null);
      setSpecialistVersion(0);
      setConversation(null);
      setMessages([]);
      setSource(null);
    }
  }

  async function handlePreparePersonalChat() {
    const created = await invoke("specialist-create", () => createSpecialist(PERSONAL_TECH_NAME, "PERSONAL_TECH"));
    if (!created) return;
    setSpecialist(created);
    setSpecialistName(created.name);
    const ingested = await invoke("document-text", () => ingestTextDocument(created.id, {
      documentKey: "personal-tech-memory",
      title: "Memória profissional",
      format: "MARKDOWN",
      content: PERSONAL_TECH_MEMORY,
    }));
    if (!ingested?.revisionId) return;
    setRevision(ingested, "seções", ingested.sectionCount);
    const published = await invoke("publish", () => publishRevision(created.id, ingested.revisionId, specialistVersion));
    if (!published) return;
    setPublication(published);
    setSpecialistVersion(published.version);
    const started = await invoke("conversation-start", () => startConversation(created.id));
    if (!started) return;
    setConversation(started);
    setMessages([]);
    setActiveTab("identity");
  }

  function setRevision(response: IngestDocumentResponse | SyncRunResponse, itemLabel: string, itemCount: number) {
    setCandidate({
      revisionId: response.revisionId,
      status: response.status,
      sourceId: response.sourceId,
      itemCount,
      itemLabel,
    });
  }

  async function handleTextDocument(document: { documentKey: string; title: string; content: string }) {
    if (!specialist) return;
    const response = await invoke("document-text", () => ingestTextDocument(specialist.id, {
      ...document,
      format: "MARKDOWN",
    }));
    if (response) setRevision(response, "seções", response.sectionCount);
  }

  async function handleFileUpload(file: File) {
    if (!specialist) return;
    let format: ReturnType<typeof validateDocumentFile>;
    try {
      format = validateDocumentFile(file);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Arquivo inválido.");
      return;
    }
    const key = createDocumentKey(file.name);
    const response = await invoke("document-upload", () => uploadDocument(
      specialist.id,
      file,
      key,
      file.name.replace(/\.[^.]+$/, ""),
      format,
    ));
    if (response) setRevision(response, "seções", response.sectionCount);
  }

  async function handleCreateSource() {
    if (!specialist) return;
    const response = await invoke("source-create", () => createDocesProductsSource(specialist.id));
    if (response) setSource(response);
  }

  async function handleSyncSource() {
    if (!specialist || !source) return;
    const response = await invoke("source-sync", () => syncSource(specialist.id, source.sourceId));
    if (response) setRevision(response, "produtos", response.productCount);
  }

  async function handlePublish() {
    if (!specialist || !candidate) return;
    const response = await invoke("publish", () => publishRevision(
      specialist.id,
      candidate.revisionId,
      specialistVersion,
    ));
    if (response) {
      setPublication(response);
      setSpecialistVersion(response.version);
      setConversation(null);
      setMessages([]);
      setPendingChat(null);
    }
  }

  async function handleStartConversation() {
    if (!specialist || !publication) return false;
    const response = await invoke("conversation-start", () => startConversation(specialist.id));
    if (!response) return false;
    setConversation(response);
    setMessages([]);
    setPendingChat(null);
    return true;
  }

  async function handleSendMessage(text: string): Promise<boolean> {
    if (!specialist || !publication) return false;
    let activeConversation = conversation;
    if (!activeConversation) {
      const started = await invoke("conversation-start", () => startConversation(specialist.id));
      if (!started) return false;
      activeConversation = started;
      setConversation(started);
    }

    const pending = pendingChat?.text === text
      ? pendingChat
      : { text, idempotencyKey: crypto.randomUUID() };
    setPendingChat(pending);
    const answer = await invoke(
      "message-send",
      () => sendMessage(activeConversation!.conversationId, text, pending.idempotencyKey),
      true,
    );
    if (!answer) return false;

    setMessages((current) => [
      ...current,
      { id: `local-${pending.idempotencyKey}`, role: "user", text, evidence: [] },
      {
        id: answer.messageId,
        role: "assistant",
        text: answer.text,
        messageId: answer.messageId,
        type: answer.type,
        evidence: answer.evidence,
      },
    ]);
    setPendingChat(null);
    return true;
  }

  const tabItems = useMemo(() => [
    {
      key: "identity",
      label: <span className={styles.tabLabel}><Glyph name="person" /> Identidade</span>,
      children: <IdentityTab
        workspace={workspace}
        specialistName={specialistName}
        specialist={specialist}
        sessionReady={true}
        busyOperation={busyOperation}
        uncertainOperations={uncertainOperations}
        onSpecialistNameChange={setSpecialistName}
        onCreateSpecialist={handleCreateSpecialist}
        onPreparePersonalChat={() => void handlePreparePersonalChat()}
      />,
    },
    {
      key: "knowledge",
      label: <span className={styles.tabLabel}><Glyph name="book" /> Conhecimento</span>,
      children: <KnowledgeTab
        specialist={specialist}
        source={source}
        candidate={candidate}
        sessionReady={true}
        busyOperation={busyOperation}
        uncertainOperations={uncertainOperations}
        onIngestText={handleTextDocument}
        onUpload={handleFileUpload}
        onCreateSource={handleCreateSource}
        onSyncSource={handleSyncSource}
      />,
    },
    {
      key: "behavior",
      label: <span className={styles.tabLabel}><Glyph name="settings" /> Comportamento</span>,
      children: <BehaviorTab />,
    },
    {
      key: "tools",
      label: <span className={styles.tabLabel}><Glyph name="api" /> Ferramentas</span>,
      children: <ToolsTab />,
    },
    {
      key: "publication",
      label: <span className={styles.tabLabel}><Glyph name="check" /> Publicação</span>,
      children: <PublicationTab
        specialist={specialist}
        candidate={candidate}
        canPublish={workspace.role === "TENANT_ADMIN"}
        publication={publication}
        specialistVersion={specialistVersion}
        busyOperation={busyOperation}
        uncertainOperations={uncertainOperations}
        onPublish={handlePublish}
      />,
    },
  ], [
    workspace, specialistName, specialist, busyOperation, uncertainOperations,
    source, candidate, publication, specialistVersion,
  ]);

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { fontFamily: "Inter Variable, Inter, sans-serif", borderRadius: 9 } }}>
      <main className={styles.appShell}>
        <header className={styles.topbar}>
          <div className={styles.brandGroup}>
            <span className={styles.brandMark}><Glyph name="robot" /></span>
            <Text className={styles.brandName}>OrbiBots</Text>
            <span className={styles.brandDivider} />
            <Text className={styles.productName}>Agent Studio</Text>
          </div>
          <div className={styles.topbarRight}>
            <Tag className={apiState === "ok" ? styles.localTag : styles.pendingTag}>
              <span className={styles.statusDot} />{apiState === "ok" ? "Sessão validada" : apiState === "error" ? "Última chamada com erro" : "API não verificada"}
            </Tag>
            <div className={styles.sessionIdentity}>
              <span>{workspace.tenantName} · {workspace.role === "TENANT_ADMIN" ? "Admin da empresa" : "Editor de agentes"}</span>
              <Button type="text" href="/workspace">Trocar empresa</Button>
              <Button type="text" href="/api/auth/logout">Sair</Button>
            </div>
          </div>
        </header>

        <div className={styles.builderBar}>
          <div className={styles.builderHeading}>
            <div className={styles.breadcrumb}>{workspace.tenantName} <span>/</span> Agent Builder</div>
            <div className={styles.titleLine}>
              <Typography.Title level={4}>{specialist?.name ?? "Novo especialista"}</Typography.Title>
              <Tag className={specialist ? styles.localTag : styles.draftTag}>
                {specialist ? `API · ${specialist.status}` : "Sem especialista"}
              </Tag>
            </div>
          </div>
        </div>

        {(apiError || localError) && (
          <div className={styles.errorStrip}>
            <Alert
              type="error"
              showIcon
              message={apiError ? `HTTP ${apiError.status ?? "sem resposta"} · ${apiError.code ?? "erro_api"}` : "Ação não enviada"}
              description={apiError
                ? <>{apiError.message}{apiError.correlationId && <span className={styles.correlationId}> · Correlação: {apiError.correlationId}</span>}</>
                : localError}
              closable
              onClose={() => { setApiError(null); setLocalError(null); }}
            />
          </div>
        )}

        <div className={styles.workspace}>
          <section className={styles.editorPane} aria-label="Configuração do especialista">
            <Tabs
              className={styles.builderTabs}
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as BuilderTab)}
              items={tabItems}
              destroyOnHidden={false}
              animated={false}
            />
          </section>
          <Playground
            agentName={specialist?.name ?? "Especialista ainda não criado"}
            specialistId={specialist?.id ?? null}
            publishedRevisionId={publication?.revisionId ?? null}
            conversation={conversation}
            messages={messages}
            sessionReady={true}
            busyOperation={busyOperation}
            uncertainOperations={uncertainOperations}
            pendingChatText={pendingChat?.text ?? null}
            onStartConversation={handleStartConversation}
            onSend={handleSendMessage}
          />
        </div>

        <footer className={styles.footerLine}>
          <span>OrbiBots Studio</span>
          <span className={styles.footerDivider}>·</span>
          <span>Estados confirmados vêm da API; campos ainda não enviados ficam em memória e não são restaurados ao recarregar.</span>
          <span className={styles.footerSpacer} />
          <span className={styles.footerVersion}>V1 · API /api/v1</span>
        </footer>
      </main>
    </ConfigProvider>
  );
}
