# Handoff — Sistema de Certificados Digitais

Documento de continuidade para retomar este projeto em outra máquina/sessão. Leia isto primeiro; o [README.md](README.md) tem a documentação completa. Pode apagar este arquivo quando o projeto estabilizar.

## Estado atual (2026-09-15)

O escopo mudou bastante nesta sessão: o sistema **deixou de processar certificados via arquivo `.pfx`/senha** e virou um sistema puro de **controle de validade** (cadastro manual de empresa + data de vencimento + dias de aviso configurável por certificado). Ver README para o desenho atual completo.

Mudanças desta sessão (ainda **não commitadas** — só na working tree local):

- Removido por completo: processamento de PFX (`node-forge`, rotas `/api/certificates/pfx/*`, página `/certificados/importar-pfx`, `src/lib/pfx/`). Dependência `node-forge`/`@types/node-forge` removida do `package.json`.
- Schema de `certificates` simplificado: removidos `serial_number`, `subject`, `issuer`, `certificate_authority`, `fingerprint`, `algorithm`, `metadata`, `processed_at` (eram todos ligados ao PFX ou nunca usados fora dele). Adicionado `warning_days` (override por certificado do limiar "vencendo", com fallback para o padrão global em `settings`). **Editei as migrations 0001/0002 diretamente** (não criei uma migration incremental) porque nenhum Supabase real foi criado ainda em lugar nenhum — é seguro fazer isso até o primeiro `db push`/deploy real.
- Nova migration `0007_notifications.sql`: tabela `notification_reads` (quem já leu qual alerta).
- Nova feature: **notificações internas** — sino no topo (`notifications-bell.tsx`) + página `/notificacoes`. Não é uma tabela de notificações geradas: um certificado em `VENCENDO`/`VENCE_HOJE`/`VENCIDO` **é** a notificação, derivada ao vivo de `certificates_view`; `notification_reads` só guarda a marca de "lido" por usuário.
- Dashboard: ações inline por linha (editar/arquivar/excluir), não só "Ver empresa" como antes.
- `supabase/seed.sql` ajustado (removida a coluna `certificate_authority` que não existe mais).

Build + lint + 35 testes passando (era 41; os 6 que somem eram só do parser de PFX, removido).

### Dado real do escritório já preparado para importar

O usuário trouxe a planilha real de certificados ativos hoje (`D:\downloads\certificados (1).xlsx`, 525 linhas). Ela tinha um bug de exportação: a coluna "Código" foi salva como data (ex. `1903-04-12`) em vez de número — recuperei os códigos reais fazendo o cálculo inverso do serial de data do Excel. Uma versão limpa está em **`import-data/certificados-ativos.csv`** (520 linhas após remover duplicatas exatas; fora do git via `.gitignore`), com cabeçalhos já no formato que o mapeamento automático do importador reconhece (`CNPJ/CPF`, `Codigo`, `Razao Social`, `Nome Fantasia`, `UF`, `Vencimento`). **Ainda não foi importado** — precisa de Supabase configurado primeiro.

## O que NÃO está feito ainda

Ver seção "Limitações atuais" do README. Resumo:

1. **Resolução de conflito de importação** por linha (só reporta, não deixa escolher manter/usar importado).
2. **Notificação por e-mail/WhatsApp** — só o alerta interno (sino + `/notificacoes`) existe.
3. **Convite de usuário por e-mail** — admin define senha inicial diretamente.
4. **Testes de integração contra banco real** — CRUD/importação/notificações nunca testados contra um Supabase de verdade.

## Passo a passo para continuar

### 1. Supabase (ainda não configurado em lugar nenhum)

1. Criar um projeto em https://supabase.com.
2. Aplicar as migrations em `supabase/migrations/` **na ordem numérica** (0001 → 0007) via SQL Editor ou `supabase db push`.
3. `cp .env.example .env.local` e preencher com as 3 chaves do painel.
4. Criar o primeiro usuário admin (ver README, seção "Supabase e migrations").

### 2. Importar os dados reais

Depois do Supabase configurado e logado como admin: ir em `/importar`, subir `import-data/certificados-ativos.csv`. No passo de mapeamento, conferir que "Razão Social" caiu em **Razão social** (não em "Nome abreviado" — o auto-mapeamento pode sugerir errado para esse header específico dependendo de ajustes futuros no dicionário de sugestões).

### 3. Rodar local e verificar

```bash
npm run dev
npm test
npm run lint
npm run build
```

## Sugestão de primeiro prompt para retomar

> Este é o projeto "Certificados Digitais" (controle de validade de certificados digitais de um escritório de contabilidade). Leia HANDOFF.md e README.md primeiro. [Descreva o que quer fazer, ex.: "configurei o Supabase, vamos importar os dados reais e testar o fluxo de ponta a ponta" ou "quero implementar a UI de resolução de conflito de importação"].
