import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

export default async function GearPage() {
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

  const t = await getTranslations('gear');
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
          {t('add_item')}
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
            d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
        <h3 className="text-base font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          {t('empty')}
        </h3>
      </div>

      {/* Table placeholder (shown when items exist) */}
      <div className="hidden mt-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                {t('category')}
              </th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                {tCommon('add')}
              </th>
              <th className="text-right px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                {t('weight')}, {tCommon('weight_g')}
              </th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                {t('season')}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={4}
                className="px-4 py-8 text-center text-zinc-400 dark:text-zinc-500"
              >
                {t('empty')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
