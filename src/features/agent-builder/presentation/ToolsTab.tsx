import { Tag, Typography } from "antd";
import { Glyph } from "./Glyph";
import styles from "./AgentBuilder.module.css";

export function ToolsTab() {
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeading}>
        <div>
          <Typography.Title level={5}>Ferramentas e APIs</Typography.Title>
          <Typography.Paragraph>Integrações disponíveis para o especialista e credenciais da empresa.</Typography.Paragraph>
        </div>
        <Tag className={styles.pendingTag}>AGUARDANDO CONTRATO</Tag>
      </div>

      <div className={styles.unavailableFeature}>
        <span className={styles.toolIcon}><Glyph name="api" /></span>
        <div>
          <Typography.Text strong>Catálogo e configuração de ferramentas</Typography.Text>
          <Typography.Paragraph>A API não oferece endpoints para listar, ativar ou configurar ferramentas neste momento.</Typography.Paragraph>
        </div>
      </div>
      <div className={styles.unavailableFeature}>
        <span className={styles.toolIcon}><Glyph name="lock" /></span>
        <div>
          <Typography.Text strong>Credenciais</Typography.Text>
          <Typography.Paragraph>Não insira chaves de provedores ou credenciais de clientes no frontend. O backend precisa definir armazenamento e autorização por workspace.</Typography.Paragraph>
        </div>
      </div>
      <div className={styles.inlineNotice}>
        <Glyph name="info" />
        <span>A conversa hoje não executa ferramentas. A resposta da API retorna a coleção de ações vazia no contrato atual.</span>
      </div>
    </div>
  );
}
