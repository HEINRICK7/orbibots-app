import { Tag, Typography } from "antd";
import { Glyph } from "./Glyph";
import styles from "./AgentBuilder.module.css";

export function BehaviorTab() {
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeading}>
        <div>
          <Typography.Title level={5}>Comportamento</Typography.Title>
          <Typography.Paragraph>Personalidade, instruções e regras de atendimento do especialista.</Typography.Paragraph>
        </div>
        <Tag className={styles.pendingTag}>AGUARDANDO CONTRATO</Tag>
      </div>
      <div className={styles.unavailableFeature}>
        <span className={styles.toolIcon}><Glyph name="settings" /></span>
        <div>
          <Typography.Text strong>Configuração ainda não persistível</Typography.Text>
          <Typography.Paragraph>
            A API atual cria o especialista somente com nome. Não há endpoint para editar personalidade, instruções, idioma, regras ou prompt; por isso estes campos não aparecem como se fossem salvos.
          </Typography.Paragraph>
        </div>
      </div>
      <div className={styles.inlineNotice}>
        <Glyph name="info" />
        <span>Quando o backend oferecer operações versionadas para comportamento, os campos poderão ser ligados sem guardar alterações locais como se fossem reais.</span>
      </div>
    </div>
  );
}
