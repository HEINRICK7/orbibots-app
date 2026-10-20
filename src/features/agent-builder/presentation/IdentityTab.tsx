"use client";

import { Button, Input, Tag, Typography } from "antd";
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
          <Typography.Title level={5}>Empresa e especialista</Typography.Title>
          <Typography.Paragraph>Empresa e papel vieram da sessão validada pelo backend.</Typography.Paragraph>
        </div>
        <Tag className={styles.localTag}>WORKSPACE VALIDADO</Tag>
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
          <Typography.Text className={styles.fieldHelp}>Este campo é persistido pelo endpoint real de criação.</Typography.Text>
        </div>
        <Input
          id="specialist-name"
          value={props.specialistName}
          onChange={(event) => props.onSpecialistNameChange(event.target.value)}
          placeholder="Ex.: Consultor de produtos"
          maxLength={120}
          disabled={Boolean(props.specialist)}
        />
        <div className={styles.actionPair}>
          <Button
            type="primary"
            icon={<Glyph name="plus" />}
            onClick={props.onCreateSpecialist}
            loading={props.busyOperation === "specialist-create" && props.specialistName.trim() !== "Personal Tech Agent"}
            disabled={!props.sessionReady || Boolean(props.specialist) || specialistLocked || !props.specialistName.trim()}
          >
            Criar especialista
          </Button>
          <Button
            icon={<Glyph name="robot" />}
            onClick={props.onPreparePersonalChat}
            loading={props.busyOperation !== null && !props.specialist}
            disabled={!props.sessionReady || Boolean(props.specialist) || specialistLocked}
          >
            Abrir chat técnico
          </Button>
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
