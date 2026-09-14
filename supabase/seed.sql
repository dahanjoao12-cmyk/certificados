-- ============================================================================
-- seed.sql -- FICTITIOUS demo data for local development only.
--
-- Do NOT put real client data here. This file is safe to commit because every
-- document number below is a made-up placeholder, never a real CNPJ/CPF.
-- Run manually against a dev database, or automatically via `supabase db reset`.
-- ============================================================================

-- Empresa 1: certificado em dia (vence daqui a ~1 ano)
with c1 as (
  insert into companies (code, document, document_type, corporate_name, trade_name, short_name, municipality, uf, situation, responsible, active, origin)
  values ('1001', '11222333000181', 'cnpj', 'ALPHA CONTABILIDADE E SERVICOS LTDA', 'Alpha Contabilidade', 'Alpha', 'Rio de Janeiro', 'RJ', 'ativa', 'Amanda', true, 'manual')
  returning id
)
insert into certificates (company_id, type, model, valid_from, valid_to, certificate_authority, is_current, origin)
select id, 'e-cnpj', 'A1', current_date - interval '1 year', current_date + interval '351 days', 'AC Demonstracao v5', true, 'manual' from c1;

-- Empresa 2: certificado vencendo em 15 dias
with c2 as (
  insert into companies (code, document, document_type, corporate_name, trade_name, short_name, municipality, uf, situation, responsible, active, origin)
  values ('1002', '22333444000181', 'cnpj', 'BETA COMERCIO DE ALIMENTOS LTDA', 'Beta Comercio', 'Beta', 'Sao Paulo', 'SP', 'ativa', 'Paulo', true, 'manual')
  returning id
)
insert into certificates (company_id, type, model, valid_from, valid_to, certificate_authority, is_current, origin)
select id, 'e-cnpj', 'A1', current_date - interval '1 year', current_date + interval '15 days', 'AC Demonstracao v5', true, 'manual' from c2;

-- Empresa 3: certificado vence hoje
with c3 as (
  insert into companies (code, document, document_type, corporate_name, trade_name, short_name, municipality, uf, situation, responsible, active, origin)
  values ('1003', '33444555000181', 'cnpj', 'GAMA RESTAURANTE E PIZZARIA LTDA', 'Gama Pizzaria', 'Gama', 'Rio de Janeiro', 'RJ', 'ativa', 'Amanda', true, 'manual')
  returning id
)
insert into certificates (company_id, type, model, valid_from, valid_to, certificate_authority, is_current, origin)
select id, 'e-cnpj', 'A3', current_date - interval '1 year', current_date, 'AC Demonstracao v5', true, 'manual' from c3;

-- Empresa 4: certificado vencido ha 20 dias
with c4 as (
  insert into companies (code, document, document_type, corporate_name, trade_name, short_name, municipality, uf, situation, responsible, active, origin)
  values ('1004', '44555666000181', 'cnpj', 'DELTA SOLUCOES EMPRESARIAIS LTDA', 'Delta Solucoes', 'DL', 'Rio de Janeiro', 'RJ', 'ativa', 'Joao', true, 'manual')
  returning id
)
insert into certificates (company_id, type, model, valid_from, valid_to, certificate_authority, is_current, origin)
select id, 'e-cnpj', 'A1', current_date - interval '1 year', current_date - interval '20 days', 'AC Demonstracao v5', true, 'manual' from c4;

-- Empresa 5: certificado arquivado manualmente
with c5 as (
  insert into companies (code, document, document_type, corporate_name, trade_name, short_name, municipality, uf, situation, responsible, active, origin)
  values ('1005', '55666777000181', 'cnpj', 'EPSILON TRANSPORTES LTDA', 'Epsilon Transportes', 'Epsilon', 'Niteroi', 'RJ', 'inativa', 'Paulo', false, 'manual')
  returning id
)
insert into certificates (company_id, type, model, valid_from, valid_to, certificate_authority, archived, is_current, origin)
select id, 'e-cnpj', 'A1', current_date - interval '2 years', current_date - interval '1 year', 'AC Demonstracao v5', true, false, 'manual' from c5;

-- Empresa 6: mesma empresa da Empresa 4 cenario, mas com HISTORICO de certificados
-- (duas renovacoes anteriores, uma atual em dia) para testar a pagina de historico
with c6 as (
  insert into companies (code, document, document_type, corporate_name, trade_name, short_name, municipality, uf, situation, responsible, active, origin)
  values ('1006', '66777888000181', 'cnpj', 'ZETA INDUSTRIA E COMERCIO LTDA', 'Zeta Industria', 'Zeta', 'Duque de Caxias', 'RJ', 'ativa', 'Amanda', true, 'manual')
  returning id
)
insert into certificates (company_id, type, model, valid_from, valid_to, certificate_authority, is_current, origin, created_at)
select id, 'e-cnpj', 'A1', current_date - interval '3 years', current_date - interval '2 years', 'AC Demonstracao v5', false, 'manual', now() - interval '3 years' from c6
union all
select id, 'e-cnpj', 'A1', current_date - interval '2 years', current_date - interval '1 year', 'AC Demonstracao v5', false, 'manual', now() - interval '2 years' from c6
union all
select id, 'e-cnpj', 'A1', current_date - interval '1 year', current_date + interval '200 days', 'AC Demonstracao v5', true, 'manual', now() - interval '1 year' from c6;

-- Empresa 7: pessoa fisica (e-CPF), sem certificado cadastrado ainda
insert into companies (code, document, document_type, corporate_name, trade_name, short_name, municipality, uf, situation, responsible, active, origin)
values ('1007', '11144477735', 'cpf', 'JOSE DA SILVA SANTOS', null, 'Jose Santos', 'Rio de Janeiro', 'RJ', 'ativa', 'Joao', true, 'manual');
