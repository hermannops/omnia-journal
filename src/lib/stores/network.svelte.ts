import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const networkStore = $state({
  online: true,
  syncing: false,
  pendingCount: 0
});

async function ping(): Promise<boolean> {
  try {
    await fetch(`${PUBLIC_SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: { apikey: PUBLIC_SUPABASE_ANON_KEY },
      signal: AbortSignal.timeout(5000)
    });
    return true; // toute réponse = réseau joignable
  } catch {
    return false;
  }
}

async function handleOnline() {
  const reachable = await ping();
  networkStore.online = reachable;
  if (reachable) {
    // Import dynamique pour éviter la dépendance circulaire au chargement du module
    const { flushQueue } = await import('$lib/offline/sync');
    flushQueue();
  }
}

function handleOffline() {
  networkStore.online = false;
}

export async function initNetwork(): Promise<void> {
  networkStore.online = navigator.onLine;

  // Vérification réelle dès le départ (navigator.onLine ment souvent)
  if (navigator.onLine) {
    networkStore.online = await ping();
  }

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Ping toutes les 15s pour détecter les coupures silencieuses
  setInterval(async () => {
    const reachable = await ping();
    if (reachable && !networkStore.online) {
      networkStore.online = true;
      const { flushQueue } = await import('$lib/offline/sync');
      flushQueue();
    } else if (!reachable && networkStore.online) {
      networkStore.online = false;
    }
  }, 15_000);
}
