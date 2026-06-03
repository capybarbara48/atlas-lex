alter table public.financial_entries
  add column if not exists recurring boolean not null default false;
