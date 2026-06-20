'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { GearList, GearItem, ListItemWithGear } from '@/lib/types';

const SEASONS = ['summer', 'winter', 'demi'] as const;

export default function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations('lists');
  const tCommon = useTranslations('common');
  const tGear = useTranslations('gear');

  const [list, setList] = useState<GearList | null>(null);
  const [listItems, setListItems] = useState<ListItemWithGear[]>([]);
  const [allGear, setAllGear] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addItemsModalOpen, setAddItemsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', season: 'summer', trip_date: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGearIds, setSelectedGearIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weightHint, setWeightHint] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);

      const { data: listData, error: listError } = await supabase
        .from('gear_lists')
        .select('*')
        .eq('id', id)
        .single();

      if (listError || !listData) {
        setError(listError?.message || 'List not found');
        setLoading(false);
        return;
      }

      setList(listData as GearList);

      const { data: itemsData } = await supabase
        .from('list_items')
        .select('*, gear_item:gear_items(*)')
        .eq('list_id', id);

      if (itemsData) {
        setListItems(itemsData as ListItemWithGear[]);
      }

      const { data: gearData } = await supabase
        .from('gear_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (gearData) {
        setAllGear(gearData as GearItem[]);
      }

      setLoading(false);
    });
  }, [id, router]);

  function formatWeight(grams: number): string {
    if (grams >= 1000) return `${(grams / 1000).toFixed(2)} ${tCommon('weight_kg')}`;
    return `${grams} ${tCommon('weight_g')}`;
  }

  function calcBaseWeight(): number {
    return listItems.reduce((sum, li) => {
      if (li.worn || li.consumable) return sum;
      return sum + (li.gear_item?.weight_g || 0) * li.quantity;
    }, 0);
  }

  function calcWornWeight(): number {
    return listItems.reduce((sum, li) => {
      if (!li.worn) return sum;
      return sum + (li.gear_item?.weight_g || 0) * li.quantity;
    }, 0);
  }

  function calcConsumableWeight(): number {
    return listItems.reduce((sum, li) => {
      if (!li.consumable) return sum;
      return sum + (li.gear_item?.weight_g || 0) * li.quantity;
    }, 0);
  }

  function calcTotalWeight(): number {
    return listItems.reduce((sum, li) => sum + (li.gear_item?.weight_g || 0) * li.quantity, 0);
  }

  function calcPackedCount(): number {
    return listItems.filter(li => li.is_packed).length;
  }

  function getSeasonBadgeClass(season: string): string {
    if (season === 'summer') return 'bg-[#ffec6d]/20 text-[#b8960f] dark:bg-[#ffec6d]/10 dark:text-[#ffec6d]';
    if (season === 'winter') return 'bg-[#6db3ff]/20 text-[#2563eb] dark:bg-[#6db3ff]/10 dark:text-[#6db3ff]';
    return 'bg-[#f5a623]/20 text-[#c2841a] dark:bg-[#f5a623]/10 dark:text-[#f5a623]';
  }

  function openEditModal() {
    if (!list) return;
    setEditForm({
      name: list.name,
      season: list.season,
      trip_date: list.trip_date || '',
    });
    setEditModalOpen(true);
  }

  async function handleUpdateList() {
    const supabase = createClient();

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('gear_lists')
      .update({
        name: editForm.name,
        season: editForm.season,
        trip_date: editForm.trip_date || null,
      })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setList(prev => prev ? { ...prev, name: editForm.name, season: editForm.season, trip_date: editForm.trip_date } : null);
    setSaving(false);
    setEditModalOpen(false);
  }

  async function handleDeleteList() {
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('gear_lists')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    router.push('/lists');
  }

  async function handleTogglePacked(itemId: string) {
    const supabase = createClient();
    const item = listItems.find(li => li.id === itemId);
    if (!item) return;

    const newPacked = !item.is_packed;

    const { error: updateError } = await supabase
      .from('list_items')
      .update({ is_packed: newPacked })
      .eq('id', itemId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setListItems(prev => prev.map(li => li.id === itemId ? { ...li, is_packed: newPacked } : li));
  }

  async function handleToggleWorn(itemId: string) {
    const supabase = createClient();
    const item = listItems.find(li => li.id === itemId);
    if (!item) return;

    const newWorn = !item.worn;
    const updates: Record<string, boolean> = { worn: newWorn };
    if (newWorn) {
      updates.consumable = false;
    }

    const { error: updateError } = await supabase
      .from('list_items')
      .update(updates)
      .eq('id', itemId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setListItems(prev => prev.map(li => li.id === itemId ? { ...li, ...updates } : li));
  }

  async function handleToggleConsumable(itemId: string) {
    const supabase = createClient();
    const item = listItems.find(li => li.id === itemId);
    if (!item) return;

    const newConsumable = !item.consumable;
    const updates: Record<string, boolean> = { consumable: newConsumable };
    if (newConsumable) {
      updates.worn = false;
    }

    const { error: updateError } = await supabase
      .from('list_items')
      .update(updates)
      .eq('id', itemId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setListItems(prev => prev.map(li => li.id === itemId ? { ...li, ...updates } : li));
  }

  async function handleUpdateQuantity(itemId: string, delta: number) {
    const supabase = createClient();
    const item = listItems.find(li => li.id === itemId);
    if (!item) return;

    const newQuantity = Math.max(1, item.quantity + delta);
    if (newQuantity === item.quantity) return;

    const { error: updateError } = await supabase
      .from('list_items')
      .update({ quantity: newQuantity })
      .eq('id', itemId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setListItems(prev => prev.map(li => li.id === itemId ? { ...li, quantity: newQuantity } : li));
  }

  async function handleSetQuantity(itemId: string, newQuantity: number) {
    const supabase = createClient();
    const q = Math.max(1, newQuantity);
    const item = listItems.find(li => li.id === itemId);
    if (!item || q === item.quantity) return;

    const { error: updateError } = await supabase
      .from('list_items')
      .update({ quantity: q })
      .eq('id', itemId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setListItems(prev => prev.map(li => li.id === itemId ? { ...li, quantity: q } : li));
  }

  async function handleRemoveItem(itemId: string) {
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('list_items')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setListItems(prev => prev.filter(li => li.id !== itemId));
  }

  async function handleAddItems() {
    if (selectedGearIds.size === 0) return;
    const supabase = createClient();

    const inserts = Array.from(selectedGearIds).map(gearItemId => ({
      list_id: id,
      gear_item_id: gearItemId,
      quantity: 1,
      is_packed: false,
      worn: false,
      consumable: false,
    }));

    const { error: insertError } = await supabase
      .from('list_items')
      .insert(inserts);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setAddItemsModalOpen(false);
    setSelectedGearIds(new Set());
    setSearchQuery('');

    const { data: itemsData } = await supabase
      .from('list_items')
      .select('*, gear_item:gear_items(*)')
      .eq('list_id', id);

    if (itemsData) {
      setListItems(itemsData as ListItemWithGear[]);
    }
  }

  function toggleGearSelection(gearId: string) {
    setSelectedGearIds(prev => {
      const next = new Set(prev);
      if (next.has(gearId)) {
        next.delete(gearId);
      } else {
        next.add(gearId);
      }
      return next;
    });
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-zinc-200 dark:border-zinc-700 border-t-[#75a93a] rounded-full animate-spin" />
      </div>
    );
  }

  if (!list && !loading) {
    return (
      <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <h3 className="text-base font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            {error || tCommon('empty')}
          </h3>
          <button
            onClick={() => router.push('/lists')}
            className="mt-4 text-sm text-[#75a93a] hover:text-[#5d8a2e] font-medium"
          >
            {t('back_to_lists')}
          </button>
        </div>
      </div>
    );
  }

  const packedCount = calcPackedCount();
  const totalItems = listItems.length;

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center mb-2">
        <button
          onClick={() => router.push('/lists')}
          className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-[#75a93a] transition-colors mr-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t('back_to_lists')}
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {list!.name}
        </h1>
        <div className="flex items-center gap-1">
          <a
            href={`/lists/${id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-[#75a93a] hover:bg-[#75a93a]/10 rounded-lg transition-colors"
            title={tCommon('print')}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 7.131H5.25" />
            </svg>
          </a>
          <button
            onClick={openEditModal}
            className="p-2 text-zinc-400 hover:text-[#75a93a] hover:bg-[#75a93a]/10 rounded-lg transition-colors"
            title={tCommon('edit')}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title={tCommon('delete')}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getSeasonBadgeClass(list!.season)}`}>
          {tGear(`season.${list!.season}`)}
        </span>
        {list!.trip_date && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {formatDate(list!.trip_date)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
            {t('base_weight')}
            <button onClick={() => setWeightHint(weightHint === 'base' ? null : 'base')} className="text-zinc-400 hover:text-[#75a93a] transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            </button>
          </div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{formatWeight(calcBaseWeight())}</div>
          {weightHint === 'base' && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{t('base_weight_hint')}</div>
          )}
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
            {t('worn_weight')}
            <button onClick={() => setWeightHint(weightHint === 'worn' ? null : 'worn')} className="text-zinc-400 hover:text-[#75a93a] transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            </button>
          </div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{formatWeight(calcWornWeight())}</div>
          {weightHint === 'worn' && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{t('worn_weight_hint')}</div>
          )}
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
            {t('consumable_weight')}
            <button onClick={() => setWeightHint(weightHint === 'consumable' ? null : 'consumable')} className="text-zinc-400 hover:text-[#75a93a] transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            </button>
          </div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{formatWeight(calcConsumableWeight())}</div>
          {weightHint === 'consumable' && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{t('consumable_weight_hint')}</div>
          )}
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t('total_weight')}</div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{formatWeight(calcTotalWeight())}</div>
        </div>
      </div>

      {totalItems > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t('packing_progress')}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400 tabular-nums">
              {packedCount} / {totalItems}
            </span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#75a93a] h-full rounded-full transition-all duration-300"
              style={{ width: totalItems > 0 ? `${(packedCount / totalItems) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={() => setAddItemsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#75a93a] hover:bg-[#5d8a2e] text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t('add_items')}
        </button>
      </div>

      {listItems.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <h3 className="text-base font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            {t('no_items')}
          </h3>
        </div>
      )}

      {listItems.length > 0 && (
        <div className="space-y-2">
          {listItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <button
                    onClick={() => handleTogglePacked(item.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                      item.is_packed
                        ? 'bg-[#75a93a] border-[#75a93a] text-white'
                        : 'border-zinc-300 dark:border-zinc-600'
                    }`}
                  >
                    {item.is_packed && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${item.is_packed ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                    {item.gear_item ? item.gear_item.name : t('deleted_item')}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.gear_item && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {tGear(`categories.${item.gear_item.category}`)}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                      {formatWeight((item.gear_item?.weight_g || 0) * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 ml-8 flex-wrap">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleUpdateQuantity(item.id, -1)}
                    disabled={item.quantity <= 1}
                    className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => handleSetQuantity(item.id, parseInt(e.target.value) || 1)}
                    className="w-10 text-center text-sm font-medium text-zinc-900 dark:text-zinc-100 bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => handleUpdateQuantity(item.id, 1)}
                    className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm font-medium"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => handleToggleWorn(item.id)}
                  className={`text-xs font-medium px-3 py-2 min-h-[44px] rounded-lg transition-colors ${
                    item.worn
                      ? 'bg-[#6db3ff]/20 text-[#2563eb] dark:bg-[#6db3ff]/10 dark:text-[#6db3ff]'
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {t('worn')}
                </button>

                <button
                  onClick={() => handleToggleConsumable(item.id)}
                  className={`text-xs font-medium px-3 py-2 min-h-[44px] rounded-lg transition-colors ${
                    item.consumable
                      ? 'bg-[#f5a623]/20 text-[#c2841a] dark:bg-[#f5a623]/10 dark:text-[#f5a623]'
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {t('consumable')}
                </button>

                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title={t('remove_item')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                {t('edit_list')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('name')}
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('season')}
                  </label>
                  <select
                    value={editForm.season}
                    onChange={(e) => setEditForm(prev => ({ ...prev, season: e.target.value }))}
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
                    value={editForm.trip_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, trip_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={handleUpdateList}
                  disabled={saving || !editForm.name.trim()}
                  className="px-4 py-2 bg-[#75a93a] hover:bg-[#5d8a2e] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed"
                >
                  {saving ? tCommon('loading') : tCommon('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {addItemsModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {t('select_items')}
              </h2>
            </div>

            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_gear')}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {allGear.length === 0 && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                  {t('no_gear_hint')}
                </p>
              )}

              {allGear.length > 0 && (() => {
                const listItemGearIds = new Set(listItems.map(li => li.gear_item_id));
                const filteredGear = allGear.filter(g =>
                  g.name.toLowerCase().includes(searchQuery.toLowerCase())
                );
                const availableGear = filteredGear.filter(g => !listItemGearIds.has(g.id));

                if (filteredGear.length === 0) {
                  return (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                      {tCommon('empty')}
                    </p>
                  );
                }

                if (availableGear.length === 0 && filteredGear.length > 0) {
                  return (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                      {t('all_added')}
                    </p>
                  );
                }

                return availableGear.map((gear) => (
                  <label
                    key={gear.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGearIds.has(gear.id)}
                      onChange={() => toggleGearSelection(gear.id)}
                      className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-[#75a93a] focus:ring-[#75a93a]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {gear.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                          {tGear(`categories.${gear.category}`)}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                          {formatWeight(gear.weight_g)}
                        </span>
                      </div>
                    </div>
                  </label>
                ));
              })()}
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {selectedGearIds.size > 0
                  ? `${tCommon('add')}: ${selectedGearIds.size}`
                  : ''}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setAddItemsModalOpen(false);
                    setSelectedGearIds(new Set());
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={handleAddItems}
                  disabled={selectedGearIds.size === 0}
                  className="px-4 py-2 bg-[#75a93a] hover:bg-[#5d8a2e] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed"
                >
                  {tCommon('add')}
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
              {t('delete_list')}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              {t('delete_confirm')}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={handleDeleteList}
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
