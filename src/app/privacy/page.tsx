import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: t('privacy_policy') };
}

export default async function PrivacyPage() {
  const t = await getTranslations('common');
  const p = await getTranslations('privacy');

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">
          {t('privacy_policy')}
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
              <li>{p('third_deepseek')}</li>
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
              <a href="https://github.com/gray-od/hiker-app/issues" target="_blank" rel="noopener noreferrer" className="text-[#75a93a] hover:underline">
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
            className="text-sm text-[#75a93a] hover:underline font-medium focus:ring-2 focus:ring-[#75a93a] rounded"
          >
            ← ProHikes
          </a>
        </div>
      </div>
    </div>
  );
}
