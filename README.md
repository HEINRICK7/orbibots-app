# OrbiBots Frontend

Agent Builder em projeto separado do backend. Stack: Next.js App Router, React, TypeScript e Ant Design.

## Desenvolvimento local

Requer Node.js 20.9 ou superior.

Instale dependências e inicie:

    npm ci
    cp .env.example .env.local
    npm run dev

Configure no ambiente do servidor Next.js: ORBIBOTS_FRONTEND_ORIGIN, ORBIBOTS_API_ORIGIN, COGNITO_MANAGED_LOGIN_URL, COGNITO_APP_CLIENT_ID e COGNITO_ISSUER_URI. Em desenvolvimento, Cognito aceita callback http://localhost; na AWS, use somente a origem HTTPS publicada. Não exponha esses valores como NEXT_PUBLIC_*. O build da Amplify grava os cinco no bundle do servidor, porque o processo SSR não recebe as variáveis do branch e o `.env.production` fica fora do artefato `.next`. O host público chega em `x-forwarded-host` e só vale quando é exatamente `ORBIBOTS_FRONTEND_ORIGIN`.

## Sessão e autorização

O login usa Amazon Cognito Managed Login com Authorization Code + PKCE, state e nonce. O callback valida a assinatura RS256 e os claims iss, aud, token_use, exp e nonce do ID token com as chaves JWKS do issuer. A API continua verificando o access token Cognito assinado, validade, issuer, client_id e token_use.

Access e refresh tokens ficam em cookies HttpOnly; em produção os cookies são Secure e SameSite=Lax. O navegador chama somente o BFF same-origin; o token Bearer é acrescentado no servidor. O BFF restringe métodos/rotas, valida a origem em POST e atualiza o access token via refresh-token rotation. O logout revoga o refresh token quando o endpoint Cognito responde e sempre limpa os cookies locais.

O cliente entra apenas se o backend retornar uma membership ativa. A escolha do workspace é guardada em cookie HttpOnly; o backend valida X-Tenant-ID e resolve papel/tenant pela membership persistida. Admin da Empresa cria e publica. Editor pode preparar e testar, mas não publica na V1. O dashboard Super Admin cria a empresa e pede convite do Cognito por e-mail; o cliente recebe uma senha temporária da AWS, define a própria senha no primeiro acesso e configura MFA TOTP. O administrador não vê nem envia a senha. WhatsApp não está conectado.

## Operações conectadas e limites do contrato

O frontend chama somente endpoints existentes:

- listar/criar empresas e solicitar o convite, sob autorização Super Admin;
- criar um especialista;
- ingerir texto/arquivos MD, TXT, PDF e DOCX (o backend limita uploads a 5 MiB);
- conectar e sincronizar o catálogo público Doces & Sonhos;
- publicar uma revisão com If-Match (somente Admin da Empresa);
- iniciar conversa e enviar mensagens com Idempotency-Key, exibindo respostas/evidências do backend.

A API não lista/reabre especialistas após recarregar nem grava função, personalidade, regras ou ferramentas. Importação por URL, workflow de aprovação do Editor, WhatsApp e chat público não têm contrato conectado. Esses fluxos não são simulados nem salvos no browser.

## Verificações

    npm test
    npm run build

## Imagem para AWS

O Dockerfile constrói Next.js no modo standalone e executa como usuário sem privilégios. Na imagem, as variáveis de sessão e origens continuam sendo lidas em runtime.

O frontend ainda não tem repositório ECR nem deploy AWS separado. A origem HTTPS também depende de domínio/TLS, e o backend staging ainda aguarda a cota de CodeBuild aprovada. Nenhuma imagem ou recurso AWS do frontend foi publicado.

## Estrutura

- domain/: formatos das respostas confirmadas da API;
- application/: validação e preparação de operações de conhecimento;
- infrastructure/: cliente REST, política BFF e proxy Next.js;
- presentation/: Agent Builder, abas e Playground.
