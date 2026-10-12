import { useEffect, useState } from 'react';
import { Alert, Avatar, Box, Button, Card, FormControlLabel, IconButton, InputAdornment, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { sb, invokeFn, uploadStudentPhoto, EMAIL_DOMAIN, notifyChanged } from '../supabase';
import { useUI } from '../App';
import { setAccess } from '../actions';
import { initials } from '../utils';
import { GRAD_RED } from '../theme';

export default function ProfileTab({ student }) {
  const ui = useUI();
  const [acc, setAcc] = useState({ full_name: student.full_name, username: student.username, password: '' });
  const [note, setNote] = useState(student.payment_note || '');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setAcc({ full_name: student.full_name, username: student.username, password: '' });
    setNote(student.payment_note || '');
  }, [student.user_id, student.full_name, student.username, student.payment_note]);

  const saveAccess = async () => {
    setErr('');
    const body = { user_id: student.user_id };
    if (acc.full_name.trim() && acc.full_name.trim() !== student.full_name) body.full_name = acc.full_name.trim();
    if (acc.username && acc.username !== student.username) body.username = acc.username;
    if (acc.password) body.password = acc.password;
    if (Object.keys(body).length === 1) return ui.notify('No hay cambios para guardar', 'info');
    if (body.password && body.password.length < 8) return setErr('La contraseña debe tener al menos 8 caracteres.');
    setBusy('access');
    try {
      await invokeFn('update-student', body);
      ui.notify('Datos de acceso actualizados');
      notifyChanged();
      setAcc((a) => ({ ...a, password: '' }));
    } catch (e) { setErr(e.message); }
    setBusy('');
  };

  const onPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy('photo');
    try {
      const url = await uploadStudentPhoto(student.slug, file);
      const { error } = await sb.from('students').update({ photo_url: url }).eq('user_id', student.user_id);
      if (error) throw new Error(error.message);
      ui.notify('Foto actualizada');
      notifyChanged();
    } catch (er) { ui.notify(er.message, 'error'); }
    setBusy('');
  };

  const toggleAccess = async (allowed) => {
    setBusy('status');
    try {
      await setAccess(student, allowed, note.trim() || null);
      ui.notify(allowed ? 'Acceso habilitado' : 'Acceso bloqueado');
    } catch (e) { ui.notify(e.message, 'error'); }
    setBusy('');
  };
  const saveNote = async () => {
    const { error } = await sb.from('students').update({ payment_note: note.trim() || null }).eq('user_id', student.user_id);
    ui.notify(error ? error.message : 'Nota guardada', error ? 'error' : 'success');
    notifyChanged();
  };

  const allowed = student.payment_status === 'al_dia';

  return (
    <Stack spacing={2}>
      <Card sx={{ p: 2.25 }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>Acceso al plan</Typography>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1.5 }}>Si está bloqueado, el alumno ve la pantalla de “Cuota pendiente” con tu WhatsApp.</Typography>
        <FormControlLabel
          control={<Switch checked={allowed} disabled={busy === 'status'} onChange={(e) => toggleAccess(e.target.checked)} />}
          label={<Typography sx={{ fontWeight: 800, color: allowed ? 'success.main' : 'primary.main' }}>{allowed ? 'Habilitado' : 'Bloqueado'}</Typography>}
        />
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <TextField label="Nota que ve el alumno si está bloqueado" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ej: debe la cuota de octubre" />
          <Button variant="outlined" color="secondary" onClick={saveNote} sx={{ flexShrink: 0 }}>Guardar</Button>
        </Stack>
      </Card>

      <Card sx={{ p: 2.25 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>Datos de acceso</Typography>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar src={student.photo_url || undefined} sx={{ width: 72, height: 72, background: GRAD_RED, fontWeight: 800 }}>{initials(student.full_name)}</Avatar>
            <Tooltip title="Cambiar foto">
              <IconButton component="label" size="small" disabled={busy === 'photo'} sx={{ position: 'absolute', right: -6, bottom: -6, bgcolor: '#fff', boxShadow: 1, '&:hover': { bgcolor: '#fff' } }}>
                <PhotoCameraRoundedIcon fontSize="small" />
                <input hidden type="file" accept="image/*" onChange={onPhoto} />
              </IconButton>
            </Tooltip>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Login</Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography sx={{ fontWeight: 800 }}>{student.username}</Typography>
              <Tooltip title="Copiar usuario"><IconButton size="small" onClick={() => { navigator.clipboard?.writeText(student.username); ui.notify('Usuario copiado'); }}><ContentCopyRoundedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
            </Stack>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>slug: {student.slug}</Typography>
          </Box>
        </Stack>
        <Stack spacing={2}>
          <TextField label="Nombre completo" value={acc.full_name} onChange={(e) => setAcc({ ...acc, full_name: e.target.value })} />
          <TextField label="Usuario (login)" value={acc.username} onChange={(e) => setAcc({ ...acc, username: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} InputProps={{ endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{EMAIL_DOMAIN}</Typography></InputAdornment> }} />
          <TextField label="Nueva contraseña" value={acc.password} onChange={(e) => setAcc({ ...acc, password: e.target.value })} placeholder="dejar vacío para no cambiarla" />
          {err && <Alert severity="error">{err}</Alert>}
          <Button variant="contained" onClick={saveAccess} disabled={busy === 'access'} sx={{ alignSelf: 'flex-start' }}>{busy === 'access' ? 'Guardando…' : 'Guardar datos de acceso'}</Button>
        </Stack>
      </Card>
    </Stack>
  );
}
