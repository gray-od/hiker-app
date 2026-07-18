import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useTranslations, useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

const features = [
  {
    key: 'gear',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    key: 'meals',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    key: 'lists',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    key: 'ai',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
];

export default function LoginPage() {
  const t = useTranslations('common');
  const lt = useTranslations('landing');
  const router = useRouter();
  const locale = useLocale();

  const switchLocale = (loc: string) => {
    document.cookie = `NEXT_LOCALE=${loc}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  };

  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleSignInWithGoogle = async () => {
    setGoogleLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setError(null);
    setSignUpSuccess(false);

    const supabase = createClient();

    if (authMode === 'signin') {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        setEmailLoading(false);
        return;
      }
      router.push('/');
    } else {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
      });
      if (authError) {
        setError(authError.message);
        setEmailLoading(false);
        return;
      }
      if (data?.session) {
        router.push('/');
        return;
      }
      setSignUpSuccess(true);
      setEmailLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>ProHikes — Login</title>
        <meta name="description" content="ProHikes — plan your hikes, manage gear and meals" />
      </Head>
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
          <div className="flex justify-end mb-6">
            {(['uk', 'ru', 'en'] as const).map((loc, i) => (
              <span key={loc} className="flex items-center">
                {i > 0 && <span className="text-zinc-300 dark:text-zinc-700 mx-1">·</span>}
                <button
                  onClick={() => switchLocale(loc)}
                  className={`px-1.5 py-1 text-sm font-medium rounded transition-colors ${locale === loc ? 'text-[var(--color-brand)]' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                >
                  {loc === 'uk' ? 'UA' : loc.toUpperCase()}
                </button>
              </span>
            ))}
          </div>
          {/* Hero */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center mb-6">
              <img src="/logo-circle.png" alt="ProHikes" className="w-20 h-20 md:w-24 md:h-24" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mb-2">
              ProHikes
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-brand)] text-white align-middle">
                beta
              </span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-700 dark:text-zinc-300 font-medium mt-3">
              {lt('tagline')}
            </p>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 max-w-md mx-auto">
              {lt('subtitle')}
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
            {features.map((f) => (
              <div
                key={f.key}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 flex gap-4 items-start"
              >
                <div className="text-[var(--color-brand)] shrink-0 mt-1">{f.icon}</div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    {lt(`feature_${f.key}_title` as any)}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {lt(`feature_${f.key}_desc` as any)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Auth section */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 text-center mb-6">
              {t('login')}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {signUpSuccess && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400">
                {t('check_email')}
              </div>
            )}

            {/* Google button */}
            <button
              onClick={handleSignInWithGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors shadow-sm focus:ring-2 focus:ring-[var(--color-brand)] min-h-[44px]"
            >
              {googleLoading ? (
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" />
                </svg>
              )}
              {t('sign_in_with_google')}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
              <span className="text-sm text-zinc-400 dark:text-zinc-500">{t('or')}</span>
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {t('email')}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent outline-none text-base"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {t('password')}
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent outline-none text-base"
                  placeholder="••••••"
                />
              </div>
              <button
                type="submit"
                disabled={emailLoading}
                className="w-full px-6 py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-zinc-900 font-medium rounded-xl transition-colors focus:ring-2 focus:ring-[var(--color-brand)] min-h-[44px]"
              >
                {emailLoading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white dark:border-zinc-900 border-t-transparent rounded-full animate-spin" />
                ) : authMode === 'signin' ? (
                  t('sign_in_with_email')
                ) : (
                  t('sign_up_with_email')
                )}
              </button>
            </form>

            {/* Toggle link */}
            <p className="text-center mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              {authMode === 'signin' ? (
                <>
                  {t('no_account')}{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setError(null); setSignUpSuccess(false); }}
                    className="text-[var(--color-brand)] hover:underline font-medium focus:ring-2 focus:ring-[var(--color-brand)] rounded"
                  >
                    {t('sign_up_with_email')}
                  </button>
                </>
              ) : (
                <>
                  {t('have_account')}{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); setError(null); setSignUpSuccess(false); }}
                    className="text-[var(--color-brand)] hover:underline font-medium focus:ring-2 focus:ring-[var(--color-brand)] rounded"
                  >
                    {t('sign_in_with_email')}
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Footer */}
          <div className="text-center mt-10 space-y-2">
            <a
              href="/privacy"
              className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-[var(--color-brand)] transition-colors focus:ring-2 focus:ring-[var(--color-brand)] rounded"
            >
              {t('privacy_policy')}
            </a>
            <span className="mx-2 text-zinc-400 dark:text-zinc-500 text-sm">|</span>
            <a
              href="https://github.com/gray-od/hiker-app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-[var(--color-brand)] transition-colors focus:ring-2 focus:ring-[var(--color-brand)] rounded"
            >
              <svg className="inline-block w-3.5 h-3.5 mr-1" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>
              {t('source_code')}
            </a>
            <p className="text-xs text-zinc-400 dark:text-zinc-600">
              &copy; {new Date().getFullYear()} ProHikes
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
