'use client';

import { useTranslations } from 'next-intl';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('errors');

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-500 mb-4">!</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">{t('something_went_wrong')}</p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-6 py-3 min-w-[44px] min-h-[44px] bg-[#75a93a] hover:bg-[#5d8a2e] text-white font-medium rounded-lg transition-colors"
        >
          {t('try_again')}
        </button>
      </div>
    </div>
  );
}
