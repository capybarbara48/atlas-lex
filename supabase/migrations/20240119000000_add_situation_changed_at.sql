alter table cases add column if not exists situation_changed_at timestamptz default null;

-- Backfill existing rows so the counter starts from a sensible date
update cases
  set situation_changed_at = coalesce(updated_at, created_at, now())
  where situation_changed_at is null;
