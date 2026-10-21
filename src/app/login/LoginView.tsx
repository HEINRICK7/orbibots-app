"use client";

import { Glyph } from "@/features/agent-builder/presentation/Glyph";
import styles from "./page.module.css";

type Props = { error?: string };

export default function LoginView({ error }: Props) {
  return (
    <main className={styles.screen}>
      <section className={styles.brandPanel} aria-label="OrbiBots Studio">
        <div className={styles.brandLockup}>
          <span className={styles.brandMark}><Glyph name="robot" /></span>
          <span>OrbiBots</span>
        </div>
        <div className={styles.brandMessage}>
          <p className={styles.kicker}>ORBITBOTS · STUDIO</p>
          <h1>Conhecimento da sua empresa, pronto para conversar.</h1>
          <p>Configure especialistas, conecte fontes reais e valide respostas no mesmo espaço.</p>
        </div>
        <div className={styles.brandFoot}>Espaço de trabalho privado</div>
        <div className={styles.orbitMark} aria-hidden="true"><span /><span /><span /></div>
      </section>

      <section className={styles.accessPanel}>
        <div className={styles.accessContent}>
          <p className={styles.kicker}>ACESSO À PLATAFORMA</p>
          <h2>Acesse sua plataforma</h2>
          <p className={styles.description}>
            Entre com o e-mail convidado pela equipe OrbiBots. No primeiro acesso, o Cognito solicitará a troca da senha temporária e a configuração de MFA.
          </p>
          {error && <div className={styles.error} role="alert"><span className={styles.errorMark}>!</span><span>Não foi possível concluir o login. Tente novamente.</span></div>}
          <a className={styles.primaryAction} href="/api/auth/login">
            Entrar com e-mail <span aria-hidden="true">→</span>
          </a>
          <div className={styles.accessNote}>
            <Glyph name="lock" />
            <span>O acesso é criado por convite. Não há cadastro público.</span>
          </div>
        </div>
        <footer className={styles.footer}>Sua sessão é protegida por autenticação e MFA.</footer>
      </section>
    </main>
  );
}
