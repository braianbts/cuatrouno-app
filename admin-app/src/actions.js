import { sb, notifyChanged } from './supabase';
import { isoToday, paymentState } from './utils';

// Marca un pago como cobrado. Si el alumno estaba bloqueado y ya no debe nada vencido, se le habilita el acceso.
// Las cuotas pendientes se consultan en la base (no en memoria) para no decidir con datos viejos.
export async function markPaid(payment, _allPayments, student) {
  const { error } = await sb.from('payments').update({ status: 'paid', paid_at: isoToday() }).eq('id', payment.id);
  if (error) throw new Error(error.message);
  let unlocked = false;
  if (student && student.payment_status !== 'al_dia') {
    const { data: open } = await sb.from('payments').select('id,status,due_date').eq('user_id', student.user_id).eq('status', 'pending');
    const stillOverdue = (open || []).some((p) => p.id !== payment.id && paymentState(p) === 'overdue');
    if (!stillOverdue) {
      const r = await sb.from('students').update({ payment_status: 'al_dia', payment_note: null }).eq('user_id', student.user_id);
      unlocked = !r.error;
    }
  }
  notifyChanged();
  return { unlocked };
}

export async function setAccess(student, allowed, note = null) {
  const { error } = await sb.from('students')
    .update({ payment_status: allowed ? 'al_dia' : 'pendiente', payment_note: allowed ? null : note })
    .eq('user_id', student.user_id);
  if (error) throw new Error(error.message);
  notifyChanged();
}
