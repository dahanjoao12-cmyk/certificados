# Certificados Digitais

Sistema interno para gerenciamento de certificados digitais e empresas de um escritório de contabilidade: cadastro de empresas, controle de certificados (com histórico completo de renovações), busca e filtros rápidos, importação de planilhas, leitura de metadados de certificados A1 (.pfx/.p12), relatórios customizáveis e exportação para Excel/CSV.

Uso 100% interno e privado. Não é um produto para clientes finais.

## Sumário

- [Finalidade](#finalidade)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Banco de dados](#banco-de-dados)
- [Instalação e execução local](#instalação-e-execução-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Supabase e migrations](#supabase-e-migrations)
- [Importação de planilhas](#importação-de-planilhas)
- [Processamento de certificado A1 (.pfx/.p12)](#processamento-de-certificado-a1-pfxp12)
- [Relatórios e exportação](#relatórios-e-exportação)
- [Segurança](#segurança)
- [Testes](#testes)
- [Deploy](#deploy)
- [Limitações atuais](#limitações-atuais)
- [Próximos passos](#próximos-passos)

## Finalidade

O escritório usava um sistema externo apenas para consultar certificados digitais. Este projeto substitui essa consulta por um sistema próprio, com cadastro completo de empresas e certificados, histórico de renovações, importação das planilhas já existentes, e relatórios/exportações configuráveis.

Princípio central da modelagem: **empresa** e **certificado** são entidades diferentes. Uma empresa pode ter vários certificados ao longo do tempo; renovar um certificado nunca apaga ou sobrescreve o anterior — o certificado antigo é preservado no histórico e apenas deixa de ser o "atual".

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | Server Components para dados, Server Actions para mutações, Route Handlers para upload/exportação/processamento — tudo roda em Node.js no servidor, nunca no navegador. |
| Estilo | Tailwind CSS v4 | Utilitário, sem dependência de um design system pesado; identidade visual própria (ver seção de design no código). |
| Banco de dados | PostgreSQL via Supabase | RLS nativo, `pg_trgm`/`unaccent` para busca, views para centralizar regras de negócio (status do certificado). |
| Autenticação | Supabase Auth (e-mail/senha) | Sistema privado, sem cadastro público; usuários são criados por um admin. |
| Planilhas (leitura) | `exceljs` (.xlsx/.xls) + `papaparse` (.csv) | Parsing no servidor. |
| Planilhas (exportação) | `exceljs` | Controle fino de formatação (CNPJ como texto, datas reais, cabeçalho em negrito). |
| Certificado A1 | `node-forge` | Parsing de PKCS#12 em JavaScript puro no servidor — nada de bibliotecas nativas/OpenSSL para instalar. |
| Validação | `zod` | Validação de formulários no servidor (Server Actions). |
| Testes | `vitest` | Testes unitários das regras de negócio (ver [Testes](#testes)). |
| Deploy | Vercel (recomendado) | Combina bem com Next.js; Route Handlers rodam como funções serverless Node.js (necessário para `node-forge`, `exceljs`). |

## Arquitetura

```
src/
  app/
    login/                    página pública de login
    (app)/                    grupo de rotas autenticadas (layout com sidebar + busca)
      page.tsx                dashboard de certificados
      empresas/                cadastro e página individual de empresas
      certificados/importar-pfx/
      importar/                importação de planilhas + histórico
      relatorios/              relatórios prontos + construtor de relatórios
      configuracoes/           limiar de "vencendo", dias de alerta
      usuarios/                gestão de usuários (admin)
    api/                       Route Handlers: exportação, importação, PFX, busca
  components/                  componentes de UI, organizados por área
  lib/
    supabase/                  clients (browser/server/admin) + proxy (middleware) de sessão
    documents/                 normalização/validação de CNPJ/CPF
    certificates/, companies/  queries, filtros, colunas, regras de status
    import/                    parsing de planilha, mapeamento, motor de deduplicação
    pfx/                       parsing de PKCS#12
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
- `companies` — a empresa. `code` (código interno) e `document` (CNPJ/CPF normalizado, só dígitos) são `unique`, mas **nenhum dos dois é primary key** — a PK é um `id` (uuid) próprio, como pedido.
- `certificates` — um certificado, sempre ligado a uma `company_id`. Uma empresa pode ter N certificados; `is_current` marca o vigente. Um trigger garante que só existe um `is_current = true` por empresa — ao inserir um novo certificado vigente, o anterior é automaticamente rebaixado (nunca apagado).
- `certificate_history` — trilha de auditoria específica de certificados (criado, renovado, atualizado, arquivado, restaurado).
- `imports` / `import_rows` — uma linha por execução de importação + uma linha por registro processado (resultado individual).
- `audit_logs` — log geral de ações (quem fez o quê).
- `report_presets` — relatórios customizados salvos.
- `settings` — configuração chave/valor (hoje: limiares de vencimento).
- `user_table_preferences` — colunas visíveis/ordem, por usuário e por tabela.

### Status do certificado é centralizado

Uma função SQL, `certificate_status(valid_to, archived)`, calcula o status (`EM_DIA`/`VENCENDO`/`VENCE_HOJE`/`VENCIDO`/`ARQUIVADO`) lendo o limiar de dias em `settings.certificate_thresholds`. Uma view, `certificates_view`, expõe certificados já com `status`, `status_priority` (para ordenar "quem precisa de atenção primeiro") e `days_remaining` prontos. **Toda** tela/relatório usa essa view — não há um único lugar no código da aplicação recalculando essa regra para exibição de dados reais (só existe uma cópia em TypeScript, para UI otimista, com um comentário deixando claro que ela é secundária).

### Índices e constraints

Índices em `document`, `code`, `municipality`, `uf`, `valid_to`, `archived`, e índices trigram (`pg_trgm`) em `corporate_name`/`trade_name`/`short_name` para busca textual rápida. `companies.document` e `companies.code` são `unique` (deduplicação); `certificates` não tem nenhuma constraint de unicidade por empresa além de fingerprint opcional — isso é proposital, para nunca impedir o histórico de múltiplos certificados.

### RLS

RLS habilitado em todas as tabelas. Qualquer usuário autenticado pode ler/gravar empresas e certificados; exclusão, configurações e gestão de usuários são restritas a `admin` (ver `supabase/migrations/0003_rls_policies.sql`). Isso é propositalmente simples — nada de um RBAC granular por enquanto (seção 51 do briefing pediu exatamente isso).

## Instalação e execução local

Pré-requisitos: Node.js 20+ e um projeto Supabase (gratuito serve para começar).

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

Abra http://localhost:3000. Você precisa aplicar as migrations e criar o primeiro usuário admin antes de conseguir entrar (próxima seção).

## Variáveis de ambiente

Ver `.env.example`. Três variáveis, todas do painel do Supabase (*Project Settings → API*):

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — públicas, usadas pelo client autenticado (respeitam RLS).
- `SUPABASE_SERVICE_ROLE_KEY` — **secreta**, usada só em código de servidor (`src/lib/supabase/admin.ts`, marcado `server-only`) para a única operação que legitimamente precisa ignorar RLS: criação de usuários pelo admin.

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

## Importação de planilhas

Fluxo em `/importar`: enviar arquivo → mapear colunas → prévia (dry run completo, sem gravar nada) → confirmar → relatório do resultado, com tudo registrado em `imports`/`import_rows` (consultável em `/importar/historico`).

Pontos importantes de design:

- **Mapeamento livre**, não fixo: qualquer coluna do arquivo pode virar qualquer campo do sistema (CNPJ, código, razão social, nome abreviado, vencimento, etc.) — cobre as duas planilhas reais do escritório (cadastro/códigos e certificados/vencimentos) com o mesmo fluxo, cruzando por CNPJ/CPF normalizado.
- **Deduplicação**: linhas repetidas com o mesmo CNPJ dentro do mesmo arquivo são consolidadas em memória durante o processamento — não criam empresas duplicadas.
- **Conflitos não são resolvidos silenciosamente**: se uma linha traz um código diferente do já cadastrado para aquele CNPJ, isso é reportado como conflito e o código existente é mantido (a linha completa é sinalizada para revisão humana — não há hoje uma UI de "manter existente vs. usar importado" por linha; ver [Limitações](#limitações-atuais)).
- **Certificados**: deduplicados por (empresa, vencimento). Um vencimento mais novo que o atual vira o certificado corrente (e o anterior é preservado no histórico); um vencimento mais antigo é adicionado só como registro histórico.
- Arquivos aceitos: `.xlsx`, `.xls`, `.csv`.

## Processamento de certificado A1 (.pfx/.p12)

Fluxo em `/certificados/importar-pfx`. Este é o ponto mais sensível do sistema em termos de segurança — leia a seção [Segurança](#segurança) também.

O que o sistema faz:

1. Recebe o arquivo e a senha **apenas no servidor** (nunca em uma API pública, nunca processado no navegador).
2. Usa `node-forge` para abrir o PKCS#12 e ler o certificado X.509: subject, issuer, número de série, validade, fingerprint (SHA-1 e SHA-256), algoritmo de assinatura.
3. Tenta identificar a empresa automaticamente por uma heurística sobre o campo *Common Name* (convenção comum da ICP-Brasil: `RAZÃO SOCIAL:CNPJ`). **Isto não é uma leitura da extensão `subjectAltName`/`otherName` específica da ICP-Brasil** (que tem OIDs próprios para CNPJ/CPF/responsável/data de nascimento, definidos na DOC-ICP-05) — implementar esse decodificador ASN.1 completo ficou fora do escopo desta versão. Quando o CN não segue essa convenção, o campo fica `null` e o usuário escolhe a empresa manualmente — o sistema nunca "inventa" um CNPJ.
4. Descarta o arquivo e a senha assim que os metadados são extraídos. Nada é salvo em disco; a chave privada nunca é lida.
5. Ao confirmar, só os metadados (não o arquivo) são gravados em `certificates`, com `origin = 'pfx'` e `processed_at` preenchido.

Certificados **A3** (armazenados em token/smartcard) não têm arquivo para processar da mesma forma — o cadastro é manual, e a arquitetura de metadados é a mesma usada pelo A1, então nada impede estender isso depois.

## Relatórios e exportação

- `/relatorios/novo` é o construtor de relatórios: escolha a base (Empresas, ou Certificados já com os dados da empresa), filtre, escolha e reordene as colunas, ordene, visualize e exporte. Pode salvar a configuração inteira como um relatório nomeado (`report_presets`).
- `/relatorios` reúne atalhos prontos (por status, por vencimento, por modelo A1/A3, etc.) mais quatro relatórios que não cabem no filtro genérico: empresas sem certificado, empresas com mais de um certificado, histórico de renovações e log de auditoria — esses quatro são views/queries dedicadas, não o construtor genérico.
- Toda exportação (dashboard, construtor de relatórios) respeita os filtros e a ordenação aplicados, e exporta **todos os registros filtrados**, não só a página visível.
- Excel: CNPJ/CPF, código e UF são gravados como **texto** (nunca viram número/notação científica); datas são células de data reais (`dd/mm/yyyy`); cabeçalho em negrito.
- Geração de relatório é estritamente leitura — nenhuma rota de relatório grava dado algum.

## Segurança

- Autenticação via Supabase Auth; toda rota exceto `/login` exige sessão (proxy em `src/proxy.ts` + checagem por página).
- RLS em todas as tabelas (ver seção de banco de dados).
- `SUPABASE_SERVICE_ROLE_KEY` só é referenciada em `src/lib/supabase/admin.ts`, marcado `import "server-only"` — um erro de build acontece se algum código de cliente tentar importar esse módulo.
- Senha de certificado PFX: nunca gravada em banco, nunca logada, nunca enviada a analytics. Existe só como variável local da requisição que processa o upload.
- Arquivo PFX/P12: processado e descartado; nunca fica no disco do servidor nem é versionado.
- `.gitignore` bloqueia planilhas reais (`*.xlsx`, `*.xls`, `*.csv`) e certificados (`*.pfx`, `*.p12`) por padrão, além de `.env*` (com exceção do `.env.example`).
- Auditoria (`audit_logs`) registra criações/edições/arquivamentos/importações/exportações/gestão de usuários — nunca senhas.

## Testes

```bash
npm test
```

41 testes (Vitest) cobrindo lógica pura, sem depender de um banco real:

- Validação/normalização/formatação de CNPJ e CPF (com e sem máscara, dígitos verificadores, casos inválidos).
- Cálculo de status do certificado (em dia, vencendo, vence hoje, vencido, arquivado, limiar configurável).
- Parsing de datas em planilha (`dd/mm/yyyy`, `yyyy-mm-dd`, datas impossíveis).
- Parsing de PKCS#12 contra um certificado autoassinado gerado no próprio teste (senha certa, senha errada, arquivo inválido, extração de CNPJ/CPF do CN, caso em que não há como identificar).
- Geração de XLSX/CSV: CNPJ e código permanecem texto (nunca notação científica), datas viram células de data reais.

**Um bug real de fuso horário foi encontrado e corrigido escrevendo esses testes**: `computeCertificateStatus` (cópia em TypeScript da regra de status, usada só para UI otimista) interpretava uma data `"yyyy-mm-dd"` como meia-noite UTC ao comparar com "hoje" em horário local — em qualquer fuso atrás de UTC isso deslocava o status em um dia. A função SQL (`certificate_status`, fonte da verdade real) nunca teve esse problema, porque comparação de `date` no Postgres não tem essa ambiguidade.

O que **não** está coberto por testes automatizados (precisa de um projeto Supabase real para testar e não foi montado neste repositório): CRUD de empresas/certificados de ponta a ponta, RLS, o motor de deduplicação de importação contra um banco real, geração de relatório via `certificates_view`. Antes de ir para produção, valide manualmente pelo menos o fluxo do item 76 do briefing original (buscar → abrir empresa → ver certificado → histórico → filtrar vencendo → exportar) contra um projeto Supabase de fato.

## Deploy

Recomendado: Vercel (Route Handlers de importação/exportação/PFX rodam como funções serverless Node.js — não use Edge Runtime nelas).

1. Crie o projeto Supabase de produção, aplique as migrations, crie o primeiro admin.
2. Configure as três variáveis de ambiente no Vercel (mesmas do `.env.example`).
3. Deploy normal de um projeto Next.js (`vercel --prod` ou integração com o repositório Git).

## Limitações atuais

- **Conflito de código na importação** é reportado, mas não há ainda uma tela de "manter existente vs. usar importado" linha a linha — a linha fica marcada como conflito e nada é sobrescrito.
- **Extração automática de CNPJ/CPF de um PFX** é uma heurística sobre o Common Name, não uma leitura da extensão ICP-Brasil `subjectAltName`/`otherName`. Quando o CN não segue o padrão, a vinculação à empresa é manual.
- **Certificados A3** só têm cadastro manual (arquitetura pronta para evoluir, sem integração real com token/smartcard).
- **Sem envio de notificações** (sistema/e-mail/WhatsApp) ainda — os limiares de alerta já ficam salvos em `settings` para quando isso for implementado.
- **Sem criação de usuário via convite por e-mail**: o admin define uma senha inicial diretamente; não há fluxo de "esqueci minha senha" nem convite; reset de senha hoje é feito pelo painel do Supabase.
- **RBAC simples**: só `admin`/`user`, sem permissões granulares por módulo.
- Nenhuma integração com OCSP/CRL/validação de revogação ICP-Brasil foi implementada — não presuma que exista uma API pública para isso (não existe, para o caso de uso deste sistema).

## Próximos passos

Ordem sugerida, mantendo o foco em empresas + certificados + vencimentos + histórico + importação + relatórios + exportação (ver seção 83 do briefing original — este sistema não deve virar um ERP genérico):

1. UI de resolução de conflito linha a linha na importação.
2. Notificações (in-app primeiro, depois e-mail).
3. Convite de usuário por e-mail (Supabase Auth já suporta `inviteUserByEmail`).
4. Registro de certificados A3 com mais metadados operacionais (localização do token, responsável).
5. Testes de integração contra um projeto Supabase de teste (companies/certificates/import end-to-end).
