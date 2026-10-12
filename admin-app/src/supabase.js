import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://yqzemrztgyripdgiwxtg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxemVtcnp0Z3lyaXBkZ2l3eHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwODYxMzAsImV4cCI6MjA5ODY2MjEzMH0.RAb-oaJQRUQC84zekeAiysaYU6BD3Wtynd1QnGAc-fI';

export const EMAIL_DOMAIN = '@cuatrouno.club';
export const WA_NUMBER = '5493484381444';

export const sb = import.meta.env.VITE_DEMO
  ? window.__demoClient
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

// Avisa al panel que algo cambió para recargar los datos (además de Realtime, por si no está activo).
export const notifyChanged = () => window.dispatchEvent(new Event('cuatrouno:changed'));

// Errores de las edge functions vienen dentro del body; los sacamos para mostrarlos.
export async function invokeFn(name, body) {
  const { data, error } = await sb.functions.invoke(name, { body });
  if (error || data?.error) {
    let detail = data?.error;
    if (!detail && error?.context?.json) {
      try { detail = (await error.context.json()).error; } catch (e) { /* sin detalle */ }
    }
    throw new Error(detail || error?.message || 'Error inesperado.');
  }
  return data;
}

export async function uploadStudentPhoto(slug, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = slug + '/profile.' + ext;
  const { error } = await sb.storage.from('student-photos').upload(path, file, { upsert: true });
  if (error) throw new Error('No se pudo subir la foto.');
  const { data } = sb.storage.from('student-photos').getPublicUrl(path);
  // ?v= evita que el CDN siga mostrando la foto anterior (misma ruta, upsert).
  return data.publicUrl + '?v=' + Date.now();
}
