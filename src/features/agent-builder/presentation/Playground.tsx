"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const canChat = Boolean(props.sessionReady && props.specialistId && props.publishedRevisionId);
  const pendingTextChanged = props.pendingChatText !== null && props.pendingChatText !== draftMessage;
  const sendLocked = props.uncertainOperations.has("conversation-start") || props.uncertainOperations.has("message-send");

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    expandButtonRef.current?.focus();

    function keepFocusInside(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setExpanded(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", keepFocusInside);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keepFocusInside);
      previousFocus?.focus();
    };
  }, [expanded]);

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
    <section
      ref={dialogRef}
      className={`${styles.playground} ${expanded ? styles.playgroundExpanded : ""}`}
      aria-label="Conversa de teste com o especialista"
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded || undefined}
    >
      <div className={styles.playgroundHeader}>
        <div>
          <span className={styles.eyebrow}>PLAYGROUND</span>
          <div className={styles.playgroundTitle}>Testar especialista</div>
        </div>
        <div className={styles.playgroundHeaderActions}>
          <span className={props.conversation ? styles.localTag : styles.pendingTag}>
            {props.conversation ? `Conversa ${props.conversation.status}` : "Nenhuma conversa"}
          </span>
          <button
            className={styles.quietButton}
            type="button"
            onClick={() => void startNewConversation()}
            disabled={!canChat || Boolean(props.busyOperation) || props.uncertainOperations.has("conversation-start")}
            aria-label="Iniciar nova conversa no backend"
          >
            <Glyph name="plus" /> Nova conversa
          </button>
          <button
            ref={expandButtonRef}
            className={styles.iconButton}
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? "Sair da tela cheia" : "Expandir conversa em tela cheia"}
            aria-expanded={expanded}
            title={expanded ? "Sair da tela cheia (Esc)" : "Expandir para tela cheia"}
          >
            <Glyph name={expanded ? "minimize" : "expand"} />
          </button>
        </div>
      </div>

      <div className={styles.previewSurface}>
        <div className={styles.previewIdentity}>
          <span className={styles.agentAvatar}><Glyph name="robot" /></span>
          <div>
            <strong className={styles.previewName}>{props.agentName}</strong>
            <span className={styles.previewCompany}>{props.specialistId ? `ID ${props.specialistId}` : "Crie o especialista na aba Identidade"}</span>
          </div>
        </div>

        {props.messages.length === 0 ? (
          <div className={styles.previewWelcome}>
            <h3>{canChat ? "Pronto para testar" : "Publicação necessária"}</h3>
            <p>{canChat
              ? "A próxima mensagem será processada pela conversa da API usando a revisão publicada."
              : "O playground só envia mensagens depois que a API confirmar uma revisão publicada."}</p>
            {props.publishedRevisionId && <span className={styles.fieldHelp}>Revisão ativa: {props.publishedRevisionId}</span>}
          </div>
        ) : (
          <div className={styles.messageList} aria-live="polite" aria-relevant="additions text">
            {props.messages.map((message) => (
              <article key={message.id} className={message.role === "user" ? styles.visitorMessage : styles.systemMessage}>
                {message.role === "assistant" ? <span className={styles.systemLabel}>RESPOSTA DA API · {message.type}</span> : <span className={styles.messageRole}>VOCÊ</span>}
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
              </article>
            ))}
          </div>
        )}

        {props.pendingChatText && <p className={styles.pendingNotice} role="status">A resposta ainda não foi confirmada. Reenvie exatamente a mesma mensagem para repetir com a mesma chave de idempotência.</p>}
        <form className={styles.composer} onSubmit={handleSubmit}>
          <textarea
            value={draftMessage}
            onChange={(event) => setDraftMessage(event.target.value)}
            placeholder={canChat ? "Escreva uma pergunta para o especialista publicado…" : "Publique uma revisão para habilitar o chat"}
            aria-label="Mensagem para o especialista publicado"
            maxLength={2000}
            rows={2}
            disabled={!canChat || sendLocked || Boolean(props.busyOperation)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <span className={styles.characterCount}>{draftMessage.length}/2000</span>
          <button
            className={styles.sendButton}
            type="submit"
            aria-label="Enviar mensagem para o backend"
            disabled={!draftMessage.trim() || !canChat || sendLocked || Boolean(props.busyOperation) || pendingTextChanged}
            aria-busy={props.busyOperation === "message-send" || props.busyOperation === "conversation-start"}
          >
            <Glyph name="arrow-up" />
          </button>
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
