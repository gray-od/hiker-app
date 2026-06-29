'use client';

import type { MealPlan, MealEntry, MealDayWithEntries } from '@/lib/types';
import { getAdaptationCoefficient } from '@/lib/hiking-standards';
import { formatWeight } from '@/lib/format';

const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

function getProgressColor(ratio: number): string {
  if (ratio >= 0.8 && ratio <= 1.1) return 'var(--color-brand)';
  if (ratio >= 0.5 && ratio < 0.8) return '#f5a623';
  return '#ef4444';
}

interface DayCardProps {
  day: MealDayWithEntries;
  dayNumber: number;
  isExpanded: boolean;
  onToggle: (dayNum: number) => void;
  plan: MealPlan | null;
  onEditEntry: (dayId: string, entry?: MealEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onAddEntry: (dayId: string) => void;
  t: (k: string) => string;
  tCommon: (k: string) => string;
}

export default function DayCard({
  day,
  dayNumber,
  isExpanded,
  onToggle,
  plan,
  onEditEntry,
  onDeleteEntry,
  onAddEntry,
  t,
  tCommon,
}: DayCardProps) {
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
  const adaptationCoeff = getAdaptationCoefficient(dayNumber);
  const peopleCount = plan?.people_count || 1;
  const calTarget = ((plan?.target_calories ?? 3000)) * adaptationCoeff * peopleCount;
  const weightTarget = ((plan?.target_weight_g ?? 650)) * peopleCount;
  const calRatio = calTarget > 0 ? dayTotalCal / calTarget : 0;
  const weightRatio = weightTarget > 0 ? dayTotalWeight / weightTarget : 0;

  return (
    <div
      className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
    >
      <button
        onClick={() => onToggle(dayNumber)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {t('day')} {dayNumber}
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            {dayTotalCal} {t('kcal')} / {formatWeight(dayTotalWeight, tCommon)}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-500 dark:text-zinc-400">{t('calories_label')}</span>
                <span className="text-zinc-600 dark:text-zinc-300 tabular-nums">
                  {dayTotalCal} / {Math.round(calTarget)} {t('kcal')}
                </span>
              </div>
              <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(calRatio * 100, 100)}%`, backgroundColor: getProgressColor(calRatio) }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-500 dark:text-zinc-400">{t('weight')}</span>
                <span className="text-zinc-600 dark:text-zinc-300 tabular-nums">
                  {dayTotalWeight} / {Math.round(weightTarget)} {tCommon('weight_g')}
                </span>
              </div>
              <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(weightRatio * 100, 100)}%`, backgroundColor: getProgressColor(weightRatio) }}
                />
              </div>
            </div>
          </div>

          {MEAL_TYPES.map((mealType) => {
            const mealEntries = groupedEntries[mealType];
            return (
              <div key={mealType}>
                <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  {t(mealType)}
                </h4>
                {mealEntries.length === 0 && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                    {t('no_entries')}
                  </p>
                )}
                {mealEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {entry.name}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="tabular-nums">
                          {entry.weight_g} {tCommon('weight_g')}
                        </span>
                        <span className="tabular-nums">
                          {entry.calories} {t('kcal')}
                        </span>
                        <span className="text-zinc-400 dark:text-zinc-500 tabular-nums">
                          {t('protein')}: {entry.protein_g}{tCommon('weight_g')}{' '}
                          {t('fat')}: {entry.fat_g}{tCommon('weight_g')}{' '}
                          {t('carbs')}: {entry.carbs_g}{tCommon('weight_g')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onEditEntry(day.id, entry)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-[var(--color-brand)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
                      title={t('edit_entry')}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDeleteEntry(entry.id)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                      title={t('remove_entry')}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            );
          })}

          <button
            onClick={() => onAddEntry(day.id)}
            className="min-h-[44px] inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] transition-colors mt-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('add_entry')}
          </button>
        </div>
      )}
    </div>
  );
}
