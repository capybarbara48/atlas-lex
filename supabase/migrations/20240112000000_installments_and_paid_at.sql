-- Change paid_at from date to timestamptz so confirmEntry can store the exact time
alter table public.financial_entries
  alter column paid_at type timestamptz using (paid_at::timestamptz);

-- Installment plan columns
alter table public.financial_entries
  add column if not exists installment_of       integer,
  add column if not exists installment_total    integer,
  add column if not exists installment_group_id uuid;
