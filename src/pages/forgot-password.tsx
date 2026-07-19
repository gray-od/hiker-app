import { useState } from 'react';
import Head from 'next/head';
import { useTranslations, useLocale } from 'next-intl';

export default function ForgotPasswordPage() {
  const t = useTranslations('common');
  const locale = useLocale();

  const switchLocale = (loc: string) => {
    document.cookie = `NEXT_LOCALE=${loc}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  };

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('recovery_not_available'));
        setLoading(false);
        return;
      }

      setQuestion(data.question);
      setStep(2);
    } catch {
      setError(t('recovery_not_available'));
    }
    setLoading(false);
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, answer, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg =
          data.error === 'wrong_answer'
            ? t('recovery_wrong_answer')
            : data.error === 'too_many_attempts'
              ? t('recovery_too_many_attempts')
              : data.error || t('recovery_wrong_answer');
        setError(msg);
        setLoading(false);
        return;
      }

      setStep(3);
    } catch {
      setError(t('recovery_wrong_answer'));
    }
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>ProHikes — {t('forgot_password_title')}</title>
        <meta name="description" content="Reset your ProHikes account password" />
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

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8">
            {step < 3 && (
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 text-center mb-6">
                {t('forgot_password_title')}
              </h2>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleLookup} className="space-y-4">
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-zinc-900 font-medium rounded-xl transition-colors focus:ring-2 focus:ring-[var(--color-brand)] min-h-[44px]"
                >
                  {loading ? (
                    <span className="inline-block w-5 h-5 border-2 border-white dark:border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    t('reset_password')
                  )}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleRecover} className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300">
                  {question}
                </div>
                <div>
                  <label htmlFor="answer" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {t('security_answer')}
                  </label>
                  <input
                    id="answer"
                    type="text"
                    required
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent outline-none text-base"
                    placeholder=""
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {t('enter_new_password')}
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent outline-none text-base"
                    placeholder="••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-zinc-900 font-medium rounded-xl transition-colors focus:ring-2 focus:ring-[var(--color-brand)] min-h-[44px]"
                >
                  {loading ? (
                    <span className="inline-block w-5 h-5 border-2 border-white dark:border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    t('reset_password')
                  )}
                </button>
              </form>
            )}

            {step === 3 && (
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400">
                  {t('password_reset_success')}
                </div>
                <a
                  href="/login"
                  className="inline-block w-full px-6 py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-xl transition-colors focus:ring-2 focus:ring-[var(--color-brand)] text-center min-h-[44px] leading-[44px]"
                >
                  {t('back_to_login')}
                </a>
              </div>
            )}

            <p className="text-center mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              <a
                href="/login"
                className="text-[var(--color-brand)] hover:underline font-medium focus:ring-2 focus:ring-[var(--color-brand)] rounded"
              >
                {t('back_to_login')}
              </a>
            </p>
          </div>

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
              <svg className="inline-block w-3.5 h-3.5 mr-1" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8" /></svg>
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
