import { useState } from 'react';
import {
  Alert, Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel,
  IconButton, InputAdornment, Stack, Switch, TextField, Tooltip, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CasinoRoundedIcon from '@mui/icons-material/CasinoRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import { sb, invokeFn, uploadStudentPhoto, EMAIL_DOMAIN, notifyChanged } from '../supabase';
import { useUI } from '../App';
import { addMonths, isoToday } from '../utils';

const randomPassword = () => {
  const words = ['fuerza', 'press', 'sentadilla', 'remo', 'cardio', 'plancha', 'prensa', 'jalon'];
  return words[Math.floor(Math.random() * words.length)] + '-' + Math.floor(1000 + Math.random() * 9000);
};

export default function CreateStudentDialog({ prefill = {}, onClose }) {
  const ui = useUI();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [f, setF] = useState({
    full_name: prefill.full_name || '', username: prefill.username || '', slug: prefill.username || '',
    password: randomPassword(), photo: null,
    withPayment: true, concept: 'Plan mensual', amount: '', due_date: isoToday(), installments: 1, paidNow: true,
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const onUsername = (e) => {
    const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setF((x) => ({ ...x, username: v, slug: slugTouched ? x.slug : v }));
  };

  const submit = async () => {
    setError('');
    if (!f.full_name.trim() || !f.username || !f.slug) return setError('Completá nombre y usuario.');
    if (f.password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (f.withPayment && !(Number(f.amount) > 0)) return setError('Poné el monto de la cuota (o desactivá "Cargar cuotas").');
    setBusy(true);
    try {
      const data = await invokeFn('create-student', { username: f.username, password: f.password, full_name: f.full_name.trim(), slug: f.slug });
      const userId = data?.user_id;
      if (userId && f.photo) {
        try {
          const url = await uploadStudentPhoto(f.slug, f.photo);
          await sb.from('students').update({ photo_url: url }).eq('user_id', userId);
        } catch (e) { ui.notify('Alumno creado, pero la foto no se pudo subir.', 'warning'); }
      }
      if (userId && f.withPayment) {
        const n = Math.max(1, Math.min(12, Number(f.installments) || 1));
        const rows = Array.from({ length: n }, (_, i) => ({
          user_id: userId,
          concept: n > 1 ? `${f.concept} · cuota ${i + 1}/${n}` : f.concept,
          amount: Number(f.amount),
          due_date: addMonths(f.due_date, i),
          status: i === 0 && f.paidNow ? 'paid' : 'pending',
          paid_at: i === 0 && f.paidNow ? isoToday() : null,
        }));
        const { error: pe } = await sb.from('payments').insert(rows);
        if (pe) ui.notify('Alumno creado, pero no se pudieron cargar las cuotas: ' + pe.message, 'warning');
        // Si la primera cuota ya está paga, arranca habilitado.
        if (f.paidNow) await sb.from('students').update({ payment_status: 'al_dia' }).eq('user_id', userId);
      }
      ui.notify(`Alumno creado: ${f.username}`);
      notifyChanged();
      onClose();
      if (userId) ui.openStudent(userId, 'plan');
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const shareText = `Hola ${f.full_name.split(' ')[0] || ''}! Ya tenés tu acceso a la app de Cuatrouno 💪\n${location.origin}\nUsuario: ${f.username}\nContraseña: ${f.password}`;

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Nuevo alumno</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ position: 'relative' }}>
              <Avatar src={f.photo ? URL.createObjectURL(f.photo) : undefined} sx={{ width: 64, height: 64 }} />
              <IconButton component="label" size="small" sx={{ position: 'absolute', right: -6, bottom: -6, bgcolor: '#fff', boxShadow: 1, '&:hover': { bgcolor: '#fff' } }}>
                <PhotoCameraRoundedIcon fontSize="small" />
                <input hidden type="file" accept="image/*" onChange={(e) => setF((x) => ({ ...x, photo: e.target.files[0] || null }))} />
              </IconButton>
            </Box>
            <TextField label="Nombre completo" value={f.full_name} onChange={set('full_name')} autoFocus />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Usuario (login)" value={f.username} onChange={onUsername} helperText={f.username ? f.username + EMAIL_DOMAIN : 'minúsculas, números y guiones'} />
            <TextField label="Slug interno" value={f.slug} onChange={(e) => { setSlugTouched(true); setF((x) => ({ ...x, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })); }} helperText="carpeta de fotos y registros" />
          </Stack>
          <TextField
            label="Contraseña" value={f.password} onChange={set('password')}
            InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="Generar otra"><IconButton size="small" onClick={() => setF((x) => ({ ...x, password: randomPassword() }))}><CasinoRoundedIcon fontSize="small" /></IconButton></Tooltip></InputAdornment> }}
          />

          <Divider />
          <FormControlLabel control={<Switch checked={f.withPayment} onChange={(e) => setF((x) => ({ ...x, withPayment: e.target.checked }))} />} label={<Typography sx={{ fontWeight: 700, fontSize: 14 }}>Cargar cuotas del plan</Typography>} />
          {f.withPayment && (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Concepto" value={f.concept} onChange={set('concept')} />
                <TextField label="Monto por cuota" type="number" value={f.amount} onChange={set('amount')} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Primera cuota vence" type="date" value={f.due_date} onChange={set('due_date')} InputLabelProps={{ shrink: true }} />
                <TextField label="Cantidad de cuotas (mensuales)" type="number" inputProps={{ min: 1, max: 12 }} value={f.installments} onChange={set('installments')} />
              </Stack>
              <FormControlLabel control={<Switch checked={f.paidNow} onChange={(e) => setF((x) => ({ ...x, paidNow: e.target.checked }))} />} label="La primera cuota ya está paga (habilita el acceso)" />
            </>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.5 }}>Mensaje para mandarle (se copia):</Typography>
            <Box component="pre" sx={{ m: 0, fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{shareText}</Box>
            <Button size="small" sx={{ mt: 0.5, px: 1 }} onClick={() => { navigator.clipboard?.writeText(shareText); ui.notify('Mensaje copiado'); }}>Copiar mensaje</Button>
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={busy} color="secondary">Cancelar</Button>
        <Button variant="contained" onClick={submit} disabled={busy}>{busy ? 'Creando…' : 'Crear alumno'}</Button>
      </DialogActions>
    </Dialog>
  );
}
