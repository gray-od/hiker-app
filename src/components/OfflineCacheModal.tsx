'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { cacheMealPlan, cacheGearList, removeCachedMeal, removeCachedList, getCachedItems, clearAllCache, getCacheSize } from '@/lib/offline-cache';

interface OfflineCacheModalProps {
  open: boolean;
  onClose: () => void;
}

interface PlanItem { id: string; name: string }

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function OfflineCacheModal({ open, onClose }: OfflineCacheModalProps) {
  const t = useTranslations('common');
  const tMeals = useTranslations('meals');
  const tLists = useTranslations('lists');
  const [meals, setMeals] = useState<PlanItem[]>([]);
  const [lists, setLists] = useState<PlanItem[]>([]);
  const [cachedMealIds, setCachedMealIds] = useState<Set<string>>(new Set());
  const [cachedListIds, setCachedListIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const cached = getCachedItems();
    setCachedMealIds(new Set(cached.meals.map(m => m.id)));
    setCachedListIds(new Set(cached.lists.map(l => l.id)));
    setCacheSize(getCacheSize());
    setSelected(new Set());

    if (!navigator.onLine) {
      setMeals(cached.meals.map(m => ({ id: m.id, name: m.name })));
      setLists(cached.lists.map(l => ({ id: l.id, name: l.name })));
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const [{ data: mp }, { data: gl }] = await Promise.all([
        supabase.from('meal_plans').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('gear_lists').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setMeals((mp || []) as PlanItem[]);
      setLists((gl || []) as PlanItem[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open]);

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    for (const key of selected) {
      if (key.startsWith('meal_')) {
        await cacheMealPlan(key.replace('meal_', ''));
      } else if (key.startsWith('list_')) {
        await cacheGearList(key.replace('list_', ''));
      }
    }
    const cached = getCachedItems();
    setCachedMealIds(new Set(cached.meals.map(m => m.id)));
    setCachedListIds(new Set(cached.lists.map(l => l.id)));
    setCacheSize(getCacheSize());
    setSelected(new Set());
    setSaving(false);
  };

  const handleRemove = (type: 'meal' | 'list', id: string) => {
    if (type === 'meal') { removeCachedMeal(id); setCachedMealIds(prev => { const n = new Set(prev); n.delete(id); return n; }); }
    else { removeCachedList(id); setCachedListIds(prev => { const n = new Set(prev); n.delete(id); return n; }); }
    setCacheSize(getCacheSize());
  };

  const handleClearAll = () => {
    clearAllCache();
    setCachedMealIds(new Set());
    setCachedListIds(new Set());
    setCacheSize(getCacheSize());
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            📥 {t('offline_access')}
          </h3>
          <span className="text-xs text-zinc-400">{formatBytes(cacheSize)}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-zinc-200 border-t-[#75a93a] rounded-full animate-spin" />
          </div>
        ) : meals.length === 0 && lists.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">{t('no_items')}</p>
        ) : (
          <>
            {meals.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">{tMeals('title')}</h4>
                <div className="space-y-1">
                  {meals.map((m) => {
                    const isCached = cachedMealIds.has(m.id);
                    const isSelected = selected.has(`meal_${m.id}`);
                    return (
                      <div key={m.id} className="flex items-center gap-2 py-1.5">
                        {!isCached ? (
                          <button
                            onClick={() => toggleSelect(`meal_${m.id}`)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? 'bg-[#75a93a] border-[#75a93a]' : 'border-zinc-300 dark:border-zinc-600'
                            }`}
                          >
                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </button>
                        ) : (
                          <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-[#75a93a]">✓</span>
                        )}
                        <span className="text-sm text-zinc-900 dark:text-zinc-100 truncate flex-1">{m.name}</span>
                        {isCached && (
                          <button onClick={() => handleRemove('meal', m.id)} className="text-zinc-300 hover:text-red-400 transition-colors flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {lists.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">{tLists('title')}</h4>
                <div className="space-y-1">
                  {lists.map((l) => {
                    const isCached = cachedListIds.has(l.id);
                    const isSelected = selected.has(`list_${l.id}`);
                    return (
                      <div key={l.id} className="flex items-center gap-2 py-1.5">
                        {!isCached ? (
                          <button
                            onClick={() => toggleSelect(`list_${l.id}`)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? 'bg-[#75a93a] border-[#75a93a]' : 'border-zinc-300 dark:border-zinc-600'
                            }`}
                          >
                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </button>
                        ) : (
                          <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-[#75a93a]">✓</span>
                        )}
                        <span className="text-sm text-zinc-900 dark:text-zinc-100 truncate flex-1">{l.name}</span>
                        {isCached && (
                          <button onClick={() => handleRemove('list', l.id)} className="text-zinc-300 hover:text-red-400 transition-colors flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleClearAll}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            {t('clear_cache')}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              {t('cancel')}
            </button>
            {selected.size > 0 && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#75a93a] hover:bg-[#5d8a2e] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? '...' : t('save_selected')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
