import { useEffect } from 'react';

// Keep the screen awake while `active`. The browser auto-releases the lock
// whenever the page is hidden, so it is re-requested on return to visible.
// Unsupported browsers and rejected requests (battery saver etc.) are no-ops.
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let pending = false;
    let disposed = false;

    const request = () => {
      if (disposed || pending) return;
      if (document.visibilityState !== 'visible') return;
      if (sentinel && !sentinel.released) return;
      pending = true;
      navigator.wakeLock.request('screen').then(
        (s) => {
          pending = false;
          // Released condition hit while the request was in flight.
          if (disposed) s.release().catch(() => {});
          else sentinel = s;
        },
        () => {
          pending = false;
        },
      );
    };

    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', request);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
