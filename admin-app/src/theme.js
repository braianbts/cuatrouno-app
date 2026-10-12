import { createTheme, alpha } from '@mui/material/styles';

// Colores de marca: rojo Cuatrouno sobre base clara y cálida (mismos tonos que el plan del alumno).
export const BRAND = {
  red: '#c81e1e',
  redBright: '#ff5a48',
  redDeep: '#7a1010',
  ink: '#1a1512',
  muted: '#6b625c',
  soft: '#a39992',
  bg: '#f4f2f0',
  surface: '#ffffff',
  surfaceAlt: '#faf8f6',
  line: 'rgba(23,18,15,.08)',
  good: '#1f9d55',
  warn: '#b9740a',
};
export const GRAD_RED = `linear-gradient(135deg, ${BRAND.redBright}, ${BRAND.red} 55%, ${BRAND.redDeep})`;

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: BRAND.red, light: BRAND.redBright, dark: BRAND.redDeep, contrastText: '#fff' },
    secondary: { main: BRAND.ink, contrastText: '#fff' },
    success: { main: BRAND.good },
    warning: { main: BRAND.warn },
    error: { main: '#d32f2f' },
    background: { default: BRAND.bg, paper: BRAND.surface },
    text: { primary: BRAND.ink, secondary: BRAND.muted, disabled: BRAND.soft },
    divider: BRAND.line,
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: "'Switzer', 'Inter', system-ui, sans-serif",
    fontWeightRegular: 500,
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 800, letterSpacing: '-0.02em' },
    h6: { fontWeight: 800, letterSpacing: '-0.01em', fontSize: '1rem' },
    subtitle2: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
    overline: { fontWeight: 800, letterSpacing: '0.12em', fontSize: '0.66rem' },
  },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: BRAND.line },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: { borderRadius: 22, borderColor: BRAND.line, boxShadow: '0 10px 28px rgba(23,18,15,.05), 0 2px 6px rgba(23,18,15,.03)' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 18 },
        containedPrimary: { background: GRAD_RED, '&.Mui-disabled': { background: 'rgba(23,18,15,.08)' } },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 700, borderRadius: 999 } },
    },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 12, background: BRAND.surface } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: BRAND.line, paddingTop: 10, paddingBottom: 10 },
        head: { fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: BRAND.soft, background: BRAND.surfaceAlt },
      },
    },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 700, minHeight: 44 } } },
    MuiTabs: { styleOverrides: { indicator: { height: 3, borderRadius: 3 } } },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '&.Mui-selected': { background: BRAND.surface, boxShadow: '0 4px 14px rgba(23,18,15,.06)', color: BRAND.ink },
          '&.Mui-selected:hover': { background: BRAND.surface },
        },
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 22 } } },
    MuiTooltip: { styleOverrides: { tooltip: { background: BRAND.ink, fontWeight: 600 } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 99, height: 8, background: alpha(BRAND.ink, 0.06) } } },
  },
});

export default theme;
