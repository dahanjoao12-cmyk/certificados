# Handoff — Sistema de Certificados Digitais

Documento de continuidade para retomar este projeto em outra máquina/sessão. Leia isto primeiro; o [README.md](README.md) tem a documentação completa (arquitetura, banco, segurança, etc.) — este arquivo é só "onde eu parei e o que fazer a seguir".

Pode apagar este arquivo quando o projeto estabilizar; ele é só uma ponte entre sessões, não documentação permanente.

## Estado atual (2026-09-14)

Tudo commitado e **já enviado para o GitHub** (`dahanjoao12-cmyk/certificados`, branch `main`, 13 commits). `git status` limpo, nada pendente local.

O que existe e funciona (build + lint + 41 testes passando):

- Next.js 16 + TypeScript + Tailwind, Supabase (Auth + Postgres + RLS).
- Empresas e certificados como entidades separadas, com histórico completo de renovações (nunca sobrescreve).
- Dashboard de certificados: cards clicáveis, busca global, filtros, colunas configuráveis por usuário, paginação.
- Página da empresa: certificado atual, histórico de certificados, histórico de alterações.
- Cadastro/edição manual de empresas e certificados.
- Importação de planilha (.xlsx/.xls/.csv): mapeamento de colunas, prévia (dry-run), deduplicação, detecção de conflitos, log de importações.
- Processamento de certificado A1 (.pfx/.p12): extração de metadados no backend via `node-forge`, testado contra certificado autoassinado real.
- Construtor de relatórios (empresas / certificados), relatórios prontos, exportação XLSX/CSV.
- Configurações (limiar de "vencendo"), gestão de usuários (admin cria/gerencia).
- Auditoria básica de ações.

## O que NÃO está feito ainda

Veja a seção "Limitações atuais" do README para a lista completa. Resumo:

1. **Resolução de conflito de importação** por linha (hoje só reporta e não sobrescreve; não tem UI de "manter existente vs. usar importado").
2. **Notificações** (in-app/e-mail/WhatsApp) — só os limiares já ficam salvos em `settings`.
3. **Convite de usuário por e-mail** — admin define senha inicial diretamente, sem fluxo de "esqueci minha senha".
4. **Certificados A3** — só cadastro manual, sem qualquer integração com token/smartcard.
5. **Testes de integração contra banco real** — os 41 testes atuais são de lógica pura (CNPJ/CPF, status, datas, PFX, export); CRUD de empresas/certificados e o importador nunca foram testados contra um Supabase de verdade.

## Passo a passo para continuar em outra máquina

### 1. Clonar e instalar

```bash
git clone https://github.com/dahanjoao12-cmyk/certificados.git
cd certificados
npm install
```

Precisa de **Node.js 20+**. Se não estiver instalado: `winget install -e --id OpenJS.NodeJS.LTS` no Windows (foi assim que instalei nesta sessão — a máquina não tinha Node).

### 2. Supabase (ainda não configurado em lugar nenhum — nem local nem produção)

Nenhum projeto Supabase foi criado ainda. Isso é obrigatório antes de rodar a aplicação de verdade:

1. Criar um projeto em https://supabase.com (grátis serve para começar).
2. Aplicar as migrations em `supabase/migrations/` **na ordem numérica** (0001 → 0006) via SQL Editor do painel, ou via Supabase CLI (`supabase link` + `supabase db push`). Detalhes no README, seção "Supabase e migrations".
3. Copiar `.env.example` para `.env.local` e preencher com as 3 chaves do painel (*Project Settings → API*): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Criar o primeiro usuário: painel Supabase → *Authentication → Users → Add user* (marcar "Auto Confirm"). A trigger já cria a linha em `profiles` automaticamente com `role = 'user'`. Depois, no SQL Editor: `update profiles set role = 'admin' where email = '...';` — daí em diante, novos usuários podem ser criados pela própria tela `/usuarios`.
5. (Opcional, só para testar com dados fictícios) rodar `supabase/seed.sql` — nunca contém CNPJ real.

### 3. Rodar local

```bash
npm run dev
```

Abrir http://localhost:3000, entrar com o usuário admin criado no passo 2.4.

### 4. Verificar que nada quebrou

```bash
npm test          # 41 testes, deve passar
npm run lint       # deve estar limpo
npm run build      # deve compilar sem erros de tipo
```

## Coisas que me custaram tempo nesta sessão (para não repetir a investigação)

- **Node.js não estava instalado** na máquina onde comecei — precisei instalar via `winget`. Se a nova máquina já tiver Node, ignore isso.
- **Next.js 16 renomeou `middleware.ts` → `proxy.ts`** (e a função exportada de `middleware` para `proxy`) — isso já está corrigido no código (`src/proxy.ts`), mas se algum tutorial/exemplo online mencionar "middleware", desconsidere: esta versão usa "proxy". Há um `AGENTS.md` na raiz do projeto (gerado automaticamente pelo próprio `next dev`) avisando sobre isso — vale reler se mexer em roteamento/middleware.
- **Tailwind v4** usa configuração via CSS (`@theme inline` em `globals.css`), não um `tailwind.config.js` tradicional.
- Um **bug real de fuso horário** foi encontrado pelos testes e corrigido: `computeCertificateStatus` (cópia TS da regra de status, só para UI otimista) comparava datas de formas inconsistentes entre fuso local e UTC. Está corrigido; se algo parecido aparecer em outro lugar que compare uma data `"yyyy-mm-dd"` do Postgres com `new Date()`, desconfie do mesmo problema — a função SQL (`certificate_status`) nunca teve esse bug.

## Sugestão de primeiro prompt para retomar

Se for abrir uma sessão nova do Claude Code para continuar:

> Este é o projeto "Certificados Digitais" (gestão de certificados digitais e empresas de um escritório de contabilidade). Leia HANDOFF.md e README.md primeiro. [Descreva aqui o que quer fazer a seguir, ex.: "quero implementar a UI de resolução de conflito de importação linha a linha" ou "já configurei o Supabase, me ajude a testar o fluxo de ponta a ponta"].
