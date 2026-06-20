import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getPlanType, type PlanTypeId } from '@/lib/hiking-standards';
import type { GearList, MealPlan } from '@/lib/types';
import TripWeightCard from '@/components/TripWeightCard';

export default async function DashboardPage() {
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

  const locale = await getLocale();

  const [{ data: recentListsRaw }, { data: recentMealsRaw }, { data: profileData }] = await Promise.all([
    supabase
      .from('gear_lists')
      .select('id, name, season, created_at, list_items(quantity, gear_item:gear_items(weight_g))')
      .order('created_at', { ascending: false }),
    supabase
      .from('meal_plans')
      .select('id, name, plan_type, days_count, created_at, meal_days(total_weight_g)')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('name')
      .eq('id', session.user.id)
      .single(),
  ]);

  const recentLists = (recentListsRaw as GearList[] | null)?.slice(0, 3) || null;
  const recentMeals = (recentMealsRaw as MealPlan[] | null)?.slice(0, 3) || null;

  const allLists = recentListsRaw as (GearList & { list_items?: { quantity: number; gear_item: { weight_g: number } | null }[] })[] | null;
  const allPlans = recentMealsRaw as (MealPlan & { meal_days?: { total_weight_g: number }[] })[] | null;

  const listsWithWeight = (allLists || []).map(list => ({
    id: list.id,
    name: list.name,
    totalWeight: (list.list_items || []).reduce((sum, li) => sum + (li.gear_item?.weight_g || 0) * (li.quantity || 1), 0),
  }));

  const plansWithWeight = (allPlans || []).map(plan => ({
    id: plan.id,
    name: plan.name,
    totalWeight: (plan.meal_days || []).reduce((sum, d) => sum + (d.total_weight_g || 0), 0),
  }));

  const t = await getTranslations('dashboard');
  const tGear = await getTranslations('gear');
  const tMeals = await getTranslations('meals');
  const user = session.user;
  const displayName = profileData?.name || user.user_metadata?.full_name;

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  function getSeasonBadgeClass(season: string): string {
    if (season === 'summer') return 'bg-[#ffec6d]/20 text-[#b8960f] dark:bg-[#ffec6d]/10 dark:text-[#ffec6d]';
    if (season === 'winter') return 'bg-[#6db3ff]/20 text-[#2563eb] dark:bg-[#6db3ff]/10 dark:text-[#6db3ff]';
    return 'bg-[#f5a623]/20 text-[#c2841a] dark:bg-[#f5a623]/10 dark:text-[#f5a623]';
  }

  function getPlanTypeBadgeClass(planType: string): string {
    if (planType === 'comfort') return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    if (planType === 'ultralight') return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    return 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400';
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      {/* Welcome section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {t('title')}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          {displayName
            ? t('welcome', { name: displayName })
            : t('welcome_anonymous')}
        </p>
      </div>

      {/* Quick actions */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
          {t('quick_actions')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/lists"
            className="flex items-center gap-4 p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-[#75a93a] dark:hover:border-[#75a93a] transition-colors group"
          >
            <div className="w-12 h-12 bg-[#75a93a]/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#75a93a]/20 transition-colors">
              <svg
                className="w-6 h-6 text-[#75a93a]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                {t('create_list')}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {t('recent_lists')}
              </p>
            </div>
          </Link>

          <Link
            href="/meals"
            className="flex items-center gap-4 p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-[#75a93a] dark:hover:border-[#75a93a] transition-colors group"
          >
            <div className="w-12 h-12 bg-[#75a93a]/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#75a93a]/20 transition-colors">
              <svg
                className="w-6 h-6 text-[#75a93a]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                {t('create_meal')}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {t('recent_meals')}
              </p>
            </div>
          </Link>
        </div>
      </section>

      <section className="mb-8">
        <TripWeightCard lists={listsWithWeight} plans={plansWithWeight} />
      </section>

      {/* Recent lists */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
          {t('recent_lists')}
        </h2>
        {recentLists && recentLists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentLists.map((list: GearList) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-[#75a93a]/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getSeasonBadgeClass(list.season)}`}
                  >
                    {tGear(`season.${list.season}`)}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {list.name}
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  {formatDate(list.created_at)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <svg
              className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm">
              {t('recent_lists')}
            </p>
          </div>
        )}
      </section>

      {/* Recent meals */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
          {t('recent_meals')}
        </h2>
        {recentMeals && recentMeals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentMeals.map((plan: MealPlan) => {
              const pt = getPlanType((plan.plan_type as PlanTypeId) ?? 'standard');
              const loc = (locale in pt.name ? locale : 'uk') as 'uk' | 'ru' | 'en';
              return (
                <Link
                  key={plan.id}
                  href={`/meals/${plan.id}`}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-[#75a93a]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getPlanTypeBadgeClass(plan.plan_type ?? 'standard')}`}
                    >
                      {pt.name[loc]}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    {plan.days_count} {tMeals('days')} · {formatDate(plan.created_at)}
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <svg
              className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm">
              {t('recent_meals')}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
