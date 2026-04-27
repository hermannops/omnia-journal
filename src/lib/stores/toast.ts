import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

let nextId = 0;

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  function add({
    message,
    type = 'info' as ToastType,
    duration = 3000
  }: {
    message: string;
    type?: ToastType;
    duration?: number;
  }) {
    const id = ++nextId;
    update((toasts) => [...toasts, { id, message, type }]);
    setTimeout(() => {
      update((toasts) => toasts.filter((t) => t.id !== id));
    }, duration);
  }

  return { subscribe, add };
}

export const toastStore = createToastStore();

export function addToast(opts: { message: string; type?: ToastType; duration?: number }) {
  toastStore.add(opts);
}
