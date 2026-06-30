import { useTranslations } from 'next-intl';

interface ErrorProps {
  statusCode?: number;
}

export default function Error({ statusCode }: ErrorProps) {
  const t = useTranslations('errors');

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-500 mb-4">!</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
          {statusCode
            ? t('error_with_status', { status: statusCode })
            : t('something_went_wrong')}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center px-6 py-3 min-w-[44px] min-h-[44px] bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white font-medium rounded-lg transition-colors"
        >
          {t('try_again')}
        </button>
      </div>
    </div>
  );
}
