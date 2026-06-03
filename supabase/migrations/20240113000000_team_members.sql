-- ══════════════════════════════════════════════════════════════════════
-- Team Members — Multi-user per law firm
-- Allows a lawyer (owner) to invite up to 3 advogados + 3 estagiários.
-- Invited members sign up with their own email; a trigger auto-links them.
-- Estagiários cannot access financial_entries or clients.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. team_members table ─────────────────────────────────────────────
create table public.team_members (
  id             uuid primary key default gen_random_uuid(),
  lawyer_id      uuid not null references public.lawyers(id) on delete cascade,
  invited_email  text not null,
  full_name      text not null,
  role           text not null check (role in ('advogado', 'estagiario')),
  status         text not null default 'pending_admin'
    check (status in ('pending_admin', 'pending_invite', 'active', 'disabled')),
  user_id        uuid references auth.users(id) on delete set null,
  invited_at     timestamptz not null default now(),
  approved_at    timestamptz,
  accepted_at    timestamptz,
  unique (lawyer_id, invited_email)
);

alter table public.team_members enable row level security;

-- Owner can manage their own team
create policy "team_members: owner manages"
  on public.team_members
  for all
  using  (lawyer_id = auth.uid())
  with check (lawyer_id = auth.uid());

-- Team members can read their own record (needed for auth resolution)
create policy "team_members: member reads own"
  on public.team_members
  for select
  using (user_id = auth.uid());

-- Admin (Atlas Lex system) can read and update all records
create policy "team_members: admin full access"
  on public.team_members
  for all
  using  (exists (select 1 from public.lawyers where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.lawyers where id = auth.uid() and role = 'admin'));

create index team_members_lawyer_id_idx on public.team_members(lawyer_id);
create index team_members_user_id_idx   on public.team_members(user_id);

-- ── 2. Helper functions ───────────────────────────────────────────────

-- Returns the lawyer_id that the current auth user belongs to.
-- For owners: their own id. For team members: the owner's id.
create or replace function public.effective_lawyer_id()
returns uuid language sql stable security definer as $$
  select coalesce(
    (select id from public.lawyers where id = auth.uid()),
    (select lawyer_id from public.team_members
     where user_id = auth.uid() and status = 'active' limit 1)
  )
$$;

-- Returns the role of the current auth user within their firm.
-- Owners and admins are always 'advogado'. Team members use their stored role.
create or replace function public.current_user_role()
returns text language sql stable security definer as $$
  select coalesce(
    case when exists(select 1 from public.lawyers where id = auth.uid()) then 'advogado' end,
    (select role from public.team_members
     where user_id = auth.uid() and status = 'active' limit 1),
    'advogado'
  )
$$;

-- ── 3. Update lawyers RLS to allow team members to read firm data ─────
drop policy "lawyers: own row only" on public.lawyers;

create policy "lawyers: owner full access"
  on public.lawyers
  for all
  using  (id = auth.uid())
  with check (id = auth.uid());

create policy "lawyers: team member read firm"
  on public.lawyers
  for select
  using (
    id = (
      select lawyer_id from public.team_members
      where user_id = auth.uid() and status = 'active' limit 1
    )
  );

-- ── 4. Update all data table RLS to use effective_lawyer_id() ─────────

-- CLIENTS — advogado only (estagiário has no access)
drop policy "clients: own records only" on public.clients;
create policy "clients: advogado access"
  on public.clients
  for all
  using  (lawyer_id = effective_lawyer_id() and current_user_role() = 'advogado')
  with check (lawyer_id = effective_lawyer_id() and current_user_role() = 'advogado');

-- CASES — all roles can access
drop policy "cases: own records only" on public.cases;
create policy "cases: team access"
  on public.cases
  for all
  using  (lawyer_id = effective_lawyer_id())
  with check (lawyer_id = effective_lawyer_id());

-- PROPOSALS — all roles can access
drop policy "proposals: own records only" on public.proposals;
create policy "proposals: team access"
  on public.proposals
  for all
  using  (lawyer_id = effective_lawyer_id())
  with check (lawyer_id = effective_lawyer_id());

-- FINANCIAL ENTRIES — advogado only
drop policy "financial_entries: own records only" on public.financial_entries;
create policy "financial_entries: advogado access"
  on public.financial_entries
  for all
  using  (lawyer_id = effective_lawyer_id() and current_user_role() = 'advogado')
  with check (lawyer_id = effective_lawyer_id() and current_user_role() = 'advogado');

-- TASKS — all roles can access
drop policy "tasks: own records only" on public.tasks;
create policy "tasks: team access"
  on public.tasks
  for all
  using  (lawyer_id = effective_lawyer_id())
  with check (lawyer_id = effective_lawyer_id());

-- NOTAS — all roles can access
drop policy "notas: own records only" on public.notas;
create policy "notas: team access"
  on public.notas
  for all
  using  (lawyer_id = effective_lawyer_id())
  with check (lawyer_id = effective_lawyer_id());

-- ── 5. Update handle_new_user to skip lawyers row for team members ────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- If this email matches a pending invite, link the team member instead
  -- of creating a new lawyers row (team members share the firm's lawyers row)
  if exists (
    select 1 from public.team_members
    where lower(invited_email) = lower(new.email)
      and status = 'pending_invite'
  ) then
    update public.team_members
    set user_id     = new.id,
        status      = 'active',
        accepted_at = now()
    where lower(invited_email) = lower(new.email)
      and status = 'pending_invite'
      and user_id is null;
    return new;
  end if;

  -- Regular signup: create a lawyers row
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
