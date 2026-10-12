import { useState } from 'react';
import { Box, Button, Card, Stack, TextField, Typography, Alert } from '@mui/material';
import { sb } from './supabase';
import { GRAD_RED } from './theme';

export default function Login({ notAdmin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError('Email o contraseña incorrectos.');
  };

  return (
    <Box sx={{ minHeight: '100%', display: 'grid', placeItems: 'center', p: 2, background: 'radial-gradient(ellipse 800px 500px at 15% -10%, rgba(200,30,30,.08), transparent 60%), #f4f2f0' }}>
      <Card sx={{ width: '100%', maxWidth: 400, p: { xs: 3, sm: 4 } }}>
        <Box component="img" src="/shared/logo-navbar.png" alt="Cuatrouno" sx={{ height: 40, mb: 3 }} />
        <Typography variant="h5">Panel de administración</Typography>
        <Typography color="text.secondary" sx={{ mb: 3, fontSize: 14 }}>Alumnos, planes y pagos en un solo lugar.</Typography>
        {notAdmin && <Alert severity="warning" sx={{ mb: 2 }}>Esta cuenta no es de administrador. <a href="/">Ir a la app del alumno</a></Alert>}
        <Stack component="form" spacing={2} onSubmit={submit}>
          <TextField label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextField label="Contraseña" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ background: GRAD_RED }}>
            {busy ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}
