alter table public.cases
  add column if not exists quota_litis_pct     text,
  add column if not exists quota_litis_received boolean not null default false;
