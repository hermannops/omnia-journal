import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { agentStore, type AgentInfo } from '$lib/stores/agent';

const JWT_KEY = 'omnia_jwt';

export function getJwt(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(JWT_KEY);
}

export function isTokenValid(): boolean {
  const token = getJwt();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getAgent(): AgentInfo | null {
  if (!isTokenValid()) return null;
  try {
    const payload = JSON.parse(atob(getJwt()!.split('.')[1]));
    return { id: payload.sub, nom: payload.nom, role: payload.role, numero: payload.numero };
  } catch {
    return null;
  }
}

export async function login(
  numero: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${PUBLIC_SUPABASE_URL}/functions/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero, pin })
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error ?? 'Erreur inconnue' };
    }

    localStorage.setItem(JWT_KEY, data.token);
    agentStore.set(data.agent);
    return { success: true };
  } catch {
    return { success: false, error: 'Erreur réseau, vérifiez votre connexion' };
  }
}

export function logout(): void {
  localStorage.removeItem(JWT_KEY);
  agentStore.set(null);
}
