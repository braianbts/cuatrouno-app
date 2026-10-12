import { useState } from 'react';
import {
  Alert, Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, InputAdornment,
  MenuItem, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { sb, notifyChanged } from '../supabase';
import { useData } from '../data';
import { useUI } from '../App';
import { addMonths, isoToday } from '../utils';
import { StudentCell } from '../components';

const METHODS = ['Transferencia', 'Efectivo', 'Mercado Pago', 'Otro'];

// Alta / edición de cuota. Lo que se guarda acá es lo que el alumno ve en su pestaña Pagos.
export default function PaymentDialog({ payment, userId, onClose }) {
  const { students, studentById } = useData();
  const ui = useUI();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const editing = !!payment;
  const [f, setF] = useState(() => ({
    user_id: payment?.user_id || userId || null,
    concept: payment?.concept || 'Plan mensual',
    amount: payment?.amount ?? '',
    due_date: payment?.due_date || isoToday(),
    status: payment?.status || 'pending',
    paid_at: payment?.paid_at || isoToday(),
    method: payment?.method || 'Transferencia',
    note: payment?.note || '',
    installments: 1,
    unlock: true,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const student = studentById(f.user_id);

  const save = async () => {
    setError('');
    if (!f.user_id) return setError('Elegí el alumno.');
    if (!(Number(f.amount) > 0)) return setError('Poné el monto.');
    setBusy(true);
    const base = {
      user_id: f.user_id, concept: f.concept.trim() || 'Cuota', amount: Number(f.amount), due_date: f.due_date || null,
      status: f.status, paid_at: f.status === 'paid' ? (f.paid_at || isoToday()) : null,
      method: f.status === 'paid' ? f.method : null, note: f.note.trim() || null,
    };
    let res;
    if (editing) {
      res = await sb.from('payments').update(base).eq('id', payment.id);
    } else {
      const n = Math.max(1, Math.min(12, Number(f.installments) || 1));
      const rows = Array.from({ length: n }, (_, i) => i === 0 ? { ...base, concept: n > 1 ? `${base.concept} · cuota 1/${n}` : base.concept } : {
        ...base, concept: `${base.concept} · cuota ${i + 1}/${n}`, due_date: addMonths(f.due_date, i), status: 'pending', paid_at: null, method: null,
      });
      res = await sb.from('payments').insert(rows);
    }
    if (res.error) { setBusy(false); return setError(res.error.message); }
    if (f.status === 'paid' && f.unlock && student && student.payment_status !== 'al_dia') {
      await sb.from('students').update({ payment_status: 'al_dia', payment_note: null }).eq('user_id', f.user_id);
      ui.notify('Pago guardado y acceso habilitado');
    } else ui.notify(editing ? 'Cuota actualizada' : 'Cuota registrada');
    notifyChanged();
    onClose();
  };

  const remove = async () => {
    if (!confirm('¿Eliminar esta cuota? El alumno deja de verla.')) return;
    setBusy(true);
    const { error: e } = await sb.from('payments').delete().eq('id', payment.id);
    if (e) { setBusy(false); return setError(e.message); }
    ui.notify('Cuota eliminada');
    notifyChanged();
    onClose();
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{editing ? 'Editar cuota' : 'Registrar cuota'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Autocomplete
            options={students}
            value={student || null}
            onChange={(_e, v) => setF((x) => ({ ...x, user_id: v?.user_id || null }))}
            getOptionLabel={(s) => s.full_name}
            isOptionEqualToValue={(a, b) => a.user_id === b.user_id}
            renderOption={(props, s) => <li {...props} key={s.user_id}><StudentCell student={s} sub={'@' + s.username} /></li>}
            renderInput={(p) => <TextField {...p} label="Alumno" />}
            disabled={editing}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Concepto" value={f.concept} onChange={set('concept')} placeholder="ej: Plan 3 meses" />
            <TextField label="Monto" type="number" value={f.amount} onChange={set('amount')} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Vence" type="date" value={f.due_date || ''} onChange={set('due_date')} InputLabelProps={{ shrink: true }} helperText="El alumno recibe el aviso 5 días antes" />
            {!editing && <TextField label="Cuotas mensuales" type="number" inputProps={{ min: 1, max: 12 }} value={f.installments} onChange={set('installments')} helperText="Crea una por mes desde esa fecha" />}
          </Stack>
          <ToggleButtonGroup exclusive fullWidth value={f.status} onChange={(_e, v) => v && setF((x) => ({ ...x, status: v }))} sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 700 } }}>
            <ToggleButton value="pending">Pendiente</ToggleButton>
            <ToggleButton value="paid" color="success">Cobrada</ToggleButton>
          </ToggleButtonGroup>
          {f.status === 'paid' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Fecha de cobro" type="date" value={f.paid_at || ''} onChange={set('paid_at')} InputLabelProps={{ shrink: true }} />
              <TextField select label="Medio" value={f.method} onChange={set('method')}>
                {METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
            </Stack>
          )}
          <TextField label="Nota (opcional)" value={f.note} onChange={set('note')} />
          {f.status === 'paid' && student && student.payment_status !== 'al_dia' && (
            <FormControlLabel control={<Switch checked={f.unlock} onChange={(e) => setF((x) => ({ ...x, unlock: e.target.checked }))} />} label={`Habilitar el acceso de ${student.full_name.split(' ')[0]} (está bloqueado)`} />
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {editing && <Button color="error" onClick={remove} disabled={busy} sx={{ mr: 'auto' }}>Eliminar</Button>}
        <Button onClick={onClose} disabled={busy} color="secondary">Cancelar</Button>
        <Button variant="contained" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</Button>
      </DialogActions>
    </Dialog>
  );
}
