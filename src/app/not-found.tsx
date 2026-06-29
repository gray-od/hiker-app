import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('errors');

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[var(--color-brand)] mb-4">404</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">{t('not_found')}</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 min-w-[44px] min-h-[44px] bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white font-medium rounded-lg transition-colors"
        >
          {t('go_home')}
        </Link>
      </div>
    </div>
  );
}
