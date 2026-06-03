-- Add case_id to notas so notes can be linked to a specific case
alter table public.notas
  add column case_id uuid references public.cases(id) on delete cascade;

create index notas_case_id_idx on public.notas(case_id);
