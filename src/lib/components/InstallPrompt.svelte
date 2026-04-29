<script lang="ts">
  import { onMount } from 'svelte';

  const STORAGE_KEY = 'pwa-install-dismissed';
  const DISMISS_DAYS = 7;

  let visible = $state(false);
  let deferredPrompt: BeforeInstallPromptEvent | null = null;

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }

  function isDismissed(): boolean {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() - ts < DISMISS_DAYS * 86_400_000;
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    visible = false;
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    visible = false;
    if (outcome === 'dismissed') dismiss();
  }

  onMount(() => {
    if (isDismissed()) return;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      visible = true;
    });
  });
</script>

{#if visible}
  <div
    class="fixed bottom-0 left-0 right-0 z-50 p-4
      flex items-center gap-3 bg-white border-t border-gray-200 shadow-lg"
  >
    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold text-gray-800 truncate">Installer OMNIA Journal</p>
      <p class="text-xs text-gray-500">Accès rapide depuis l'écran d'accueil</p>
    </div>
    <button
      type="button"
      onclick={install}
      class="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded-xl
        active:bg-blue-900 transition-colors shrink-0"
    >
      Installer
    </button>
    <button
      type="button"
      onclick={dismiss}
      class="px-3 py-2 text-sm text-gray-400 hover:text-gray-600 shrink-0"
    >
      Plus tard
    </button>
  </div>
{/if}
