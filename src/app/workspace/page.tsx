"use client";
import { useEffect, useState } from "react";
import { Button, Card, Spin, Typography } from "antd";
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
  if (error) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#111315", color: "#f2f4f6" }}>{error}</main>;
  if (memberships.length === 0) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#111315" }}><Spin /></main>;
  return <main style={{ minHeight: "100vh", background: "#111315", padding: 48, color: "#f2f4f6" }}>
    <Typography.Title level={3}>Escolha uma empresa</Typography.Title>
    <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
      {memberships.map((workspace) => <Card key={workspace.tenantId} title={workspace.tenantName}>
        <Typography.Paragraph>{workspace.segment} · {workspace.role}</Typography.Paragraph>
        <Button type="primary" onClick={() => router.push("/workspace/" + workspace.tenantId)}>Abrir workspace</Button>
      </Card>)}
    </div>
  </main>;
}
