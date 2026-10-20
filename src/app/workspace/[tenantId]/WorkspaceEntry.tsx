"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Spin, Typography } from "antd";
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
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#111315", padding: 24 }}>
    {error ? <section><Alert type="error" showIcon message={error} /><Button href="/workspace" style={{ marginTop: 16 }}>Voltar aos workspaces</Button></section>
      : <div style={{ textAlign: "center" }}><Spin /><Typography.Paragraph style={{ color: "#9ba1a8" }}>Validando membership no backend...</Typography.Paragraph></div>}
  </main>;
}
