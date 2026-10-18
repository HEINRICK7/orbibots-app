export default function UnlinkedAccountPage() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#111315", padding: 24 }}>
    <section role="status" style={{ maxWidth: 520, padding: 32, background: "#191c1f", border: "1px solid #32363b", borderRadius: 14 }}>
      <h1 style={{ margin: "0 0 16px", color: "#f3f4f5", fontSize: 24 }}>Nenhuma empresa associada</h1>
      <p style={{ margin: "0 0 24px", color: "#b6bbc1", lineHeight: 1.6 }}>Sua conta autenticou, mas o backend não encontrou uma membership ativa. Peça ao administrador da empresa para confirmar o convite.</p>
      <a href="/api/auth/logout" style={{ color: "#e6e9ed" }}>Sair</a>
    </section>
  </main>;
}
