export default function UnlinkedAccountPage() {
  return <main className="appStatePage">
    <section className="appStateCard" role="status">
      <div className="appStateBrand"><span className="appStateLogo">O</span><span className="appStateBrandName">OrbiBots</span></div>
      <p className="appStateEyebrow">MEMBERSHIP</p>
      <h1 className="appStateTitle">Nenhuma empresa associada</h1>
      <p className="appStateCopy">Sua conta autenticou, mas o backend não encontrou uma membership ativa. Peça ao administrador da empresa para confirmar o convite.</p>
      <a className="appStateAction appStateActionSecondary" href="/api/auth/logout">Sair da plataforma</a>
    </section>
  </main>;
}
