import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Card, CircularProgress, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { sb, notifyChanged } from '../supabase';
import { useData } from '../data';
import { useUI } from '../App';
import { PlanChip } from '../components';
import TempWeekEditor from './TempWeekEditor';

// El convertidor de HTML viejo vive en la app principal (/shared/plan-import.js); se carga a demanda.
let importerPromise = null;
function loadImporter() {
  if (window.CuatrounoPlanImport) return Promise.resolve(window.CuatrounoPlanImport);
  if (!importerPromise) {
    importerPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/shared/plan-import.js';
      s.onload = () => resolve(window.CuatrounoPlanImport);
      s.onerror = () => { importerPromise = null; reject(new Error('No se pudo cargar el convertidor.')); };
      document.head.appendChild(s);
    });
  }
  return importerPromise;
}
let baseCssPromise = null;
function loadBaseCss() {
  if (!baseCssPromise) {
    baseCssPromise = fetch('/plan.html', { cache: 'no-store' }).then((r) => r.text())
      .then((t) => new DOMParser().parseFromString(t, 'text/html').querySelector('style')?.textContent || '');
  }
  return baseCssPromise;
}

export default function PlanTab({ student, onDirty }) {
  const { students, plans, payments } = useData();
  const ui = useUI();
  const [row, setRow] = useState(undefined);     // fila guardada { html, data }
  const [draft, setDraft] = useState(null);      // plan editable en edición
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [warnings, setWarnings] = useState(null);
  const [panel, setPanel] = useState('semana');
  const [busy, setBusy] = useState(false);
  const frame = useRef(null);

  const load = useCallback(async () => {
    const { data, error } = await sb.from('student_plans').select('html,data,updated_at').eq('user_id', student.user_id).maybeSingle();
    if (error) { ui.notify(error.message, 'error'); return; }
    setRow(data || { html: null, data: null });
    setDraft(data?.data || null);
    setJsonText(data?.data ? JSON.stringify(data.data, null, 2) : '');
    setWarnings(null);
  }, [student.user_id]);
  useEffect(() => { setRow(undefined); load(); }, [load]);

  const dirty = useMemo(() => !!draft && JSON.stringify(draft) !== JSON.stringify(row?.data || null), [draft, row]);
  useEffect(() => { onDirty(dirty); }, [dirty]);

  // Vista previa: la misma plantilla que ve el alumno, recibe el borrador por postMessage.
  const studentInfo = { full_name: student.full_name, photo_url: student.photo_url, slug: student.slug };
  const myPayments = useMemo(() => payments.filter((p) => p.user_id === student.user_id)
    .sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || ''))), [payments, student.user_id]);
  const postPreview = useCallback(() => {
    if (!draft || !frame.current?.contentWindow) return;
    frame.current.contentWindow.postMessage({ type: 'cuatrouno:plan', plan: draft, student: studentInfo, payments: myPayments.length ? myPayments : null }, location.origin);
  }, [draft, student.full_name, student.photo_url, myPayments]);
  useEffect(() => { postPreview(); }, [postPreview]);
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin === location.origin && e.data?.type === 'cuatrouno:plan-ready' && e.source === frame.current?.contentWindow) postPreview();
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [postPreview]);

  const updateDraft = (next) => {
    setDraft(next);
    setJsonText(JSON.stringify(next, null, 2));
    setJsonError('');
  };
  const onJson = (text) => {
    setJsonText(text);
    try { setDraft(JSON.parse(text)); setJsonError(''); } catch (e) { setJsonError(e.message); }
  };

  const convert = async () => {
    if (row?.data && !confirm('Ya tiene un plan editable. ¿Reemplazarlo por la conversión del HTML? (no se guarda hasta que toques Guardar)')) return;
    setBusy(true);
    try {
      const imp = await loadImporter();
      const { plan, warnings: w } = imp.htmlToPlan(row.html, await loadBaseCss());
      updateDraft(plan);
      setWarnings([...new Set(w)]);
      ui.notify('Convertido. Revisá la vista previa y guardá.', 'info');
    } catch (e) { ui.notify(e.message, 'error'); }
    setBusy(false);
  };

  const copyFrom = async (other) => {
    if (!other) return;
    const { data, error } = await sb.from('student_plans').select('data').eq('user_id', other.user_id).maybeSingle();
    if (error || !data?.data) return ui.notify('No se pudo copiar ese plan.', 'error');
    const plan = JSON.parse(JSON.stringify(data.data));
    plan.athlete = student.slug;           // los pesos se guardan con la clave de este alumno
    plan.greet = 'Buenas, ' + student.full_name.split(' ')[0] + ' 👋';
    delete plan.tempWeek;
    updateDraft(plan);
    setWarnings(null);
    ui.notify(`Plan de ${other.full_name} copiado. Ajustalo y guardá.`, 'info');
  };

  const save = async () => {
    if (jsonError) return ui.notify('El JSON tiene un error, corregilo antes de guardar.', 'error');
    setBusy(true);
    const { error } = await sb.from('student_plans').upsert({ user_id: student.user_id, data: draft, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return ui.notify('Error al guardar: ' + error.message, 'error');
    setRow((r) => ({ ...(r || {}), data: draft }));
    ui.notify('Plan guardado. El alumno ya lo ve.');
    notifyChanged();
  };

  const revertToHtml = async () => {
    if (!row?.html) return ui.notify('No tiene HTML de respaldo. Subí uno primero.', 'warning');
    if (!confirm('El alumno va a volver a ver el plan HTML y se borra el plan editable. ¿Seguir?')) return;
    const { error } = await sb.from('student_plans').update({ data: null, updated_at: new Date().toISOString() }).eq('user_id', student.user_id);
    if (error) return ui.notify(error.message, 'error');
    ui.notify('El alumno vuelve a ver el HTML.');
    notifyChanged();
    load();
  };

  const uploadHtml = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const html = await file.text();
    const { error } = await sb.from('student_plans').upsert({ user_id: student.user_id, html, updated_at: new Date().toISOString() });
    if (error) return ui.notify(error.message, 'error');
    setRow((r) => ({ ...(r || {}), html }));
    ui.notify(row?.data ? 'HTML guardado como respaldo (el alumno sigue viendo el plan editable).' : 'HTML guardado. Ya podés convertirlo a editable.');
  };

  if (row === undefined) return <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>;

  const mode = row.data ? 'editable' : row.html ? 'html' : null;
  const copyOptions = students.filter((s) => s.user_id !== student.user_id && plans[s.user_id]?.mode === 'editable');

  return (
    <Stack spacing={2} sx={{ height: { lg: '100%' } }}>
      <Card sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
            <PlanChip mode={mode} />
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              {mode === 'editable' ? 'El alumno ve la plantilla. Lo que guardes le llega al instante.'
                : mode === 'html' ? 'El alumno ve el HTML subido. Convertilo para editarlo desde acá.'
                  : 'Todavía no tiene plan.'}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            {row.html && <Button variant="outlined" color="secondary" startIcon={<AutoFixHighRoundedIcon />} onClick={convert} disabled={busy}>{mode === 'editable' ? 'Reconvertir HTML' : 'Convertir a editable'}</Button>}
            {draft && <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={save} disabled={busy || !dirty}>{dirty ? 'Guardar plan' : 'Guardado'}</Button>}
          </Stack>
        </Stack>
        {warnings && (
          <Alert severity={warnings.length ? 'warning' : 'success'} sx={{ mt: 1.5 }} onClose={() => setWarnings(null)}>
            {warnings.length ? <>Estas partes se copiaron tal cual del HTML (se ven igual, pero no se editan como campos): {warnings.join(' · ')}</> : 'Conversión completa. Revisá la vista previa y guardá.'}
          </Alert>
        )}
        {!draft && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }} alignItems={{ sm: 'center' }}>
            <Autocomplete
              sx={{ flex: 1 }}
              options={copyOptions}
              getOptionLabel={(s) => s.full_name}
              onChange={(_e, v) => copyFrom(v)}
              renderInput={(p) => <TextField {...p} label="Empezar copiando el plan de…" />}
              noOptionsText="Ningún alumno tiene plan editable todavía"
            />
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>o</Typography>
            <Button component="label" variant="outlined" color="secondary" startIcon={<UploadFileRoundedIcon />}>
              Subir HTML<input hidden type="file" accept=".html,text/html" onChange={uploadHtml} />
            </Button>
          </Stack>
        )}
      </Card>

      {draft && (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) 400px' }, flex: 1, minHeight: 0 }}>
          <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Tabs value={panel} onChange={(_e, v) => setPanel(v)} sx={{ mb: 2, minHeight: 40 }}>
              <Tab value="semana" label="Semana temporal" />
              <Tab value="json" label="Avanzado (JSON)" />
              <Tab value="respaldo" label="HTML respaldo" />
            </Tabs>
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {panel === 'semana' && <TempWeekEditor plan={draft} onChange={updateDraft} />}
              {panel === 'json' && (
                <Stack spacing={1} sx={{ height: '100%' }}>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Todo el plan: textos, comidas, ejercicios, cuotas. La vista previa se actualiza mientras escribís.</Typography>
                  <TextField
                    multiline value={jsonText} onChange={(e) => onJson(e.target.value)} error={!!jsonError}
                    helperText={jsonError ? 'JSON con error: ' + jsonError : '✓ JSON válido'}
                    InputProps={{ sx: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, alignItems: 'flex-start' } }}
                    minRows={18} maxRows={40}
                  />
                </Stack>
              )}
              {panel === 'respaldo' && (
                <Stack spacing={1.5} alignItems="flex-start">
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {row.html ? `Hay un HTML de respaldo guardado (${Math.round(row.html.length / 1024)} KB).` : 'No hay HTML de respaldo.'}
                  </Typography>
                  <Button component="label" variant="outlined" color="secondary" startIcon={<UploadFileRoundedIcon />}>
                    {row.html ? 'Reemplazar HTML de respaldo' : 'Subir HTML'}<input hidden type="file" accept=".html,text/html" onChange={uploadHtml} />
                  </Button>
                  {mode === 'editable' && <Button color="error" onClick={revertToHtml}>Volver a mostrar el HTML al alumno</Button>}
                </Stack>
              )}
            </Box>
          </Card>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.75, fontWeight: 700 }}>Vista previa · así lo ve el alumno</Typography>
            <Box component="iframe" ref={frame} src="/plan.html?preview=1" title="Vista previa del plan" allow="camera"
              sx={{ width: '100%', flex: 1, minHeight: { xs: 640, lg: 560 }, border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 5, bgcolor: '#f6f4f2' }} />
          </Box>
        </Box>
      )}
    </Stack>
  );
}
