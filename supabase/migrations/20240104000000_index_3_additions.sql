-- ════════════════════════════════════════════════════════════════════
-- Atlas Lex — Index 3.0 additions
-- 1. final_fees + sucumbencia_fees on cases (recorded at case closure)
-- 2. preferences JSONB on lawyers (editable lists per user)
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Cases — closure fees ──────────────────────────────────────────
alter table public.cases
  add column if not exists final_fees       numeric(12, 2),
  add column if not exists sucumbencia_fees numeric(12, 2);

comment on column public.cases.final_fees       is 'Honorários finais recebidos ao encerrar o caso';
comment on column public.cases.sucumbencia_fees is 'Honorários sucumbenciais recebidos ao encerrar o caso';

-- ── 2. Lawyers — user preferences (editable lists) ──────────────────
-- Stores per-user config such as:
--   service_types:       text[]  (tipos de serviço para propostas)
--   quota_litis_options: text[]  (percentuais de quota-litis disponíveis)
alter table public.lawyers
  add column if not exists preferences jsonb not null default '{}';

comment on column public.lawyers.preferences is 'Configurações editáveis por usuário: service_types, quota_litis_options, etc.';
