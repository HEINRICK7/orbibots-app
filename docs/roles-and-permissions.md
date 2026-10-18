# OrbiBots — papéis e permissões da V1

Este é o modelo de produto informado pelo usuário para o frontend. Ele não representa uma sessão real nem substitui a autorização do backend.

## Papéis

### Super Admin — administrador da plataforma

Opera a plataforma globalmente: empresas, contas, planos, limites, configuração global, modelos, auditoria e métricas. Acesso de suporte a dados privados de uma empresa exige autorização e auditoria explícitas. Não publica agentes de clientes por padrão.

### Admin da Empresa — proprietário do workspace

Administra o perfil da própria empresa, equipe, agentes, fontes, integrações, consumo e conversas. Pode criar, editar, testar, publicar e despublicar agentes do próprio workspace. Não pode acessar outra empresa.

### Editor de Agentes — colaborador

Pode criar e editar agentes da própria empresa, atualizar conhecimento, configurar instruções e regras, testar no Playground e solicitar aprovação. Não publica diretamente na V1; não administra equipe, plano ou faturamento; não visualiza credenciais sensíveis nem altera configurações globais.

### Usuário Final — cliente do agente

Pode conversar com agentes publicados e executar ações que estejam autorizadas para si. Não entra no painel, altera agentes ou conhecimento, consulta conversas alheias nem executa ferramentas administrativas. Os canais públicos (link, widget ou aplicação integrada) dependem de contrato futuro.

## Matriz resumida

| Funcionalidade | Super Admin | Admin da Empresa | Editor | Usuário Final |
|---|---:|---:|---:|---:|
| Administrar plataforma | Sim | Não | Não | Não |
| Gerenciar empresa | Suporte autorizado | Sim | Não | Não |
| Criar e editar agente | Não por padrão | Sim | Sim | Não |
| Testar agente | Não por padrão | Sim | Sim | Não |
| Publicar agente | Não por padrão | Sim | Solicita aprovação | Não |
| Gerenciar equipe | Não | Sim | Não | Não |
| Configurar integrações | Não por padrão | Sim | Limitado | Não |
| Conversar com agente publicado | Sim | Sim | Sim | Sim |

## Segurança e integração

- Os papéis deste documento são intenção de produto, não claims emitidas pelo backend.
- O backend atual identifica `PLATFORM_ADMIN`, `TENANT_ADMIN`, `OPERATOR` e `CHANNEL_CLIENT` em JWT. O mapeamento para os quatro papéis acima precisa ser confirmado antes de conectar o login; o frontend não infere nem inventa essa equivalência.
- A tela aceita temporariamente um JWT já emitido para permitir chamadas reais; não existe login nem emissor de sessão de navegador nesta aplicação. O campo fica em memória até recarregar ou fechar a página.
- Contrato atual: tenant, especialista, fontes, sincronização, documentos e publicação exigem `TENANT_ADMIN` ou `PLATFORM_ADMIN`; conversas e mensagens aceitam também `OPERATOR` e `CHANNEL_CLIENT`. O backend verifica cada operação; o frontend não decodifica claims para liberar acesso.
- A tela ainda não implementa seleção de workspace, lista de agentes ou restauração após recarregar porque faltam endpoints de leitura.
- Entidades de empresa precisam ser tenant-scoped; cada leitura ou mutação será reautorizada no servidor com `tenantId` da sessão verificada.
- Botões desabilitados ou ocultos no frontend são só orientação de interface. A API deve aplicar RBAC e isolamento multi-tenant em cada caso de uso.
- Publicação, alterações de acesso e ações administrativas exigem auditoria no backend.
- Segredos de ferramentas e provedores não devem ser enviados ou mantidos no bundle/browser.
