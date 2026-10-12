-- Asistencia: el alumno toca "Empezar entrenamiento" en su Rutina y queda registrado el día.
-- Alimenta el calendario mensual de Progreso (punto rojo por día entrenado) y la ficha del alumno en el panel.
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,                       -- día local del alumno
  day_label text,                           -- día de la rutina (LUN, MAR…) o de la semana temporal
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, date)                    -- un entrenamiento por día
);

create index if not exists workout_sessions_user_date_idx on public.workout_sessions (user_id, date desc);

alter table public.workout_sessions enable row level security;

drop policy if exists "admin ve asistencia" on public.workout_sessions;
create policy "admin ve asistencia" on public.workout_sessions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "alumno ve su asistencia" on public.workout_sessions;
create policy "alumno ve su asistencia" on public.workout_sessions
  for select using (user_id = auth.uid());

drop policy if exists "alumno registra su entrenamiento" on public.workout_sessions;
create policy "alumno registra su entrenamiento" on public.workout_sessions
  for insert with check (user_id = auth.uid());

drop policy if exists "alumno termina su entrenamiento" on public.workout_sessions;
create policy "alumno termina su entrenamiento" on public.workout_sessions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workout_sessions'
  ) then
    alter publication supabase_realtime add table public.workout_sessions;
  end if;
end $$;
