import Head from 'next/head';
import { useTranslations } from 'next-intl';

export default function PrivacyPage() {
  const tCommon = useTranslations('common');
  const p = useTranslations('privacy');

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Head>
        <title>ProHikes — Privacy Policy</title>
      </Head>

      <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">
          {tCommon('privacy_policy')}
        </h1>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6 text-zinc-700 dark:text-zinc-300">
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{p('data_collect_title')}</h2>
            <p>{p('data_collect_intro')}</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>{p('data_email')}</li>
              <li>{p('data_name')}</li>
              <li>{p('data_gear')}</li>
              <li>{p('data_meals')}</li>
              <li>{p('data_lists')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{p('purpose_title')}</h2>
            <p>{p('purpose_text')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{p('third_title')}</h2>
            <p>{p('third_intro')}</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>{p('third_supabase')}</li>
              <li>{p('third_google')}</li>
              <li>{p('third_ai')}</li>
              <li>{p('third_search')}</li>
              <li>{p('third_weather')}</li>
              <li>{p('third_byok')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{p('cookies_title')}</h2>
            <p>{p('cookies_text')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{p('deletion_title')}</h2>
            <p>{p('deletion_self_service')}</p>
            <p className="mt-2">
              {p('deletion_text')}{' '}
              <a href="https://github.com/gray-od/hiker-app/issues" target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand)] hover:underline">
                GitHub Issues
              </a>.{' '}
              {p('deletion_period')}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{p('no_sale_title')}</h2>
            <p>{p('no_sale_text')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{p('changes_title')}</h2>
            <p>{p('changes_text')}</p>
          </section>

          <p className="text-sm text-zinc-400 dark:text-zinc-500 pt-4">
            {p('last_updated')}
          </p>
        </div>

        <div className="mt-10 text-center">
          <a
            href="/login"
            className="text-sm text-[var(--color-brand)] hover:underline font-medium focus:ring-2 focus:ring-[var(--color-brand)] rounded"
          >
            ← ProHikes
          </a>
        </div>
      </div>
    </div>
  );
}
