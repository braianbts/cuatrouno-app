// Cliente falso de Supabase para `npm run demo`: datos inventados en memoria, para ver y probar el panel
// sin tocar la base real. Implementa solo lo que usa el panel.
import { addDays, addMonths, isoToday } from '../utils';

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const today = isoToday();
const ago = (days) => new Date(Date.now() - days * 86400000).toISOString();

const STUDENTS = [
  ['Lucía Gómez', 'lucia-gomez', 'al_dia', ago(0.1)],
  ['Martín Ríos', 'martin-rios', 'al_dia', ago(1)],
  ['Sofía Herrera', 'sofia-herrera', 'pendiente', ago(9)],
  ['Tomás Acosta', 'tomas-acosta', 'al_dia', ago(2)],
  ['Valentina Paz', 'valentina-paz', 'al_dia', ago(0.4)],
  ['Diego Molina', 'diego-molina', 'pendiente', null],
  ['Camila Ferreyra', 'camila-ferreyra', 'al_dia', ago(4)],
].map(([full_name, username, payment_status, last_login_at]) => ({
  user_id: uid(), full_name, username, slug: username, payment_status, payment_note: payment_status === 'pendiente' ? 'Debe la cuota del mes' : null,
  photo_url: null, last_login_at,
}));

const PAYMENTS = [];
STUDENTS.forEach((s, i) => {
  const amount = [75000, 74990, 60000, 75000, 199990, 75000, 65000][i];
  for (let m = -5; m <= 1; m++) {
    const due = addMonths(addDays(today, (i * 3) % 20 - 8), m);
    const paid = due < today && !(s.payment_status === 'pendiente' && m >= -1);
    PAYMENTS.push({ id: uid(), user_id: s.user_id, concept: 'Plan mensual', amount, due_date: due, status: paid ? 'paid' : 'pending', paid_at: paid ? due : null, method: paid ? 'Transferencia' : null, note: null, created_at: ago(30) });
  }
});

const SAMPLE_PLAN = {
  v: 1, athlete: 'lucia-gomez', greet: 'Buenas, Lucía 👋', greetSub: 'Mes 1 · adaptación',
  hero: { label: 'Recomposición · Mes 1', title: 'Menos grasa,<br>más <span>fuerza</span>.', text: '3 días de fuerza · técnica primero.' },
  sections: {
    resumen: { title: '', subtitle: '', lead: '', blocks: [
      { type: 'label', text: 'Objetivo del día' },
      { type: 'stats', items: [{ label: 'Kcal / día', value: '1800', unit: '', hi: true }, { label: 'Proteína', value: '130', unit: 'g' }, { label: 'Carbos', value: '190', unit: 'g' }, { label: 'Grasas', value: '55', unit: 'g' }] },
    ] },
    dieta: { title: 'Dieta', subtitle: '/ ~1800 kcal', lead: 'Ejemplo de dieta.', blocks: [
      { type: 'meals', items: [{ key: 'des', num: '01', name: 'Desayuno', time: 'mañana', open: true, variants: [{ name: '', prot: '25', carbs: '40', fat: '10', kcal: '350', items: [{ name: 'Huevos', qty: '2 unid' }, { name: 'Pan integral', qty: '2 rodajas' }, { name: 'Fruta', qty: '1 unid', fruit: 'a' }] }] }] },
    ] },
    rutina: { title: 'Rutina', subtitle: '/ 3 días', lead: 'Rutina de ejemplo.', blocks: [
      { type: 'days', items: [
        { day: 'LUN', kind: 'Gym · Día 1', name: 'Piernas', focus: '4 ejercicios', blocks: [
          { type: 'ex', nombre: 'Prensa 45°', cells: [{ label: 'Series × Reps', value: '3 × 10–12' }, { label: 'RIR', value: '2' }, { label: 'Descanso', value: '90 s' }], log: 'kg' },
          { type: 'ex', nombre: 'Sillón de cuádriceps', cells: [{ label: 'Series × Reps', value: '3 × 12' }, { label: 'RIR', value: '2' }, { label: 'Descanso', value: '60 s' }], log: 'kg' },
        ] },
        { day: 'MIÉ', kind: 'Gym · Día 2', name: 'Torso', focus: '4 ejercicios', blocks: [
          { type: 'ex', nombre: 'Press de pecho en máquina', cells: [{ label: 'Series × Reps', value: '3 × 10' }, { label: 'RIR', value: '2' }, { label: 'Descanso', value: '90 s' }], log: 'kg' },
        ] },
        { day: 'VIE', kind: 'Gym · Día 3', name: 'Full body', focus: '3 ejercicios', blocks: [
          { type: 'ex', nombre: 'Jalón al pecho', cells: [{ label: 'Series × Reps', value: '3 × 12' }, { label: 'RIR', value: '2' }, { label: 'Descanso', value: '60 s' }], log: 'kg' },
        ] },
        { day: 'DOM', kind: 'Descanso', name: 'Off', focus: '', blocks: [{ type: 'rest', big: 'DESCANSO', text: 'Hoy descansás.' }] },
      ] },
    ] },
    compras: { title: 'Compras', subtitle: 'semanales', lead: '', blocks: [] },
    progreso: { title: 'Progreso', subtitle: '/ pesos', lead: '' },
    pago: { title: 'Pagos', subtitle: '/ Plan mensual', lead: 'Se renueva mes a mes.', blocks: [] },
  },
};

const TABLES = {
  students: STUDENTS,
  payments: PAYMENTS,
  student_plans: [
    { user_id: STUDENTS[0].user_id, html: '<html><body>plan viejo</body></html>', data: SAMPLE_PLAN, updated_at: ago(1) },
    { user_id: STUDENTS[1].user_id, html: '<html><body>plan viejo</body></html>', data: null, updated_at: ago(5) },
    { user_id: STUDENTS[3].user_id, html: '<html><body>plan viejo</body></html>', data: null, updated_at: ago(8) },
  ],
  formularios: [
    { id: 1, nombre: 'Julieta Benítez', recibido_en: ago(1), edad: '29', objetivo: 'Bajar grasa', experiencia: 'Principiante', dias_disponibles: '3', lesiones: 'Ninguna', telefono: '11 5555-5555' },
    { id: 2, nombre: 'Lucía Gómez', recibido_en: ago(40), edad: '31', objetivo: 'Recomposición', experiencia: 'Intermedia', dias_disponibles: '4' },
  ],
  exercise_logs: [],
};
['Prensa 45°', 'Sillón de cuádriceps', 'Press de pecho en máquina', 'Jalón al pecho'].forEach((ex, k) => {
  for (let w = 0; w < 4; w++) {
    STUDENTS.slice(0, 5).forEach((s, i) => {
      const base = 20 + k * 10 + i * 5 + w * 2.5;
      TABLES.exercise_logs.push({ id: uid(), athlete: s.slug, date: addDays(today, -(w * 7 + i + k)), day: ['LUN', 'MIÉ', 'VIE'][k % 3], exercise: ex, set1_weight: base, set2_weight: base, set3_weight: base - 2.5 });
    });
  }
});

const listeners = [];
const emit = (table, row) => listeners.filter((l) => l.table === table).forEach((l) => setTimeout(() => l.cb({ new: row }), 50));

// Columnas tipo "athlete:data->>athlete" -> alias simple.
function project(row, cols) {
  if (!cols || cols === '*') return { ...row };
  const out = {};
  cols.split(',').map((c) => c.trim()).forEach((c) => {
    const m = c.match(/^(\w+):(\w+)->>?(\w+)$/);
    if (m) out[m[1]] = row[m[2]]?.[m[3]] ?? null;
    else out[c] = row[c];
  });
  return out;
}

class Query {
  constructor(table) { this.table = table; this.filters = []; this.op = 'select'; }
  select(cols) { if (this.op === 'select') this.cols = cols; return this; }
  eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
  neq(c, v) { this.filters.push((r) => r[c] !== v); return this; }
  not(c, op, v) { this.filters.push((r) => (op === 'is' && v === null ? r[c] !== null && r[c] !== undefined : true)); return this; }
  order(c, o = {}) { this.ord = { c, asc: o.ascending !== false }; return this; }
  limit(n) { this.lim = n; return this; }
  maybeSingle() { this.single = true; return this; }
  insert(rows) { this.op = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  update(obj) { this.op = 'update'; this.payload = obj; return this; }
  upsert(obj) { this.op = 'upsert'; this.payload = obj; return this; }
  delete() { this.op = 'delete'; return this; }
  then(res, rej) { return Promise.resolve().then(() => this.run()).then(res, rej); }
  run() {
    const t = TABLES[this.table] || (TABLES[this.table] = []);
    const match = (r) => this.filters.every((f) => f(r));
    if (this.op === 'insert') {
      const rows = this.payload.map((r) => ({ id: uid(), created_at: new Date().toISOString(), ...r }));
      t.push(...rows); rows.forEach((r) => emit(this.table, r));
      return { data: rows, error: null };
    }
    if (this.op === 'update') {
      t.filter(match).forEach((r) => { Object.assign(r, this.payload); emit(this.table, r); });
      return { data: null, error: null };
    }
    if (this.op === 'upsert') {
      const key = this.table === 'student_plans' ? 'user_id' : 'id';
      let r = t.find((x) => x[key] === this.payload[key]);
      if (r) Object.assign(r, this.payload); else { r = { ...this.payload }; t.push(r); }
      emit(this.table, r);
      return { data: null, error: null };
    }
    if (this.op === 'delete') {
      for (let i = t.length - 1; i >= 0; i--) if (match(t[i])) { const [r] = t.splice(i, 1); emit(this.table, r); }
      return { data: null, error: null };
    }
    let rows = t.filter(match);
    if (this.ord) {
      const { c, asc } = this.ord;
      rows = [...rows].sort((a, b) => (a[c] == null ? 1 : b[c] == null ? -1 : (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1)));
    }
    if (this.lim) rows = rows.slice(0, this.lim);
    rows = rows.map((r) => project(r, this.cols));
    if (this.single) return { data: rows[0] || null, error: null };
    return { data: rows, error: null };
  }
}

export function createMockClient() {
  let session = { user: { id: 'admin', email: 'demo@cuatrouno.club' }, access_token: 'demo' };
  const authCbs = [];
  return {
    from: (table) => new Query(table),
    rpc: async (name) => ({ data: name === 'is_admin', error: null }),
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: (cb) => { authCbs.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
      signInWithPassword: async () => { session = { user: { id: 'admin', email: 'demo@cuatrouno.club' } }; authCbs.forEach((cb) => cb('SIGNED_IN', session)); return { error: null }; },
      signOut: async () => { session = null; authCbs.forEach((cb) => cb('SIGNED_OUT', null)); },
    },
    channel: () => {
      const ch = { on: (_t, opts, cb) => { listeners.push({ table: opts.table, cb, ch }); return ch; }, subscribe: () => ch };
      return ch;
    },
    removeChannel: (ch) => { for (let i = listeners.length - 1; i >= 0; i--) if (listeners[i].ch === ch) listeners.splice(i, 1); },
    functions: {
      invoke: async (name, { body }) => {
        if (name === 'create-student') {
          const s = { user_id: uid(), full_name: body.full_name, username: body.username, slug: body.slug, payment_status: 'pendiente', payment_note: null, photo_url: null, last_login_at: null };
          STUDENTS.push(s); emit('students', s);
          return { data: { user_id: s.user_id }, error: null };
        }
        if (name === 'update-student') {
          const s = STUDENTS.find((x) => x.user_id === body.user_id);
          if (body.full_name) s.full_name = body.full_name;
          if (body.username) s.username = body.username;
          emit('students', s);
          return { data: { ok: true }, error: null };
        }
        return { data: null, error: new Error('demo') };
      },
    },
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '/shared/braian-avatar.webp' } }) }) },
  };
}
