const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const fmtMoney = (n) => money.format(Number(n) || 0);

export function isoToday() {
  const t = new Date();
  return toIso(t);
}
export function toIso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toIso(d);
}
export function addMonths(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toIso(d);
}
export function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(String(iso).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function fmtShortDate(iso) {
  if (!iso) return '—';
  return new Date(String(iso).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}
export function daysUntil(iso) {
  if (!iso) return null;
  const today = new Date(isoToday() + 'T00:00:00');
  const d = new Date(iso + 'T00:00:00');
  return Math.round((d - today) / 86400000);
}
export function lastLoginText(ts) {
  if (!ts) return 'Nunca ingresó';
  const d = new Date(ts);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'Hoy ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Ayer';
  if (days < 30) return 'Hace ' + days + ' días';
  return d.toLocaleDateString('es-AR');
}
export function initials(name) {
  return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '41';
}

// Estado real de un pago: pagado, vencido, vence pronto (5 días) o pendiente.
export const REMINDER_DAYS = 5;
export function paymentState(p) {
  if (p.status === 'paid') return 'paid';
  const d = daysUntil(p.due_date);
  if (d === null) return 'pending';
  if (d < 0) return 'overdue';
  if (d <= REMINDER_DAYS) return 'due-soon';
  return 'pending';
}
export const PAYMENT_STATE = {
  paid: { label: 'Pagado', color: 'success' },
  pending: { label: 'Pendiente', color: 'default' },
  'due-soon': { label: 'Vence pronto', color: 'warning' },
  overdue: { label: 'Vencido', color: 'error' },
};

export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
