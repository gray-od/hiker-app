'use client';

import type { MealPlan, MealDayWithEntries } from '@/lib/types';
import { formatWeight } from '@/lib/format';

interface StatsCardsProps {
  days: MealDayWithEntries[];
  plan: MealPlan;
  t: (k: string) => string;
  tCommon: (k: string) => string;
}

export default function StatsCards({ days, plan, t, tCommon }: StatsCardsProps) {
  const totalCalories = days.reduce(
    (sum, d) => sum + (d.meal_entries || []).reduce((s, e) => s + e.calories, 0),
    0,
  );
  const totalWeight = days.reduce(
    (sum, d) => sum + (d.meal_entries || []).reduce((s, e) => s + e.weight_g, 0),
    0,
  );
  const daysCount = days.length || 1;
  const peopleCount = plan.people_count || 1;
  const avgCalPerPersonDay = Math.round(totalCalories / daysCount / peopleCount);
  const avgWeightPerPersonDay = Math.round(totalWeight / daysCount / peopleCount);

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t('total_calories')}</div>
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {totalCalories} {t('kcal')}
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t('total_weight')}</div>
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {formatWeight(totalWeight, tCommon)}
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t('days')}</div>
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {daysCount}
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
          {t('kcal')} / {t('per_person')} / {tCommon('day')}
        </div>
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {avgCalPerPersonDay}
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
          {tCommon('weight_g')} / {t('per_person')} / {tCommon('day')}
        </div>
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {avgWeightPerPersonDay}
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t('people')}</div>
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {peopleCount}
        </div>
      </div>
    </div>
  );
}
