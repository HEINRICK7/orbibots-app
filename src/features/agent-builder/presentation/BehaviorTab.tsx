import { Glyph } from "./Glyph";
import styles from "./AgentBuilder.module.css";

export function BehaviorTab() {
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeading}>
        <div>
          <h3>Comportamento</h3>
          <p>Personalidade, instruções e regras de atendimento do especialista.</p>
        </div>
        <span className={styles.pendingTag}>AGUARDANDO CONTRATO</span>
      </div>
      <div className={styles.unavailableFeature}>
        <span className={styles.toolIcon}><Glyph name="settings" /></span>
        <div>
          <strong>Configuração ainda não persistível</strong>
          <p>
            A API atual cria o especialista somente com nome. Não há endpoint para editar personalidade, instruções, idioma, regras ou prompt; por isso estes campos não aparecem como se fossem salvos.
          </p>
        </div>
      </div>
      <div className={styles.inlineNotice}>
        <Glyph name="info" />
        <span>Quando o backend oferecer operações versionadas para comportamento, os campos poderão ser ligados sem guardar alterações locais como se fossem reais.</span>
      </div>
    </div>
  );
}
