import { writable } from 'svelte/store';

export type AgentInfo = {
  id: string;
  nom: string;
  role: string;
  numero: string;
};

export const agentStore = writable<AgentInfo | null>(null);
