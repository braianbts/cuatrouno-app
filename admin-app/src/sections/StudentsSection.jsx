import { useMemo, useState } from 'react';
import {
  Box, Button, Card, Chip, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import { useData } from '../data';
import { useUI } from '../App';
import { StudentCell, AccessChip, PlanChip, PaymentChip, Empty } from '../components';
import { fmtMoney, lastLoginText, paymentState } from '../utils';
import { BRAND } from '../theme';

const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'bloqueados', label: 'Bloqueados' },
  { key: 'vencidos', label: 'Cuota vencida' },
  { key: 'sinplan', label: 'Sin plan editable' },
];

export default function StudentsSection() {
  const { students, plans, payments } = useData();
  const ui = useUI();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [filter, setFilter] = useState('todos');

  // Próximo pago pendiente de cada alumno (el más cercano a vencer).
  const nextPayment = useMemo(() => {
    const m = {};
    payments.filter((p) => p.status !== 'paid').forEach((p) => {
      const cur = m[p.user_id];
      if (!cur || String(p.due_date || '9999') < String(cur.due_date || '9999')) m[p.user_id] = p;
    });
    return m;
  }, [payments]);

  const q = ui.search.trim().toLowerCase();
  const list = students.filter((s) => {
    if (q && !(`${s.full_name} ${s.username}`.toLowerCase().includes(q))) return false;
    if (filter === 'bloqueados') return s.payment_status !== 'al_dia';
    if (filter === 'vencidos') return nextPayment[s.user_id] && paymentState(nextPayment[s.user_id]) === 'overdue';
    if (filter === 'sinplan') return plans[s.user_id]?.mode !== 'editable';
    return true;
  });

  return (
    <Card sx={{ p: { xs: 1.5, sm: 2.25 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>{list.length} alumno{list.length === 1 ? '' : 's'}{q ? ` · “${ui.search}”` : ''}</Typography>
        <ToggleButtonGroup exclusive size="small" value={filter} onChange={(_e, v) => v && setFilter(v)} sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { borderRadius: '999px !important', border: `1px solid ${BRAND.line} !important`, mx: 0.25, px: 1.5, textTransform: 'none', fontWeight: 700, fontSize: 12.5 } }}>
          {FILTERS.map((f) => <ToggleButton key={f.key} value={f.key}>{f.label}</ToggleButton>)}
        </ToggleButtonGroup>
      </Stack>

      {!list.length && <Empty>No hay alumnos con ese filtro.</Empty>}

      {mobile ? (
        <Stack spacing={1}>
          {list.map((s) => {
            const np = nextPayment[s.user_id];
            return (
              <Box key={s.user_id} onClick={() => ui.openStudent(s.user_id)} sx={{ p: 1.5, border: `1px solid ${BRAND.line}`, borderRadius: 3, cursor: 'pointer' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ flex: 1, minWidth: 0 }}><StudentCell student={s} sub={'@' + s.username + ' · ' + lastLoginText(s.last_login_at)} /></Box>
                  <AccessChip student={s} />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <PlanChip mode={plans[s.user_id]?.mode} />
                  {np && <PaymentChip payment={np} />}
                  {np && <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{fmtMoney(np.amount)}</Typography>}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Box sx={{ mx: { sm: -2.25 }, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: 2.25 }}>Alumno</TableCell>
                <TableCell>Último ingreso</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Próxima cuota</TableCell>
                <TableCell>Acceso</TableCell>
                <TableCell align="right" sx={{ pr: 2.25 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((s) => {
                const np = nextPayment[s.user_id];
                return (
                  <TableRow key={s.user_id} hover sx={{ cursor: 'pointer' }} onClick={() => ui.openStudent(s.user_id)}>
                    <TableCell sx={{ pl: 2.25 }}><StudentCell student={s} sub={'@' + s.username} /></TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{lastLoginText(s.last_login_at)}</TableCell>
                    <TableCell><PlanChip mode={plans[s.user_id]?.mode} /></TableCell>
                    <TableCell>
                      {np ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{fmtMoney(np.amount)}</Typography>
                          <PaymentChip payment={np} />
                        </Stack>
                      ) : <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>—</Typography>}
                    </TableCell>
                    <TableCell><AccessChip student={s} /></TableCell>
                    <TableCell align="right" sx={{ pr: 2.25, whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Editar plan"><IconButton size="small" onClick={() => ui.openStudent(s.user_id, 'plan')}><EditNoteRoundedIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Registrar pago"><IconButton size="small" onClick={() => ui.newPayment(s.user_id)}><PaymentsRoundedIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
      {!students.length && (
        <Box sx={{ textAlign: 'center', mt: 2 }}><Button variant="contained" onClick={() => ui.newStudent()}>Crear el primer alumno</Button></Box>
      )}
    </Card>
  );
}
