import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Avatar, BottomNavigation, BottomNavigationAction, Box, Button, CircularProgress, IconButton, InputAdornment,
  List, ListItemButton, ListItemIcon, ListItemText, Paper, Snackbar, Alert, TextField, Tooltip, Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { sb } from './supabase';
import { DataProvider, useData } from './data';
import { BRAND } from './theme';
import Login from './Login';
import Dashboard from './sections/Dashboard';
import StudentsSection from './sections/StudentsSection';
import PaymentsSection from './sections/PaymentsSection';
import FormsSection from './sections/FormsSection';
import StudentDrawer from './student/StudentDrawer';
import CreateStudentDialog from './dialogs/CreateStudentDialog';
import PaymentDialog from './dialogs/PaymentDialog';

// Estado de la interfaz compartido: sección activa, alumno abierto, diálogos y avisos.
const UIContext = createContext(null);
export const useUI = () => useContext(UIContext);

const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: <DashboardRoundedIcon />, quote: 'Todo tu equipo de un vistazo: alumnos, cobros y actividad.' },
  { key: 'alumnos', label: 'Alumnos', icon: <PeopleAltRoundedIcon />, quote: 'Accesos, planes y progreso de cada alumno.' },
  { key: 'pagos', label: 'Pagos', icon: <PaymentsRoundedIcon />, quote: 'Cuotas, vencimientos y cobros. El alumno lo ve en su app.' },
  { key: 'formularios', label: 'Formularios', icon: <AssignmentRoundedIcon />, quote: 'Fichas que completaron desde la web.' },
];

export default function App() {
  const [session, setSession] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    sb.rpc('is_admin').then(({ data }) => setIsAdmin(!!data));
  }, [session?.user?.id]);

  if (session === undefined || (session && isAdmin === null)) {
    return <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  }
  if (!session || !isAdmin) return <Login notAdmin={!!session && isAdmin === false} />;
  return <DataProvider><Shell session={session} /></DataProvider>;
}

function Shell({ session }) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const { loading } = useData();
  const [section, setSection] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [openStudent, setOpenStudent] = useState(null);       // { id, tab }
  const [createDlg, setCreateDlg] = useState(null);           // { prefill }
  const [paymentDlg, setPaymentDlg] = useState(null);         // { payment?, userId? }
  const [toast, setToast] = useState(null);

  const ui = useMemo(() => ({
    section, setSection, search, setSearch,
    openStudent: (id, tab = 'perfil') => setOpenStudent({ id, tab }),
    newStudent: (prefill = {}) => setCreateDlg({ prefill }),
    newPayment: (userId) => setPaymentDlg({ userId }),
    editPayment: (payment) => setPaymentDlg({ payment }),
    notify: (msg, severity = 'success') => setToast({ msg, severity, key: Date.now() }),
  }), [section, search]);

  const current = SECTIONS.find((s) => s.key === section);
  const logout = () => sb.auth.signOut();

  return (
    <UIContext.Provider value={ui}>
      <Box sx={{ display: 'flex', height: '100%', bgcolor: 'background.default' }}>
        {!mobile && (
          <Box component="nav" sx={{ width: 248, flexShrink: 0, p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, borderRight: `1px solid ${BRAND.line}` }}>
            <Box component="img" src="/shared/logo-navbar.png" alt="Cuatrouno" sx={{ height: 34, alignSelf: 'flex-start', ml: 1 }} />
            <Paper variant="outlined" sx={{ p: 1.25, display: 'flex', alignItems: 'center', gap: 1.25, borderRadius: 4 }}>
              <Avatar src="/shared/braian-avatar.webp" sx={{ width: 36, height: 36 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800 }}>Braian</Typography>
                <Typography noWrap sx={{ fontSize: 11.5, color: 'text.secondary' }}>{session.user.email}</Typography>
              </Box>
            </Paper>
            <Typography variant="overline" color="text.disabled" sx={{ ml: 1.5, mt: 1 }}>Menú</Typography>
            <List dense disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {SECTIONS.map((s) => (
                <ListItemButton key={s.key} selected={section === s.key} onClick={() => setSection(s.key)}>
                  <ListItemIcon sx={{ minWidth: 34, color: section === s.key ? 'primary.main' : 'text.disabled' }}>{s.icon}</ListItemIcon>
                  <ListItemText primary={s.label} primaryTypographyProps={{ fontSize: 14, fontWeight: section === s.key ? 800 : 600 }} />
                </ListItemButton>
              ))}
            </List>
            <Box sx={{ flex: 1 }} />
            <List dense disablePadding>
              <ListItemButton component="a" href="/" target="_blank">
                <ListItemIcon sx={{ minWidth: 34, color: 'text.disabled' }}><OpenInNewRoundedIcon /></ListItemIcon>
                <ListItemText primary="App del alumno" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} />
              </ListItemButton>
              <ListItemButton onClick={logout}>
                <ListItemIcon sx={{ minWidth: 34, color: 'text.disabled' }}><LogoutRoundedIcon /></ListItemIcon>
                <ListItemText primary="Salir" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} />
              </ListItemButton>
            </List>
          </Box>
        )}

        <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box component="header" sx={{ display: 'flex', alignItems: 'center', gap: 2, px: { xs: 2, md: 3 }, pt: { xs: 'calc(env(safe-area-inset-top) + 12px)', md: 2.5 }, pb: { xs: 1.5, md: 2 } }}>
            {mobile && <Box component="img" src="/shared/logo-navbar.png" alt="Cuatrouno" sx={{ height: 28 }} />}
            {!mobile && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontSize: 22 }}>{current.label}</Typography>
                <Typography noWrap sx={{ fontSize: 13, color: 'text.secondary' }}>“{current.quote}”</Typography>
              </Box>
            )}
            <Box sx={{ flex: 1 }} />
            <TextField
              placeholder="Buscar alumno…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (e.target.value && section !== 'alumnos') setSection('alumnos'); }}
              sx={{ maxWidth: { xs: 170, sm: 260 } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
            />
            {mobile ? (
              <Tooltip title="Nuevo alumno"><IconButton color="primary" onClick={() => ui.newStudent()}><PersonAddAlt1RoundedIcon /></IconButton></Tooltip>
            ) : (
              <Button variant="contained" startIcon={<PersonAddAlt1RoundedIcon />} onClick={() => ui.newStudent()}>Nuevo alumno</Button>
            )}
            {mobile && <IconButton onClick={logout} aria-label="Salir"><LogoutRoundedIcon /></IconButton>}
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: { xs: 2, md: 3 }, pb: { xs: 'calc(env(safe-area-inset-bottom) + 84px)', md: 3 } }}>
            {loading ? (
              <Box sx={{ height: '60%', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
            ) : (
              <>
                {section === 'dashboard' && <Dashboard />}
                {section === 'alumnos' && <StudentsSection />}
                {section === 'pagos' && <PaymentsSection />}
                {section === 'formularios' && <FormsSection />}
              </>
            )}
          </Box>
        </Box>

        {mobile && (
          <Paper sx={{ position: 'fixed', left: 12, right: 12, bottom: 'calc(env(safe-area-inset-bottom) + 12px)', borderRadius: 5, boxShadow: '0 12px 32px rgba(23,18,15,.14)', overflow: 'hidden', zIndex: 10 }}>
            <BottomNavigation showLabels value={section} onChange={(_e, v) => setSection(v)} sx={{ height: 62 }}>
              {SECTIONS.map((s) => <BottomNavigationAction key={s.key} value={s.key} label={s.label} icon={s.icon} sx={{ minWidth: 0, '& .MuiBottomNavigationAction-label': { fontSize: 10.5, fontWeight: 700 } }} />)}
            </BottomNavigation>
          </Paper>
        )}
      </Box>

      <StudentDrawer state={openStudent} onClose={() => setOpenStudent(null)} />
      {createDlg && <CreateStudentDialog prefill={createDlg.prefill} onClose={() => setCreateDlg(null)} />}
      {paymentDlg && <PaymentDialog {...paymentDlg} onClose={() => setPaymentDlg(null)} />}
      <Snackbar open={!!toast} key={toast?.key} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ bottom: { xs: 90, md: 24 } }}>
        {toast ? <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>{toast.msg}</Alert> : <span />}
      </Snackbar>
    </UIContext.Provider>
  );
}
