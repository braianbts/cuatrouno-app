-- Plan editable: el contenido del plan pasa a guardarse como JSON (student_plans.data)
-- y lo dibuja la plantilla única /plan.html. La columna html queda como respaldo / modo anterior.

alter table public.student_plans add column if not exists data jsonb;
alter table public.student_plans alter column html drop not null;

-- Realtime: el alumno recibe los cambios del plan sin recargar la app.
-- (Realtime respeta las políticas RLS de select: cada alumno solo recibe su propia fila.)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'student_plans'
  ) then
    alter publication supabase_realtime add table public.student_plans;
  end if;
end $$;
