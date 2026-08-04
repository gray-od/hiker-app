'use client';

import { useEffect } from 'react';

export default function SWRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.update().catch(() => {});
      }
    });

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
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
  }, []);

  return null;
}
