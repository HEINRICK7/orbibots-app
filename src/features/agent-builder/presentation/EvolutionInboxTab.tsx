"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  allowEvolutionSender,
  bindEvolutionChannel,
  loadEvolutionAllowedSenders,
  loadEvolutionChannel,
  loadEvolutionInbox,
  loadEvolutionMessages,
  OrbiBotsApiError,
  removeEvolutionSender,
} from "../infrastructure/orbibots-api";
import type {
  EvolutionAllowedSender,
  EvolutionChannelResponse,
  EvolutionInboxConversation,
  EvolutionInboxMessage,
  PageResponse,
} from "../domain/api-contracts";
import styles from "./EvolutionInboxTab.module.css";

const INBOX_REFRESH_MS = 1_000;

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
  const [allowedSenders, setAllowedSenders] = useState<PageResponse<EvolutionAllowedSender> | null>(null);
  const [senderPage, setSenderPage] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [senderBusy, setSenderBusy] = useState(false);
  const [senderError, setSenderError] = useState<string | null>(null);
  const [inboxPage, setInboxPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PageResponse<EvolutionInboxMessage> | null>(null);
  const [messagePage, setMessagePage] = useState(0);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const seenTailRef = useRef<string | null>(null);
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    setConnection(null);
    setInbox(null);
    setAllowedSenders(null);
    setMessages(null);
    setSelectedId(null);
    setInboxPage(0);
    setMessagePage(0);
    setSenderPage(0);
    setPhoneNumber("");
    setSenderError(null);
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
    let cancelled = false;
    if (!specialistId || !connection?.connected || !canConfigure) {
      setAllowedSenders(null);
      return () => { cancelled = true; };
    }
    loadEvolutionAllowedSenders(specialistId, senderPage, 20).then((result) => {
      if (!cancelled) setAllowedSenders(result);
    }).catch((cause: unknown) => {
      if (!cancelled) setSenderError(cause instanceof Error ? cause.message : "Não foi possível consultar os números permitidos.");
    });
    return () => { cancelled = true; };
  }, [specialistId, connection?.connected, canConfigure, senderPage]);

  useEffect(() => {
    if (!active || !specialistId) return;
    let cancelled = false;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
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
        inFlight = false;
        if (!cancelled) setLoadingInbox(false);
      }
    };
    setLoadingInbox(true);
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, INBOX_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
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
    let inFlight = false;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const result = await loadEvolutionMessages(specialistId, selectedId, messagePage, 50);
        if (!cancelled) setMessages(result);
      } catch (cause: unknown) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível abrir as mensagens.");
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, INBOX_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, specialistId, selectedId, messagePage]);

  useEffect(() => {
    setChatFullscreen(false);
  }, [specialistId]);

  useEffect(() => {
    if (!chatFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fullscreenButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setChatFullscreen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [chatFullscreen]);

  useEffect(() => {
    seenTailRef.current = null;
  }, [selectedId]);

  useEffect(() => {
    if (messagePage !== 0) return;
    const tail = messages?.items.at(-1);
    if (!tail) return;
    const marker = `${selectedId}:${tail.messageId}`;
    if (seenTailRef.current === marker) return;
    seenTailRef.current = marker;
    threadEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, messagePage, selectedId]);

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

  async function handleAllowSender(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!specialistId || !phoneNumber.trim() || senderBusy) return;
    setSenderBusy(true);
    setSenderError(null);
    try {
      await allowEvolutionSender(specialistId, phoneNumber.trim());
      setPhoneNumber("");
      setSenderPage(0);
      setAllowedSenders(await loadEvolutionAllowedSenders(specialistId, 0, 20));
    } catch (cause: unknown) {
      setSenderError(cause instanceof Error ? cause.message : "Não foi possível liberar este número.");
    } finally {
      setSenderBusy(false);
    }
  }

  async function handleRemoveSender(senderId: string) {
    if (!specialistId || senderBusy) return;
    setSenderBusy(true);
    setSenderError(null);
    try {
      await removeEvolutionSender(specialistId, senderId);
      const nextPage = senderPage > 0 && (allowedSenders?.items.length ?? 0) === 1 ? senderPage - 1 : senderPage;
      setSenderPage(nextPage);
      setAllowedSenders(await loadEvolutionAllowedSenders(specialistId, nextPage, 20));
    } catch (cause: unknown) {
      setSenderError(cause instanceof Error ? cause.message : "Não foi possível remover este número.");
    } finally {
      setSenderBusy(false);
    }
  }

  const conversations = inbox?.items ?? [];
  const allowedSenderItems = allowedSenders?.items ?? [];
  const allowedSenderPages = Math.max(1, Math.ceil((allowedSenders?.total ?? 0) / (allowedSenders?.size || 20)));
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

          <section className={styles.setupCard} aria-labelledby="evolution-allowed-senders-heading">
            <div className={styles.cardHeading}>
              <div><h4 id="evolution-allowed-senders-heading">Números autorizados</h4>
                <p>Somente estes números podem iniciar perguntas para o especialista.</p></div>
              {canConfigure && connection?.connected && allowedSenders && <code>{allowedSenders.total} liberado(s)</code>}
            </div>
            {canConfigure ? connection?.connected ? (
              <>
                <form className={styles.form} onSubmit={(event) => void handleAllowSender(event)}>
                  <label>
                    <span>Número com código do país</span>
                    <input type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)}
                      placeholder="+55 11 99999-9999" maxLength={24} autoComplete="tel" />
                    <small>Use o formato internacional, por exemplo +5511999999999. A lista vazia bloqueia todos.</small>
                  </label>
                  <button type="submit" disabled={senderBusy || !phoneNumber.trim()}>
                    {senderBusy ? "Salvando…" : "Autorizar número"}
                  </button>
                </form>
                {senderError && <p className={styles.error} role="alert">{senderError}</p>}
                {allowedSenders === null ? (
                  <p className={styles.senderNote}>{senderError ? "Não foi possível carregar a lista; atualize a aba para tentar novamente." : "Carregando números autorizados…"}</p>
                ) : allowedSenderItems.length === 0 ? (
                  <p className={styles.senderNote}>Nenhum número autorizado. O bot ignora todas as mensagens recebidas.</p>
                ) : (
                  <>
                    <ul className={styles.senderList}>
                      {allowedSenderItems.map((sender) => (
                        <li key={sender.id} className={styles.senderRow}>
                          <code>{sender.phoneNumber}</code>
                          <button type="button" disabled={senderBusy} onClick={() => void handleRemoveSender(sender.id)}>
                            Remover
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className={styles.senderControls}>
                      <span>Página {senderPage + 1} de {allowedSenderPages}</span>
                      <button type="button" disabled={senderPage === 0} onClick={() => setSenderPage((page) => Math.max(0, page - 1))}>Anterior</button>
                      <button type="button" disabled={senderPage + 1 >= allowedSenderPages} onClick={() => setSenderPage((page) => page + 1)}>Próxima</button>
                    </div>
                  </>
                )}
              </>
            ) : <p className={styles.senderNote}>Registre o canal Evolution para configurar quem pode enviar perguntas.</p> : (
              <p className={styles.readOnly}>Somente o administrador da empresa pode consultar ou alterar esta lista.</p>
            )}
            <p className={styles.direction}>Remover um número bloqueia novas perguntas desse contato; o histórico existente continua visível no inbox.</p>
          </section>

          <section
            className={`${styles.inboxSection} ${chatFullscreen ? styles.inboxFullscreen : ""}`}
            aria-label="Conversas recebidas do WhatsApp"
            role={chatFullscreen ? "dialog" : undefined}
            aria-modal={chatFullscreen || undefined}
          >
            <div className={styles.inboxHeading}>
              <div><h4>Conversas recebidas</h4><p>{inbox?.total ?? 0} conversa(s) · atualização a cada segundo</p></div>
              <div className={styles.listControls}>
                <span>{loadingInbox ? "Atualizando…" : `Página ${inboxPage + 1} de ${inboxPages}`}</span>
                <button type="button" disabled={inboxPage === 0} onClick={() => setInboxPage((page) => Math.max(0, page - 1))}>Mais recentes</button>
                <button type="button" disabled={inboxPage + 1 >= inboxPages} onClick={() => setInboxPage((page) => page + 1)}>Mais antigas</button>
                <button
                  ref={fullscreenButtonRef}
                  type="button"
                  className={styles.fullscreenButton}
                  aria-pressed={chatFullscreen}
                  onClick={() => setChatFullscreen((value) => !value)}
                >
                  {chatFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                </button>
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
                      <div ref={threadEndRef} />
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
