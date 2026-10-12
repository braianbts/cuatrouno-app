import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { BRAND } from '../theme';
import { addDays, isoToday, toIso } from '../utils';

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().slice(0, 3);
const plain = (s) => String(s ?? '').replace(/<[^>]*>/g, '');

// Días de la rutina base que se pueden asignar a cada fecha.
function baseDays(plan) {
  const out = [];
  (plan?.sections?.rutina?.blocks || []).forEach((b) => { if (b.type === 'days') b.items.forEach((d) => out.push(d)); });
  return out;
}
const trains = (d) => (d.blocks || []).some((x) => x.type === 'ex' || x.type === 'group');

// Rango de fechas -> lista de días (máx. 14), conservando lo ya cargado en fechas que siguen dentro.
function rebuild(tw, plan) {
  const prev = Object.fromEntries((tw.days || []).map((d) => [d.date, d]));
  const base = baseDays(plan);
  const days = [];
  if (tw.start && tw.end && tw.start <= tw.end) {
    let iso = tw.start;
    while (iso <= tw.end && days.length < 14) {
      if (prev[iso]) days.push(prev[iso]);
      else {
        // Por defecto, la rutina que ese día de la semana ya tenía (o off si no entrena).
        const dow = new Date(iso + 'T00:00:00').getDay();
        const own = base.find((b) => norm(b.day) === norm(DOW[dow]));
        days.push(own && trains(own) ? { date: iso, base: norm(own.day) } : { date: iso, base: 'off', off: 'Descanso' });
      }
      iso = addDays(iso, 1);
    }
  }
  return { ...tw, days };
}

export default function TempWeekEditor({ plan, onChange }) {
  const tw = plan.tempWeek;
  const base = baseDays(plan);
  const today = isoToday();
  const setTw = (next) => onChange({ ...plan, tempWeek: next });

  if (!tw) {
    const create = () => {
      const d = new Date();
      d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); // próximo lunes
      const start = toIso(d);
      setTw(rebuild({ title: 'Rutina de esta semana', sub: '', intro: '', start, end: addDays(start, 6), days: [] }, plan));
    };
    return (
      <Box sx={{ p: 2, border: `1px dashed ${BRAND.line}`, borderRadius: 3, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
          Para una semana con cambios (cursos, viajes, feriados): elegís qué rutina hace cada día sin tocar la rutina base. El alumno la ve arriba de la rutina y se desactiva sola cuando termina.
        </Typography>
        <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={create}>Armar semana temporal</Button>
      </Box>
    );
  }

  const field = (k) => ({ value: tw[k] || '', onChange: (e) => setTw({ ...tw, [k]: e.target.value }) });
  const setDate = (k) => (e) => setTw(rebuild({ ...tw, [k]: e.target.value }, plan));
  const setDay = (i, k, v) => {
    const days = tw.days.map((d, j) => {
      if (j !== i) return d;
      const nd = { ...d };
      if (v) nd[k] = v; else delete nd[k];
      if (k === 'base' && v !== 'off') delete nd.off;
      return nd;
    });
    setTw({ ...tw, days });
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.5}>
        <TextField label="Desde" type="date" value={tw.start || ''} onChange={setDate('start')} InputLabelProps={{ shrink: true }} />
        <TextField label="Hasta" type="date" value={tw.end || ''} onChange={setDate('end')} InputLabelProps={{ shrink: true }} />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField label="Título (botón)" placeholder="ej: Rutina semanal 5–11/oct" {...field('title')} />
        <TextField label="Subtítulo" placeholder="ej: Por cursos 8–9/10 · días de off" {...field('sub')} />
      </Stack>
      <TextField label="Explicación para el alumno" multiline minRows={2} {...field('intro')} />
      <Typography variant="overline" color="text.secondary">Días</Typography>
      {tw.days.map((d, i) => {
        const dt = new Date(d.date + 'T00:00:00');
        const off = !d.base || d.base === 'off';
        return (
          <Box key={d.date} sx={{ display: 'grid', gridTemplateColumns: '74px 1fr', gap: 1, p: 1.25, borderRadius: 3, border: `1px solid ${d.date === today ? BRAND.red : BRAND.line}`, bgcolor: 'background.paper' }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'primary.main', textTransform: 'uppercase', pt: 1 }}>
              {DOW[dt.getDay()]} {dt.getDate()}/{dt.getMonth() + 1}
              {d.date === today && <Box component="span" sx={{ display: 'block', color: 'text.secondary', textTransform: 'none', fontWeight: 600 }}>hoy</Box>}
            </Typography>
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: off ? '1fr' : '1.4fr 1fr 70px' } }}>
              <TextField select value={off ? 'off' : norm(d.base)} onChange={(e) => setDay(i, 'base', e.target.value)} sx={{ gridColumn: '1 / -1' }}>
                <MenuItem value="off">Off / descanso</MenuItem>
                {base.map((b) => <MenuItem key={b.day} value={norm(b.day)}>Rutina {b.day} — {plain(b.name || b.kind)}</MenuItem>)}
              </TextField>
              {off ? (
                <TextField placeholder="Motivo (ej: cursos presenciales)" value={d.off || ''} onChange={(e) => setDay(i, 'off', e.target.value)} />
              ) : (
                <>
                  <TextField placeholder="Etiqueta (ej: Presencial · fuerte)" value={d.tag || ''} onChange={(e) => setDay(i, 'tag', e.target.value)} />
                  <TextField placeholder="Nota del día" value={d.focus || ''} onChange={(e) => setDay(i, 'focus', e.target.value)} />
                  <TextField placeholder="RIR" value={d.rir || ''} onChange={(e) => setDay(i, 'rir', e.target.value)} />
                </>
              )}
            </Box>
          </Box>
        );
      })}
      <Button color="error" onClick={() => { if (confirm('¿Quitar la semana temporal? (se aplica al guardar)')) { const { tempWeek, ...rest } = plan; onChange(rest); } }} sx={{ alignSelf: 'flex-start' }}>
        Quitar semana temporal
      </Button>
    </Stack>
  );
}
