/** Cloudflare Turnstile helpers — invisible background challenges for web login. */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: Record<string, unknown>
      ) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

/** Production site key (override with VITE_TURNSTILE_SITE_KEY). */
const DEFAULT_SITE_KEY = '0x4AAAAAAEA-_ZRG0NySV866';

export const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';
export const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';

export function getTurnstileSiteKey(): string {
  const fromEnv = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();
  return fromEnv || DEFAULT_SITE_KEY;
}

/** Native / Electron builds skip Turnstile (server trusts X-ERP-Client). */
export function isTurnstileEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  // @ts-ignore Electron desktop
  if (window.electronAPI) return false;
  try {
    // Capacitor native shells
    const cap = (window as any).Capacitor;
    if (cap?.isNativePlatform?.()) return false;
  } catch {
    /* ignore */
  }
  return getTurnstileSiteKey().length > 0;
}

export type TurnstileHandle = {
  /** Run the invisible challenge; resolves with the token (or "" if disabled). */
  execute: () => Promise<string>;
  reset: () => void;
};
