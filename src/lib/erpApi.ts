/** Thin accessor for Electron IPC or Supabase shim (window.electronAPI). */
export function getErpApi(): any {
  // @ts-ignore
  return window.electronAPI;
}

export function newClientUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `uuid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
