import { useEffect, useMemo, useState } from 'react';
import { Box, Card, CircularProgress, Stack, Typography } from '@mui/material';
import { sb } from '../supabase';
import { useData } from '../data';
import { Empty } from '../components';
import { fmtShortDate } from '../utils';
import { BRAND } from '../theme';
import AttendanceCard from './AttendanceCard';

// Últimos registros de pesos agrupados por ejercicio (lo más reciente primero).
export default function ProgressTab({ student }) {
  const { athleteOf, logs: liveLogs } = useData();
  const athlete = athleteOf(student);
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    let alive = true;
    sb.from('exercise_logs').select('id,date,day,exercise,set1_weight,set2_weight,set3_weight')
      .eq('athlete', athlete).order('date', { ascending: false }).limit(300)
      .then(({ data }) => { if (alive) setLogs(data || []); });
    return () => { alive = false; };
  }, [athlete, liveLogs]);

  const groups = useMemo(() => {
    const m = new Map();
    (logs || []).forEach((l) => {
      if (!m.has(l.exercise)) m.set(l.exercise, []);
      m.get(l.exercise).push(l);
    });
    return [...m.entries()];
  }, [logs]);

  const attendance = <AttendanceCard student={student} />;
  if (logs === null) return <Stack spacing={1.5}>{attendance}<Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box></Stack>;
  if (!logs.length) return <Stack spacing={1.5}>{attendance}<Card sx={{ p: 2 }}><Empty>Todavía no cargó pesos (clave: {athlete}).</Empty></Card></Stack>;

  const best = (rows) => Math.max(...rows.flatMap((r) => [r.set1_weight, r.set2_weight, r.set3_weight]).filter((v) => v !== null && v !== undefined).map(Number));
  return (
    <Stack spacing={1.5}>
      {attendance}
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{logs.length} registros · {groups.length} ejercicios · último {fmtShortDate(logs[0].date)}</Typography>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        {groups.map(([exercise, rows]) => {
          const first = rows[rows.length - 1];
          const last = rows[0];
          const delta = best([last]) - best([first]);
          return (
            <Card key={exercise} sx={{ p: 2 }}>
              <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
                <Typography sx={{ flex: 1, fontSize: 13.5, fontWeight: 800 }}>{exercise}</Typography>
                {rows.length > 1 && Number.isFinite(delta) && <Typography sx={{ fontSize: 12, fontWeight: 800, color: delta > 0 ? 'success.main' : delta < 0 ? 'primary.main' : 'text.secondary' }}>{delta > 0 ? '+' : ''}{delta}</Typography>}
              </Stack>
              <Stack divider={<Box sx={{ borderTop: `1px solid ${BRAND.line}` }} />}>
                {rows.slice(0, 5).map((r) => (
                  <Stack key={r.id || r.date + r.exercise} direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{fmtShortDate(r.date)} · {r.day}</Typography>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{[r.set1_weight, r.set2_weight, r.set3_weight].filter((v) => v !== null && v !== undefined).join(' / ')}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Card>
          );
        })}
      </Box>
    </Stack>
  );
}
