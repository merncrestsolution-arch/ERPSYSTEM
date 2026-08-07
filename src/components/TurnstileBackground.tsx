import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  TURNSTILE_SCRIPT_ID,
  TURNSTILE_SCRIPT_SRC,
  getTurnstileSiteKey,
  isTurnstileEnabled,
  type TurnstileHandle,
} from '../lib/turnstile';

type Pending = {
  resolve: (token: string) => void;
  reject: (err: Error) => void;
  timeoutId: number;
};

type Props = {
  onError?: (message: string) => void;
};

/**
 * Invisible Cloudflare Turnstile — loads in the background and only runs
 * the challenge when `execute()` is called (e.g. on login submit).
 */
const TurnstileBackground = forwardRef<TurnstileHandle, Props>(function TurnstileBackground(
  { onError },
  ref
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const siteKey = isTurnstileEnabled() ? getTurnstileSiteKey() : '';

  const clearPending = useCallback((err?: Error) => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    if (pending.timeoutId) window.clearTimeout(pending.timeoutId);
    if (err) pending.reject(err);
  }, []);

  useEffect(() => {
    if (!siteKey) return;

    let cancelled = false;

    const tryRender = (): boolean => {
      if (cancelled || widgetIdRef.current || !hostRef.current || !window.turnstile) {
        return !!widgetIdRef.current;
      }
      try {
        widgetIdRef.current = window.turnstile.render(hostRef.current, {
          sitekey: siteKey,
          size: 'invisible',
          execution: 'execute',
          appearance: 'execute',
          callback: (token: string) => {
            const pending = pendingRef.current;
            if (!pending) return;
            pendingRef.current = null;
            if (pending.timeoutId) window.clearTimeout(pending.timeoutId);
            pending.resolve(token);
          },
          'expired-callback': () => {
            clearPending(new Error('Security check expired. Please try again.'));
          },
          'error-callback': () => {
            clearPending(new Error('Security check failed. Check your connection and try again.'));
            onErrorRef.current?.('Security check failed. Please try again.');
          },
          theme: 'light',
          retry: 'auto',
          refreshExpired: 'auto',
        });
        return true;
      } catch (e) {
        console.error('[turnstile] invisible render failed', e);
        onErrorRef.current?.('Could not start security check. Refresh and try again.');
        return false;
      }
    };

    const poll = window.setInterval(() => {
      if (tryRender()) window.clearInterval(poll);
    }, 250);

    const prevOnLoad = window.onTurnstileLoad;
    window.onTurnstileLoad = () => {
      prevOnLoad?.();
      if (!cancelled) tryRender();
    };

    if (document.getElementById(TURNSTILE_SCRIPT_ID)) {
      if (window.turnstile) tryRender();
    } else {
      const script = document.createElement('script');
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onerror = () =>
        onErrorRef.current?.('Could not load Cloudflare security script. Check your connection.');
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      clearPending();
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, clearPending]);

  useImperativeHandle(
    ref,
    (): TurnstileHandle => ({
      execute: () =>
        new Promise<string>((resolve, reject) => {
          if (!siteKey) {
            resolve('');
            return;
          }

          const attempt = (tries = 0) => {
            if (!window.turnstile || !widgetIdRef.current) {
              if (tries < 40) {
                window.setTimeout(() => attempt(tries + 1), 250);
                return;
              }
              reject(new Error('Security check unavailable. Please try again.'));
              return;
            }
            if (pendingRef.current) {
              reject(new Error('Security check already in progress.'));
              return;
            }
            pendingRef.current = {
              resolve,
              reject,
              timeoutId: window.setTimeout(() => {
                clearPending(new Error('Security check timed out. Please try again.'));
              }, 25_000),
            };
            try {
              window.turnstile.execute(widgetIdRef.current);
            } catch (e) {
              clearPending(e instanceof Error ? e : new Error('Security check failed.'));
            }
          };
          attempt();
        }),
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch {
            /* ignore */
          }
        }
        clearPending();
      },
    }),
    [siteKey, clearPending]
  );

  if (!siteKey) return null;

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
      aria-hidden
    />
  );
});

export default TurnstileBackground;
