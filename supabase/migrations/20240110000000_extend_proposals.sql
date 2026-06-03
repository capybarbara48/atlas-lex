alter table public.proposals
  add column if not exists service_type text,
  add column if not exists participacao_pct text,
  add column if not exists is_partner boolean not null default false,
  add column if not exists client_name_override text;
