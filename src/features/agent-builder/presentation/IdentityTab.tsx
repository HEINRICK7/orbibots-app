"use client";

import type { ApiOperation } from "../application/api-operation";
import type { SpecialistResponse, TenantMembershipResponse } from "../domain/api-contracts";
import { Glyph } from "./Glyph";
import styles from "./AgentBuilder.module.css";

interface IdentityTabProps {
  workspace: TenantMembershipResponse;
  specialistName: string;
  specialist: SpecialistResponse | null;
  sessionReady: boolean;
  busyOperation: ApiOperation | null;
  uncertainOperations: Set<ApiOperation>;
  onSpecialistNameChange: (value: string) => void;
  onCreateSpecialist: () => void;
  onPreparePersonalChat: () => void;
}

export function IdentityTab(props: IdentityTabProps) {
  const specialistLocked = props.uncertainOperations.has("specialist-create");
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeading}>
        <div>
          <h3>Empresa e especialista</h3>
          <p>Empresa e papel vieram da sessão validada pelo backend.</p>
        </div>
        <span className={styles.localTag}>WORKSPACE VALIDADO</span>
      </div>

      <div className={styles.identityBlock}>
        <div className={styles.apiResult}>
          <span>Empresa</span><code>{props.workspace.tenantName}</code>
          <span>Segmento</span><code>{props.workspace.segment}</code>
          <span>Seu papel</span><code>{props.workspace.role}</code>
          <span>Usuário</span><code>{props.workspace.email}</code>
        </div>
      </div>

      <div className={styles.identityBlock}>
        <div className={styles.fieldTitleRow}>
          <label className={styles.fieldLabel} htmlFor="specialist-name">Nome do especialista</label>
          <span className={styles.fieldHelp}>Este campo é persistido pelo endpoint real de criação.</span>
        </div>
        <input
          className={styles.textInput}
          id="specialist-name"
          type="text"
          value={props.specialistName}
          onChange={(event) => props.onSpecialistNameChange(event.target.value)}
          placeholder="Ex.: Consultor de produtos"
          maxLength={120}
          disabled={Boolean(props.specialist)}
        />
        <div className={styles.actionPair}>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={props.onCreateSpecialist}
            aria-busy={props.busyOperation === "specialist-create" && props.specialistName.trim() !== "Personal Tech Agent"}
            disabled={!props.sessionReady || Boolean(props.specialist) || specialistLocked || !props.specialistName.trim()}
          >
            <Glyph name="plus" /> {props.busyOperation === "specialist-create" ? "Criando…" : "Criar especialista"}
          </button>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={props.onPreparePersonalChat}
            aria-busy={props.busyOperation !== null && !props.specialist}
            disabled={!props.sessionReady || Boolean(props.specialist) || specialistLocked}
          >
            <Glyph name="robot" /> {props.busyOperation !== null && !props.specialist ? "Preparando…" : "Abrir chat técnico"}
          </button>
        </div>
        {props.specialist && (
          <div className={styles.apiResult}>
            <span>Especialista</span><code>{props.specialist.name}</code>
            <span>ID</span><code>{props.specialist.id}</code>
            <span>Status retornado</span><code>{props.specialist.status}</code>
          </div>
        )}
      </div>

      <div className={styles.inlineNotice}>
        <Glyph name="info" />
        <span>O chat técnico grava o perfil Personal Tech Agent e uma memória curta. Personalidade livre e a lista de agentes depois do recarregar ainda não existem. WhatsApp fica para depois.</span>
      </div>
    </div>
  );
}
