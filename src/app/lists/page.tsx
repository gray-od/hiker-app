import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

export default async function ListsPage() {
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

  const t = await getTranslations('lists');
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
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
          />
        </svg>
        <h3 className="text-base font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          {t('empty')}
        </h3>
      </div>

      {/* Cards placeholder (shown when lists exist) */}
      <div className="hidden mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card template — repeated for each list */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:border-[#75a93a]/50 transition-colors cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
              Назва походу
            </h3>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              12.06.2026
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            <span>
              {t('items')}: 0
            </span>
            <span>
              {t('base_weight')}: 0 {tCommon('weight_g')}
            </span>
          </div>
          <div className="mt-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#75a93a] h-full rounded-full"
              style={{ width: '0%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
