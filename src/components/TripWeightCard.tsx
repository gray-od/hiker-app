'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface WeightItem {
  id: string;
  name: string;
  totalWeight: number;
}

interface TripWeightCardProps {
  lists: WeightItem[];
  plans: WeightItem[];
}

function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} кг`;
  return `${grams} г`;
}

export default function TripWeightCard({ lists, plans }: TripWeightCardProps) {
  const t = useTranslations('dashboard');

  const [selectedListId, setSelectedListId] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('trip_weight_selection');
      if (saved) {
        const { listId, planId } = JSON.parse(saved);
        if (listId) setSelectedListId(listId);
        if (planId) setSelectedPlanId(planId);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('trip_weight_selection', JSON.stringify({ listId: selectedListId, planId: selectedPlanId }));
  }, [selectedListId, selectedPlanId, mounted]);

  const selectedList = lists.find(l => l.id === selectedListId);
  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const gearWeight = selectedList?.totalWeight || 0;
  const foodWeight = selectedPlan?.totalWeight || 0;
  const totalWeight = gearWeight + foodWeight;

  if (lists.length === 0 && plans.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">{t('trip_weight')}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t('gear_weight')}</label>
          <select
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
          >
            <option value="">{t('select_list')}</option>
            {lists.map(l => (
              <option key={l.id} value={l.id}>{l.name} ({formatWeight(l.totalWeight)})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t('food_weight')}</label>
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
          >
            <option value="">{t('select_plan')}</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({formatWeight(p.totalWeight)})</option>
            ))}
          </select>
        </div>
      </div>

      {(selectedListId || selectedPlanId) ? (
        <div className="flex items-center justify-between text-sm border-t border-zinc-200 dark:border-zinc-800 pt-3">
          <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-400">
            {selectedList && <span>{t('gear_weight')}: {formatWeight(gearWeight)}</span>}
            {selectedPlan && <span>{t('food_weight')}: {formatWeight(foodWeight)}</span>}
          </div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {t('combined_weight')}: {formatWeight(totalWeight)}
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">{t('select_hint')}</p>
      )}
    </div>
  );
}
