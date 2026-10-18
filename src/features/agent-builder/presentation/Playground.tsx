"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Button, Input, Tag, Typography } from "antd";
import type { ApiOperation } from "../application/api-operation";
import type { EvidenceItemResponse, StartConversationResponse } from "../domain/api-contracts";
import { Glyph } from "./Glyph";
import styles from "./AgentBuilder.module.css";

type PlaygroundEntry = {
  id: string;
  role: "user" | "assistant";
  text: string;
  messageId?: string;
  type?: string;
  evidence: EvidenceItemResponse[];
};

interface PlaygroundProps {
  agentName: string;
  specialistId: string | null;
  publishedRevisionId: string | null;
  conversation: StartConversationResponse | null;
  messages: PlaygroundEntry[];
  sessionReady: boolean;
  busyOperation: ApiOperation | null;
  uncertainOperations: Set<ApiOperation>;
  pendingChatText: string | null;
  onStartConversation: () => Promise<boolean>;
  onSend: (text: string) => Promise<boolean>;
}

export function Playground(props: PlaygroundProps) {
  const [draftMessage, setDraftMessage] = useState("");
  const canChat = Boolean(props.sessionReady && props.specialistId && props.publishedRevisionId);
  const pendingTextChanged = props.pendingChatText !== null && props.pendingChatText !== draftMessage;
  const sendLocked = props.uncertainOperations.has("conversation-start") || props.uncertainOperations.has("message-send");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draftMessage.trim();
    if (!value || !canChat || pendingTextChanged || sendLocked || props.busyOperation) return;
    if (await props.onSend(value)) setDraftMessage("");
  }

  async function startNewConversation() {
    if (!canChat || props.busyOperation || props.uncertainOperations.has("conversation-start")) return;
    if (await props.onStartConversation()) setDraftMessage("");
  }

  return (
    <section className={styles.playground} aria-label="Playground conectado ao backend">
      <div className={styles.playgroundHeader}>
        <div>
          <Typography.Text className={styles.eyebrow}>Playground</Typography.Text>
          <div className={styles.playgroundTitle}>Testar especialista</div>
        </div>
        <div className={styles.playgroundHeaderActions}>
          <Tag className={props.conversation ? styles.localTag : styles.pendingTag}>
            {props.conversation ? `Conversa ${props.conversation.status}` : "Nenhuma conversa"}
          </Tag>
          <Button
            type="text"
            icon={<Glyph name="plus" />}
            onClick={() => void startNewConversation()}
            disabled={!canChat || Boolean(props.busyOperation) || props.uncertainOperations.has("conversation-start")}
            aria-label="Iniciar nova conversa no backend"
          >
            Nova conversa
          </Button>
        </div>
      </div>

      <div className={styles.previewSurface}>
        <div className={styles.previewIdentity}>
          <Avatar size={44} icon={<Glyph name="robot" />} className={styles.agentAvatar} />
          <div>
            <Typography.Text strong className={styles.previewName}>{props.agentName}</Typography.Text>
            <Typography.Text className={styles.previewCompany}>
              {props.specialistId ? `ID ${props.specialistId}` : "Crie o especialista na aba Identidade"}
            </Typography.Text>
          </div>
        </div>

        {props.messages.length === 0 ? (
          <div className={styles.previewWelcome}>
            <Typography.Title level={4}>{canChat ? "Pronto para testar" : "Publicação necessária"}</Typography.Title>
            <Typography.Paragraph>
              {canChat
                ? "A próxima mensagem será processada pela conversa da API usando a revisão publicada."
                : "O playground só envia mensagens depois que a API confirmar uma revisão publicada."}
            </Typography.Paragraph>
            {props.publishedRevisionId && <Typography.Text className={styles.fieldHelp}>Revisão ativa: {props.publishedRevisionId}</Typography.Text>}
          </div>
        ) : (
          <div className={styles.messageList} aria-live="polite">
            {props.messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? styles.visitorMessage : styles.systemMessage}>
                {message.role === "assistant" && <span className={styles.systemLabel}>RESPOSTA DA API · {message.type}</span>}
                <span>{message.text}</span>
                {message.role === "assistant" && message.messageId && <code className={styles.messageMeta}>message {message.messageId}</code>}
                {message.role === "assistant" && message.evidence.length > 0 && (
                  <details className={styles.evidenceDetails}>
                    <summary>{message.evidence.length} evidência(s) retornada(s)</summary>
                    {message.evidence.map((evidence) => (
                      <div key={evidence.evidenceId} className={styles.evidenceRow}>
                        <code>{evidence.evidenceId}</code>
                        <span>source {evidence.sourceId} · registro {evidence.sourceRecordId} · {evidence.observedAt}</span>
                      </div>
                    ))}
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {props.pendingChatText && (
          <Typography.Text className={styles.fieldHelp}>
            A resposta ainda não foi confirmada. Reenvie exatamente a mesma mensagem para repetir com a mesma chave de idempotência.
          </Typography.Text>
        )}
        <form className={styles.composer} onSubmit={handleSubmit}>
          <Input
            value={draftMessage}
            onChange={(event) => setDraftMessage(event.target.value)}
            placeholder={canChat ? "Escreva uma pergunta para o especialista publicado..." : "Publique uma revisão para habilitar o chat"}
            aria-label="Mensagem para o especialista publicado"
            maxLength={2000}
            disabled={!canChat || sendLocked || Boolean(props.busyOperation)}
            suffix={<Typography.Text className={styles.characterCount}>{draftMessage.length}/2000</Typography.Text>}
          />
          <Button
            type="primary"
            htmlType="submit"
            icon={<Glyph name="arrow-up" />}
            aria-label="Enviar mensagem para o backend"
            disabled={!draftMessage.trim() || !canChat || sendLocked || Boolean(props.busyOperation) || pendingTextChanged}
            loading={props.busyOperation === "message-send" || props.busyOperation === "conversation-start"}
          />
        </form>
        <div className={styles.playgroundDisclaimer}>
          {props.conversation
            ? `Conversa ${props.conversation.conversationId} · revisão ${props.conversation.knowledgeRevisionId}. Nova conversa cria outra sessão no backend.`
            : "Mensagens não são simuladas. O envio exige sessão autorizada, especialista e revisão publicada."}
        </div>
      </div>
    </section>
  );
}
