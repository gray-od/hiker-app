'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

const locales = [
  { code: 'uk', label: 'Українська' },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslations('settings');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [currentLocale, setCurrentLocale] = useState('uk');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setEmail(user.email || '');

      supabase
        .from('profiles')
        .select('name, lang')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setName(data.name || '');
            setCurrentLocale(data.lang || 'uk');
          }
          setLoading(false);
        });
    });

    const cookie = document.cookie
      .split('; ')
      .find(c => c.startsWith('NEXT_LOCALE='));
    if (cookie) {
      setCurrentLocale(cookie.split('=')[1]);
    }
  }, [router]);

  const switchLocale = (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setCurrentLocale(locale);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-zinc-200 dark:border-zinc-700 border-t-[#75a93a] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mb-6">
        {t('title')}
      </h1>

      <div className="space-y-6">
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            {t('language')}
          </h2>
          <div className="flex gap-2">
            {locales.map((loc) => (
              <button
                key={loc.code}
                onClick={() => switchLocale(loc.code)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentLocale === loc.code
                    ? 'bg-[#75a93a] text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {loc.label}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            {t('profile')}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                {t('email')}
              </label>
              <p className="text-sm text-zinc-900 dark:text-zinc-100">{email}</p>
            </div>
            {name && (
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  {t('name')}
                </label>
                <p className="text-sm text-zinc-900 dark:text-zinc-100">{name}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
