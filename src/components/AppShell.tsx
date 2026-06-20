'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import ChatWidget from '@/components/ChatWidget';
import SWRegister from '@/components/SWRegister';

const PUBLIC_ROUTES = ['/login'];

interface CachedItem {
  id: string;
  name: string;
  type: 'meal' | 'list';
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  const t = useTranslations('common');
  const [online, setOnline] = useState(true);
  const [cachedItems, setCachedItems] = useState<CachedItem[]>([]);

  useEffect(() => {
    const scanCache = () => {
      const items: CachedItem[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('offline_meal_')) {
            const data = JSON.parse(localStorage.getItem(key)!);
            items.push({ id: key.replace('offline_meal_', ''), name: data.plan?.name || '—', type: 'meal' });
          }
          if (key?.startsWith('offline_list_')) {
            const data = JSON.parse(localStorage.getItem(key)!);
            items.push({ id: key.replace('offline_list_', ''), name: data.list?.name || '—', type: 'list' });
          }
        }
      } catch {}
      setCachedItems(items);
    };

    setOnline(navigator.onLine);
    if (!navigator.onLine) scanCache();

    const goOnline = () => setOnline(true);
    const goOffline = () => { setOnline(false); scanCache(); };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (isPublic) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="pt-14 md:pt-0 pb-16 md:pb-0 md:pl-64 min-h-screen print:!pt-0 print:!pb-0 print:!pl-0">
        {!online && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
              📡 {t('offline_mode')}
            </p>
            {cachedItems.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {cachedItems.map((item) => (
                  <a
                    key={item.id}
                    href={item.type === 'meal' ? `/meals/${item.id}` : `/lists/${item.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                  >
                    {item.type === 'meal' ? '🍽' : '🎒'} {item.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        {children}
      </main>
      <ChatWidget />
      <SWRegister />
    </>
  );
}
