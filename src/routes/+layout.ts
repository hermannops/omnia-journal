import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { isTokenValid } from '$lib/auth';
import { initReferentiels } from '$lib/stores/referentiels.svelte';

export const ssr = false;

export function load({ url }) {
  if (!browser) return {};

  const isLoginPage = url.pathname === '/login';
  const tokenValid = isTokenValid();

  if (!tokenValid && !isLoginPage) {
    redirect(302, '/login');
  }

  if (tokenValid && isLoginPage) {
    redirect(302, '/saisie');
  }

  // Fire-and-forget : ne bloque pas le rendu, le cache prend le relais si réseau absent
  if (tokenValid) {
    initReferentiels();
  }

  return {};
}
