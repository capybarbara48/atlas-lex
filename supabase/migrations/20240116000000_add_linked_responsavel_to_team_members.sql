alter table team_members
  add column if not exists linked_responsavel text default null;
