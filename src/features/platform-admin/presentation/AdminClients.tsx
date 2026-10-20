"use client";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, ConfigProvider, Input, Spin, Table, Tag, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import type { CompanySummary } from "@/features/agent-builder/domain/api-contracts";
import { getAccount } from "@/lib/account-api";
import { AdminApiError, createCompany, inviteOwner, listCompanies } from "../infrastructure/admin-api";
import styles from "./AdminClients.module.css";

export function AdminClients() {
  const router = useRouter();
  const createFormRef = useRef<HTMLFormElement>(null);
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingInvite, setPendingInvite] = useState<{ tenantId: string; email: string; key: string } | null>(null);
  const [pendingCompany, setPendingCompany] = useState<{ name: string; segment: string; key: string } | null>(null);

  async function refresh(nextPage = page) {
    setLoading(true);
    try {
      const result = await listCompanies(nextPage, 20);
      setCompanies(result.items); setPage(result.page); setTotal(result.total);
    } catch (reason) {
      if (reason instanceof AdminApiError && reason.status === 401) router.replace("/login");
      else if (reason instanceof AdminApiError && reason.status === 403) router.replace("/");
      else setError(reason instanceof Error ? reason.message : "Não foi possível consultar as empresas.");
    } finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    getAccount().then((account) => {
      if (!active) return;
      if (!account.platformAdmin) { router.replace("/"); return; }
      void refresh(0);
    }).catch(() => router.replace("/login"));
    return () => { active = false; };
  }, [router]);

  async function deliverInvitation(tenantId: string, ownerEmail: string, key: string) {
    setSaving(true); setError("");
    try {
      const invitation = await inviteOwner(tenantId, ownerEmail, key);
      if (invitation.status === "PENDING") {
        setNotice("O backend ainda informa uma tentativa de convite pendente; o envio do e-mail não foi confirmado.");
        setPendingInvite({ tenantId, email: ownerEmail, key });
      } else if (invitation.status === "SENT") {
        setNotice(invitation.alreadySent
          ? "O pedido de convite já está registrado no Cognito para " + ownerEmail + "."
          : "O Cognito aceitou o pedido de convite para " + ownerEmail + ".");
        setPendingInvite(null);
      } else {
        throw new Error("O backend retornou um estado de convite não reconhecido.");
      }
      await refresh(0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "O envio do convite não foi confirmado.");
      setPendingInvite({ tenantId, email: ownerEmail, key });
      await refresh(0);
    } finally { setSaving(false); }
  }
  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !segment.trim() || !email.trim()) return;
    const request = pendingCompany && pendingCompany.name === name.trim() && pendingCompany.segment === segment.trim()
      ? pendingCompany
      : { name: name.trim(), segment: segment.trim(), key: crypto.randomUUID() };
    setPendingCompany(request);
    setSaving(true); setError(""); setNotice("");
    try {
      const ownerEmail = email.trim();
      const company = await createCompany(request.name, request.segment, request.key);
      setPendingCompany(null);
      const inviteKey = crypto.randomUUID();
      setPendingInvite({ tenantId: company.id, email: ownerEmail, key: inviteKey });
      setName(""); setSegment(""); setEmail("");
      await deliverInvitation(company.id, ownerEmail, inviteKey);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar a empresa.");
      if (reason instanceof AdminApiError && reason.status < 500) setPendingCompany(null);
      setSaving(false);
      await refresh(0);
    }
  }

  const columns: ColumnsType<CompanySummary> = [
    { title: "Empresa", dataIndex: "name", key: "name", render: (value: string) => <span className={styles.company}>{value}</span> },
    { title: "Segmento", dataIndex: "segment", key: "segment" },
    { title: "Responsável", dataIndex: "ownerEmail", key: "ownerEmail", render: (value: string | null) => value || <span className={styles.muted}>Ainda não convidado</span> },
    { title: "Convite", dataIndex: "invitationStatus", key: "invitationStatus", render: (value: string | null) => <InvitationTag status={value} /> },
    { title: "Conta", dataIndex: "status", key: "status", render: (value: string) => <Tag>{accountLabel(value)}</Tag> },
    { title: "Ação", key: "action", render: (_value, record) => record.ownerEmail
      ? <Button size="small" disabled={saving} onClick={() => void deliverInvitation(record.id, record.ownerEmail!, crypto.randomUUID())}>Reenviar convite</Button>
      : null },
  ];
  const ready = Boolean(name.trim() && segment.trim() && email.trim());

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { fontFamily: "Inter Variable, Inter, sans-serif", borderRadius: 10, colorPrimary: "#7eb6e6" } }}>
      <main className={styles.screen}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <span className={styles.mark} aria-hidden="true">O</span>
            <div>
              <p className={styles.kicker}>OrbiBots</p>
              <h1 className={styles.title}>Empresas</h1>
            </div>
          </div>
          <Button className={styles.logout} href="/api/auth/logout">Sair</Button>
        </header>
        {error && <Alert type="error" showIcon message={error} closable onClose={() => setError("")} />}
        {notice && <Alert type="success" showIcon message={notice} closable onClose={() => setNotice("")} />}
        <div className={styles.workspace}>
          <Card className={styles.panel} title="Nova empresa">
            <form ref={createFormRef} className={styles.form} onSubmit={(event) => void handleCreate(event)}>
              <label className={styles.field}>Empresa
                <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={200} required disabled={saving || Boolean(pendingCompany)} placeholder="Nome da empresa" />
              </label>
              <label className={styles.field}>Segmento
                <Input value={segment} onChange={(event) => setSegment(event.target.value)} maxLength={120} required disabled={saving || Boolean(pendingCompany)} placeholder="Ex.: Confeitaria" />
              </label>
              <label className={styles.field}>E-mail do responsável
                <Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={320} required disabled={saving || Boolean(pendingCompany)} placeholder="responsavel@empresa.com" />
              </label>
              <Button className={styles.submit} type="primary" htmlType="submit" loading={saving} disabled={saving || Boolean(pendingCompany) || !ready}>Criar empresa</Button>
              <p className={styles.help}>O Cognito envia o convite com senha temporária. No primeiro acesso a pessoa cria a senha e o MFA. WhatsApp ainda não está conectado.</p>
            </form>
            {pendingCompany && <div className={styles.retry}>
              <Typography.Text>Não foi possível confirmar a criação. Repetir usa a mesma chave para evitar uma empresa duplicada.</Typography.Text>
              <Button onClick={() => createFormRef.current?.requestSubmit()} loading={saving}>Tentar novamente</Button>
            </div>}
            {pendingInvite && <div className={styles.retry}>
              <Typography.Text>O convite de {pendingInvite.email} ainda não foi confirmado. A mesma chave não dispara um segundo e-mail enquanto o pedido estiver pendente.</Typography.Text>
              <Button onClick={() => void deliverInvitation(pendingInvite.tenantId, pendingInvite.email, pendingInvite.key)} loading={saving}>Verificar solicitação</Button>
            </div>}
          </Card>
          <section className={styles.panel}>
            <div className={styles.panelBody}>
              <div className={styles.listHead}>
                <h2 className={styles.listTitle}>Cadastradas</h2>
                <span className={styles.count}>{loading ? "Consultando" : total === 1 ? "1 empresa" : `${total} empresas`}</span>
                <Button onClick={() => void refresh(0)} disabled={loading}>Atualizar</Button>
              </div>
              {loading ? <Spin /> : companies.length === 0 ? (
                <div className={styles.empty}>
                  <p className={styles.emptyTitle}>Nenhuma empresa ainda</p>
                  <p className={styles.emptyText}>A primeira que você criar aparece aqui, com o responsável e o estado do convite.</p>
                </div>
              ) : (
                <Table<CompanySummary> className={styles.table} rowKey="id" columns={columns} dataSource={companies} pagination={false} scroll={{ x: 680 }} />
              )}
              {total > 20 && <div className={styles.pagination}>
                <Button disabled={loading || page === 0} onClick={() => void refresh(page - 1)}>Anterior</Button>
                <Button disabled={loading || (page + 1) * 20 >= total} onClick={() => void refresh(page + 1)}>Próxima</Button>
              </div>}
            </div>
          </section>
        </div>
      </main>
    </ConfigProvider>
  );
}

function accountLabel(status: string) {
  if (status === "ACTIVE") return "Ativa";
  if (status === "SUSPENDED") return "Suspensa";
  return status;
}

function InvitationTag({ status }: { status: string | null }) {
  if (!status) return <Tag>Sem convite</Tag>;
  if (status === "SENT") return <Tag color="green">Solicitado</Tag>;
  if (status === "FAILED") return <Tag color="red">Falhou</Tag>;
  if (status === "PENDING") return <Tag color="gold">Pendente</Tag>;
  return <Tag>{status}</Tag>;
}
