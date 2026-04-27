import { createClient } from '@supabase/supabase-js';
import { create } from 'djwt';

// Variables auto-injectées par Supabase (ne pas setter manuellement)
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Variables custom (à setter via `supabase secrets set`)
const jwtSecret = Deno.env.get('JWT_SECRET')!;
const jwtExpiryHours = parseInt(Deno.env.get('JWT_EXPIRY_HOURS') ?? '12', 10);
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Clé HMAC dérivée du JWT_SECRET — initialisée une seule fois au démarrage
const jwtKey = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(jwtSecret),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign', 'verify']
);

function corsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin =
    requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('origin'));

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Méthode non autorisée' }, 405, cors);
  }

  let body: { numero?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corps JSON invalide' }, 400, cors);
  }

  const { numero, pin } = body;
  if (!numero || !pin) {
    return json({ error: 'Identifiants manquants' }, 400, cors);
  }

  const { data, error } = await supabase.rpc('verifier_pin', {
    p_numero: numero,
    p_pin: pin,
  });

  if (error) {
    console.error('Erreur RPC verifier_pin:', error.message);
    return json({ error: 'Erreur serveur' }, 500, cors);
  }

  type AgentRow = { id: string; nom: string; role: string; verrouille: boolean };
  const rows = data as AgentRow[] | null;

  // Pas de ligne → numéro inconnu ou PIN incorrect (ne pas distinguer)
  if (!rows || rows.length === 0) {
    return json({ error: 'Identifiants incorrects' }, 401, cors);
  }

  const agent = rows[0];

  if (agent.verrouille) {
    return json({ error: 'Compte verrouillé, contactez l\'administrateur' }, 403, cors);
  }

  const exp = Math.floor(Date.now() / 1000) + jwtExpiryHours * 3600;

  const token = await create(
    { alg: 'HS256', typ: 'JWT' },
    { sub: agent.id, numero, nom: agent.nom, role: agent.role, exp },
    jwtKey
  );

  return json(
    { token, agent: { id: agent.id, nom: agent.nom, role: agent.role, numero } },
    200,
    cors
  );
});
