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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('trip_weight_selection');
      if (saved) {
        const { listId } = JSON.parse(saved);
        if (listId) setSelectedListId(listId);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('trip_weight_selection', JSON.stringify({ listId: selectedListId }));
  }, [selectedListId, mounted]);

  const selectedList = lists.find(l => l.id === selectedListId);
  const linkedPlan = plans.find(p => p.id === selectedList?.meal_plan_id);
  const gearWeight = selectedList?.totalWeight || 0;
  const foodWeight = linkedPlan?.totalWeight || 0;
  const totalWeight = gearWeight + foodWeight;

  if (lists.length === 0 && plans.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">{t('trip_weight')}</h3>

      <div className="mb-4">
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

      {selectedList && (
        <div className="mb-4">
          {(() => {
            const linkedPlan = selectedList.meal_plan_id ? plans.find(p => p.id === selectedList.meal_plan_id) : null;
            return (
              <>
                {linkedPlan ? (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                    <span>{t('food_weight')}:</span>
                    <span className="text-[#75a93a]">{linkedPlan.name}</span>
                    <span>· {formatWeight(linkedPlan.totalWeight)} · {linkedPlan.people_count} ос</span>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-400 dark:text-zinc-500">
                    <span>{t('food_weight')}: {t('no_meal_plan')}</span>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {selectedList && (
        <>
          <div className="flex items-center justify-between text-sm border-t border-zinc-200 dark:border-zinc-800 pt-3">
            <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-400">
              <span>{t('gear_weight')}: {formatWeight(gearWeight)}</span>
              {(() => {
                const lp = selectedList.meal_plan_id ? plans.find(p => p.id === selectedList.meal_plan_id) : null;
                return lp ? <span>{t('food_weight')}: {formatWeight(lp.totalWeight)}</span> : null;
              })()}
            </div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {t('combined_weight')}: {formatWeight(totalWeight)}
            </div>
          </div>
          {selectedList?.gpx_data && (
            <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="2.5" cy="8" r="1.5"/><line x1="4" y1="8" x2="12" y2="8"/><circle cx="13.5" cy="8" r="1.5"/></svg>
                {selectedList.gpx_data.distance_km} км
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3,11 8,5"/><line x1="8" y1="5" x2="8" y2="14"/></svg>
                +{selectedList.gpx_data.elevation_gain_m} м
              </span>
              {selectedList.gpx_data.max_elevation_m > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="8,2 14,12 2,12"/></svg>
                  {selectedList.gpx_data.max_elevation_m} м
                </span>
              )}
            </div>
          )}
          {selectedList && selectedList.participants && selectedList.participants.length > 0 && (
            <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
              {selectedList.participants.map((p: any, i: number) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-[#75a93a]/10 text-[#75a93a]">{p.name}{p.weight_kg ? ` ${p.weight_kg}кг` : ''}</span>
              ))}
            </div>
          )}
          {selectedList && (() => {
            const lp = selectedList.meal_plan_id ? plans.find(p => p.id === selectedList.meal_plan_id) : null;
            if (!lp) return null;
            const gearTotal = selectedList.totalWeight || 0;
            const foodTotal = lp.totalWeight || 0;
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
          })()}
        </>
      )}
    </div>
  );
}
