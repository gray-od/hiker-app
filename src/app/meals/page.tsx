import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

export default async function MealsPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value),
            );
          } catch {
            // Server Component — ignored; middleware refreshes sessions
          }
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const t = await getTranslations('meals');
  const tCommon = await getTranslations('common');

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {t('title')}
        </h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#75a93a] hover:bg-[#5d8a2e] text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t('add')}
        </button>
      </div>

      {/* Empty state */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
        <svg
          className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 9h10.5M9 12h10.5M9 15h10.5M9 18h10.5M3 9h.008v.008H3V9zm0 3h.008v.008H3V12zm0 3h.008v.008H3V15zm0 3h.008v.008H3V18zm12-10.5V3m0 0l-3 3m3-3l3 3"
          />
        </svg>
        <h3 className="text-base font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {t('empty')}
        </h3>
      </div>

      {/* Meal plan cards placeholder (shown when plans exist) */}
      <div className="hidden mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card template — repeated for each meal plan */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:border-[#75a93a]/50 transition-colors cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
              Назва походу
            </h3>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              5 {tCommon('days')}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            <span>
              {t('total_calories')}: 0 {tCommon('calories')}
            </span>
            <span>
              {t('total_weight')}: 0 {tCommon('weight_g')}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-zinc-400 dark:text-zinc-500">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full">
              {t('breakfast')}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full">
              {t('lunch')}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full">
              {t('snack')}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full">
              {t('dinner')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
