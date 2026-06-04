-- Add despacho_attempts column to cases
alter table cases add column if not exists despacho_attempts jsonb default null;

-- Seed "Despachar o Processo" kanban situation for all existing lawyers that don't have it
insert into lawyer_list_items (lawyer_id, list_type, value, color, sort_order)
select
  l.id,
  'kanban_situation',
  'Despachar o Processo',
  '#7c3aed',
  coalesce(
    (select max(sort_order) + 1
       from lawyer_list_items
      where lawyer_id = l.id and list_type = 'kanban_situation'),
    5
  )
from lawyers l
where not exists (
  select 1 from lawyer_list_items
  where lawyer_id = l.id
    and list_type = 'kanban_situation'
    and lower(value) like '%despachar%'
);
