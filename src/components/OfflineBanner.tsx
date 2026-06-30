'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const t = useTranslations('common');

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-white text-center text-sm font-medium py-2 px-4 safe-area-top">
      {t('offline_banner')}
    </div>
  );
}
