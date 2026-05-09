-- ════════════════════════════════════════════════════════════════════
-- Atlas Lex — Migration 002
-- Adds columns required by the React UI that were missing from the
-- initial schema.
-- ════════════════════════════════════════════════════════════════════

-- ── clients: address detail + legal type ─────────────────────────────
alter table public.clients
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists tipo   text not null default 'PF'
    check (tipo in ('PF', 'PJ'));

-- ── cases: monetary value of the dispute ─────────────────────────────
alter table public.cases
  add column if not exists valor numeric(14, 2) not null default 0;
