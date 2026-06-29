'use client';

import { formatWeight } from '@/lib/format';

interface WeightStatCardProps {
  baseWeight: number;
  wornWeight: number;
  consumableWeight: number;
  totalWeight: number;
  weightHint: string | null;
  onHintChange: (hint: string | null) => void;
  t: (key: string) => string;
  tGear: (key: string) => string;
}

function HintButton({
  hint,
  currentHint,
  label,
  onHintChange,
}: {
  hint: string;
  currentHint: string | null;
  label: string;
  onHintChange: (hint: string | null) => void;
}) {
  return (
    <button
      onClick={() => onHintChange(currentHint === hint ? null : hint)}
      aria-label={label}
      className="text-zinc-400 hover:text-[#75a93a] transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    </button>
  );
}

export default function WeightStatCard({
  baseWeight,
  wornWeight,
  consumableWeight,
  totalWeight,
  weightHint,
  onHintChange,
  t,
  tGear,
}: WeightStatCardProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
          {t('base_weight')}
          <HintButton hint="base" currentHint={weightHint} label={t('base_weight')} onHintChange={onHintChange} />
        </div>
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {formatWeight(baseWeight, tGear)}
        </div>
        {weightHint === 'base' && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            {t('base_weight_hint')}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
          {t('worn_weight')}
          <HintButton hint="worn" currentHint={weightHint} label={t('worn_weight')} onHintChange={onHintChange} />
        </div>
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {formatWeight(wornWeight, tGear)}
        </div>
        {weightHint === 'worn' && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            {t('worn_weight_hint')}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
          {t('consumable_weight')}
          <HintButton hint="consumable" currentHint={weightHint} label={t('consumable_weight')} onHintChange={onHintChange} />
        </div>
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {formatWeight(consumableWeight, tGear)}
        </div>
        {weightHint === 'consumable' && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            {t('consumable_weight_hint')}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t('total_weight')}</div>
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {formatWeight(totalWeight, tGear)}
        </div>
      </div>
    </div>
  );
}
