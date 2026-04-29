/**
 * Garde-fou front : redirige les non-admin vers /saisie.
 *
 * ⚠️  SÉCURITÉ v1 — IMPORTANT :
 * Cette protection est UNIQUEMENT côté client (JWT décodé localement).
 * Il n'y a pas de RLS Supabase activé en v1 — toute personne avec un
 * token valide peut interroger les tables directement via l'API.
 * À durcir en v2 avec des policies RLS par rôle sur chaque table.
 */
import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import type { LoadEvent } from '@sveltejs/kit';
import { getAgent } from '$lib/auth';
import { addToast } from '$lib/stores/toast';

export const ssr = false;

export function load(_event: LoadEvent) {
  if (!browser) return {};
  const agent = getAgent();
  if (!agent || agent.role !== 'admin') {
    addToast({ message: 'Accès refusé — réservé aux administrateurs', type: 'error' });
    redirect(302, '/saisie');
  }
  return {};
}
