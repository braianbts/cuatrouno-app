import { useMemo, useState } from 'react';
import {
  Box, Button, Card, Chip, IconButton, LinearProgress, MenuItem, Select, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Tooltip, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import FitnessCenterRoundedIcon from '@mui/icons-material/FitnessCenterRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import { useData } from '../data';
import { useUI } from '../App';
import { BRAND, GRAD_RED } from '../theme';
import { Panel, StudentCell, AccessChip, PaymentChip, PlanChip, Empty } from '../components';
import { fmtMoney, fmtShortDate, isoToday, lastLoginText, MONTHS, paymentState } from '../utils';
import { markPaid } from '../actions';

export default function Dashboard() {
  const theme = useTheme();
  const fit = useMediaQuery(theme.breakpoints.up('lg')); // en escritorio entra todo en una pantalla
  const { students, payments, logs } = useData();

  return (
    <Box sx={{
      display: 'grid', gap: 2,
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(12, 1fr)' },
      gridTemplateRows: fit ? 'auto minmax(0, 1fr) minmax(0, 1fr)' : 'auto',
      height: fit ? '100%' : 'auto',
      minHeight: fit ? 640 : 0,
    }}>
      <HeroCard sx={{ gridColumn: { xs: '1 / -1', sm: '1 / -1', lg: 'span 4' } }} />
      <StudentsKpi sx={{ gridColumn: { xs: '1 / -1', lg: 'span 5' } }} />
      <CollectionScore sx={{ gridColumn: { xs: '1 / -1', lg: 'span 3' } }} />
      <IncomeChart sx={{ gridColumn: { xs: '1 / -1', lg: 'span 8' }, minHeight: fit ? 0 : 320 }} />
      <UpcomingPayments sx={{ gridColumn: { xs: '1 / -1', lg: 'span 4' }, minHeight: fit ? 0 : 280 }} />
      <StudentsTable sx={{ gridColumn: { xs: '1 / -1', lg: 'span 5' }, minHeight: fit ? 0 : 320 }} />
      <PaymentsDonut sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1', lg: 'span 3' }, minHeight: fit ? 0 : 300 }} />
      <Activity sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1', lg: 'span 4' }, minHeight: fit ? 0 : 300 }} students={students} logs={logs} payments={payments} />
    </Box>
  );
}

// ---------- Fila 1 ----------
function HeroCard({ sx }) {
  const { payments } = useData();
  const ui = useUI();
  const month = isoToday().slice(0, 7);
  const cobrado = payments.filter((p) => p.status === 'paid' && (p.paid_at || '').startsWith(month)).reduce((a, p) => a + Number(p.amount), 0);
  const porCobrar = payments.filter((p) => p.status !== 'paid' && (p.due_date || '').startsWith(month)).reduce((a, p) => a + Number(p.amount), 0);
  return (
    <Card sx={{ ...sx, p: 2.5, color: '#fff', border: 'none', background: GRAD_RED, position: 'relative', overflow: 'hidden', boxShadow: '0 16px 36px rgba(200,30,30,.28)' }}>
      <Box sx={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%', border: '28px solid rgba(255,255,255,.10)' }} />
      <Box sx={{ position: 'absolute', right: 30, bottom: -90, width: 180, height: 180, borderRadius: '50%', border: '22px solid rgba(255,255,255,.08)' }} />
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ position: 'relative' }}>
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>Cobrado en {MONTHS[new Date().getMonth()].toLowerCase()}</Typography>
          <Typography sx={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.15 }}>{fmtMoney(cobrado)}</Typography>
          <Typography sx={{ fontSize: 12.5, opacity: 0.85, mt: 0.25 }}>Por cobrar este mes: <b>{fmtMoney(porCobrar)}</b></Typography>
        </Box>
        <Tooltip title="Registrar pago">
          <IconButton onClick={() => ui.newPayment()} sx={{ bgcolor: 'rgba(255,255,255,.95)', color: 'primary.main', '&:hover': { bgcolor: '#fff' } }}><AddRoundedIcon /></IconButton>
        </Tooltip>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 2.5, position: 'relative' }}>
        <Button fullWidth onClick={() => ui.newPayment()} sx={{ bgcolor: '#fff', color: 'primary.main', whiteSpace: 'nowrap', '&:hover': { bgcolor: '#fff6f5' } }}>Registrar pago</Button>
        <Button fullWidth startIcon={<PersonAddAlt1RoundedIcon />} onClick={() => ui.newStudent()} sx={{ bgcolor: BRAND.ink, color: '#fff', whiteSpace: 'nowrap', '&:hover': { bgcolor: '#000' } }}>Alumno</Button>
      </Stack>
    </Card>
  );
}

function StudentsKpi({ sx }) {
  const { students, payments } = useData();
  const ui = useUI();
  const al = students.filter((s) => s.payment_status === 'al_dia').length;
  const overdue = new Set(payments.filter((p) => paymentState(p) === 'overdue').map((p) => p.user_id)).size;
  const week = Date.now() - 7 * 86400000;
  const active = students.filter((s) => s.last_login_at && new Date(s.last_login_at).getTime() > week).length;
  const tiles = [
    { label: 'Alumnos', value: students.length, sub: `${active} activos esta semana`, icon: <PeopleAltRoundedIcon fontSize="small" /> },
    { label: 'Habilitados', value: al, sub: 'acceso al plan', icon: <VerifiedRoundedIcon fontSize="small" /> },
    { label: 'Bloqueados', value: students.length - al, sub: overdue ? `${overdue} con cuota vencida` : 'sin cuotas vencidas', icon: <LockRoundedIcon fontSize="small" />, alert: students.length - al > 0 },
  ];
  return (
    <Panel title="Alumnos" sx={sx} action={<Button size="small" variant="outlined" color="secondary" onClick={() => ui.setSection('alumnos')}>Ver todos</Button>} bodySx={{ overflow: 'visible' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
        {tiles.map((t) => (
          <Box key={t.label} sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${BRAND.line}`, bgcolor: BRAND.surfaceAlt }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: t.alert ? 'primary.main' : 'text.secondary', mb: 1 }}>
              <Box sx={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: t.alert ? 'rgba(200,30,30,.10)' : 'rgba(23,18,15,.06)' }}>{t.icon}</Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{t.label}</Typography>
            </Stack>
            <Typography sx={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1 }}>{t.value}</Typography>
            <Typography noWrap sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>{t.sub}</Typography>
          </Box>
        ))}
      </Box>
    </Panel>
  );
}

function CollectionScore({ sx }) {
  const { payments } = useData();
  // Cobranza del mes: cobrado / (cobrado + lo que vencía este mes y sigue pendiente).
  const month = isoToday().slice(0, 7);
  const due = payments.filter((p) => (p.due_date || '').startsWith(month) || (p.paid_at || '').startsWith(month));
  const paid = due.filter((p) => p.status === 'paid').reduce((a, p) => a + Number(p.amount), 0);
  const total = due.reduce((a, p) => a + Number(p.amount), 0);
  const pct = total ? Math.round((paid / total) * 100) : 100;
  const label = !total ? 'Sin cuotas' : pct >= 90 ? 'Excelente' : pct >= 70 ? 'Buena' : pct >= 40 ? 'Regular' : 'Atención';
  return (
    <Panel title="Cobranza del mes" sx={sx} bodySx={{ overflow: 'visible' }}>
      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Cuotas del mes cobradas</Typography>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between">
        <Typography sx={{ fontSize: 24, fontWeight: 800 }}>{label}</Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.secondary' }}>{pct}%</Typography>
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }}>
        <Box sx={{ flex: Math.max(pct, 4), height: 26, borderRadius: 2, bgcolor: BRAND.ink }} />
        <Box sx={{ flex: Math.max(100 - pct, 4), height: 26, borderRadius: 2, background: GRAD_RED, opacity: 0.85 }} />
      </Stack>
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 1 }}>{fmtMoney(paid)} de {fmtMoney(total)}</Typography>
    </Panel>
  );
}

// ---------- Fila 2 ----------
function IncomeChart({ sx }) {
  const { payments } = useData();
  const [range, setRange] = useState(6);
  const data = useMemo(() => {
    const now = new Date();
    const out = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const cobrado = payments.filter((p) => p.status === 'paid' && (p.paid_at || '').startsWith(key)).reduce((a, p) => a + Number(p.amount), 0);
      const pendiente = payments.filter((p) => p.status !== 'paid' && (p.due_date || '').startsWith(key)).reduce((a, p) => a + Number(p.amount), 0);
      out.push({ month: MONTHS[d.getMonth()], cobrado, pendiente });
    }
    return out;
  }, [payments, range]);
  const total = data.reduce((a, d) => a + d.cobrado, 0);
  return (
    <Panel
      sx={sx}
      title={<Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ flexWrap: 'wrap' }}><span>Ingresos</span><Typography component="span" sx={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>{fmtMoney(total)}</Typography><Typography component="span" sx={{ fontSize: 11.5, color: 'text.secondary' }}>cobrado en el período</Typography></Stack>}
      action={
        <Stack direction="row" spacing={2} alignItems="center">
          <Stack direction="row" spacing={2} sx={{ display: { xs: 'none', sm: 'flex' } }}>
            <Legend color={BRAND.red} label="Cobrado" />
            <Legend color="#f2b8b0" label="Por cobrar" />
          </Stack>
          <Select value={range} onChange={(e) => setRange(e.target.value)} sx={{ fontSize: 13, height: 34 }}>
            <MenuItem value={6}>Últimos 6 meses</MenuItem>
            <MenuItem value={12}>Últimos 12 meses</MenuItem>
          </Select>
        </Stack>
      }
      bodySx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <Box sx={{ flex: 1, minHeight: 130, position: 'relative' }}>
        {/* contenedor con tamaño definido: el gráfico toma el alto/ancho disponible */}
        <Box sx={{ position: 'absolute', inset: 0 }}>
        <BarChart
          dataset={data}
          xAxis={[{ scaleType: 'band', dataKey: 'month', categoryGapRatio: 0.45, barGapRatio: 0.15, disableTicks: true }]}
          yAxis={[{ valueFormatter: (v) => (v >= 1000 ? Math.round(v / 1000) + 'k' : v), disableTicks: true }]}
          series={[
            { dataKey: 'cobrado', label: 'Cobrado', color: BRAND.red, valueFormatter: (v) => fmtMoney(v) },
            { dataKey: 'pendiente', label: 'Por cobrar', color: '#f2b8b0', valueFormatter: (v) => fmtMoney(v) },
          ]}
          borderRadius={8}
          slotProps={{ legend: { hidden: true } }}
          margin={{ top: 10, right: 6, bottom: 24, left: 40 }}
          grid={{ horizontal: true }}
          sx={{ '& .MuiChartsAxis-line': { display: 'none' }, '& .MuiChartsGrid-line': { stroke: BRAND.line, strokeDasharray: '4 4' } }}
        />
        </Box>
      </Box>
    </Panel>
  );
}

function Legend({ color, label }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box sx={{ width: 10, height: 10, borderRadius: 0.75, bgcolor: color }} />
      <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{label}</Typography>
    </Stack>
  );
}

function UpcomingPayments({ sx }) {
  const { payments, studentById } = useData();
  const ui = useUI();
  const list = payments
    .filter((p) => p.status !== 'paid')
    .sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')))
    .slice(0, 12);
  const pay = async (p) => {
    try {
      const { unlocked } = await markPaid(p, payments, studentById(p.user_id));
      ui.notify(unlocked ? 'Pago registrado y acceso habilitado' : 'Pago registrado');
    } catch (e) { ui.notify(e.message, 'error'); }
  };
  return (
    <Panel sx={sx} title="Próximos vencimientos" action={<Button size="small" onClick={() => ui.setSection('pagos')}>Ver pagos</Button>}>
      {!list.length && <Empty>No hay cuotas pendientes 🎉</Empty>}
      <Stack divider={<Box sx={{ borderTop: `1px solid ${BRAND.line}` }} />}>
        {list.map((p) => {
          const st = studentById(p.user_id);
          return (
            <Stack key={p.id} direction="row" alignItems="center" spacing={1} sx={{ py: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => ui.openStudent(p.user_id, 'pagos')}>
                <StudentCell student={st} sub={`${p.concept} · vence ${fmtShortDate(p.due_date)}`} />
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{fmtMoney(p.amount)}</Typography>
                <PaymentChip payment={p} />
              </Box>
              <Tooltip title="Marcar cobrado"><IconButton size="small" onClick={() => pay(p)} sx={{ bgcolor: 'rgba(31,157,85,.10)', color: 'success.main' }}><CheckRoundedIcon fontSize="small" /></IconButton></Tooltip>
            </Stack>
          );
        })}
      </Stack>
    </Panel>
  );
}

// ---------- Fila 3 ----------
function StudentsTable({ sx }) {
  const { students, plans } = useData();
  const ui = useUI();
  const sorted = [...students].sort((a, b) => String(b.last_login_at || '').localeCompare(String(a.last_login_at || '')));
  return (
    <Panel sx={sx} title="Alumnos recientes" subtitle="Ordenados por último ingreso" bodySx={{ mx: -2.25 }}>
      {!students.length ? <Empty>Todavía no hay alumnos.</Empty> : (
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ pl: 2.25 }}>Alumno</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell sx={{ pr: 2.25 }}>Acceso</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((s) => (
              <TableRow key={s.user_id} hover sx={{ cursor: 'pointer' }} onClick={() => ui.openStudent(s.user_id)}>
                <TableCell sx={{ pl: 2.25, maxWidth: 200 }}><StudentCell student={s} sub={lastLoginText(s.last_login_at)} /></TableCell>
                <TableCell><PlanChip mode={plans[s.user_id]?.mode} /></TableCell>
                <TableCell sx={{ pr: 2.25 }}><AccessChip student={s} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

function PaymentsDonut({ sx }) {
  const { payments } = useData();
  const month = isoToday().slice(0, 7);
  const rel = payments.filter((p) => (p.due_date || '').startsWith(month) || (p.paid_at || '').startsWith(month) || paymentState(p) === 'overdue');
  const sum = (st) => rel.filter((p) => paymentState(p) === st || (st === 'pending' && paymentState(p) === 'due-soon')).reduce((a, p) => a + Number(p.amount), 0);
  const parts = [
    { id: 'paid', label: 'Cobrado', value: sum('paid'), color: BRAND.ink },
    { id: 'pending', label: 'Pendiente', value: sum('pending'), color: '#f2b8b0' },
    { id: 'overdue', label: 'Vencido', value: sum('overdue'), color: BRAND.red },
  ];
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <Panel sx={sx} title="Estado de cuotas" subtitle="Este mes + vencidas" bodySx={{ display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, minHeight: 110, position: 'relative' }}>
        {total > 0 ? (
          <Box sx={{ position: 'absolute', inset: 0 }}>
          <PieChart
            series={[{ data: parts.filter((p) => p.value > 0), innerRadius: '68%', outerRadius: '100%', paddingAngle: 3, cornerRadius: 6, valueFormatter: (v) => fmtMoney(v.value) }]}
            slotProps={{ legend: { hidden: true } }}
            margin={{ top: 4, bottom: 4, left: 4, right: 4 }}
          />
          </Box>
        ) : <Empty>Sin cuotas este mes</Empty>}
        {total > 0 && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>Total</Typography>
              <Typography sx={{ fontSize: 17, fontWeight: 800 }}>{fmtMoney(total)}</Typography>
            </Box>
          </Box>
        )}
      </Box>
      <Stack spacing={0.5} sx={{ mt: 1 }}>
        {parts.map((p) => (
          <Stack key={p.id} direction="row" alignItems="center" spacing={1}>
            <Chip size="small" label={total ? Math.round((p.value / total) * 100) + '%' : '0%'} sx={{ height: 22, minWidth: 48, fontSize: 11, bgcolor: p.color, color: p.id === 'pending' ? BRAND.ink : '#fff' }} />
            <Typography sx={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{p.label}</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{fmtMoney(p.value)}</Typography>
          </Stack>
        ))}
      </Stack>
    </Panel>
  );
}

function Activity({ sx, students, logs }) {
  const { athleteOf } = useData();
  const ui = useUI();
  const byAthlete = useMemo(() => Object.fromEntries(students.map((s) => [athleteOf(s), s])), [students, athleteOf]);
  const list = logs.slice(0, 25);
  return (
    <Panel sx={sx} title="Actividad de entrenamiento" subtitle="Últimos pesos cargados por los alumnos">
      {!list.length && <Empty>Todavía no hay registros.</Empty>}
      <Stack divider={<Box sx={{ borderTop: `1px solid ${BRAND.line}` }} />}>
        {list.map((l) => {
          const st = byAthlete[l.athlete];
          const vals = [l.set1_weight, l.set2_weight, l.set3_weight].filter((v) => v !== null && v !== undefined);
          return (
            <Stack key={l.id || l.athlete + l.date + l.exercise} direction="row" spacing={1.25} alignItems="center" sx={{ py: 0.9, cursor: st ? 'pointer' : 'default' }} onClick={() => st && ui.openStudent(st.user_id, 'progreso')}>
              <Box sx={{ width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'rgba(200,30,30,.08)', color: 'primary.main', flexShrink: 0 }}><FitnessCenterRoundedIcon sx={{ fontSize: 17 }} /></Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 13, fontWeight: 700 }}>{st?.full_name || l.athlete}</Typography>
                <Typography noWrap sx={{ fontSize: 11.5, color: 'text.secondary' }}>{l.exercise}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{vals.join(' / ')}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{fmtShortDate(l.date)}</Typography>
              </Box>
            </Stack>
          );
        })}
      </Stack>
    </Panel>
  );
}
