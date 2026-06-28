'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getTerrainLimitPct, calcGroupMax, bannerColor } from '@/lib/weight-calc';

interface TripWeightCardProps {
  lists: Array<{
    id: string;
    name: string;
    totalWeight: number;
    gpx_data?: any;
    participants?: Array<{ name: string; weight_kg?: number }>;
    meal_plan_id?: string;
  }>;
  plans: Array<{
    id: string;
    name: string;
    totalWeight: number;
    people_count: number;
  }>;
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
        <>
          <div className="flex items-center justify-between text-sm border-t border-zinc-200 dark:border-zinc-800 pt-3">
            <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-400">
              {selectedList && <span>{t('gear_weight')}: {formatWeight(gearWeight)}</span>}
              {selectedPlan && <span>{t('food_weight')}: {formatWeight(foodWeight)}</span>}
            </div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {t('combined_weight')}: {formatWeight(totalWeight)}
            </div>
          </div>
          {selectedList?.gpx_data && (
            <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
              <span>📏 {selectedList.gpx_data.distance_km} км</span>
              <span>⛰ +{selectedList.gpx_data.elevation_gain_m} м</span>
              {selectedList.gpx_data.max_elevation_m > 0 && <span>▲ {selectedList.gpx_data.max_elevation_m} м</span>}
            </div>
          )}
          {selectedList && selectedList.participants && selectedList.participants.length > 0 && (
            <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
              {selectedList.participants.map((p: any, i: number) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-[#75a93a]/10 text-[#75a93a]">{p.name}{p.weight_kg ? ` ${p.weight_kg}кг` : ''}</span>
              ))}
            </div>
          )}
          {selectedList && selectedPlan && (
            (() => {
              const gearTotal = selectedList.totalWeight || 0;
              const foodTotal = selectedPlan.totalWeight || 0;
              const groupTotal = gearTotal + foodTotal;
              const limitPct = getTerrainLimitPct(selectedList.gpx_data);
              const peopleCount = selectedList.participants?.length || 1;
              const maxPerPerson = selectedList.participants?.length
                ? calcGroupMax(selectedList.participants, selectedList.gpx_data)
                : 80 * 1000 * limitPct;
              const groupMax = maxPerPerson * peopleCount;
              const pct = groupMax > 0 ? Math.round((groupTotal / groupMax) * 100) : 0;
              return (
                <div className={`mt-3 p-2 rounded-lg text-xs flex items-center justify-between flex-wrap gap-2 ${bannerColor(pct)}`}>
                  <span>⚖ {formatWeight(gearTotal)} + {formatWeight(foodTotal)} = {formatWeight(groupTotal)}</span>
                  <span className="tabular-nums font-medium">≤ {formatWeight(groupMax)} ({pct}%)</span>
                </div>
              );
            })()
          )}
        </>
      ) : (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">{t('select_hint')}</p>
      )}
    </div>
  );
}
