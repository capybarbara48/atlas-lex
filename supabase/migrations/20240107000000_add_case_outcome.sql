-- Add outcome tracking for finalized cases
alter table public.cases
  add column if not exists outcome text check (outcome in ('procedente', 'improcedente', 'outro')),
  add column if not exists outcome_reason text,
  add column if not exists finalizado_at timestamptz;

create index if not exists cases_outcome_idx on public.cases(outcome) where outcome is not null;
create index if not exists cases_finalizado_at_idx on public.cases(finalizado_at) where finalizado_at is not null;
