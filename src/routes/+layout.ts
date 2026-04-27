import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { isTokenValid } from '$lib/auth';

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

  return {};
}
