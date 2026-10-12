-- Cuotas de los alumnos. Las carga el admin desde el panel (/admin) y el alumno las ve en su pestaña Pagos.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept text not null default 'Cuota',
  amount numeric(12,2) not null default 0,
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at date,
  method text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_due_date_idx on public.payments (due_date);

alter table public.payments enable row level security;

-- El admin maneja todas las cuotas.
drop policy if exists "admin gestiona cuotas" on public.payments;
create policy "admin gestiona cuotas" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

-- Cada alumno solo ve las suyas.
drop policy if exists "alumno ve sus cuotas" on public.payments;
create policy "alumno ve sus cuotas" on public.payments
  for select using (user_id = auth.uid());

-- Realtime: el panel y la app del alumno se actualizan solos.
do $$
declare t text;
begin
  foreach t in array array['payments', 'students', 'exercise_logs'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
