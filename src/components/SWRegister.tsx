'use client';

import { useEffect } from 'react';

export default function SWRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    // Filled once register() resolves. Browsers only check for a SW update on
    // navigation, not on client-side route changes, so a tab left open can keep
    // the old worker and the old build-scoped document cache indefinitely; the
    // visibilitychange handler below needs a handle on the same registration.
    let registration: ServiceWorkerRegistration | null = null;

    const checkForUpdate = () => {
      if (document.visibilityState !== 'visible') return;
      registration?.update().catch(() => {
        // update() rejects when the script fetch fails (offline). The next
        // visibility change retries, so there is nothing to report here.
      });
    };
    document.addEventListener('visibilitychange', checkForUpdate);

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      registration = reg;

      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            installing.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(() => {});

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'RELOAD_ON_ONLINE' && !refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    return () => document.removeEventListener('visibilitychange', checkForUpdate);
  }, []);

  return null;
}
