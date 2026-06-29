'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { GearList } from '@/lib/types';
import { formatDate, formatWeight } from '@/lib/format';

const SEASONS = ['summer', 'winter', 'demi'] as const;

type ListItemRaw = {
  id: string;
  quantity: number;
  is_packed: boolean;
  worn: boolean;
  consumable: boolean;
  gear_item: { weight_g: number } | null;
};

type GearListWithItems = GearList & { list_items: ListItemRaw[] };

const EMPTY_FORM = {
  name: '',
  season: 'summer' as (typeof SEASONS)[number],
  trip_date: '',
  meal_plan_id: '',
};

const SEASON_COLORS: Record<string, { light: string; dark: string }> = {
  summer: { light: 'bg-[#ffec6d]/20 text-[#b8960f]', dark: 'dark:bg-[#ffec6d]/10 dark:text-[#ffec6d]' },
  winter: { light: 'bg-[#6db3ff]/20 text-[#2563eb]', dark: 'dark:bg-[#6db3ff]/10 dark:text-[#6db3ff]' },
  demi: { light: 'bg-[#f5a623]/20 text-[#c2841a]', dark: 'dark:bg-[#f5a623]/10 dark:text-[#f5a623]' },
};

export default function ListsPage() {
  const router = useRouter();
  const t = useTranslations('lists');
  const tCommon = useTranslations('common');
  const tGear = useTranslations('gear');

  const [lists, setLists] = useState<GearListWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mealPlans, setMealPlans] = useState<Array<{id:string; name:string; people_count:number; total_weight_g:number}>>([]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);

      supabase
        .from('gear_lists')
        .select('*, list_items(id, quantity, is_packed, worn, consumable, gear_item:gear_items(weight_g))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            setLists(data as unknown as GearListWithItems[]);
          }
          setLoading(false);
        });

      supabase
        .from('meal_plans')
        .select('id, name, people_count, total_weight_g')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setMealPlans(data);
        });
    });
  }, [router]);

  function getItemsCount(list: GearListWithItems): number {
    return list.list_items?.length ?? 0;
  }

  function getPackedCount(list: GearListWithItems): number {
    return (list.list_items ?? []).filter((li) => li.is_packed).length;
  }

  function getPackingProgress(list: GearListWithItems): number {
    const total = getItemsCount(list);
    if (total === 0) return 0;
    return Math.round((getPackedCount(list) / total) * 100);
  }

  async function fetchLists() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('gear_lists')
      .select('*, list_items(id, quantity, is_packed, worn, consumable, gear_item:gear_items(weight_g))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLists(data as unknown as GearListWithItems[]);
    }
  }

  async function handleCreate() {
    try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    setSaving(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('gear_lists')
      .insert({
        user_id: user.id,
        name: formData.name,
        season: formData.season,
        trip_date: formData.trip_date || null,
        meal_plan_id: formData.meal_plan_id || null,
      })
      .select('*, list_items(id, quantity, is_packed, worn, consumable, gear_item:gear_items(weight_g))')
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    if (data) {
      setLists((prev) => [data as unknown as GearListWithItems, ...prev]);
    }

    setSaving(false);
    setModalOpen(false);
    setFormData(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  }

  async function handleDelete(id: string) {
    try {
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('gear_lists')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      setConfirmDelete(null);
      return;
    }

    setLists((prev) => prev.filter((l) => l.id !== id));
    setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  }

  function handleFormChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function openCreateModal() {
    setFormData(EMPTY_FORM);
    setModalOpen(true);
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {t('title')}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t('subtitle')}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#75a93a] hover:bg-[#5d8a2e] text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t('add')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-zinc-200 dark:border-zinc-700 border-t-[#75a93a] rounded-full animate-spin" />
        </div>
      )}

      {!loading && lists.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <svg
            className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <h3 className="text-base font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            {t('empty')}
          </h3>
        </div>
      )}

      {!loading && lists.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lists.map((list) => {
            const totalWeight = (list.list_items ?? []).reduce((sum, li) => sum + (li.gear_item?.weight_g ?? 0) * li.quantity, 0);
            const itemsCount = getItemsCount(list);
            const progress = getPackingProgress(list);

            return (
              <div
                key={list.id}
                onClick={() => router.push(`/lists/${list.id}`)}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:border-[#75a93a]/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100 pr-2">
                    {list.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(list.id);
                    }}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                    title={tCommon('delete')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${SEASON_COLORS[list.season]?.light ?? ''} ${SEASON_COLORS[list.season]?.dark ?? ''}`}
                  >
                    {tGear(`season.${list.season}`)}
                  </span>
                  {list.trip_date && (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {formatDate(list.trip_date)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                  <span>
                    {itemsCount} {t('items')}
                  </span>
                  <span>
                    {formatWeight(totalWeight, tCommon)}
                  </span>
                </div>

                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#75a93a] h-full rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                {t('add')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('name')}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    required
                    maxLength={200}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                    placeholder={t('name')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {tGear('season_label')}
                  </label>
                  <select
                    value={formData.season}
                    onChange={(e) => handleFormChange('season', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                  >
                    {SEASONS.map((s) => (
                      <option key={s} value={s}>
                        {tGear(`season.${s}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('trip_date')}
                  </label>
                  <input
                    type="date"
                    value={formData.trip_date}
                    onChange={(e) => handleFormChange('trip_date', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('linked_meal_plan')}
                  </label>
                  <select
                    value={formData.meal_plan_id || ''}
                    onChange={(e) => handleFormChange('meal_plan_id', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                  >
                    <option value="">{t('no_meal_plan')}</option>
                    {mealPlans.map((mp) => (
                      <option key={mp.id} value={mp.id}>{mp.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => { setModalOpen(false); setFormData(EMPTY_FORM); }}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving || !formData.name.trim()}
                  className="px-4 py-2 bg-[#75a93a] hover:bg-[#5d8a2e] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed"
                >
                  {saving ? tCommon('loading') : tCommon('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {tCommon('delete')}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              {t('delete_confirm')}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
              >
                {tCommon('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
