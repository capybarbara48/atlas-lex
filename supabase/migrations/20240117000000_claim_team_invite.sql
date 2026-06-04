-- Auto-links an existing auth user to a pending team_members invite.
-- Called client-side when fetchLawyer finds no matching row by user_id.
-- Returns true if a record was claimed, false otherwise.
create or replace function public.claim_team_invite()
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_rows  int;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then return false; end if;

  update public.team_members
  set user_id     = auth.uid(),
      status      = 'active',
      accepted_at = now()
  where lower(invited_email) = lower(v_email)
    and status in ('pending_invite', 'pending_admin')
    and user_id is null;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

-- Also fix the trigger so it matches pending_admin invites too
-- (handles users who sign up before admin approves).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.team_members
    where lower(invited_email) = lower(new.email)
      and status in ('pending_invite', 'pending_admin')
  ) then
    update public.team_members
    set user_id     = new.id,
        status      = 'active',
        accepted_at = now()
    where lower(invited_email) = lower(new.email)
      and status in ('pending_invite', 'pending_admin')
      and user_id is null;
    return new;
  end if;

  insert into public.lawyers (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;
