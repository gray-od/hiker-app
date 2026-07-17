import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { fetchMealPlanDetail } from '@/lib/supabase/service';
import type { MealPlan, MealDayWithEntries, MealEntry } from '@/lib/types';

const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

export default function MealPlanPrintPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const t = useTranslations('meals');
  const tCommon = useTranslations('common');

  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [days, setDays] = useState<MealDayWithEntries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<'uk' | 'ru' | 'en'>('uk');

  useEffect(() => {
    const match = document.cookie.match(/NEXT_LOCALE=(\w+)/);
    if (match && ['uk', 'ru', 'en'].includes(match[1])) setLocale(match[1] as 'uk' | 'ru' | 'en');
  }, []);

  useEffect(() => {
    if (!router.isReady || typeof id !== 'string') return;
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);

      const { data: mealResult, error: mealError } = await fetchMealPlanDetail(id);

      if (mealError || !mealResult) {
        setError(mealError?.message || 'Plan not found');
        setLoading(false);
        return;
      }

      setPlan(mealResult.plan);
      setDays(mealResult.days);

      setLoading(false);
    }).catch((err) => {
      console.error('Failed to load meal plan print:', err);
      setLoading(false);
      setError(tCommon('error_loading'));
    });
  }, [id, router]);

  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(new Date().toLocaleDateString(locale === 'uk' ? 'uk-UA' : locale === 'ru' ? 'ru-RU' : 'en-US'));
  }, [locale]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-[var(--color-brand)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!plan && !loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center p-12">
          <h3 className="text-base font-medium text-zinc-700 mb-2">
            {error || tCommon('empty')}
          </h3>
          <button
            onClick={() => router.push('/meals')}
            className="mt-4 text-sm text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] font-medium"
          >
            {t('back_to_plans')}
          </button>
        </div>
      </div>
    );
  }

  const totalCalories = days.reduce(
    (sum, d) => sum + (d.meal_entries || []).reduce((s, e) => s + e.calories, 0),
    0,
  );
  const totalWeight = days.reduce(
    (sum, d) => sum + (d.meal_entries || []).reduce((s, e) => s + e.weight_g, 0),
    0,
  );
  const daysCount = days.length || 1;
  const peopleCount = plan?.people_count ?? 1;
  const avgCalPerPersonDay = Math.round(totalCalories / daysCount / peopleCount);
  const avgWeightPerPersonDay = Math.round(totalWeight / daysCount / peopleCount);

  const planTypeLabels: Record<string, string> = {
    comfort: t('plan_type_comfort'),
    standard: t('plan_type_standard'),
    ultralight: t('plan_type_ultralight'),
  };
  const planTypeName = planTypeLabels[plan?.plan_type ?? 'standard'] ?? plan?.plan_type ?? '';

  return (
    <>
      <Head>
        <title>ProHikes — {plan?.name ?? 'Meal Plan'} — {tCommon('print')}</title>
      </Head>
      <style>{`
        @page { margin: 1cm; }
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-white text-black w-full max-w-4xl mx-auto px-3 py-4 sm:p-6">

        <div className="no-print flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push(`/meals/${id}`)}
            className="flex items-center gap-1 text-sm text-zinc-600 hover:text-[var(--color-brand)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('back_to_plans')}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {tCommon('print')}
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-black mb-1">{plan?.name ?? ''}</h1>
          <div className="text-sm text-zinc-600">
            {t('plan_type')}: {planTypeName} &nbsp;|&nbsp; {t('people')}: {peopleCount} &nbsp;|&nbsp; {t('days')}: {daysCount}
          </div>
        </div>

        {days.map((day) => {
          const entries = day.meal_entries || [];

          const groupedEntries: Record<string, MealEntry[]> = {
            breakfast: [],
            lunch: [],
            snack: [],
            dinner: [],
          };
          entries.forEach((e) => {
            if (groupedEntries[e.meal_type]) {
              groupedEntries[e.meal_type].push(e);
            }
          });

          const dayTotalCal = entries.reduce((s, e) => s + e.calories, 0);
          const dayTotalWeight = entries.reduce((s, e) => s + e.weight_g, 0);

          return (
            <div key={day.id} className="mb-6">
              <h2 className="text-base font-semibold text-black border-b-2 border-zinc-300 pb-1 mb-3">
                {t('day')} {day.day_number}
              </h2>

              {MEAL_TYPES.map((mealType) => {
                const mealEntries = groupedEntries[mealType];
                if (mealEntries.length === 0) return null;

                return (
                  <div key={mealType} className="mb-4">
                    <h3 className="text-sm font-semibold text-black mb-2 ml-1">
                      ● {t(mealType)}
                    </h3>
                    <div className="overflow-x-auto -mx-1">
                    <table className="w-full border-collapse border border-zinc-300 text-xs sm:text-sm mb-2">
                      <thead>
                        <tr className="bg-zinc-100">
                          <th className="border border-zinc-300 px-2 py-1 text-left font-medium text-zinc-700 max-w-[140px] sm:max-w-none break-words">{t('meal_name')}</th>
                          <th className="border border-zinc-300 px-2 py-1 text-right font-medium text-zinc-700 whitespace-nowrap">{tCommon('weight_g')}</th>
                          <th className="border border-zinc-300 px-2 py-1 text-right font-medium text-zinc-700 whitespace-nowrap">{t('kcal')}</th>
                          <th className="border border-zinc-300 px-2 py-1 text-right font-medium text-zinc-700 whitespace-nowrap">{t('protein')}</th>
                          <th className="border border-zinc-300 px-2 py-1 text-right font-medium text-zinc-700 whitespace-nowrap">{t('fat')}</th>
                          <th className="border border-zinc-300 px-2 py-1 text-right font-medium text-zinc-700 whitespace-nowrap">{t('carbs')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mealEntries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="border border-zinc-300 px-2 py-1 text-black max-w-[140px] sm:max-w-none break-words">{entry.name}</td>
                            <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums text-black whitespace-nowrap">{entry.weight_g}</td>
                            <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums text-black whitespace-nowrap">{entry.calories}</td>
                            <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums text-black whitespace-nowrap">{entry.protein_g}</td>
                            <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums text-black whitespace-nowrap">{entry.fat_g}</td>
                            <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums text-black whitespace-nowrap">{entry.carbs_g}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                );
              })}

              <div className="text-sm text-right text-zinc-600 border-t border-zinc-200 pt-1">
                {t('day')} {day.day_number} {t('total_calories').toLowerCase()}: {dayTotalCal} {t('kcal')} &nbsp;|&nbsp; {dayTotalWeight} {tCommon('weight_g')}
              </div>
            </div>
          );
        })}

        <div className="border-t-2 border-black pt-3 mb-4">
          <div className="text-base font-semibold text-black text-center mb-2">
            ═══ {t('plan_summary')} ═══
          </div>
          <div className="text-sm text-center text-zinc-800 space-y-1">
            <div>
              {t('total_calories')}: {totalCalories} {t('kcal')} &nbsp;|&nbsp; {totalWeight} {tCommon('weight_g')}
            </div>
            <div>
              {t('per_person')} / {tCommon('day')}: {avgCalPerPersonDay} {t('kcal')} &nbsp;|&nbsp; {avgWeightPerPersonDay} {tCommon('weight_g')}
            </div>
          </div>
        </div>

        <div className="text-xs text-zinc-400 text-center pt-4 border-t border-zinc-200">
          ProHikes &nbsp;|&nbsp; {today}
        </div>
      </div>
    </>
  );
}