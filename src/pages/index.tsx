import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslations, useLocale } from 'next-intl';
import Head from 'next/head';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { fetchUserProfile, fetchUserLists, fetchUserMealPlans } from '@/lib/supabase/service';
import type { GearList, MealPlan } from '@/lib/types';
import type { GearListWithTotalWeight } from '@/lib/supabase/service';
import { getPlanType, type PlanTypeId } from '@/lib/hiking-standards';
import { formatDate } from '@/lib/format';
import { getSeasonBadgeClass, getPlanTypeBadgeClass } from '@/lib/badges';
import TripWeightCard from '@/components/TripWeightCard';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Dashboard() {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const tGear = useTranslations('gear');
  const tMeals = useTranslations('meals');
  const locale = useLocale();

  const [user, setUser] = useState<{ id: string; user_metadata?: { full_name?: string } } | null>(null);
  const [profile, setProfile] = useState<{ name?: string } | null>(null);
  const [lists, setLists] = useState<GearListWithTotalWeight[]>([]);
  const [plans, setPlans] = useState<(MealPlan & { meal_days?: { total_weight_g: number }[] })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      if (cancelled) return;
      setUser(user);

      Promise.all([
        fetchUserProfile(user.id),
        fetchUserLists(user.id),
        fetchUserMealPlans(user.id),
      ]).then(([profileRes, listsRes, plansRes]) => {
        if (cancelled) return;
        if (profileRes.data) setProfile(profileRes.data);
        if (listsRes.data) setLists(listsRes.data);
        if (plansRes.data) setPlans(plansRes.data as (MealPlan & { meal_days?: { total_weight_g: number }[] })[]);
        setLoading(false);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) return <LoadingSpinner fullPage />;

  const recentLists = (lists as GearList[]).slice(0, 3);
  const recentMeals = (plans as (MealPlan & { meal_days?: { total_weight_g: number }[] })[]).slice(0, 3);

  const allLists = lists as unknown as Array<
    GearList & { list_items?: Array<{ quantity: number; gear_item: { weight_g: number } | null }> }
  >;
  const allPlans = plans;

  const listsWithWeight = (allLists || []).map((list) => ({
    id: list.id,
    name: list.name,
    totalWeight: (list.list_items || []).reduce(
      (sum, li) => sum + (li.gear_item?.weight_g || 0) * (li.quantity || 1),
      0,
    ),
    gpx_data: list.gpx_data,
    meal_plan_id: list.meal_plan_id,
  }));

  const plansWithWeight = (allPlans || []).map((plan) => ({
    id: plan.id,
    name: plan.name,
    totalWeight: (plan.meal_days || []).reduce((sum, d) => sum + (d.total_weight_g || 0), 0),
    people_count: plan.people_count || 1,
  }));

  const displayName = profile?.name || user?.user_metadata?.full_name;

  return (
    <>
      <Head>
        <title>ProHikes — Dashboard</title>
        <meta name="description" content="ProHikes hiking gear and meal planner dashboard" />
      </Head>

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
              className="flex items-center gap-4 p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-[var(--color-brand)] dark:hover:border-[var(--color-brand)] transition-colors group"
            >
              <div className="w-12 h-12 bg-[var(--color-brand)]/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[var(--color-brand)]/20 transition-colors">
                <svg
                  className="w-6 h-6 text-[var(--color-brand)]"
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
              className="flex items-center gap-4 p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-[var(--color-brand)] dark:hover:border-[var(--color-brand)] transition-colors group"
            >
              <div className="w-12 h-12 bg-[var(--color-brand)]/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[var(--color-brand)]/20 transition-colors">
                <svg
                  className="w-6 h-6 text-[var(--color-brand)]"
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
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-[var(--color-brand)]/50 transition-colors cursor-pointer"
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
                    className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-[var(--color-brand)]/50 transition-colors cursor-pointer"
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
    </>
  );
}
