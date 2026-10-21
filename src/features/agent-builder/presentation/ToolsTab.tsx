import { Glyph } from "./Glyph";
import styles from "./AgentBuilder.module.css";

export function ToolsTab() {
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeading}>
        <div>
          <h3>Ferramentas e APIs</h3>
          <p>Integrações disponíveis para o especialista e credenciais da empresa.</p>
        </div>
        <span className={styles.pendingTag}>AGUARDANDO CONTRATO</span>
      </div>

      <div className={styles.unavailableFeature}>
        <span className={styles.toolIcon}><Glyph name="api" /></span>
        <div>
          <strong>Catálogo e configuração de ferramentas</strong>
          <p>A API não oferece endpoints para listar, ativar ou configurar ferramentas neste momento.</p>
        </div>
      </div>
      <div className={styles.unavailableFeature}>
        <span className={styles.toolIcon}><Glyph name="lock" /></span>
        <div>
          <strong>Credenciais</strong>
          <p>Não insira chaves de provedores ou credenciais de clientes no frontend. O backend precisa definir armazenamento e autorização por workspace.</p>
        </div>
      </div>
      <div className={styles.inlineNotice}>
        <Glyph name="info" />
        <span>A conversa hoje não executa ferramentas. A resposta da API retorna a coleção de ações vazia no contrato atual.</span>
      </div>
    </div>
  );
}
