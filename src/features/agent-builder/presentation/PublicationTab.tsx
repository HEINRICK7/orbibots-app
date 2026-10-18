import { Button, Tag, Typography } from "antd";
import type { ApiOperation } from "../application/api-operation";
import type { PublishRevisionResponse, SpecialistResponse } from "../domain/api-contracts";
import { Glyph } from "./Glyph";
import styles from "./AgentBuilder.module.css";

interface RevisionCandidate {
  revisionId: string;
  status: string;
  sourceId: string;
  itemCount: number;
  itemLabel: string;
}

interface PublicationTabProps {
  specialist: SpecialistResponse | null;
  candidate: RevisionCandidate | null;
  publication: PublishRevisionResponse | null;
  canPublish: boolean;
  specialistVersion: number;
  busyOperation: ApiOperation | null;
  uncertainOperations: Set<ApiOperation>;
  onPublish: () => void;
}

export function PublicationTab(props: PublicationTabProps) {
  const alreadyPublished = Boolean(props.publication && props.candidate && props.publication.revisionId === props.candidate.revisionId);
  const canPublish = Boolean(props.canPublish && props.specialist && props.candidate && !alreadyPublished && props.busyOperation === null && !props.uncertainOperations.has("publish"));
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeading}>
        <div>
          <Typography.Title level={5}>Validação e publicação</Typography.Title>
          <Typography.Paragraph>{props.canPublish ? "A API verifica revisão, empresa, papel e versão antes de publicar." : "Editor pode preparar e testar. Na V1, só Admin da empresa publica; solicitação de aprovação ainda não tem endpoint."}</Typography.Paragraph>
        </div>
        <Tag className={props.publication ? styles.localTag : styles.pendingTag}>
          {props.publication ? "PUBLICAÇÃO CONFIRMADA PELA API" : "SEM PUBLICAÇÃO CONFIRMADA"}
        </Tag>
      </div>

      <div className={styles.publishChecklist}>
        <ChecklistItem ok={Boolean(props.specialist)} label="Especialista criado" detail={props.specialist?.id ?? "A API ainda não retornou um especialista."} />
        <ChecklistItem ok={Boolean(props.candidate)} label="Revisão de conhecimento recebida" detail={props.candidate?.revisionId ?? "Envie um documento ou sincronize uma fonte."} />
        <ChecklistItem ok={Boolean(props.publication)} label="Publicação retornada pelo backend" detail={props.publication?.publishedAt ?? "A publicação ainda não foi confirmada."} />
        <ChecklistItem ok={Boolean(props.publication)} label="Autorização da publicação" detail={props.publication ? "O backend autorizou o Admin da empresa e confirmou esta publicação." : props.canPublish ? "Seu papel de Admin da empresa permite solicitar publicação; o backend valida novamente." : "Seu papel de Editor não permite publicar."} />
      </div>

      <div className={props.candidate ? styles.validationReady : styles.validationPending}>
        {props.candidate
          ? <>Revisão candidata: <code>{props.candidate.revisionId}</code> · estado informado: {props.candidate.status}</>
          : "Nenhuma revisão retornada pela API nesta sessão."}
      </div>

      {props.publication && (
        <div className={styles.apiResult}>
          <span>Revisão ativa</span><code>{props.publication.revisionId}</code>
          <span>Versão do especialista</span><code>{props.publication.version}</code>
          <span>Publicado em</span><code>{props.publication.publishedAt}</code>
        </div>
      )}

      <div className={styles.publishFooter}>
        <div className={styles.permissionText}>
          <Glyph name="lock" />
          <span>Versão enviada em If-Match: {props.specialistVersion}. Uma resposta de sucesso será a confirmação da publicação.</span>
        </div>
        <Button
          type="primary"
          icon={<Glyph name="cloud" />}
          loading={props.busyOperation === "publish"}
          disabled={!canPublish}
          onClick={props.onPublish}
        >
          Publicar revisão
        </Button>
      </div>
      {props.uncertainOperations.has("publish") && (
        <div className={styles.inlineNotice}><Glyph name="info" /><span>A resposta da publicação não foi confirmada. Não há endpoint de leitura para reconciliar; a tela bloqueia o reenvio para evitar uma publicação duplicada.</span></div>
      )}
      {alreadyPublished && <Typography.Text className={styles.fieldHelp}>Esta revisão já foi confirmada como publicada pela API.</Typography.Text>}
    </div>
  );
}

function ChecklistItem({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <div className={styles.checkItem}>
      <span className={ok ? styles.checkOk : styles.checkOff}>{ok ? <Glyph name="check" /> : <span aria-hidden="true">—</span>}</span>
      <div>
        <Typography.Text>{label}</Typography.Text>
        {detail && <Typography.Text className={styles.fieldHelp}>{detail}</Typography.Text>}
      </div>
    </div>
  );
}
