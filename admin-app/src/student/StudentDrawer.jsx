import { useEffect, useState } from 'react';
import { Box, CircularProgress, Drawer, IconButton, Stack, Tab, Tabs, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useData } from '../data';
import { StudentAvatar, AccessChip, PlanChip } from '../components';
import { lastLoginText } from '../utils';
import ProfileTab from './ProfileTab';
import PlanTab from './PlanTab';
import StudentPaymentsTab from './StudentPaymentsTab';
import ProgressTab from './ProgressTab';

// Ficha del alumno: se abre desde cualquier sección. En celular ocupa toda la pantalla.
export default function StudentDrawer({ state, onClose }) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const { studentById, plans } = useData();
  const [tab, setTab] = useState('perfil');
  const [dirty, setDirty] = useState(false);
  const student = state ? studentById(state.id) : null;

  useEffect(() => { if (state) { setTab(state.tab || 'perfil'); setDirty(false); } }, [state?.id, state?.tab]);

  const close = () => {
    if (dirty && !confirm('Hay cambios del plan sin guardar. ¿Cerrar igual?')) return;
    onClose();
  };
  const changeTab = (_e, v) => {
    if (tab === 'plan' && dirty && !confirm('Hay cambios del plan sin guardar. ¿Salir del editor igual?')) return;
    if (tab === 'plan') setDirty(false);
    setTab(v);
  };

  return (
    <Drawer
      anchor="right"
      open={!!state}
      onClose={close}
      PaperProps={{ sx: { width: mobile ? '100%' : tab === 'plan' ? 'min(1180px, 96vw)' : 620, transition: 'width .25s', bgcolor: 'background.default' } }}
    >
      {/* Recién creado: puede tardar un instante en aparecer en la lista */}
      {state && !student && <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>}
      {student && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 'calc(env(safe-area-inset-top) + 14px)', sm: 2.5 }, pb: 1.5, bgcolor: 'background.paper' }}>
            <StudentAvatar student={student} size={46} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 18, fontWeight: 800 }}>{student.full_name}</Typography>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>@{student.username} · {lastLoginText(student.last_login_at)}</Typography>
              </Stack>
            </Box>
            <Stack direction="row" spacing={0.75} sx={{ display: { xs: 'none', sm: 'flex' } }}>
              <PlanChip mode={plans[student.user_id]?.mode} />
              <AccessChip student={student} />
            </Stack>
            <IconButton onClick={close} aria-label="Cerrar"><CloseRoundedIcon /></IconButton>
          </Stack>
          <Tabs value={tab} onChange={changeTab} variant="scrollable" allowScrollButtonsMobile sx={{ px: { xs: 1, sm: 2 }, bgcolor: 'background.paper', borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
            <Tab value="perfil" label="Perfil y acceso" />
            <Tab value="plan" label="Plan" />
            <Tab value="pagos" label="Pagos" />
            <Tab value="progreso" label="Progreso" />
          </Tabs>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: { xs: 2, sm: 3 } }}>
            {tab === 'perfil' && <ProfileTab student={student} />}
            {tab === 'plan' && <PlanTab student={student} onDirty={setDirty} />}
            {tab === 'pagos' && <StudentPaymentsTab student={student} />}
            {tab === 'progreso' && <ProgressTab student={student} />}
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
