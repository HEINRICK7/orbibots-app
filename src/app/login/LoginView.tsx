"use client";

import { Alert, Button, Typography } from "antd";
import styles from "./page.module.css";

type Props = { error?: string };

export default function LoginView({ error }: Props) {
  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <div className={styles.brand}>OrbiBots</div>
        <Typography.Title level={2}>Acesse sua plataforma</Typography.Title>
        <Typography.Paragraph>
          Entre com o e-mail convidado pela equipe OrbiBots. No primeiro acesso, o Cognito solicitará a troca da senha temporária e a configuração de MFA.
        </Typography.Paragraph>
        {error && <Alert type="error" showIcon message="Não foi possível concluir o login. Tente novamente." />}
        <Button type="primary" size="large" href="/api/auth/login">
          Entrar com e-mail
        </Button>
        <Typography.Text className={styles.note}>
          O acesso é criado por convite. Não há cadastro público.
        </Typography.Text>
      </section>
    </main>
  );
}
