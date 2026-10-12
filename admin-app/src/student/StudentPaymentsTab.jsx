import { Box, Button, Card, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useData } from '../data';
import { useUI } from '../App';
import { PaymentChip, Empty } from '../components';
import { fmtDate, fmtMoney } from '../utils';
import { markPaid } from '../actions';
import { BRAND } from '../theme';

export default function StudentPaymentsTab({ student }) {
  const { payments } = useData();
  const ui = useUI();
  const list = payments
    .filter((p) => p.user_id === student.user_id)
    .sort((a, b) => String(b.due_date || '').localeCompare(String(a.due_date || '')));
  const paid = list.filter((p) => p.status === 'paid').reduce((a, p) => a + Number(p.amount), 0);
  const owed = list.filter((p) => p.status !== 'paid').reduce((a, p) => a + Number(p.amount), 0);

  const pay = async (p) => {
    try {
      const { unlocked } = await markPaid(p, payments, student);
      ui.notify(unlocked ? 'Pago registrado y acceso habilitado' : 'Pago registrado');
    } catch (e) { ui.notify(e.message, 'error'); }
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <Card sx={{ p: 2 }}>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Total cobrado</Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{fmtMoney(paid)}</Typography>
        </Card>
        <Card sx={{ p: 2 }}>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Pendiente</Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: owed ? 'primary.main' : 'text.primary' }}>{fmtMoney(owed)}</Typography>
        </Card>
      </Box>
      <Card sx={{ p: 2.25 }}>
        <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Cuotas</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>El alumno las ve en su pestaña Pagos, con aviso 5 días antes del vencimiento.</Typography>
          </Box>
          <Button size="small" variant="contained" startIcon={<AddRoundedIcon />} onClick={() => ui.newPayment(student.user_id)}>Cuota</Button>
        </Stack>
        {!list.length && <Empty>Sin cuotas cargadas. Mientras no tenga, el alumno ve lo que diga su plan.</Empty>}
        <Stack divider={<Box sx={{ borderTop: `1px solid ${BRAND.line}` }} />}>
          {list.map((p) => (
            <Stack key={p.id} direction="row" alignItems="center" spacing={1} sx={{ py: 1.1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 700 }}>{p.concept}</Typography>
                <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {p.status === 'paid' ? `Cobrada ${fmtDate(p.paid_at)}${p.method ? ' · ' + p.method : ''}` : `Vence ${fmtDate(p.due_date)}`}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>{fmtMoney(p.amount)}</Typography>
                <PaymentChip payment={p} />
              </Box>
              <Tooltip title="Editar"><IconButton size="small" onClick={() => ui.editPayment(p)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
              {p.status !== 'paid'
                ? <Tooltip title="Marcar cobrada"><IconButton size="small" onClick={() => pay(p)} sx={{ bgcolor: 'rgba(31,157,85,.10)', color: 'success.main' }}><CheckRoundedIcon fontSize="small" /></IconButton></Tooltip>
                : <Box sx={{ width: 34 }} />}
            </Stack>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}
