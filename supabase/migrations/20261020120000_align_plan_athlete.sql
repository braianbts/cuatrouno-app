-- La regla de exercise_logs solo deja guardar pesos con athlete = slug del alumno.
-- Algunos planes convertidos traían otra clave (ej. "carlos" en vez de "carlosvillegas") y no podían guardar.
-- (Ya aplicado el 2026-10-20; desde entonces la plantilla usa siempre el slug.)
update public.student_plans p
set data = jsonb_set(p.data, '{athlete}', to_jsonb(s.slug)), updated_at = now()
from public.students s
where s.user_id = p.user_id and p.data is not null and p.data->>'athlete' is distinct from s.slug;
