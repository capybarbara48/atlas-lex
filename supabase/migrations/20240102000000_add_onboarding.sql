-- ════════════════════════════════════════════════════════════════════
-- Atlas Lex — Add onboarding_completed flag
--
-- Run this in: Supabase Dashboard → SQL Editor → New query
--
-- Logic:
--   false (default) = user needs to go through the onboarding wizard
--   true            = user has completed onboarding, goes straight to app
--
-- All rows — new and existing — default to false so they all see the
-- onboarding on next login. Update to true for any user you want to
-- skip it (or let them complete the wizard naturally).
-- ════════════════════════════════════════════════════════════════════

alter table public.lawyers
  add column if not exists onboarding_completed boolean not null default false;

-- Optional: mark an existing user as already onboarded so they skip the flow.
-- Replace the UUID with your actual user ID (found in Settings > Conta).
--
-- update public.lawyers
--   set onboarding_completed = true
--   where id = 'YOUR-USER-UUID-HERE';
