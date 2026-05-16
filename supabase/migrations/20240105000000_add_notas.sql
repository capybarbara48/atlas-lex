-- ════════════════════════════════════════════════════════════════════
-- Atlas Lex — Etapa 6: Notas
-- Anotações gerais do advogado com cor, fixar e busca
-- ════════════════════════════════════════════════════════════════════

create table public.notas (
  id         uuid primary key default uuid_generate_v4(),
  lawyer_id  uuid not null references public.lawyers(id) on delete cascade,
  titulo     text,
  corpo      text,
  cor        text check (cor in ('amarelo', 'azul', 'verde', 'vermelho', 'roxo', 'laranja')),
  fixada     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notas enable row level security;

create policy "notas: own records only"
  on public.notas
  for all
  using  (lawyer_id = auth.uid())
  with check (lawyer_id = auth.uid());

create index notas_lawyer_id_idx on public.notas(lawyer_id);
create index notas_fixada_idx    on public.notas(lawyer_id, fixada);

create trigger set_updated_at before update on public.notas
  for each row execute function public.set_updated_at();
