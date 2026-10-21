"use client";

import { useState, type ChangeEvent } from "react";
import type { ApiOperation } from "../application/api-operation";
import type { SourceConnectionResponse, SpecialistResponse } from "../domain/api-contracts";
import { Glyph } from "./Glyph";
import styles from "./AgentBuilder.module.css";

interface RevisionCandidate {
  revisionId: string;
  status: string;
  sourceId: string;
  itemCount: number;
  itemLabel: string;
}

interface KnowledgeTabProps {
  specialist: SpecialistResponse | null;
  source: SourceConnectionResponse | null;
  candidate: RevisionCandidate | null;
  sessionReady: boolean;
  busyOperation: ApiOperation | null;
  uncertainOperations: Set<ApiOperation>;
  onIngestText: (document: { documentKey: string; title: string; content: string }) => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  onCreateSource: () => void;
  onSyncSource: () => void;
}

export function KnowledgeTab(props: KnowledgeTabProps) {
  const [documentKey, setDocumentKey] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    void props.onUpload(file);
    event.target.value = "";
  }

  const canWrite = Boolean(props.specialist && props.sessionReady);
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeading}>
        <div>
          <h3>Conhecimento</h3>
          <p>Envie fontes que o backend consiga ingerir e indexar para uma revisão candidata.</p>
        </div>
        <span className={props.specialist ? styles.localTag : styles.pendingTag}>
          {props.specialist ? "ESPECIALISTA DA API SELECIONADO" : "CRIE UM ESPECIALISTA PRIMEIRO"}
        </span>
      </div>

      <section className={styles.knowledgeSection} aria-labelledby="text-document-heading">
        <div className={styles.sourceHeading}>
          <div>
            <h4 id="text-document-heading">Documento de texto</h4>
            <span className={styles.fieldHelp}>MARKDOWN é aceito pelo endpoint. O conteúdo será enviado ao backend nesta solicitação.</span>
          </div>
        </div>
        <div className={styles.formPair}>
          <label className={styles.textField}>
            <span className={styles.fieldLabel}>Chave do documento</span>
            <input className={styles.textInput} value={documentKey} onChange={(event) => setDocumentKey(event.target.value)} placeholder="faq-entrega" maxLength={120} />
          </label>
          <label className={styles.textField}>
            <span className={styles.fieldLabel}>Título</span>
            <input className={styles.textInput} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="FAQ de entrega" maxLength={160} />
          </label>
        </div>
        <label className={styles.textField}>
          <span className={styles.fieldLabel}>Conteúdo Markdown</span>
          <textarea
            className={styles.textArea}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="## Entrega\nDescreva somente informações que devem compor a base de conhecimento."
            rows={6}
          />
        </label>
        <button
          className={styles.primaryButton}
          type="button"
          aria-busy={props.busyOperation === "document-text"}
          disabled={!canWrite || props.uncertainOperations.has("document-text") || !documentKey.trim() || !title.trim() || !content.trim()}
          onClick={() => void props.onIngestText({ documentKey: documentKey.trim(), title: title.trim(), content })}
        >
          <Glyph name="cloud" /> {props.busyOperation === "document-text" ? "Enviando texto…" : "Enviar texto ao backend"}
        </button>
      </section>

      <section className={styles.knowledgeSection} aria-labelledby="file-heading">
        <div className={styles.sourceHeading}>
          <div>
            <h4 id="file-heading">Enviar arquivo</h4>
            <span className={styles.fieldHelp}>MD, TXT, PDF ou DOCX · limite confirmado pelo backend: 5 MiB.</span>
          </div>
        </div>
        <label className={styles.filePicker}>
          <input type="file" accept=".md,.markdown,.txt,.pdf,.docx" disabled={!canWrite || props.busyOperation !== null || props.uncertainOperations.has("document-upload")} onChange={handleFileChange} />
          <span className={styles.filePickerButton}><Glyph name="cloud" /> Escolher arquivo</span>
          <span className={styles.fileName}>{selectedFileName || "Nenhum arquivo selecionado"}</span>
        </label>
      </section>

      <section className={styles.knowledgeSection} aria-labelledby="catalog-heading">
        <div className={styles.sourceHeading}>
          <div>
            <h4 id="catalog-heading">Catálogo Doces &amp; Sonhos</h4>
            <span className={styles.fieldHelp}>Esta fonte é suportada pelo backend. A sincronização retorna uma revisão candidata.</span>
          </div>
        </div>
        {!props.source ? (
          <button
            className={styles.secondaryButton}
            type="button"
            aria-busy={props.busyOperation === "source-create"}
            disabled={!canWrite || props.uncertainOperations.has("source-create")}
            onClick={props.onCreateSource}
          >
            <Glyph name="link" /> {props.busyOperation === "source-create" ? "Conectando…" : "Conectar catálogo público"}
          </button>
        ) : (
          <div className={styles.apiResult}>
            <span>Source ID</span><code>{props.source.sourceId}</code>
            <span>Status retornado</span><code>{props.source.status}</code>
            <button
              className={styles.secondaryButton}
              type="button"
              aria-busy={props.busyOperation === "source-sync"}
              disabled={!canWrite || props.uncertainOperations.has("source-sync")}
              onClick={props.onSyncSource}
            >
              <Glyph name="refresh" /> {props.busyOperation === "source-sync" ? "Sincronizando…" : "Sincronizar catálogo"}
            </button>
          </div>
        )}
      </section>

      {props.candidate ? (
        <div className={styles.revisionCard}>
          <div className={styles.fieldTitleRow}>
            <span className={styles.fieldTitleRow}><strong>Revisão retornada pela API</strong><span className={styles.draftTag}>{props.candidate.status.toUpperCase()}</span></span>
          </div>
          <code>{props.candidate.revisionId}</code>
          <span className={styles.fieldHelp}>
            {props.candidate.itemCount} {props.candidate.itemLabel} · source {props.candidate.sourceId}
          </span>
        </div>
      ) : (
        <div className={styles.emptySource}>Nenhuma ingestão foi confirmada nesta sessão.</div>
      )}

      <div className={styles.inlineNotice}>
        <Glyph name="info" />
        <span>URLs, campos gerais do negócio e listagem/histórico de fontes não têm operações disponíveis no contrato atual. A interface não os simula.</span>
      </div>
    </div>
  );
}
