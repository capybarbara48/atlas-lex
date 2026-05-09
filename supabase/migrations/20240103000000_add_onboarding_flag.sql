-- ════════════════════════════════════════════════════════════════════
-- Atlas Lex — Migration 003
-- Adds the onboarding_completed flag to lawyers.
-- All statements use IF NOT EXISTS / safe defaults — fully idempotent.
-- ════════════════════════════════════════════════════════════════════

-- The onboarding wizard checks this column on every login.
-- Trigger handle_new_user() creates the row with default = false,
-- so new users see the wizard. After finishing it, the flag is set true.
alter table public.lawyers
  add column if not exists onboarding_completed boolean not null default false;

-- ────────────────────────────────────────────────────────────────────
-- Also re-applies migration 002 columns (idempotent — safe to re-run
-- even if those columns already exist from a previous run).
-- ────────────────────────────────────────────────────────────────────

alter table public.clients
  add column if not exists cidade text,
  add column if not exists estado text;

-- tipo requires a check constraint; use a DO block so we can skip
-- the ADD if the column already exists (the constraint can't use IF NOT EXISTS)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'clients'
      and column_name  = 'tipo'
  ) then
    alter table public.clients
      add column tipo text not null default 'PF'
        check (tipo in ('PF','PJ'));
  end if;
end $$;

alter table public.cases
  add column if not exists valor numeric(14, 2) not null default 0;
