"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AgentBuilder } from "@/features/agent-builder/presentation/AgentBuilder";
import type { TenantMembershipResponse } from "@/features/agent-builder/domain/api-contracts";
import { AccountApiError, getAccount } from "@/lib/account-api";
export default function WorkspaceEntry({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<TenantMembershipResponse | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function openWorkspace() {
      try {
        const account = await getAccount();
        const member = account.memberships.find((item) => item.tenantId === tenantId);
        if (!member || !["TENANT_ADMIN", "TENANT_EDITOR"].includes(member.role)) {
          setError("Sua conta não tem permissão para abrir este workspace."); return;
        }
        const response = await fetch("/api/auth/select-tenant", {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.detail || "Não foi possível selecionar a empresa.");
        }
        if (active) setWorkspace(member);
      } catch (reason) {
        if (reason instanceof AccountApiError && reason.status === 401) router.replace("/login");
        else if (active) setError(reason instanceof Error ? reason.message : "Não foi possível abrir o workspace.");
      }
    }
    void openWorkspace();
    return () => { active = false; };
  }, [router, tenantId]);
  if (workspace) return <AgentBuilder workspace={workspace} />;
  return <main className="appStatePage">
    {error ? <section className="appStateCard" role="alert"><p className="appStateEyebrow">ACESSO AO WORKSPACE</p><h1 className="appStateTitle">Não foi possível abrir esta empresa</h1><p className="appStateCopy">{error}</p><a className="appStateAction appStateActionSecondary" href="/workspace">Voltar aos workspaces</a></section>
      : <section className="appStateCard"><div className="appStateBrand"><span className="appStateLogo">O</span><span className="appStateBrandName">OrbiBots</span></div><div className="appStateLoading" role="status" aria-live="polite"><span className="appStateSpinner" aria-hidden="true" />Validando seu acesso no backend…</div></section>}
  </main>;
}
