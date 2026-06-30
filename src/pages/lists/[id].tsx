import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import { createClient } from '@/lib/supabase/client';
import { fetchUserListDetail, fetchListItems, fetchUserGear, fetchUserMealPlansLight } from '@/lib/supabase/service';
import type { GearList, GearItem, ListItemWithGear } from '@/lib/types';
import { formatWeight } from '@/lib/format';
import { fetchRouteWeather } from '@/lib/gpx-weather';
import { parseGpxFile } from '@/lib/gpx-parser';
import { calcWeight } from '@/lib/weight-calc';
import LoadingSpinner from '@/components/LoadingSpinner';
import WeightStatCard from '@/components/lists/WeightStatCard';
import GpxSection from '@/components/lists/GpxSection';
import AddItemsModal from '@/components/lists/AddItemsModal';
import EditListModal from '@/components/lists/EditListModal';
import DeleteListModal from '@/components/lists/DeleteListModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { toast } from '@/lib/toast';

export default function ListDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };
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
  const [gpxUploading, setGpxUploading] = useState(false);
  const [gpxError, setGpxError] = useState<string | null>(null);
  const [confirmRemoveItem, setConfirmRemoveItem] = useState<string | null>(null);
  const [confirmRemoveGpx, setConfirmRemoveGpx] = useState(false);
  const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set());
  const [deletingList, setDeletingList] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [removingGpx, setRemovingGpx] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mealPlans, setMealPlans] = useState<Array<{id:string; name:string; people_count:number; total_weight_g:number}>>([]);
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);

      const [listResult, itemsResult, gearResult, plansResult] = await Promise.all([
        fetchUserListDetail(id),
        fetchListItems(id),
        fetchUserGear(user.id),
        fetchUserMealPlansLight(user.id),
      ]);

      const { data: listData, error: listError } = listResult;
      const { data: itemsData, error: itemsError } = itemsResult;
      const { data: gearData, error: gearError } = gearResult;
      const { data: plansData, error: plansError } = plansResult;

      if (listError || !listData) {
        setError(listError?.message || 'List not found');
        setLoading(false);
        return;
      }

      setList(listData);

      if (itemsError) {
        console.error('Failed to load items:', itemsError);
      } else if (itemsData) {
        setListItems(itemsData);
      }

      if (gearError) {
        console.error('Failed to load gear:', gearError);
      } else if (gearData) {
        setAllGear(gearData);
      }

      if (plansError) {
        console.error('Failed to load meal plans:', plansError);
      } else if (plansData) {
        setMealPlans(plansData);
      }

      setLoading(false);
    }).catch((err) => {
      console.error('Failed to load list data:', err);
      setLoading(false);
      setError(tCommon('error_loading'));
    });
  }, [id, router]);

  const baseWeight = useMemo(() =>
    calcWeight(listItems.map(li => ({ quantity: li.quantity, weight_g: li.gear_item?.weight_g, worn: li.worn, consumable: li.consumable })), (li) => !li.worn && !li.consumable),
  [listItems]);

  const wornWeight = useMemo(() =>
    calcWeight(listItems.map(li => ({ quantity: li.quantity, weight_g: li.gear_item?.weight_g, worn: li.worn })), (li) => li.worn),
  [listItems]);

  const consumableWeight = useMemo(() =>
    calcWeight(listItems.map(li => ({ quantity: li.quantity, weight_g: li.gear_item?.weight_g, consumable: li.consumable })), (li) => li.consumable),
  [listItems]);

  const totalWeight = useMemo(() =>
    calcWeight(listItems.map(li => ({ quantity: li.quantity, weight_g: li.gear_item?.weight_g }))),
  [listItems]);

  const packedCount = useMemo(() =>
    listItems.filter(li => li.is_packed).length,
  [listItems]);

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
    try {
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
        toast.error(updateError.message);
        setSaving(false);
        return;
      }

      toast.success(t('updated'));
      setList(prev => prev ? { ...prev, name: editForm.name, season: editForm.season, trip_date: editForm.trip_date } : null);
      if (editForm.trip_date && list?.gpx_data?.points?.length && editForm.trip_date !== list.trip_date) {
        fetchRouteWeather(list.gpx_data.points[0][0], list.gpx_data.points[0][1], editForm.trip_date).then(weather => {
          if (weather) setList(prev => prev ? { ...prev, gpx_data: { ...prev.gpx_data, weather } as GearList['gpx_data'] } : null);
        }).catch(() => setError('Failed to load weather'));
      }
      setSaving(false);
      setEditModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update list';
      setError(msg);
      toast.error(msg);
      setSaving(false);
    }
  }

  async function handleDeleteList() {
    setDeletingList(true);
    try {
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('gear_lists')
        .delete()
        .eq('id', id);

      if (deleteError) {
        setError(deleteError.message);
        setDeletingList(false);
        return;
      }

      toast.success(t('deleted'));
      router.push('/lists');
    } catch (err) {
      toast.error(tCommon('error'));
      setError(err instanceof Error ? err.message : 'Failed to delete list');
      setDeletingList(false);
    }
  }

  async function handleTogglePacked(itemId: string) {
    setTogglingItems(prev => new Set(prev).add(itemId));
    try {
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
        toast.error(updateError.message);
        return;
      }

      setListItems(prev => prev.map(li => li.id === itemId ? { ...li, is_packed: newPacked } : li));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle packed';
      setError(msg);
      toast.error(msg);
    } finally {
      setTogglingItems(prev => { const next = new Set(prev); next.delete(itemId); return next });
    }
  }

  async function handleToggleWorn(itemId: string) {
    setTogglingItems(prev => new Set(prev).add(itemId));
    try {
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
        toast.error(updateError.message);
        return;
      }

      setListItems(prev => prev.map(li => li.id === itemId ? { ...li, ...updates } : li));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle worn';
      setError(msg);
      toast.error(msg);
    } finally {
      setTogglingItems(prev => { const next = new Set(prev); next.delete(itemId); return next });
    }
  }

  async function handleToggleConsumable(itemId: string) {
    setTogglingItems(prev => new Set(prev).add(itemId));
    try {
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
        toast.error(updateError.message);
        return;
      }

      setListItems(prev => prev.map(li => li.id === itemId ? { ...li, ...updates } : li));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle consumable';
      setError(msg);
      toast.error(msg);
    } finally {
      setTogglingItems(prev => { const next = new Set(prev); next.delete(itemId); return next });
    }
  }

  async function handleUpdateQuantity(itemId: string, delta: number) {
    try {
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
        toast.error(updateError.message);
        return;
      }

      setListItems(prev => prev.map(li => li.id === itemId ? { ...li, quantity: newQuantity } : li));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update quantity';
      setError(msg);
      toast.error(msg);
    }
  }

  async function handleSetQuantity(itemId: string, newQuantity: number) {
    try {
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
        toast.error(updateError.message);
        return;
      }

      setListItems(prev => prev.map(li => li.id === itemId ? { ...li, quantity: q } : li));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to set quantity';
      setError(msg);
      toast.error(msg);
    }
  }

  async function handleRemoveItem(itemId: string) {
    setRemovingItemId(itemId);
    try {
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('list_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) {
        setError(deleteError.message);
        toast.error(deleteError.message);
        return;
      }

      toast.success(t('removed'));
      setListItems(prev => prev.filter(li => li.id !== itemId));
      setConfirmRemoveItem(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove item';
      setError(msg);
      toast.error(msg);
    } finally {
      setRemovingItemId(null);
    }
  }

  async function handleAddItems() {
    setSaving(true);
    try {
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
        toast.error(tCommon('error'));
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add items';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const handleGpxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setGpxUploading(true);
    setGpxError(null);
    
    try {
      const result = await parseGpxFile(file);
      const supabase = createClient();

      const gpxData = {
        track_name: result.trackName,
        distance_km: result.distanceKm,
        elevation_gain_m: result.elevationGainM,
        elevation_loss_m: result.elevationLossM,
        max_elevation_m: result.maxElevationM,
        points: result.points,
        raw_file_base64: result.rawBase64,
        weather: null as string | null,
      };

      if (result.points.length > 0) {
        const weather = await fetchRouteWeather(result.points[0][0], result.points[0][1], list?.trip_date || undefined);
        gpxData.weather = weather;
      }

      const { error: updateError } = await supabase
        .from('gear_lists')
        .update({ gpx_data: gpxData })
        .eq('id', id);

      if (updateError) throw updateError;

      setList((prev) => prev ? { ...prev, gpx_data: gpxData } as GearList : null);
    } catch (err: any) {
      toast.error(tCommon('error'));
      setGpxError(err.message || 'Failed to parse GPX');
    } finally {
      setGpxUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleShowOnMap = () => {
    if (!list?.gpx_data?.points?.length) return;
    const [lat, lng] = list.gpx_data.points[0];
    window.open(`geo:${lat},${lng}`, '_blank');
  };

  const handleDownloadGpx = () => {
    if (!list?.gpx_data?.raw_file_base64) return;
    try {
      const binaryStr = atob(list.gpx_data.raw_file_base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/gpx+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${list.name || 'track'}.gpx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // GPX download failed — silently ignore (non-critical)
    }
  };

  const handleRemoveGpx = async () => {
    setRemovingGpx(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('gear_lists')
        .update({ gpx_data: null })
        .eq('id', id);
      if (error) {
        setError(error.message);
        toast.error(error.message);
        return;
      }
      toast.success(t('gpx_removed'));
      setList((prev) => prev ? { ...prev, gpx_data: null } as GearList : null);
      setConfirmRemoveGpx(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove GPX';
      setError(msg);
      toast.error(msg);
    } finally {
      setRemovingGpx(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-zinc-200 dark:border-zinc-700 border-t-[var(--color-brand)] rounded-full animate-spin" />
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
            className="mt-4 text-sm text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] font-medium"
          >
            {t('back_to_lists')}
          </button>
        </div>
      </div>
    );
  }

  const totalItems = listItems.length;

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <Head>
        <title>ProHikes — {list?.name ?? t('title')}</title>
      </Head>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center mb-2">
        <button
          onClick={() => router.push('/lists')}
          className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-[var(--color-brand)] transition-colors mr-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t('back_to_lists')}
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {list?.name ?? ''}
        </h1>
        <div className="flex items-center gap-1">
          <a
            href={`/lists/${id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-[var(--color-brand)] hover:bg-[var(--color-brand)]/10 rounded-lg transition-colors"
            title={tCommon('print')}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 7.131H5.25" />
            </svg>
          </a>
          <button
            onClick={openEditModal}
            className="p-2 text-zinc-400 hover:text-[var(--color-brand)] hover:bg-[var(--color-brand)]/10 rounded-lg transition-colors min-h-[44px]"
            title={tCommon('edit')}
            aria-label={tCommon('edit')}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors min-h-[44px]"
            title={tCommon('delete')}
            aria-label={tCommon('delete')}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <GpxSection
        list={list}
        gpxUploading={gpxUploading}
        gpxError={gpxError}
        t={t}
        tGear={tGear}
        onGpxUpload={handleGpxUpload}
        onShowOnMap={handleShowOnMap}
        onDownload={handleDownloadGpx}
        onRemove={() => setConfirmRemoveGpx(true)}
        fileInputRef={fileInputRef}
      />

      <WeightStatCard
        baseWeight={baseWeight}
        wornWeight={wornWeight}
        consumableWeight={consumableWeight}
        totalWeight={totalWeight}
        weightHint={weightHint}
        onHintChange={setWeightHint}
        t={t}
        tGear={tCommon}
      />

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{t('linked_meal_plan')}:</span>
          {(() => {
            const linkedPlan = list?.meal_plan_id ? mealPlans.find(mp => mp.id === list.meal_plan_id) : null;
            return (
              <>
                <select
                  value={list?.meal_plan_id || ''}
                  onChange={async (e) => {
                    const planId = e.target.value;
                    const prevId = list?.meal_plan_id || '';
                    try {
                      const supabase = createClient();
                      if (planId) {
                        const { error } = await supabase.from('gear_lists').update({ meal_plan_id: planId }).eq('id', list?.id ?? '');
                        if (error) throw error;
                        toast.success(t('linked'));
                      } else {
                        const { error } = await supabase.from('gear_lists').update({ meal_plan_id: null }).eq('id', list?.id ?? '');
                        if (error) throw error;
                      }
                      setList((prev) => prev ? { ...prev, meal_plan_id: planId || null } : null);
                    } catch {
                      e.target.value = prevId;
                      toast.error(tCommon('error'));
                    }
                  }}
                  className="text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-zinc-600 dark:text-zinc-400"
                >
                  <option value="">{t('no_meal_plan')}</option>
                  {mealPlans.map((mp) => (
                    <option key={mp.id} value={mp.id}>{mp.name}</option>
                  ))}
                </select>
                {linkedPlan && (
                  <span className="text-xs text-[var(--color-brand)]">
                    · {formatWeight(linkedPlan.total_weight_g / linkedPlan.people_count, tCommon)} {t('per_person')} · {t('total')} {formatWeight(linkedPlan.total_weight_g, tCommon)}
                  </span>
                )}
              </>
            );
          })()}
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
              className="bg-[var(--color-brand)] h-full rounded-full transition-all duration-300"
              style={{ width: totalItems > 0 ? `${(packedCount / totalItems) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={() => setAddItemsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
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
          <h2 className="text-base font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            {t('no_items')}
          </h2>
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
                    aria-label={t('packed')}
                    disabled={togglingItems.has(item.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                      item.is_packed
                        ? 'bg-[var(--color-brand)] border-[var(--color-brand)] text-white'
                        : 'border-zinc-300 dark:border-zinc-600'
                    } ${togglingItems.has(item.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {togglingItems.has(item.id) ? (
                      <LoadingSpinner size="sm" />
                    ) : item.is_packed ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : null}
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
                      {formatWeight((item.gear_item?.weight_g || 0) * item.quantity, tCommon)}
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
                    aria-label={t('quantity')}
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
                    aria-label={t('quantity')}
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => handleToggleWorn(item.id)}
                  disabled={togglingItems.has(item.id)}
                  className={`text-xs font-medium px-3 py-2 min-h-[44px] rounded-lg transition-colors ${
                    item.worn
                      ? 'bg-[#6db3ff]/20 text-[#2563eb] dark:bg-[#6db3ff]/10 dark:text-[#6db3ff]'
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  } ${togglingItems.has(item.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {togglingItems.has(item.id) ? <LoadingSpinner size="sm" /> : t('worn')}
                </button>

                <button
                  onClick={() => handleToggleConsumable(item.id)}
                  disabled={togglingItems.has(item.id)}
                  className={`text-xs font-medium px-3 py-2 min-h-[44px] rounded-lg transition-colors ${
                    item.consumable
                      ? 'bg-[#f5a623]/20 text-[#c2841a] dark:bg-[#f5a623]/10 dark:text-[#f5a623]'
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  } ${togglingItems.has(item.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {togglingItems.has(item.id) ? <LoadingSpinner size="sm" /> : t('consumable')}
                </button>

                <button
                  onClick={() => setConfirmRemoveItem(item.id)}
                  className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title={t('remove_item')}
                  aria-label={t('remove_item')}
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

      <EditListModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        editForm={editForm}
        saving={saving}
        onSave={handleUpdateList}
        onFieldChange={(field: string, value: string) => setEditForm(prev => ({ ...prev, [field]: value }))}
        t={t}
        tCommon={tCommon}
        tGear={tGear}
      />

      <AddItemsModal
        open={addItemsModalOpen}
        onClose={() => {
          setAddItemsModalOpen(false);
          setSelectedGearIds(new Set());
          setSearchQuery('');
        }}
        allGear={allGear}
        listItems={listItems}
        searchQuery={searchQuery}
        selectedGearIds={selectedGearIds}
        onToggleGearSelection={toggleGearSelection}
        onSearchChange={setSearchQuery}
        onAdd={handleAddItems}
        saving={saving}
        t={t}
        tCommon={tCommon}
        tGear={tGear}
      />

      <DeleteListModal
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDeleteList}
        title={t('delete_list')}
        message={t('delete_confirm')}
        loading={deletingList}
      />

      <ConfirmDeleteModal
        open={confirmRemoveItem !== null}
        onCancel={() => setConfirmRemoveItem(null)}
        onConfirm={() => {
          if (confirmRemoveItem) {
            handleRemoveItem(confirmRemoveItem);
          }
        }}
        title={t('confirm_delete_item')}
        message={t('confirm_delete_item_desc')}
        loading={removingItemId !== null}
      />

      <ConfirmDeleteModal
        open={confirmRemoveGpx}
        onCancel={() => setConfirmRemoveGpx(false)}
        onConfirm={() => {
          handleRemoveGpx();
        }}
        title={t('confirm_remove_gpx')}
        message={t('confirm_remove_gpx_desc')}
        loading={removingGpx}
      />
    </div>
  );
}
