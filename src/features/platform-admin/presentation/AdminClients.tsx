"use client";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Input, Spin, Table, Tag, Typography } from "antd";
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
    { title: "Empresa", dataIndex: "name", key: "name" },
    { title: "Segmento", dataIndex: "segment", key: "segment" },
    { title: "Responsável", dataIndex: "ownerEmail", key: "ownerEmail", render: (value: string | null) => value || "Ainda não convidado" },
    { title: "Convite", dataIndex: "invitationStatus", key: "invitationStatus", render: (value: string | null) => value
      ? <Tag color={value === "SENT" ? "green" : value === "FAILED" ? "red" : "gold"}>{value === "SENT" ? "SOLICITADO AO COGNITO" : value}</Tag>
      : <Tag>SEM CONVITE</Tag> },
    { title: "Conta", dataIndex: "status", key: "status", render: (value: string) => <Tag>{value}</Tag> },
    { title: "Ação", key: "action", render: (_value, record) => record.ownerEmail
      ? <Button size="small" disabled={saving} onClick={() => void deliverInvitation(record.id, record.ownerEmail!, crypto.randomUUID())}>Reenviar convite</Button>
      : null },
  ];

  return <main className={styles.screen}>
    <header className={styles.header}>
      <div><div className={styles.eyebrow}>OrbiBots · Administração</div><Typography.Title level={2}>Empresas</Typography.Title></div>
      <Button href="/api/auth/logout">Sair</Button>
    </header>
    {error && <Alert type="error" showIcon message={error} closable onClose={() => setError("")} />}
    {notice && <Alert type="success" showIcon message={notice} closable onClose={() => setNotice("")} />}
    <Card className={styles.createPanel} title="Adicionar cliente">
      <form ref={createFormRef} className={styles.form} onSubmit={(event) => void handleCreate(event)}>
        <label>Empresa<Input value={name} onChange={(event) => setName(event.target.value)} maxLength={200} required disabled={saving || Boolean(pendingCompany)} placeholder="Nome da empresa" /></label>
        <label>Segmento<Input value={segment} onChange={(event) => setSegment(event.target.value)} maxLength={120} required disabled={saving || Boolean(pendingCompany)} placeholder="Ex.: Confeitaria" /></label>
        <label>E-mail do responsável<Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={320} required disabled={saving || Boolean(pendingCompany)} placeholder="responsavel@empresa.com" /></label>
        <Button type="primary" htmlType="submit" loading={saving} disabled={saving || Boolean(pendingCompany) || !name.trim() || !segment.trim() || !email.trim()}>Criar empresa e solicitar acesso</Button>
      </form>
      <Typography.Text className={styles.help}>A empresa é persistida pelo backend. O Cognito cria o usuário e solicita o envio do convite por e-mail com senha temporária; o primeiro acesso exige nova senha e MFA. WhatsApp ainda não está conectado.</Typography.Text>
      {pendingCompany && <div className={styles.retry}>
        <Typography.Text>Não foi possível confirmar a criação. Repetir usa a mesma chave para evitar criar uma empresa duplicada.</Typography.Text>
        <Button onClick={() => createFormRef.current?.requestSubmit()} loading={saving}>Tentar novamente</Button>
      </div>}
      {pendingInvite && <div className={styles.retry}>
        <Typography.Text>O estado do convite ainda não foi confirmado para {pendingInvite.email}. A mesma chave não dispara um segundo e-mail enquanto o pedido estiver pendente.</Typography.Text>
        <Button onClick={() => void deliverInvitation(pendingInvite.tenantId, pendingInvite.email, pendingInvite.key)} loading={saving}>Verificar solicitação</Button>
      </div>}
    </Card>
    <Card className={styles.tablePanel} title="Clientes cadastrados" extra={<Button onClick={() => void refresh(0)} disabled={loading}>Atualizar</Button>}>
      {loading ? <Spin /> : <Table<CompanySummary> rowKey="id" columns={columns} dataSource={companies} pagination={false}
        locale={{ emptyText: "O backend não retornou empresas." }} scroll={{ x: 680 }} />}
      <div className={styles.pagination}>
        <Typography.Text>{total} empresa(s) retornada(s) pelo backend</Typography.Text>
        <div>
          <Button disabled={loading || page === 0} onClick={() => void refresh(page - 1)}>Anterior</Button>
          <Button disabled={loading || (page + 1) * 20 >= total} onClick={() => void refresh(page + 1)}>Próxima</Button>
        </div>
      </div>
    </Card>
  </main>;
}
