import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import type { LoadEvent } from '@sveltejs/kit';
import { isTokenValid, getAgent } from '$lib/auth';
import { initReferentiels } from '$lib/stores/referentiels.svelte';
import { loadPointsAFaire } from '$lib/stores/point-veille.svelte';

export const ssr = false;

export function load({ url }: LoadEvent) {
  if (!browser) return {};

  const isLoginPage = url.pathname === '/login';
  const tokenValid = isTokenValid();
  const agent = getAgent();

  if (!tokenValid && !isLoginPage) redirect(302, '/login');
  if (tokenValid && isLoginPage) redirect(302, '/saisie');

  if (tokenValid && agent) {
    initReferentiels();
    // Les redirects point-veille sont gérés dans onMount de chaque page
    if (agent.role !== 'admin') {
      loadPointsAFaire(); // fire-and-forget, remplit le store
    }
  }

  return {};
}
