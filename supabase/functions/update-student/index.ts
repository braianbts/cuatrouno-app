// Edge function: el admin edita usuario (login), contraseña y/o nombre de un alumno.
// Requiere service_role porque modifica auth.users de otro usuario.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const EMAIL_DOMAIN = "@cuatrouno.club";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1. Verificar que quien llama es admin (con su propio JWT).
  const authHeader = req.headers.get("Authorization") ?? "";
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: isAdmin, error: adminErr } = await caller.rpc("is_admin");
  if (adminErr || !isAdmin) return json({ error: "No autorizado." }, 403);

  // 2. Validar entrada.
  let body: { user_id?: string; username?: string; password?: string; full_name?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body inválido." }, 400);
  }
  const userId = body.user_id;
  const username = body.username?.trim().toLowerCase();
  const password = body.password;
  const fullName = body.full_name?.trim();

  if (!userId) return json({ error: "Falta user_id." }, 400);
  if (!username && !password && !fullName) return json({ error: "No hay cambios." }, 400);
  if (username !== undefined && !/^[a-z0-9-]+$/.test(username)) {
    return json({ error: "Usuario inválido: solo minúsculas, números y guiones." }, 400);
  }
  if (password !== undefined && password.length < 8) {
    return json({ error: "La contraseña debe tener al menos 8 caracteres." }, 400);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: student, error: stErr } = await admin
    .from("students").select("user_id,username").eq("user_id", userId).maybeSingle();
  if (stErr || !student) return json({ error: "Alumno no encontrado." }, 404);

  if (username && username !== student.username) {
    const { data: taken } = await admin
      .from("students").select("user_id").eq("username", username).neq("user_id", userId).maybeSingle();
    if (taken) return json({ error: "Ese usuario ya existe." }, 409);
  }

  // 3. Actualizar auth (email de login y/o contraseña).
  const authUpdate: { email?: string; email_confirm?: boolean; password?: string } = {};
  if (username && username !== student.username) {
    authUpdate.email = username + EMAIL_DOMAIN;
    authUpdate.email_confirm = true;
  }
  if (password) authUpdate.password = password;

  if (Object.keys(authUpdate).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(userId, authUpdate);
    if (error) return json({ error: "Error actualizando acceso: " + error.message }, 400);
  }

  // 4. Actualizar ficha del alumno.
  const studentUpdate: { username?: string; full_name?: string } = {};
  if (username && username !== student.username) studentUpdate.username = username;
  if (fullName) studentUpdate.full_name = fullName;

  if (Object.keys(studentUpdate).length > 0) {
    const { error } = await admin.from("students").update(studentUpdate).eq("user_id", userId);
    if (error) {
      // Revertir el email si la ficha no se pudo actualizar, para no dejar login y ficha desincronizados.
      if (authUpdate.email) {
        await admin.auth.admin.updateUserById(userId, { email: student.username + EMAIL_DOMAIN, email_confirm: true });
      }
      return json({ error: "Error actualizando la ficha: " + error.message }, 400);
    }
  }

  return json({ ok: true });
});
