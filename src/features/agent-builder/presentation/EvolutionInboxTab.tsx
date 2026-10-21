"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  bindEvolutionChannel,
  loadEvolutionChannel,
  loadEvolutionInbox,
  loadEvolutionMessages,
  OrbiBotsApiError,
} from "../infrastructure/orbibots-api";
import type {
  EvolutionChannelResponse,
  EvolutionInboxConversation,
  EvolutionInboxMessage,
  PageResponse,
} from "../domain/api-contracts";
import styles from "./EvolutionInboxTab.module.css";

function createWebhookToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeStyle: "short",
  }).format(date);
}

export function EvolutionInboxTab({
  specialistId,
  canConfigure,
  published,
  active,
}: {
  specialistId: string | null;
  canConfigure: boolean;
  published: boolean;
  active: boolean;
}) {
  const [connection, setConnection] = useState<EvolutionChannelResponse | null>(null);
  const [instanceName, setInstanceName] = useState("");
  const [tokenForVps, setTokenForVps] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inbox, setInbox] = useState<PageResponse<EvolutionInboxConversation> | null>(null);
  const [inboxPage, setInboxPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PageResponse<EvolutionInboxMessage> | null>(null);
  const [messagePage, setMessagePage] = useState(0);
  const [loadingInbox, setLoadingInbox] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setConnection(null);
    setInbox(null);
    setMessages(null);
    setSelectedId(null);
    setInboxPage(0);
    setMessagePage(0);
    setInstanceName("");
    setTokenForVps(null);
    setRetryToken(null);
    setError(null);
    if (!specialistId) return () => { cancelled = true; };
    loadEvolutionChannel(specialistId).then((result) => {
      if (cancelled) return;
      setConnection(result);
      if (result.instanceName) setInstanceName(result.instanceName);
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível consultar o canal.");
    });
    return () => { cancelled = true; };
  }, [specialistId]);

  useEffect(() => {
    if (!active || !specialistId) return;
    let cancelled = false;
    const refresh = async () => {
      setLoadingInbox(true);
      try {
        const result = await loadEvolutionInbox(specialistId, inboxPage, 20);
        if (!cancelled) {
          setInbox(result);
          setSelectedId((current) => current && result.items.some((item) => item.conversationId === current)
            ? current : result.items[0]?.conversationId ?? null);
        }
      } catch (cause: unknown) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível atualizar as conversas.");
      } finally {
        if (!cancelled) setLoadingInbox(false);
      }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 5_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [active, specialistId, inboxPage]);

  useEffect(() => {
    setMessagePage(0);
  }, [selectedId]);

  useEffect(() => {
    if (!active || !specialistId || !selectedId) {
      setMessages(null);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      try {
        const result = await loadEvolutionMessages(specialistId, selectedId, messagePage, 50);
        if (!cancelled) setMessages(result);
      } catch (cause: unknown) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível abrir as mensagens.");
      }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 5_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [active, specialistId, selectedId, messagePage]);

  async function handleBind(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!specialistId || !instanceName.trim() || busy) return;
    setBusy(true);
    setError(null);
    const token = retryToken ?? createWebhookToken();
    setRetryToken(token);
    try {
      const result = await bindEvolutionChannel(specialistId, instanceName.trim(), token);
      setConnection(result);
      setTokenForVps(token);
      setRetryToken(null);
      setCopied(false);
      setInstanceName(result.instanceName ?? instanceName.trim());
    } catch (cause: unknown) {
      const message = cause instanceof OrbiBotsApiError || cause instanceof Error
        ? cause.message : "Não foi possível registrar o webhook.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function copyToken() {
    if (!tokenForVps) return;
    await navigator.clipboard.writeText(tokenForVps);
    setCopied(true);
  }

  const conversations = inbox?.items ?? [];
  const selectedConversation = conversations.find((item) => item.conversationId === selectedId);
  const inboxPages = Math.max(1, Math.ceil((inbox?.total ?? 0) / (inbox?.size || 20)));
  const messagePages = Math.max(1, Math.ceil((messages?.total ?? 0) / (messages?.size || 50)));

  return (
    <div className={styles.content}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>CANAL DE ENTRADA</span>
          <h3>WhatsApp para o inbox web</h3>
          <p>As mensagens recebidas passam pelo especialista. Perguntas e respostas ficam neste painel.</p>
        </div>
        <span className={connection?.connected ? styles.connected : styles.disconnected}>
          <i aria-hidden="true" />{connection?.connected ? "Webhook registrado" : "Não configurado"}
        </span>
      </header>

      {!specialistId ? (
        <div className={styles.empty}><strong>Crie ou selecione um especialista.</strong><span>O canal será associado ao especialista selecionado no Agent Studio.</span></div>
      ) : (
        <>
          <section className={styles.setupCard} aria-labelledby="evolution-setup-heading">
            <div className={styles.cardHeading}>
              <div><h4 id="evolution-setup-heading">Conexão da Evolution API</h4><p>Uma instância e um segredo de webhook por especialista.</p></div>
              {connection?.instanceName && <code>{connection.instanceName}</code>}
            </div>
            {canConfigure ? (
              <form className={styles.form} onSubmit={(event) => void handleBind(event)}>
                <label>
                  <span>Nome exato da instância</span>
                  <input value={instanceName} onChange={(event) => setInstanceName(event.target.value)}
                    placeholder="orbibots-atendimento" maxLength={100} autoComplete="off" />
                </label>
                <button type="submit" disabled={!published || busy || !instanceName.trim()}>
                  {busy ? "Registrando…" : connection?.connected ? "Gerar segredo novo" : "Registrar webhook"}
                </button>
                {!published && <small>Publique o especialista antes de registrar o canal.</small>}
                {connection?.connected && <small>Gerar outro segredo substitui o atual; atualize o header na Evolution depois.</small>}
              </form>
            ) : (
              <p className={styles.readOnly}>Somente o administrador da empresa pode configurar ou trocar o segredo.</p>
            )}
            {error && <p className={styles.error} role="alert">{error}</p>}
            {tokenForVps && connection && (
              <div className={styles.secretBox}>
                <strong>Copie este segredo para a configuração do webhook na VPS.</strong>
                <p>Ele é mostrado somente nesta sessão. O backend guarda apenas o hash; se perder, gere outro e atualize a Evolution.</p>
                <div className={styles.secretRow}><code>{tokenForVps}</code><button type="button" onClick={() => void copyToken()}>{copied ? "Copiado" : "Copiar segredo"}</button></div>
              </div>
            )}
            <div className={styles.instructions}>
              <span><b>Endpoint</b><code>{connection?.webhookPath ?? "/webhooks/evolution"}</code><small>Use o domínio público da API OrbiBots antes deste caminho.</small></span>
              <span><b>Evento</b><code>{connection?.event ?? "MESSAGES_UPSERT"}</code></span>
              <span><b>Header</b><code>{connection?.tokenHeader ?? "X-OrbiBots-Webhook-Token"}</code></span>
            </div>
            <p className={styles.direction}>Somente entrada: o especialista não envia respostas ao WhatsApp. Este estado confirma o cadastro, não monitora a conexão da instância na VPS.</p>
          </section>

          <section className={styles.inboxSection} aria-label="Conversas recebidas do WhatsApp">
            <div className={styles.inboxHeading}>
              <div><h4>Conversas recebidas</h4><p>{inbox?.total ?? 0} conversa(s) · atualização a cada 5 segundos</p></div>
              <div className={styles.listControls}>
                <span>{loadingInbox ? "Atualizando…" : `Página ${inboxPage + 1} de ${inboxPages}`}</span>
                <button type="button" disabled={inboxPage === 0} onClick={() => setInboxPage((page) => Math.max(0, page - 1))}>Mais recentes</button>
                <button type="button" disabled={inboxPage + 1 >= inboxPages} onClick={() => setInboxPage((page) => page + 1)}>Mais antigas</button>
              </div>
            </div>
            <div className={styles.inbox}>
              <nav className={styles.conversationList} aria-label="Lista de conversas">
                {conversations.length === 0 ? <p className={styles.noConversations}>As mensagens recebidas aparecerão aqui.</p> : conversations.map((item) => (
                  <button key={item.conversationId} type="button" className={selectedId === item.conversationId ? styles.conversationActive : styles.conversation}
                    onClick={() => { setSelectedId(item.conversationId); setMessagePage(0); }}>
                    <span className={styles.contactLine}><strong>{item.remoteJid}</strong><time>{formatDate(item.lastMessageAt)}</time></span>
                    <span className={styles.lastMessage}>{item.lastMessage}</span>
                  </button>
                ))}
              </nav>
              <div className={styles.thread} aria-live="polite">
                {selectedConversation ? (
                  <>
                    <div className={styles.threadHeader}><strong>{selectedConversation.remoteJid}</strong><span>{selectedConversation.messageCount} mensagens</span></div>
                    <div className={styles.messageControls}>
                      <button type="button" disabled={messagePage + 1 >= messagePages} onClick={() => setMessagePage((page) => page + 1)}>Mensagens anteriores</button>
                      <span>Página {messagePage + 1} de {messagePages}</span>
                      <button type="button" disabled={messagePage === 0} onClick={() => setMessagePage((page) => Math.max(0, page - 1))}>Mais recentes</button>
                    </div>
                    <div className={styles.messages}>
                      {(messages?.items ?? []).map((message) => (
                        <article key={message.messageId} className={message.role === "USER" ? styles.incoming : styles.answer}>
                          <span>{message.role === "USER" ? "WHATSAPP · PERGUNTA" : "ESPECIALISTA · RESPOSTA WEB"}</span>
                          <p>{message.text}</p>
                          <time>{formatDate(message.createdAt)}</time>
                        </article>
                      ))}
                    </div>
                  </>
                ) : <p className={styles.noConversations}>Selecione uma conversa para ver o histórico.</p>}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
