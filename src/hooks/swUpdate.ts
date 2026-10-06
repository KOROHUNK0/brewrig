import { useEffect, useState } from 'react';

// Registers the service worker (production builds only — in `npm run dev` a
// cache-first SW would serve stale modules) and reports when a new version
// has taken control.
//
// sw.js calls skipWaiting()/clients.claim(), so a new deploy activates on its
// own; we just watch `controllerchange`. Only a change *from an existing
// controller* counts as an update — the very first install also fires
// controllerchange (via claim) but must not show the toast.
export function useSwUpdate(): boolean {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    const sw = navigator.serviceWorker;
    let hadController = !!sw.controller;

    const onControllerChange = () => {
      if (hadController) setUpdateReady(true);
      hadController = true;
    };
    // Look for a new deploy whenever the app comes back to the foreground
    // (an installed PWA can stay open for days).
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      sw.getRegistration()
        .then((r) => r?.update())
        .catch(() => {});
    };
    const register = () => {
      sw.register('./sw.js').catch((e) => console.warn(e));
    };

    sw.addEventListener('controllerchange', onControllerChange);
    document.addEventListener('visibilitychange', onVisible);
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => {
      sw.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('load', register);
    };
  }, []);

  return updateReady;
}
