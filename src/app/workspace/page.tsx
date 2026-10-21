"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TenantMembershipResponse } from "@/features/agent-builder/domain/api-contracts";
import { AccountApiError, getAccount } from "@/lib/account-api";
export default function WorkspaceChooser() {
  const router = useRouter();
  const [memberships, setMemberships] = useState<TenantMembershipResponse[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    getAccount().then((account) => {
      if (account.platformAdmin) router.replace("/admin/clients");
      else if (account.memberships.length === 0) router.replace("/account/unlinked");
      else if (account.memberships.length === 1) router.replace("/workspace/" + account.memberships[0].tenantId);
      else setMemberships(account.memberships);
    }).catch((reason: unknown) => {
      if (reason instanceof AccountApiError && reason.status === 401) router.replace("/login");
      else setError(reason instanceof Error ? reason.message : "Não foi possível carregar os workspaces.");
    });
  }, [router]);
  if (error) return <main className="appStatePage"><section className="appStateCard" role="alert"><p className="appStateEyebrow">WORKSPACES</p><h1 className="appStateTitle">Não foi possível carregar as empresas</h1><p className="appStateCopy">{error}</p><a className="appStateAction appStateActionSecondary" href="/api/auth/logout">Sair</a></section></main>;
  if (memberships.length === 0) return <main className="appStatePage"><section className="appStateCard" role="status"><div className="appStateBrand"><span className="appStateLogo">O</span><span className="appStateBrandName">OrbiBots</span></div><div className="appStateLoading"><span className="appStateSpinner" aria-hidden="true" />Carregando seus workspaces…</div></section></main>;
  return <main className="appStatePage"><div className="appStateLayout">
    <section className="appStateCard">
      <div className="appStateBrand"><span className="appStateLogo">O</span><span className="appStateBrandName">OrbiBots</span></div>
      <p className="appStateEyebrow">SELEÇÃO DE EMPRESA</p>
      <h1 className="appStateTitle">Escolha um workspace</h1>
      <p className="appStateCopy">Você tem acesso a mais de uma empresa. Selecione onde quer trabalhar.</p>
      <div className="workspaceChoiceList">
        {memberships.map((workspace) => <button className="workspaceChoice" key={workspace.tenantId} onClick={() => router.push("/workspace/" + workspace.tenantId)}>
          <span><span className="workspaceChoiceName">{workspace.tenantName}</span><span className="workspaceChoiceMeta">{workspace.segment} · {workspace.role}</span></span>
          <span className="workspaceChoiceArrow" aria-hidden="true">→</span>
        </button>)}
      </div>
    </section>
  </div></main>;
}
