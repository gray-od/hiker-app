'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase/client';

const locales = [
  { code: 'uk', label: 'Українська' },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [currentLocale, setCurrentLocale] = useState('uk');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const cookieLocale = document.cookie
      .split('; ')
      .find(c => c.startsWith('NEXT_LOCALE='))
      ?.split('=')[1];

    if (cookieLocale) {
      setCurrentLocale(cookieLocale);
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setEmail(user.email || '');
      setName(user.user_metadata?.full_name || '');

      supabase
        .from('profiles')
        .select('name, lang')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            if (data.name) setName(data.name);
            if (!cookieLocale && data.lang) {
              setCurrentLocale(data.lang);
            }
          }
          setLoading(false);
        });
    });
  }, [router]);

  const switchLocale = async (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setCurrentLocale(locale);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ lang: locale }).eq('id', user.id);
    }
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
            {t('theme')}
          </h2>
          {mounted && (
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((th) => (
                <button
                  key={th}
                  onClick={() => setTheme(th)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    theme === th
                      ? 'bg-[#75a93a] text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {t(th)}
                </button>
              ))}
            </div>
          )}
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
            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                {t('name')}
              </label>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                  />
                  <button
                    onClick={async () => {
                      setSavingName(true);
                      const supabase = createClient();
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        await supabase.from('profiles').update({ name: nameInput }).eq('id', user.id);
                      }
                      setName(nameInput);
                      setEditingName(false);
                      setSavingName(false);
                    }}
                    disabled={savingName}
                    className="px-3 py-2 bg-[#75a93a] hover:bg-[#5d8a2e] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {savingName ? '...' : tCommon('save')}
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    {tCommon('cancel')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">{name || '—'}</p>
                  <button
                    onClick={() => { setNameInput(name); setEditingName(true); }}
                    className="text-sm text-[#75a93a] hover:text-[#5d8a2e] font-medium"
                  >
                    {tCommon('edit')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
