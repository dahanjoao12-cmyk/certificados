# Certificados Digitais

Sistema interno para controle de validade de certificados digitais de um escritório de contabilidade: cadastro manual de empresas e certificados (com histórico completo de renovações), dashboard visual de vencimentos, notificações internas, busca e filtros rápidos, importação de planilhas, relatórios customizáveis e exportação para Excel/CSV.

Uso 100% interno e privado. Não é um produto para clientes finais.

Este é deliberadamente **um sistema de controle de validade, não um leitor/validador de certificados**: não há upload de arquivo `.pfx`/`.p12`, não há leitura automática de certificado e não há qualquer solicitação ou armazenamento de senha de certificado digital. O responsável cadastra manualmente empresa + data de vencimento; o sistema cuida de avisar quando estiver vencendo.

## Sumário

- [Finalidade](#finalidade)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Banco de dados](#banco-de-dados)
- [Instalação e execução local](#instalação-e-execução-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Supabase e migrations](#supabase-e-migrations)
- [Cadastro de certificados e aviso de vencimento](#cadastro-de-certificados-e-aviso-de-vencimento)
- [Contas de usuário](#contas-de-usuário)
- [Notificações internas e por e-mail](#notificações-internas-e-por-e-mail)
- [Importação de planilhas](#importação-de-planilhas)
- [Relatórios e exportação](#relatórios-e-exportação)
- [Segurança](#segurança)
- [Testes](#testes)
- [Deploy](#deploy)
- [Limitações atuais](#limitações-atuais)
- [Próximos passos](#próximos-passos)

## Finalidade

O escritório usava um sistema externo apenas para consultar certificados digitais. Este projeto substitui essa consulta por um sistema próprio, focado numa coisa: cadastrar manualmente os certificados das empresas e controlar de forma simples e visual quando cada um está próximo do vencimento.

Princípio central da modelagem: **empresa** e **certificado** são entidades diferentes. Uma empresa pode ter vários certificados ao longo do tempo; renovar um certificado nunca apaga ou sobrescreve o anterior — o certificado antigo é preservado no histórico e apenas deixa de ser o "atual".

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | Server Components para dados, Server Actions para mutações, Route Handlers para upload/exportação — tudo roda em Node.js no servidor, nunca no navegador. |
| Estilo | Tailwind CSS v4 | Utilitário, sem dependência de um design system pesado; identidade visual própria. |
| Banco de dados | PostgreSQL via Supabase | RLS nativo, `pg_trgm`/`unaccent` para busca, views para centralizar regras de negócio (status do certificado). |
| Autenticação | Supabase Auth (e-mail/senha) | Sistema privado, sem cadastro público; usuários são criados por um admin. |
| Planilhas (leitura) | `exceljs` (.xlsx/.xls) + `papaparse` (.csv) | Parsing no servidor. |
| Planilhas (exportação) | `exceljs` | Controle fino de formatação (CNPJ como texto, datas reais, cabeçalho em negrito). |
| Validação | `zod` | Validação de formulários no servidor (Server Actions). |
| Testes | `vitest` | Testes unitários das regras de negócio (ver [Testes](#testes)). |
| Deploy | Vercel (recomendado) | Combina bem com Next.js; Route Handlers rodam como funções serverless Node.js. |

## Arquitetura

```
src/
  app/
    login/                    página pública de login
    (app)/                    grupo de rotas autenticadas (layout com sidebar + busca)
      page.tsx                dashboard de certificados
      empresas/                cadastro e página individual de empresas
      notificacoes/            lista de alertas internos (vencendo/vencido)
      importar/                importação de planilhas + histórico
      relatorios/              relatórios prontos + construtor de relatórios
      configuracoes/           limiar padrão de "vencendo"
      usuarios/                gestão de usuários (admin)
    api/                       Route Handlers: exportação, importação, busca
  components/                  componentes de UI, organizados por área
  lib/
    supabase/                  clients (browser/server/admin) + proxy (middleware) de sessão
    documents/                 normalização/validação de CNPJ/CPF
    certificates/, companies/  queries, filtros, colunas, regras de status
    notifications/             derivação dos alertas a partir de certificates_view + leituras por usuário
    import/                    parsing de planilha, mapeamento, motor de deduplicação
    export/                    geração de XLSX/CSV
    reports/                   motor genérico do construtor de relatórios
    audit/                     log de auditoria
supabase/
  migrations/                  schema versionado (SQL puro, sem GUI)
  seed.sql                     dados fictícios para desenvolvimento
```

Nada de arquivos gigantes "faz tudo": cada regra de negócio (status do certificado, validação de documento, deduplicação de importação, etc.) mora em um módulo próprio e é reaproveitada por páginas, Server Actions e Route Handlers.

## Banco de dados

Tabelas principais (schema completo em `supabase/migrations/`):

- `profiles` — perfil do usuário autenticado (nome, e-mail, role `admin`/`user`).
- `companies` — a empresa. `code` (código interno) e `document` (CNPJ/CPF normalizado, só dígitos) são `unique`, mas **nenhum dos dois é primary key** — a PK é um `id` (uuid) próprio.
- `certificates` — um certificado, sempre ligado a uma `company_id`. Campos: `type` (e-CNPJ/e-CPF), `model` (A1/A3, só identificação — não há leitura de arquivo), `valid_from`/`valid_to`, `warning_days` (override opcional de dias de aviso **por certificado**; `null` usa o padrão global de `settings`), `notes`, `archived`, `is_current`. Uma empresa pode ter N certificados; `is_current` marca o vigente. Um trigger garante que só existe um `is_current = true` por empresa — ao inserir um novo certificado vigente, o anterior é automaticamente rebaixado (nunca apagado).
- `certificate_history` — trilha de auditoria específica de certificados (criado, renovado, atualizado, arquivado, restaurado).
- `notification_reads` — quais certificados (em alerta) cada usuário já marcou como lidos. Não existe tabela de "notificações geradas": o alerta é sempre derivado ao vivo de `certificates_view` (status), isto é só a marca de leitura por usuário.
- `imports` / `import_rows` — uma linha por execução de importação + uma linha por registro processado (resultado individual).
- `audit_logs` — log geral de ações (quem fez o quê).
- `report_presets` — relatórios customizados salvos.
- `settings` — configuração chave/valor (hoje: limiar **padrão** de vencimento, usado quando o certificado não tem `warning_days` próprio).
- `user_table_preferences` — colunas visíveis/ordem, por usuário e por tabela.

### Status do certificado é centralizado

Uma função SQL, `certificate_status(valid_to, archived, warning_days)`, calcula o status (`EM_DIA`/`VENCENDO`/`VENCE_HOJE`/`VENCIDO`/`ARQUIVADO`). O terceiro parâmetro é o `warning_days` do próprio certificado; quando `null`, cai no padrão global (`get_certificate_warning_days()`, lido de `settings.certificate_thresholds`). Uma view, `certificates_view`, expõe certificados já com `status`, `status_priority` (para ordenar "quem precisa de atenção primeiro") e `days_remaining` prontos. **Toda** tela/relatório usa essa view — não há um único lugar no código da aplicação recalculando essa regra para exibição de dados reais (só existe uma cópia em TypeScript, para UI otimista, com um comentário deixando claro que ela é secundária).

### RLS

RLS habilitado em todas as tabelas. Qualquer usuário autenticado pode ler/gravar empresas e certificados; exclusão, configurações e gestão de usuários são restritas a `admin` (ver `supabase/migrations/0003_rls_policies.sql`). `notification_reads` é privada por usuário (cada um só lê/grava suas próprias leituras).

## Instalação e execução local

Pré-requisitos: Node.js 20+ e um projeto Supabase (gratuito serve para começar).

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

Abra http://localhost:3000. Você precisa aplicar as migrations e criar o primeiro usuário admin antes de conseguir entrar (próxima seção).

## Variáveis de ambiente

Ver `.env.example` para o arquivo completo. Resumo:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — do painel do Supabase (*Project Settings → API*), públicas, usadas pelo client autenticado (respeitam RLS).
- `SUPABASE_SERVICE_ROLE_KEY` — **secreta**, usada só em código de servidor (`src/lib/supabase/admin.ts`, marcado `server-only`) para as operações que legitimamente precisam ignorar RLS: convite/gestão de usuário pelo admin.
- `RESEND_API_KEY` / `EMAIL_FROM` — conta na [Resend](https://resend.com), usadas para todo e-mail que o sistema manda (convite, redefinição de senha, notificação de vencimento). Sem domínio verificado na Resend, só entrega para o e-mail da própria conta Resend.
- `CRON_SECRET` — protege `/api/cron/notify` (ver [Notificações](#notificações-internas-e-por-e-mail)). Valor aleatório qualquer, precisa ser o mesmo no agendador (Vercel Cron ou `crontab`).
- `NEXT_PUBLIC_APP_URL` — URL pública completa do app (já com o sub-caminho, se houver), usada para montar links nos e-mails.
- `NEXT_PUBLIC_BASE_PATH` — só se o app rodar numa sub-rota de um domínio compartilhado (ex.: `/certificados` atrás de um Nginx com vários sistemas). Vazio = raiz do domínio (caso da Vercel). Ver [Deploy](#deploy).

Nunca commite `.env.local` (já está no `.gitignore`).

## Supabase e migrations

As migrations em `supabase/migrations/` são SQL puro, numeradas e aplicadas em ordem — nada de criar tabela manualmente pelo painel sem documentar.

**Opção A — SQL Editor do Supabase (mais simples):** copie o conteúdo de cada arquivo em `supabase/migrations/`, na ordem numérica, e rode no SQL Editor do seu projeto.

**Opção B — Supabase CLI:**

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Depois de aplicar as migrations, crie o primeiro usuário admin (a UI de "criar usuário" exige já estar logado como admin, então o primeiro precisa ser criado direto):

1. No painel do Supabase, *Authentication → Users → Add user* (defina e-mail/senha, marque "Auto Confirm").
2. A trigger `on_auth_user_created` já cria a linha em `profiles` automaticamente, com `role = 'user'`.
3. No SQL Editor: `update profiles set role = 'admin' where email = 'seu-email@escritorio.com';`

Dados de exemplo (fictícios, seguros para rodar localmente): `supabase/seed.sql`. **Nunca contém CNPJs reais nem dados de clientes.**

## Cadastro de certificados e aviso de vencimento

Fluxo: em `/empresas/{id}/certificados/novo`, o responsável escolhe/cria a empresa e preenche: tipo (e-CNPJ/e-CPF), modelo (A1/A3, só identificação), início e fim da validade, **"avisar quando estiver vencendo em ___ dias"** (opcional — em branco usa o padrão global configurado em `/configuracoes`) e observações. Não há upload de arquivo nem senha em nenhum momento.

A classificação do certificado é automática, a partir de **data atual + data de validade + dias de aviso**:

- **Em dia** — fora do período de alerta.
- **Vencendo** — dentro do período configurado (`warning_days` do certificado ou o padrão global).
- **Vence hoje**.
- **Vencido** — data de validade já passou.
- **Arquivado** — arquivado manualmente (some das contagens de "ativos", mas fica no histórico).

## Contas de usuário

Sem senha definida pelo admin: criar um usuário em `/usuarios` (admin) gera um convite via `supabase.auth.admin.generateLink({ type: "invite" })` e o sistema manda seu **próprio** e-mail (template + Resend) com o link — não usa o mailer nativo do Supabase, para manter tudo no mesmo remetente/marca.

"Esqueci minha senha" (`/recuperar-senha`) funciona igual, com `type: "recovery"`. Por segurança, a resposta é sempre a mesma mensagem genérica, exista ou não aquele e-mail cadastrado (nunca confirma/nega existência de conta).

Os dois fluxos convergem no mesmo lugar: o link do e-mail cai em `/auth/callback` (troca o `code` por uma sessão via `exchangeCodeForSession`) e redireciona para `/definir-senha`, onde a pessoa escolhe a senha (`supabase.auth.updateUser({ password })`) já autenticada.

## Notificações internas e por e-mail

Não existe uma tabela de "notificações geradas": um certificado em `VENCENDO`/`VENCE_HOJE`/`VENCIDO` (e não arquivado) **é** uma notificação, derivada ao vivo de `certificates_view`. A tabela `notification_reads` só guarda quais certificados cada usuário já marcou como lidos — por isso uma notificação "permanece disponível até ser visualizada ou marcada como lida", por usuário.

UI interna: sino no topo com contagem de não lidas e lista rápida (`src/components/layout/notifications-bell.tsx`), mais uma página completa em `/notificacoes` com "marcar como lida" individual ou em lote.

E-mail: um resumo diário (`/api/cron/notify`, protegido por `CRON_SECRET`) para todos os usuários ativos, listando tudo que está `VENCENDO`/`VENCE_HOJE`/`VENCIDO` no momento — reenviado todo dia de propósito (é um lembrete de prazo, não um alerta único). Também dá para disparar na hora em `/configuracoes` (botão "Enviar notificações por e-mail agora", admin). Na Vercel isso é agendado por `vercel.json`; num servidor próprio precisa de um cron do sistema chamando essa rota.

## Importação de planilhas

Fluxo em `/importar`: enviar arquivo → mapear colunas → prévia (dry run completo, sem gravar nada) → confirmar → relatório do resultado, com tudo registrado em `imports`/`import_rows` (consultável em `/importar/historico`).

Pontos importantes de design:

- **Mapeamento livre**, não fixo: qualquer coluna do arquivo pode virar qualquer campo do sistema (CNPJ, código, razão social, nome abreviado, vencimento, etc.).
- **Deduplicação**: linhas repetidas com o mesmo CNPJ dentro do mesmo arquivo são consolidadas em memória durante o processamento — não criam empresas duplicadas.
- **Conflitos não são resolvidos silenciosamente**: se uma linha traz um código diferente do já cadastrado para aquele CNPJ, isso é reportado como conflito e o código existente é mantido (a linha completa é sinalizada para revisão humana — não há hoje uma UI de "manter existente vs. usar importado" por linha; ver [Limitações](#limitações-atuais)).
- **Certificados**: deduplicados por (empresa, vencimento). Um vencimento mais novo que o atual vira o certificado corrente (e o anterior é preservado no histórico); um vencimento mais antigo é adicionado só como registro histórico.
- Arquivos aceitos: `.xlsx`, `.xls`, `.csv`.

## Relatórios e exportação

- `/relatorios/novo` é o construtor de relatórios: escolha a base (Empresas, ou Certificados já com os dados da empresa), filtre, escolha e reordene as colunas, ordene, visualize e exporte. Pode salvar a configuração inteira como um relatório nomeado (`report_presets`).
- `/relatorios` reúne atalhos prontos (por status, por vencimento, por modelo A1/A3, etc.) mais quatro relatórios que não cabem no filtro genérico: empresas sem certificado, empresas com mais de um certificado, histórico de renovações e log de auditoria.
- Toda exportação (dashboard, construtor de relatórios) respeita os filtros e a ordenação aplicados, e exporta **todos os registros filtrados**, não só a página visível.
- Excel: CNPJ/CPF, código e UF são gravados como **texto** (nunca viram número/notação científica); datas são células de data reais (`dd/mm/yyyy`); cabeçalho em negrito.

## Segurança

- Autenticação via Supabase Auth; toda rota exceto `/login` exige sessão (proxy em `src/proxy.ts` + checagem por página).
- RLS em todas as tabelas (ver seção de banco de dados).
- `SUPABASE_SERVICE_ROLE_KEY` só é referenciada em `src/lib/supabase/admin.ts`, marcado `import "server-only"` — um erro de build acontece se algum código de cliente tentar importar esse módulo.
- **Nenhuma senha de certificado digital é solicitada, transmitida ou armazenada pelo sistema** — o cadastro é sempre manual, sem upload de `.pfx`/`.p12`.
- `.gitignore` bloqueia planilhas reais (`*.xlsx`, `*.xls`, `*.csv`), além de `.env*` (com exceção do `.env.example`).
- Auditoria (`audit_logs`) registra criações/edições/arquivamentos/importações/exportações/gestão de usuários.

## Testes

```bash
npm test
```

35 testes (Vitest) cobrindo lógica pura, sem depender de um banco real:

- Validação/normalização/formatação de CNPJ e CPF (com e sem máscara, dígitos verificadores, casos inválidos).
- Cálculo de status do certificado (em dia, vencendo, vence hoje, vencido, arquivado, limiar configurável).
- Parsing de datas em planilha (`dd/mm/yyyy`, `yyyy-mm-dd`, datas impossíveis).
- Geração de XLSX/CSV: CNPJ e código permanecem texto (nunca notação científica), datas viram células de data reais.

O que **não** está coberto por testes automatizados: CRUD de empresas/certificados de ponta a ponta, RLS, o motor de deduplicação de importação, geração de relatório via `certificates_view`, notificações, convite/redefinição de senha. Isso já é viável de escrever hoje (existe um projeto Supabase real, inclusive com dados reais importados) — é o próximo item da lista abaixo.

## Deploy

Duas formas, ambas em uso:

**Vercel (mais simples):** Route Handlers de importação/exportação rodam como funções serverless Node.js (não use Edge Runtime nelas).
1. Crie o projeto Supabase de produção, aplique as migrations, crie o primeiro admin.
2. Configure as variáveis de ambiente no painel do projeto (mesmas do `.env.example`; deixe `NEXT_PUBLIC_BASE_PATH` vazio).
3. Deploy normal (`vercel --prod` ou integração com o repositório Git — cada push já dispara).
4. Notificação por e-mail automática: `vercel.json` já tem o cron configurado (`/api/cron/notify`, uma vez por dia).

**Servidor próprio (EC2 + Nginx, por exemplo), numa sub-rota de um domínio compartilhado:**
1. Mesmos passos de Supabase acima.
2. Defina `NEXT_PUBLIC_BASE_PATH=/nome-da-rota` (ex.: `/certificados`) e `NEXT_PUBLIC_APP_URL` já com esse caminho — isso é lido tanto em build time (`next.config.ts`) quanto em runtime.
3. `npm run build && npm run start -- -p PORTA`. O Nginx só precisa repassar a rota pro Next (`proxy_pass` simples, sem `proxy_redirect` — o app já resolve o próprio prefixo em tudo, incluindo redirects de login/Server Actions).
4. No Supabase, *Authentication → URL Configuration*: Site URL e Redirect URLs com a URL pública completa (com o sub-caminho).
5. Notificação por e-mail automática: sem cron da Vercel aqui — precisa de um `crontab` do sistema chamando `/api/cron/notify` com `Authorization: Bearer <CRON_SECRET>` (GET ou POST, ambos aceitos).

## Limitações atuais

- **Certificados A3** só têm cadastro manual (decisão deliberada — não há e nunca haverá leitura de token/smartcard neste sistema, que é um controle de validade, não um leitor de certificado).
- **RBAC simples**: só `admin`/`user`, sem permissões granulares por módulo (também deliberado, não uma lacuna a preencher).
- **Sem testes de integração** contra um Supabase real (ver seção Testes).

## Próximos passos

1. Testes de integração contra um projeto Supabase de teste (companies/certificates/import/notifications/convite end-to-end).
