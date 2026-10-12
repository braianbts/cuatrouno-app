import { Avatar, Box, Card, Chip, Stack, Typography } from '@mui/material';
import { BRAND, GRAD_RED } from './theme';
import { initials, PAYMENT_STATE, paymentState } from './utils';

// Tarjeta base del panel: título + acción a la derecha + contenido que puede scrollear por dentro.
export function Panel({ title, action, children, sx, bodySx, subtitle }) {
  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, p: 2.25, ...sx }}>
      {(title || action) && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, minHeight: 32 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {title && <Typography variant="h6">{title}</Typography>}
            {subtitle && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{subtitle}</Typography>}
          </Box>
          {action}
        </Stack>
      )}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', ...bodySx }}>{children}</Box>
    </Card>
  );
}

export function StudentAvatar({ student, size = 34 }) {
  return (
    <Avatar src={student?.photo_url || undefined} sx={{ width: size, height: size, fontSize: size * 0.38, fontWeight: 800, background: GRAD_RED }}>
      {initials(student?.full_name)}
    </Avatar>
  );
}

export function StudentCell({ student, sub }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
      <StudentAvatar student={student} />
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 700 }}>{student?.full_name || 'Alumno eliminado'}</Typography>
        {sub && <Typography noWrap sx={{ fontSize: 11.5, color: 'text.secondary' }}>{sub}</Typography>}
      </Box>
    </Stack>
  );
}

export function AccessChip({ student, size = 'small' }) {
  const ok = student?.payment_status === 'al_dia';
  return <Chip size={size} label={ok ? 'Habilitado' : 'Bloqueado'} color={ok ? 'success' : 'error'} variant={ok ? 'outlined' : 'filled'} sx={{ height: 24, fontSize: 11 }} />;
}

export function PaymentChip({ payment }) {
  const st = PAYMENT_STATE[paymentState(payment)];
  const soft = { success: 'rgba(31,157,85,.10)', warning: 'rgba(185,116,10,.12)', error: 'rgba(200,30,30,.10)', default: 'rgba(23,18,15,.06)' };
  const fg = { success: BRAND.good, warning: BRAND.warn, error: BRAND.red, default: BRAND.muted };
  return <Chip size="small" label={st.label} sx={{ height: 24, fontSize: 11, bgcolor: soft[st.color], color: fg[st.color] }} />;
}

export function PlanChip({ mode }) {
  if (mode === 'editable') return <Chip size="small" label="Editable" sx={{ height: 22, fontSize: 10.5, bgcolor: 'rgba(200,30,30,.08)', color: 'primary.main' }} />;
  if (mode === 'html') return <Chip size="small" label="HTML" sx={{ height: 22, fontSize: 10.5, bgcolor: 'rgba(23,18,15,.06)', color: 'text.secondary' }} />;
  return <Chip size="small" label="Sin plan" sx={{ height: 22, fontSize: 10.5, bgcolor: 'rgba(185,116,10,.12)', color: BRAND.warn }} />;
}

export function Empty({ children }) {
  return <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 3 }}>{children}</Typography>;
}
