"use client";
import { useEffect, useState } from "react";
import { Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { AccountApiError, getAccount } from "@/lib/account-api";
export default function HomePage() {
  const router = useRouter();
  const [message, setMessage] = useState("Validando sua sessão...");
  useEffect(() => {
    let active = true;
    getAccount().then((account) => {
      if (!active) return;
      if (account.platformAdmin) router.replace("/admin/clients");
      else if (account.memberships.length === 0) router.replace("/account/unlinked");
      else if (account.memberships.length === 1) router.replace("/workspace/" + account.memberships[0].tenantId);
      else router.replace("/workspace");
    }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof AccountApiError && error.status === 401) { router.replace("/login"); return; }
      setMessage(error instanceof Error ? error.message : "Não foi possível verificar o acesso.");
    });
    return () => { active = false; };
  }, [router]);
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#111315" }}>
    <div style={{ textAlign: "center" }}><Spin /><Typography.Paragraph style={{ color: "#a6acb3", marginTop: 16 }}>{message}</Typography.Paragraph></div>
  </main>;
}
