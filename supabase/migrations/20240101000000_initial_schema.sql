-- ════════════════════════════════════════════════════════════════════
-- Atlas Lex — Initial Schema
-- Multi-tenant: every table is isolated by lawyer_id = auth.uid()
-- ════════════════════════════════════════════════════════════════════

-- ── Extensions ───────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════
-- 1. LAWYERS
--    One row per user. Created on first login via a trigger.
--    Holds branding/theme config and professional metadata.
-- ════════════════════════════════════════════════════════════════════
create table public.lawyers (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text,
  email            text,
  oab_number       text,                          -- e.g. "OAB/SP 123456"
  firm_name        text not null default 'Atlas Lex',
  logo_url         text,
  theme_accent     text not null default '#2563eb',
  theme_accent_dark text not null default '#1d4ed8',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.lawyers enable row level security;

create policy "lawyers: own row only"
  on public.lawyers
  for all
  using  (id = auth.uid())
  with check (id = auth.uid());

-- Auto-upsert lawyer row when a new user signs up via OAuth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.lawyers (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════
-- 2. CLIENTS
-- ════════════════════════════════════════════════════════════════════
create table public.clients (
  id          uuid primary key default uuid_generate_v4(),
  lawyer_id   uuid not null references public.lawyers(id) on delete cascade,
  full_name   text not null,
  cpf_cnpj    text,
  email       text,
  phone       text,
  address     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "clients: own records only"
  on public.clients
  for all
  using  (lawyer_id = auth.uid())
  with check (lawyer_id = auth.uid());

create index clients_lawyer_id_idx on public.clients(lawyer_id);

-- ════════════════════════════════════════════════════════════════════
-- 3. CASES (Processos)
-- ════════════════════════════════════════════════════════════════════
create type case_status as enum ('ativo', 'encerrado', 'arquivado', 'suspenso');

create table public.cases (
  id             uuid primary key default uuid_generate_v4(),
  lawyer_id      uuid not null references public.lawyers(id) on delete cascade,
  client_id      uuid references public.clients(id) on delete set null,
  title          text not null,
  case_number    text,                             -- número do processo
  court          text,                             -- tribunal / vara
  status         case_status not null default 'ativo',
  area           text,                             -- e.g. "Trabalhista", "Cível"
  description    text,
  opened_at      date,
  closed_at      date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.cases enable row level security;

create policy "cases: own records only"
  on public.cases
  for all
  using  (lawyer_id = auth.uid())
  with check (lawyer_id = auth.uid());

create index cases_lawyer_id_idx on public.cases(lawyer_id);
create index cases_client_id_idx on public.cases(client_id);

-- ════════════════════════════════════════════════════════════════════
-- 4. PROPOSALS (Honorários / Contratos de prestação de serviços)
-- ════════════════════════════════════════════════════════════════════
create type proposal_status as enum ('rascunho', 'enviada', 'aceita', 'recusada', 'expirada');
create type fee_type as enum ('fixo', 'por_hora', 'percentual_exito', 'misto');

create table public.proposals (
  id              uuid primary key default uuid_generate_v4(),
  lawyer_id       uuid not null references public.lawyers(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete set null,
  case_id         uuid references public.cases(id) on delete set null,
  title           text not null,
  status          proposal_status not null default 'rascunho',
  fee_type        fee_type not null default 'fixo',
  fee_amount      numeric(12, 2),
  fee_percentage  numeric(5, 2),                  -- for percentual_exito
  valid_until     date,
  body            text,                            -- rich-text / markdown
  sent_at         timestamptz,
  responded_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.proposals enable row level security;

create policy "proposals: own records only"
  on public.proposals
  for all
  using  (lawyer_id = auth.uid())
  with check (lawyer_id = auth.uid());

create index proposals_lawyer_id_idx on public.proposals(lawyer_id);

-- ════════════════════════════════════════════════════════════════════
-- 5. FINANCIAL ENTRIES (Lançamentos financeiros)
-- ════════════════════════════════════════════════════════════════════
create type entry_type as enum ('receita', 'despesa');
create type entry_status as enum ('pendente', 'pago', 'cancelado');

create table public.financial_entries (
  id           uuid primary key default uuid_generate_v4(),
  lawyer_id    uuid not null references public.lawyers(id) on delete cascade,
  case_id      uuid references public.cases(id) on delete set null,
  client_id    uuid references public.clients(id) on delete set null,
  type         entry_type not null,
  status       entry_status not null default 'pendente',
  description  text not null,
  amount       numeric(12, 2) not null,
  due_date     date,
  paid_at      date,
  category     text,                               -- e.g. "honorários", "custas"
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.financial_entries enable row level security;

create policy "financial_entries: own records only"
  on public.financial_entries
  for all
  using  (lawyer_id = auth.uid())
  with check (lawyer_id = auth.uid());

create index financial_entries_lawyer_id_idx on public.financial_entries(lawyer_id);
create index financial_entries_due_date_idx  on public.financial_entries(due_date);

-- ════════════════════════════════════════════════════════════════════
-- 6. TASKS (Prazos e tarefas processuais)
-- ════════════════════════════════════════════════════════════════════
create type task_status as enum ('pendente', 'em_andamento', 'concluida', 'cancelada');
create type task_priority as enum ('baixa', 'media', 'alta', 'urgente');

create table public.tasks (
  id           uuid primary key default uuid_generate_v4(),
  lawyer_id    uuid not null references public.lawyers(id) on delete cascade,
  case_id      uuid references public.cases(id) on delete set null,
  title        text not null,
  description  text,
  status       task_status not null default 'pendente',
  priority     task_priority not null default 'media',
  due_date     timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "tasks: own records only"
  on public.tasks
  for all
  using  (lawyer_id = auth.uid())
  with check (lawyer_id = auth.uid());

create index tasks_lawyer_id_idx on public.tasks(lawyer_id);
create index tasks_due_date_idx  on public.tasks(due_date);
create index tasks_case_id_idx   on public.tasks(case_id);

-- ════════════════════════════════════════════════════════════════════
-- 7. updated_at trigger (applies to all tables)
-- ════════════════════════════════════════════════════════════════════
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.lawyers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.cases
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.proposals
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.financial_entries
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
