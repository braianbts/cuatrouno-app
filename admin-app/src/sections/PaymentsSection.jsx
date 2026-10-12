import { useState } from 'react';
import {
  Box, Button, Card, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useData } from '../data';
import { useUI } from '../App';
import { StudentCell, PaymentChip, Empty } from '../components';
import { fmtDate, fmtMoney, paymentState } from '../utils';
import { markPaid } from '../actions';
import { BRAND } from '../theme';

const FILTERS = [
  { key: 'abiertos', label: 'Por cobrar' },
  { key: 'vencidos', label: 'Vencidos' },
  { key: 'pagados', label: 'Cobrados' },
  { key: 'todos', label: 'Todos' },
];

export default function PaymentsSection() {
  const { payments, studentById } = useData();
  const ui = useUI();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [filter, setFilter] = useState('abiertos');

  const q = ui.search.trim().toLowerCase();
  const list = payments
    .filter((p) => {
      const st = paymentState(p);
      if (filter === 'abiertos' && st === 'paid') return false;
      if (filter === 'vencidos' && st !== 'overdue') return false;
      if (filter === 'pagados' && st !== 'paid') return false;
      if (q) return (studentById(p.user_id)?.full_name || '').toLowerCase().includes(q);
      return true;
    })
    .sort((a, b) => filter === 'pagados'
      ? String(b.paid_at || '').localeCompare(String(a.paid_at || ''))
      : String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));

  const total = list.reduce((a, p) => a + Number(p.amount), 0);
  const pay = async (p) => {
    try {
      const { unlocked } = await markPaid(p, payments, studentById(p.user_id));
      ui.notify(unlocked ? 'Pago registrado y acceso habilitado' : 'Pago registrado');
    } catch (e) { ui.notify(e.message, 'error'); }
  };

  return (
    <Card sx={{ p: { xs: 1.5, sm: 2.25 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">{list.length} cuota{list.length === 1 ? '' : 's'}</Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Total: <b>{fmtMoney(total)}</b></Typography>
        </Box>
        <ToggleButtonGroup exclusive size="small" value={filter} onChange={(_e, v) => v && setFilter(v)} sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { borderRadius: '999px !important', border: `1px solid ${BRAND.line} !important`, mx: 0.25, px: 1.5, textTransform: 'none', fontWeight: 700, fontSize: 12.5 } }}>
          {FILTERS.map((f) => <ToggleButton key={f.key} value={f.key}>{f.label}</ToggleButton>)}
        </ToggleButtonGroup>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => ui.newPayment()}>Registrar cuota</Button>
      </Stack>

      {!list.length && <Empty>No hay cuotas con ese filtro.</Empty>}

      {mobile ? (
        <Stack spacing={1}>
          {list.map((p) => (
            <Box key={p.id} sx={{ p: 1.5, border: `1px solid ${BRAND.line}`, borderRadius: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => ui.openStudent(p.user_id, 'pagos')}><StudentCell student={studentById(p.user_id)} sub={p.concept} /></Box>
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{fmtMoney(p.amount)}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                <PaymentChip payment={p} />
                <Typography sx={{ flex: 1, fontSize: 12, color: 'text.secondary' }}>{p.status === 'paid' ? 'Cobrado ' + fmtDate(p.paid_at) : 'Vence ' + fmtDate(p.due_date)}</Typography>
                <IconButton size="small" onClick={() => ui.editPayment(p)}><EditRoundedIcon fontSize="small" /></IconButton>
                {p.status !== 'paid' && <IconButton size="small" onClick={() => pay(p)} sx={{ bgcolor: 'rgba(31,157,85,.10)', color: 'success.main' }}><CheckRoundedIcon fontSize="small" /></IconButton>}
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <Box sx={{ mx: { sm: -2.25 }, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: 2.25 }}>Alumno</TableCell>
                <TableCell>Concepto</TableCell>
                <TableCell>Vence</TableCell>
                <TableCell>Cobrado</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right" sx={{ pr: 2.25 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ pl: 2.25, cursor: 'pointer' }} onClick={() => ui.openStudent(p.user_id, 'pagos')}><StudentCell student={studentById(p.user_id)} /></TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{p.concept}{p.note ? <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{p.note}</Typography> : null}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{fmtDate(p.due_date)}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{p.paid_at ? fmtDate(p.paid_at) : '—'}{p.method ? <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{p.method}</Typography> : null}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 13.5, fontWeight: 800 }}>{fmtMoney(p.amount)}</TableCell>
                  <TableCell><PaymentChip payment={p} /></TableCell>
                  <TableCell align="right" sx={{ pr: 2.25, whiteSpace: 'nowrap' }}>
                    <Tooltip title="Editar"><IconButton size="small" onClick={() => ui.editPayment(p)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
                    {p.status !== 'paid' && <Tooltip title="Marcar cobrado"><IconButton size="small" onClick={() => pay(p)} sx={{ ml: 0.5, bgcolor: 'rgba(31,157,85,.10)', color: 'success.main' }}><CheckRoundedIcon fontSize="small" /></IconButton></Tooltip>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Card>
  );
}
