import { useEffect, useState } from 'react';
import { Box, Card, IconButton, Stack, Typography } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { sb } from '../supabase';
import { BRAND } from '../theme';
import { isoToday } from '../utils';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Días que el alumno tocó "Empezar entrenamiento" (tabla workout_sessions): mismo calendario que ve él en Progreso.
export default function AttendanceCard({ student }) {
  const [sessions, setSessions] = useState(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () => sb.from('workout_sessions').select('date,started_at').eq('user_id', student.user_id)
      .order('date', { ascending: false }).limit(400)
      .then(({ data, error }) => { if (alive) setSessions(error ? [] : data || []); });
    load();
    const ch = sb.channel('att-' + student.user_id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_sessions', filter: 'user_id=eq.' + student.user_id }, load)
      .subscribe();
    return () => { alive = false; sb.removeChannel(ch); };
  }, [student.user_id]);

  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const y = first.getFullYear();
  const m = first.getMonth();
  const prefix = y + '-' + String(m + 1).padStart(2, '0');
  const list = sessions || [];
  const byDate = Object.fromEntries(list.filter((s) => s.date.startsWith(prefix)).map((s) => [s.date, s]));
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const today = isoToday();
  // Lunes de esta semana -> cuántos días entrenó en la semana en curso.
  const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const mondayIso = monday.getFullYear() + '-' + String(monday.getMonth() + 1).padStart(2, '0') + '-' + String(monday.getDate()).padStart(2, '0');
  const thisWeek = list.filter((s) => s.date >= mondayIso && s.date <= today).length;
  const last = list[0]?.date;

  return (
    <Card sx={{ p: 2.25 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">Asistencia</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {last ? `Último entrenamiento: ${new Date(last + 'T00:00:00').toLocaleDateString('es-AR')}` : 'Todavía no registró entrenamientos'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => setOffset(offset - 1)}><ChevronLeftRoundedIcon /></IconButton>
        <Typography sx={{ fontSize: 13.5, fontWeight: 800, textTransform: 'capitalize', minWidth: 110, textAlign: 'center' }}>{MONTHS[m]} {y}</Typography>
        <IconButton size="small" onClick={() => setOffset(offset + 1)} disabled={offset >= 0}><ChevronRightRoundedIcon /></IconButton>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        <Stat label="Días en el mes" value={Object.keys(byDate).length} hi />
        <Stat label="Esta semana" value={thisWeek} />
        <Stat label={`Total ${y}`} value={list.filter((s) => s.date.startsWith(String(y))).length} />
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, textAlign: 'center' }}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <Typography key={i} sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.disabled' }}>{d}</Typography>)}
        {Array.from({ length: lead }, (_, i) => <Box key={'o' + i} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const iso = prefix + '-' + String(i + 1).padStart(2, '0');
          const done = !!byDate[iso];
          return (
            <Box key={iso} sx={{
              height: 36, borderRadius: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontSize: 12.5, fontWeight: 700, color: iso > today ? 'text.disabled' : 'text.primary',
              bgcolor: done ? 'rgba(200,30,30,.08)' : 'transparent',
              boxShadow: iso === today ? `inset 0 0 0 1.5px ${BRAND.ink}` : 'none',
            }}>
              {i + 1}
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', mt: 0.25, bgcolor: done ? 'primary.main' : 'transparent' }} />
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}

function Stat({ label, value, hi }) {
  return (
    <Box sx={{ flex: 1, p: 1.1, borderRadius: 2.5, border: hi ? 'none' : `1px solid ${BRAND.line}`, bgcolor: hi ? 'primary.main' : BRAND.surfaceAlt, color: hi ? '#fff' : 'text.primary' }}>
      <Typography sx={{ fontSize: 19, fontWeight: 800, lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', opacity: hi ? 0.85 : 0.6 }}>{label}</Typography>
    </Box>
  );
}
