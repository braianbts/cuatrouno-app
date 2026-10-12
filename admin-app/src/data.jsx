import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { sb } from './supabase';

// Estado compartido del panel: alumnos, pagos, planes (solo metadatos), formularios y actividad.
// Se recarga solo con Realtime cuando cambia algo (desde este panel, otra pestaña o el alumno).
const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

export function DataProvider({ children }) {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [plans, setPlans] = useState({});         // user_id -> { mode: 'editable' | 'html', updated_at }
  const [forms, setForms] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const timer = useRef(null);

  const load = useCallback(async () => {
    const [st, pay, withData, withHtml, fo, lg] = await Promise.all([
      sb.from('students').select('*').order('full_name'),
      sb.from('payments').select('*').order('due_date', { ascending: true, nullsFirst: false }),
      sb.from('student_plans').select('user_id,updated_at,athlete:data->>athlete').not('data', 'is', null),
      sb.from('student_plans').select('user_id,updated_at').not('html', 'is', null),
      sb.from('formularios').select('*').order('recibido_en', { ascending: false }),
      sb.from('exercise_logs').select('id,athlete,date,day,exercise,set1_weight,set2_weight,set3_weight').order('date', { ascending: false }).limit(60),
    ]);
    const errs = {};
    if (st.error) errs.students = st.error.message;
    if (pay.error) errs.payments = pay.error.message;
    if (fo.error) errs.forms = fo.error.message;
    setErrors(errs);
    setStudents(st.data || []);
    setPayments(pay.data || []);
    const pm = {};
    (withHtml.data || []).forEach((r) => { pm[r.user_id] = { mode: 'html', updated_at: r.updated_at }; });
    (withData.data || []).forEach((r) => { pm[r.user_id] = { mode: 'editable', updated_at: r.updated_at, athlete: r.athlete }; });
    setPlans(pm);
    setForms(fo.data || []);
    setLogs(lg.data || []);
    setLoading(false);
  }, []);

  // Varias novedades seguidas -> una sola recarga.
  const scheduleReload = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(load, 300);
  }, [load]);

  useEffect(() => {
    load();
    const ch = sb.channel('admin-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_plans' }, scheduleReload)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'exercise_logs' }, scheduleReload)
      .subscribe();
    const onFocus = () => { if (document.visibilityState === 'visible') scheduleReload(); };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('cuatrouno:changed', scheduleReload);
    return () => {
      sb.removeChannel(ch);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('cuatrouno:changed', scheduleReload);
      clearTimeout(timer.current);
    };
  }, [load, scheduleReload]);

  const value = useMemo(() => ({
    students, payments, plans, forms, logs, loading, errors, reload: load,
    studentById: (id) => students.find((s) => s.user_id === id),
    // Clave con la que el alumno guarda sus pesos (plan.athlete puede diferir del slug).
    athleteOf: (s) => plans[s.user_id]?.athlete || s.slug,
  }), [students, payments, plans, forms, logs, loading, errors, load]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
