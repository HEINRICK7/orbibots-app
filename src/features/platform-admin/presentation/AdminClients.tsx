"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanySummary } from "@/features/agent-builder/domain/api-contracts";
import { getAccount } from "@/lib/account-api";
import type { TenantMembershipResponse } from "@/features/agent-builder/domain/api-contracts";
import { AdminApiError, createCompany, inviteOwner, listCompanies } from "../infrastructure/admin-api";
import { Glyph } from "@/features/agent-builder/presentation/Glyph";
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
  const [workspaces, setWorkspaces] = useState<TenantMembershipResponse[]>([]);

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
      setWorkspaces(account.memberships);
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
      const account = await getAccount().catch(() => null);
      if (account) setWorkspaces(account.memberships);
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

  const ready = Boolean(name.trim() && segment.trim() && email.trim());

  return (
    <main className={styles.screen}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/" aria-label="OrbiBots, início">
          <span className={styles.mark}><Glyph name="robot" /></span>
          <span><small className={styles.kicker}>ORBITBOTS</small><strong className={styles.title}>Console de empresas</strong></span>
        </a>
        <div className={styles.topActions}>
          {workspaces.map((workspace) => <a key={workspace.tenantId} className={styles.workspaceAction} href={"/workspace/" + workspace.tenantId}>Abrir {workspace.tenantName}</a>)}
          <a className={styles.logout} href="/api/auth/logout">Sair</a>
        </div>
      </header>

      <section className={styles.pageIntro}>
        <div><p className={styles.kicker}>ADMINISTRAÇÃO DA PLATAFORMA</p><h1>Empresas</h1><p>Crie um workspace e convide o primeiro administrador da empresa.</p></div>
        <span className={styles.accessLabel}><i /> Acesso de plataforma</span>
      </section>

      {error && <div className={`${styles.feedback} ${styles.feedbackError}`} role="alert"><span className={styles.feedbackIcon}>!</span><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Fechar aviso">×</button></div>}
      {notice && <div className={`${styles.feedback} ${styles.feedbackSuccess}`} role="status"><span className={styles.feedbackIcon}>✓</span><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Fechar aviso">×</button></div>}

      <div className={styles.workspace}>
        <section className={styles.panel} aria-labelledby="create-company-title">
          <div className={styles.panelHeading}><span className={styles.sectionNumber}>01</span><div><h2 id="create-company-title">Nova empresa</h2><p>Os dados são enviados ao backend no envio do formulário.</p></div></div>
          <form ref={createFormRef} className={styles.form} onSubmit={(event) => void handleCreate(event)}>
            <label className={styles.field}>Empresa
              <input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} maxLength={200} required disabled={saving || Boolean(pendingCompany)} placeholder="Nome da empresa" />
            </label>
            <label className={styles.field}>Segmento
              <input className={styles.input} value={segment} onChange={(event) => setSegment(event.target.value)} maxLength={120} required disabled={saving || Boolean(pendingCompany)} placeholder="Ex.: Tecnologia" />
            </label>
            <label className={styles.field}>E-mail do responsável
              <input className={styles.input} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={320} required disabled={saving || Boolean(pendingCompany)} placeholder="responsavel@empresa.com" />
            </label>
            <button className={styles.submit} type="submit" aria-busy={saving} disabled={saving || Boolean(pendingCompany) || !ready}>
              <Glyph name="plus" /> {saving ? "Salvando…" : "Criar empresa e convidar"}
            </button>
            <p className={styles.help}>O convite usa o Cognito. A senha temporária e o MFA são tratados no primeiro acesso. WhatsApp ainda não está conectado.</p>
          </form>
          {pendingCompany && <div className={styles.retry}>
            <p>Não foi possível confirmar a criação. A tentativa usa a mesma chave para evitar uma empresa duplicada.</p>
            <button className={styles.secondaryButton} type="button" onClick={() => createFormRef.current?.requestSubmit()} disabled={saving}>Tentar novamente</button>
          </div>}
          {pendingInvite && <div className={styles.retry}>
            <p>O convite de <strong>{pendingInvite.email}</strong> ainda não foi confirmado. Repetir mantém a mesma chave.</p>
            <button className={styles.secondaryButton} type="button" onClick={() => void deliverInvitation(pendingInvite.tenantId, pendingInvite.email, pendingInvite.key)} disabled={saving}>{saving ? "Verificando…" : "Verificar solicitação"}</button>
          </div>}
        </section>

        <section className={`${styles.panel} ${styles.companyPanel}`} aria-labelledby="companies-title" aria-busy={loading}>
          <div className={styles.listHead}>
            <div><p className={styles.kicker}>DIRETÓRIO</p><h2 id="companies-title">Empresas cadastradas</h2></div>
            <div className={styles.listActions}><span className={styles.count}>{loading ? "Consultando" : total === 1 ? "1 empresa" : `${total} empresas`}</span><button className={styles.secondaryButton} type="button" onClick={() => void refresh(0)} disabled={loading}><Glyph name="refresh" /> Atualizar</button></div>
          </div>
          {loading ? <div className={styles.loading} role="status"><span className={styles.spinner} />Carregando empresas…</div> : companies.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyMark}><Glyph name="building" /></span>
              <p className={styles.emptyTitle}>Nenhuma empresa ainda</p>
              <p className={styles.emptyText}>A primeira que você criar aparece aqui, com o responsável e o estado do convite.</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>Empresas cadastradas e situação do convite</caption>
                <thead><tr><th scope="col">Empresa</th><th scope="col">Segmento</th><th scope="col">Responsável</th><th scope="col">Convite</th><th scope="col">Conta</th><th scope="col"><span className={styles.srOnly}>Ações</span></th></tr></thead>
                <tbody>{companies.map((company: CompanySummary) => <tr key={company.id}>
                  <td><span className={styles.company}>{company.name}</span></td>
                  <td>{company.segment}</td>
                  <td>{company.ownerEmail || <span className={styles.muted}>Ainda não convidado</span>}</td>
                  <td><InvitationTag status={company.invitationStatus} /></td>
                  <td><span className={styles.accountTag}>{accountLabel(company.status)}</span></td>
                  <td>{company.ownerEmail && <button className={styles.rowAction} type="button" aria-label={`Reenviar convite para ${company.name}`} disabled={saving} onClick={() => void deliverInvitation(company.id, company.ownerEmail!, crypto.randomUUID())}>Reenviar convite</button>}</td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
          {total > 20 && <div className={styles.pagination}>
            <span>Página {page + 1} de {Math.ceil(total / 20)}</span>
            <div><button className={styles.secondaryButton} type="button" disabled={loading || page === 0} onClick={() => void refresh(page - 1)}>Anterior</button><button className={styles.secondaryButton} type="button" disabled={loading || (page + 1) * 20 >= total} onClick={() => void refresh(page + 1)}>Próxima</button></div>
          </div>}
        </section>
      </div>
    </main>
  );
}

function accountLabel(status: string) {
  if (status === "ACTIVE") return "Ativa";
  if (status === "SUSPENDED") return "Suspensa";
  return status;
}

function InvitationTag({ status }: { status: string | null }) {
  if (!status) return <span className={styles.invitationTag}>Sem convite</span>;
  if (status === "SENT") return <span className={`${styles.invitationTag} ${styles.invitationSent}`}>Solicitado</span>;
  if (status === "FAILED") return <span className={`${styles.invitationTag} ${styles.invitationFailed}`}>Falhou</span>;
  if (status === "PENDING") return <span className={`${styles.invitationTag} ${styles.invitationPending}`}>Pendente</span>;
  return <span className={styles.invitationTag}>{status}</span>;
}
