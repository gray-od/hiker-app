import { useEffect, useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { resolveUser } from '@/lib/supabase/resolveUser';
import {
  addMealDays,
  addMealEntries,
  deleteMealDay,
  deleteMealEntry,
  deleteMealPlan,
  fetchMealPlanDetail,
  fetchUserFoodItems,
  updateMealDay,
  updateMealEntry,
  updateMealPlan,
} from '@/lib/supabase/service';
import type { MealPlan, MealEntry, MealDayWithEntries, UserFoodItem } from '@/lib/types';
import type { MealPlanLight } from '@/lib/supabase/service';
import { FOOD_CATALOG, FOOD_CATEGORY_NAMES, calculateNutrition } from '@/lib/food-catalog';
import type { FoodItem, FoodCategory } from '@/lib/food-catalog';
import { type PlanTypeId, getPlanType } from '@/lib/hiking-standards';
import { getMealTemplate, getMealTemplateByPlanType } from '@/lib/meal-templates';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { toast } from '@/lib/toast';
import { invalidateCache, cacheKeys, getCached, setCache, removeCache } from '@/lib/cache';
import StatsCards from '@/components/meals/StatsCards';
import PlanHeader from '@/components/meals/PlanHeader';
import DayCard from '@/components/meals/DayCard';
import EntryModal from '@/components/meals/EntryModal';
import EditPlanModal from '@/components/meals/EditPlanModal';
import TemplateModal from '@/components/meals/TemplateModal';

// Shape of the /meals list snapshot in IndexedDB (written by fetchUserMealPlans).
type MealPlanWithDays = MealPlan & {
  meal_days: { total_calories: number; total_weight_g: number }[];
};

export default function MealPlanDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const t = useTranslations('meals');
  const tCommon = useTranslations('common');

  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [days, setDays] = useState<MealDayWithEntries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState<{
    meal_type: MealEntry['meal_type'];
    name: string;
    weight_g: number;
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  }>({
    meal_type: 'breakfast',
    name: '',
    weight_g: 0,
    calories: 0,
    protein_g: 0,
    fat_g: 0,
    carbs_g: 0,
  });
  const [editPlanModalOpen, setEditPlanModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    plan_type: 'standard',
    people_count: 1,
    target_calories: 3000,
    target_weight_g: 650,
  });
  const [confirmDeletePlan, setConfirmDeletePlan] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<string | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [confirmRemoveDay, setConfirmRemoveDay] = useState(false);
  const [removingDay, setRemovingDay] = useState(false);
  const [confirmTemplate, setConfirmTemplate] = useState<string | null>(null);
  const [confirmTypeChange, setConfirmTypeChange] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addingDay, setAddingDay] = useState(false);
  const addingDayRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const [locale, setLocale] = useState<'uk' | 'ru' | 'en'>('uk');
  const [entryMode, setEntryMode] = useState<'catalog' | 'my_products' | 'custom'>('catalog');
  const [selectedProduct, setSelectedProduct] = useState<FoodItem | null>(null);
  const [portionG, setPortionG] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<FoodCategory | ''>('');
  const [productSearch, setProductSearch] = useState('');
  const [userFoodItems, setUserFoodItems] = useState<UserFoodItem[]>([]);
  const [selectedUserProduct, setSelectedUserProduct] = useState<UserFoodItem | null>(null);

  useEffect(() => {
    const match = document.cookie.match(/NEXT_LOCALE=(\w+)/);
    if (match && ['uk', 'ru', 'en'].includes(match[1])) setLocale(match[1] as 'uk' | 'ru' | 'en');
  }, []);

  useEffect(() => {
    if (!router.isReady || typeof id !== 'string') return;

    resolveUser().then(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      userIdRef.current = user.id;
      setLoading(true);

      const [planResult, foodResult] = await Promise.all([
        fetchMealPlanDetail(user.id, id),
        fetchUserFoodItems(user.id),
      ]);
      const { data: planData, error: planError } = planResult;
      const { data: userFoodData, error: foodError } = foodResult;

      if (planError || !planData) {
        console.error('Failed to load meal plan:', planError ?? 'no plan data');
        setError(t('plan_not_found'));
        setLoading(false);
        return;
      }

      setPlan(planData.plan);
      setDays(planData.days);

      if (foodError) {
        console.error('Failed to load food items:', foodError);
      } else if (userFoodData) {
        setUserFoodItems(userFoodData);
      }

      setLoading(false);
    }).catch((err) => {
      console.error('Failed to load meal plan:', err);
      setLoading(false);
      setError(tCommon('error_loading'));
    });
  }, [id, router]);

  async function recalculateTotals(): Promise<boolean> {
    const supabase = createClient();

    // supabase-js resolves PostgREST failures as `{ error }` instead of throwing, so each
    // statement is checked explicitly; the boolean lets callers gate their success toasts.
    const failTotals = (step: string, table: string, message: string): false => {
      console.error('Recalculate totals:', step, 'failed on', table, '-', message);
      toast.error(tCommon('error_occurred'));
      return false;
    };

    try {
      const { data: currentDays, error: daysReadError } = await supabase
        .from('meal_days')
        .select('*, meal_entries(*)')
        .eq('plan_id', id)
        .order('day_number');

      if (daysReadError || !currentDays) {
        return failTotals('select meal_days', 'meal_days', daysReadError?.message ?? 'no rows returned');
      }

      const typedDays = currentDays as MealDayWithEntries[];

      for (const day of typedDays) {
        const entries = day.meal_entries || [];
        const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);
        const totalWeight = entries.reduce((sum, e) => sum + e.weight_g, 0);
        const { error: dayUpdateError } = await supabase
          .from('meal_days')
          .update({ total_calories: totalCalories, total_weight_g: totalWeight })
          .eq('id', day.id);

        if (dayUpdateError) {
          return failTotals(`update meal_days totals (day ${day.day_number})`, 'meal_days', dayUpdateError.message);
        }

        day.total_calories = totalCalories;
        day.total_weight_g = totalWeight;
      }

      const planTotalWeight = typedDays.reduce((sum, d) => sum + d.total_weight_g, 0);
      const planDaysCount = typedDays.length;

      const { error: planUpdateError } = await supabase
        .from('meal_plans')
        .update({ total_weight_g: planTotalWeight, days_count: planDaysCount })
        .eq('id', id);

      if (planUpdateError) {
        return failTotals('update meal_plans totals', 'meal_plans', planUpdateError.message);
      }

      setDays(typedDays);
      setPlan(prev => prev ? { ...prev, total_weight_g: planTotalWeight, days_count: planDaysCount } : null);
      return true;
    } catch (err) {
      console.error('Recalculate totals: unexpected failure -', err);
      toast.error(tCommon('error_occurred'));
      return false;
    }
  }

  /**
   * A queued write leaves the cache-first reads on the pre-write snapshot, so an offline
   * reload would drop what the user just did. The local outcome is stored under the same
   * keys those reads use; the plan list and the linked-plan select are patched in place
   * so their other rows survive.
   */
  async function cachePlanOutcome(userId: string, nextPlan: MealPlan, nextDays: MealDayWithEntries[]) {
    await setCache(cacheKeys.mealPlanDetail(userId, id), { plan: nextPlan, days: nextDays });

    const cards = await getCached<MealPlanWithDays[]>(cacheKeys.mealPlans(userId));
    if (cards) {
      await setCache(
        cacheKeys.mealPlans(userId),
        cards.map((card) => card.id === nextPlan.id
          ? {
              ...card,
              ...nextPlan,
              meal_days: nextDays.map((day) => ({
                total_calories: day.total_calories,
                total_weight_g: day.total_weight_g,
              })),
            }
          : card),
      );
    }

    const light = await getCached<MealPlanLight[]>(cacheKeys.mealPlansLight(userId));
    if (light) {
      await setCache(
        cacheKeys.mealPlansLight(userId),
        light.map((entry) => entry.id === nextPlan.id
          ? {
              id: nextPlan.id,
              name: nextPlan.name,
              people_count: nextPlan.people_count,
              total_weight_g: nextPlan.total_weight_g,
            }
          : entry),
      );
    }
  }

  /** A queued delete keeps the deleted plan readable offline — drop what it leaves behind. */
  async function cachePlanDeletion(userId: string) {
    await removeCache(cacheKeys.mealPlanDetail(userId, id));

    const cards = await getCached<MealPlanWithDays[]>(cacheKeys.mealPlans(userId));
    if (cards) {
      await setCache(cacheKeys.mealPlans(userId), cards.filter((card) => card.id !== id));
    }

    const light = await getCached<MealPlanLight[]>(cacheKeys.mealPlansLight(userId));
    if (light) {
      await setCache(cacheKeys.mealPlansLight(userId), light.filter((entry) => entry.id !== id));
    }
  }

  /**
   * Offline counterpart of recalculateTotals: the server cannot be read while the write
   * sits in the queue, so the totals are computed from the local rows and enqueued after
   * them (FIFO keeps the replay order). Only the days whose entries changed get a day
   * update; the plan row always follows. `planPatch` carries field edits the caller has
   * applied to local state but that this closure's `plan` value still lacks.
   */
  async function persistTotalsOffline(
    nextDays: MealDayWithEntries[],
    changedDayIds: string[],
    planPatch?: Partial<MealPlan>,
  ) {
    const userId = userIdRef.current;
    if (!userId) return;

    const changed = new Set(changedDayIds);
    for (const day of nextDays) {
      if (!changed.has(day.id)) continue;
      const entries = day.meal_entries || [];
      day.total_calories = entries.reduce((sum, e) => sum + e.calories, 0);
      day.total_weight_g = entries.reduce((sum, e) => sum + e.weight_g, 0);
      const { error, queued } = await updateMealDay(day.id, userId, id, {
        total_calories: day.total_calories,
        total_weight_g: day.total_weight_g,
      });
      if (error && !queued) {
        console.error('Persist totals offline: update meal_days totals (day', day.day_number, ') failed -', error.message);
      }
    }

    const planTotalWeight = nextDays.reduce((sum, d) => sum + d.total_weight_g, 0);
    const { error: planError, queued: planQueued } = await updateMealPlan(id, userId, {
      total_weight_g: planTotalWeight,
      days_count: nextDays.length,
    });
    if (planError && !planQueued) {
      console.error('Persist totals offline: update meal_plans totals failed -', planError.message);
    }

    setDays(nextDays);
    const nextPlan = plan
      ? { ...plan, ...planPatch, total_weight_g: planTotalWeight, days_count: nextDays.length }
      : null;
    setPlan(nextPlan);
    if (nextPlan) {
      await cachePlanOutcome(userId, nextPlan, nextDays);
    }
  }

  function toggleDay(dayNumber: number) {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayNumber)) {
        next.delete(dayNumber);
      } else {
        next.add(dayNumber);
      }
      return next;
    });
  }

  function selectProduct(product: FoodItem) {
    setSelectedProduct(product);
    const pt = (plan?.plan_type || 'standard') as PlanTypeId;
    const basePortion = product.defaultPortion[pt] ?? product.defaultPortion.standard;
    setPortionG(basePortion * (plan?.people_count || 1));
  }

  function selectUserProduct(product: UserFoodItem) {
    setSelectedUserProduct(product);
    setPortionG(product.default_portion_g * (plan?.people_count || 1));
  }

  function openEntryModal(dayId: string, entry?: MealEntry) {
    setActiveDayId(dayId);
    setActionError(null);
    setSelectedProduct(null);
    setSelectedUserProduct(null);
    setProductSearch('');
    setCategoryFilter('');
    setPortionG(0);

    if (entry) {
      setEditEntryId(entry.id);
      setEntryMode('custom');
      setEntryForm({
        meal_type: entry.meal_type,
        name: entry.name,
        weight_g: entry.weight_g,
        calories: entry.calories,
        protein_g: entry.protein_g,
        fat_g: entry.fat_g,
        carbs_g: entry.carbs_g,
      });
    } else {
      setEditEntryId(null);
      setEntryMode('catalog');
      setEntryForm({
        meal_type: 'breakfast',
        name: '',
        weight_g: 0,
        calories: 0,
        protein_g: 0,
        fat_g: 0,
        carbs_g: 0,
      });
    }
    setEntryModalOpen(true);
  }

  function handleEntryModeChange(mode: 'catalog' | 'my_products' | 'custom') {
    setActionError(null);
    if (mode === 'my_products') {
      setSelectedUserProduct(null);
      setProductSearch('');
      setCategoryFilter('');
    }
    setEntryMode(mode);
  }

  function handleEntryFormChange(field: string, value: string | number) {
    setEntryForm(prev => ({ ...prev, [field]: value }));
  }

  function handleEditFieldChange(field: string, value: string | number) {
    if (field === 'plan_type') {
      const pt = getPlanType(value as PlanTypeId);
      setEditForm(prev => ({ ...prev, plan_type: value as string, target_calories: pt.targetCalories.default, target_weight_g: pt.targetWeight.default }));
    } else {
      setEditForm(prev => ({ ...prev, [field]: value }));
    }
  }

  async function handleSaveEntry() {
    try {
    if (!activeDayId) return;

    if (entryMode === 'custom' && !entryForm.name.trim()) return;
    if (entryMode === 'catalog' && !selectedProduct) return;
    if (entryMode === 'my_products' && !selectedUserProduct) return;

    const userId = userIdRef.current;
    if (!userId) { toast.error(tCommon('error_loading')); return; }

    setSaving(true);
    setActionError(null);

    let saveName: string;
    let saveWeight: number;
    let saveCalories: number;
    let saveProtein: number;
    let saveFat: number;
    let saveCarbs: number;

    if (entryMode === 'catalog' && selectedProduct) {
      const nutrition = calculateNutrition(selectedProduct, portionG);
      saveName = selectedProduct.name[locale];
      saveWeight = portionG;
      saveCalories = nutrition.calories;
      saveProtein = nutrition.protein;
      saveFat = nutrition.fat;
      saveCarbs = nutrition.carbs;
    } else if (entryMode === 'my_products' && selectedUserProduct) {
      saveName = selectedUserProduct.name;
      saveWeight = portionG;
      saveCalories = Math.round(selectedUserProduct.calories_per100g * portionG / 100);
      saveProtein = Math.round(selectedUserProduct.protein_per100g * portionG / 100 * 10) / 10;
      saveFat = Math.round(selectedUserProduct.fat_per100g * portionG / 100 * 10) / 10;
      saveCarbs = Math.round(selectedUserProduct.carbs_per100g * portionG / 100 * 10) / 10;
    } else {
      saveName = entryForm.name.trim();
      saveWeight = entryForm.weight_g;
      saveCalories = entryForm.calories;
      saveProtein = entryForm.protein_g;
      saveFat = entryForm.fat_g;
      saveCarbs = entryForm.carbs_g;
    }

    const entryPayload = {
      meal_type: entryForm.meal_type,
      name: saveName,
      weight_g: saveWeight,
      calories: saveCalories,
      protein_g: saveProtein,
      fat_g: saveFat,
      carbs_g: saveCarbs,
    };

    if (editEntryId) {
      const { error: updateError, queued } = await updateMealEntry(editEntryId, userId, id, entryPayload);

      if (updateError && !queued) {
        setActionError(updateError.message);
        toast.error(updateError.message);
        setSaving(false);
        return;
      }

      if (queued) {
        setEntryModalOpen(false);
        setSaving(false);
        await persistTotalsOffline(
          days.map(day => day.id !== activeDayId ? day : {
            ...day,
            meal_entries: (day.meal_entries || []).map(e => e.id === editEntryId ? { ...e, ...entryPayload } : e),
          }),
          [activeDayId],
        );
        toast.info(tCommon('saved_offline'));
        return;
      }
    } else {
      const newEntryId = crypto.randomUUID();
      const { error: insertError, queued } = await addMealEntries(userId, id, [
        { id: newEntryId, day_id: activeDayId, ...entryPayload },
      ]);

      if (insertError && !queued) {
        setActionError(insertError.message);
        toast.error(insertError.message);
        setSaving(false);
        return;
      }

      if (queued) {
        // The row carries its final id right away, so the new entry can be edited and
        // deleted offline before the queue ever reaches the server.
        const newEntry: MealEntry = { id: newEntryId, day_id: activeDayId, ...entryPayload };
        setEntryModalOpen(false);
        setSaving(false);
        await persistTotalsOffline(
          days.map(day => day.id !== activeDayId ? day : {
            ...day,
            meal_entries: [...(day.meal_entries || []), newEntry],
          }),
          [activeDayId],
        );
        toast.info(tCommon('saved_offline'));
        return;
      }
    }

    setEntryModalOpen(false);
    setSaving(false);
    const totalsOk = await recalculateTotals();
    await invalidateCache(cacheKeys.mealPlanDetail(userId, id));
    await invalidateCache(cacheKeys.mealPlans(userId));
    if (!totalsOk) {
      // The entry itself was saved; re-read so it is not hidden by stale local state.
      await refreshPlanFromServer();
      return;
    }
    toast.success(editEntryId ? t('updated') : t('added'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setActionError(msg);
      toast.error(msg);
      setSaving(false);
    }
  }

  async function handleDeleteEntry(entryId: string) {
    setDeletingEntryId(entryId);
    try {
    const userId = userIdRef.current;
    if (!userId) { toast.error(tCommon('error_loading')); return; }

    const { error: deleteError, queued } = await deleteMealEntry(entryId, userId, id);

    if (deleteError && !queued) {
      setError(deleteError.message);
      toast.error(deleteError.message);
      return;
    }

    if (queued) {
      const entryDay = days.find(day => (day.meal_entries || []).some(e => e.id === entryId));
      setConfirmDeleteEntry(null);
      await persistTotalsOffline(
        days.map(day => day.id !== entryDay?.id ? day : {
          ...day,
          meal_entries: (day.meal_entries || []).filter(e => e.id !== entryId),
        }),
        entryDay ? [entryDay.id] : [],
      );
      toast.info(tCommon('saved_offline'));
      return;
    }

    const totalsOk = await recalculateTotals();
    await invalidateCache(cacheKeys.mealPlanDetail(userId, id));
    await invalidateCache(cacheKeys.mealPlans(userId));
    setConfirmDeleteEntry(null);
    if (!totalsOk) {
      // The entry is already gone; re-read so stale local state does not keep showing it.
      await refreshPlanFromServer();
      return;
    }
    toast.success(t('entry_deleted'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingEntryId(null);
    }
  }

  async function handleUpdatePlan(confirmedTypeChange = false) {
    try {
    if (!editForm.name.trim()) return;

    // Below 1 the rescale factor becomes 0 and every entry is zeroed — refuse the value
    // before any write instead of persisting it.
    const peopleCount = Math.floor(editForm.people_count);
    if (!Number.isFinite(peopleCount) || peopleCount < 1) {
      const msg = tCommon('error_occurred');
      setActionError(msg);
      toast.error(msg);
      return;
    }

    const userId = userIdRef.current;
    if (!userId) { toast.error(tCommon('error_loading')); return; }

    const oldType = plan?.plan_type || 'standard';
    const oldPeople = Math.max(1, plan?.people_count || 1);
    const typeChangeWithDays = oldType !== editForm.plan_type && days.length > 0;

    // A type change rebuilds the plan from a template, discarding the current days and
    // entries; the template button confirms the exact same destructive step. The rebuild
    // deletes rows by filter (day_id / plan_id), which the offline queue cannot replay,
    // so offline it must not start at all — a guard later would leave the plan half-done.
    if (typeChangeWithDays && !navigator.onLine) {
      toast.error(tCommon('connection_error'));
      return;
    }

    if (typeChangeWithDays && !confirmedTypeChange) {
      setConfirmTypeChange(true);
      return;
    }

    // A type change rebuilds the plan from the template registered for the selected type;
    // template ids do not spell out plan types (`comfort` is rebuilt from `comfort_winter`),
    // so the mapping in meal-templates.ts is the only source. Without a template the rebuild
    // cannot run — refuse before any write instead of persisting the new type over the old days.
    const typeTemplate = typeChangeWithDays
      ? getMealTemplateByPlanType(editForm.plan_type as PlanTypeId)
      : undefined;

    if (typeChangeWithDays && !typeTemplate) {
      const msg = t('template_not_found');
      setActionError(msg);
      toast.error(msg);
      return;
    }

    setSaving(true);
    setActionError(null);

    const planFields = {
      name: editForm.name.trim(),
      plan_type: editForm.plan_type,
      people_count: peopleCount,
      target_calories: editForm.target_calories,
      target_weight_g: editForm.target_weight_g,
    };

    if (typeChangeWithDays && typeTemplate) {
      // Raw online writes on purpose: routing the mid-rebuild plan update through the
      // service could queue a plan_type change whose rebuild never runs.
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from('meal_plans')
        .update(planFields)
        .eq('id', id);

      if (updateError) {
        setActionError(updateError.message);
        toast.error(updateError.message);
        setSaving(false);
        return;
      }

      setSaving(false);
      setEditPlanModalOpen(false);
      const applied = await handleApplyTemplate(typeTemplate.id, peopleCount);
      // The apply handler already reported the failure and reloaded the plan; adopting the
      // new name/type here would present a half-applied plan as a successful update.
      if (!applied) return;

      const { error: renameError } = await supabase
        .from('meal_plans')
        .update({
          name: editForm.name.trim(),
          people_count: peopleCount,
        })
        .eq('id', id);

      if (renameError) {
        console.error('Apply template: update meal_plans (name/people_count) failed -', renameError.message);
        setError(renameError.message);
        toast.error(renameError.message);
        await refreshPlanFromServer();
        return;
      }

      setPlan(prev => prev ? { ...prev, name: editForm.name.trim(), people_count: peopleCount } : null);
      return;
    }

    const { error: updateError, queued } = await updateMealPlan(id, userId, planFields);

    if (updateError && !queued) {
      setActionError(updateError.message);
      toast.error(updateError.message);
      setSaving(false);
      return;
    }

    let anyQueued = queued === true;

    if (oldPeople !== peopleCount && days.length > 0) {
      const pRatio = peopleCount / oldPeople;
      const nextDays: MealDayWithEntries[] = days.map(day => ({
        ...day,
        meal_entries: (day.meal_entries || []).map(e => ({
          ...e,
          weight_g: Math.round(e.weight_g * pRatio),
          calories: Math.round(e.calories * pRatio),
          protein_g: Math.round(e.protein_g * pRatio * 10) / 10,
          fat_g: Math.round(e.fat_g * pRatio * 10) / 10,
          carbs_g: Math.round(e.carbs_g * pRatio * 10) / 10,
        })),
      }));

      for (const day of nextDays) {
        for (const e of (day.meal_entries || [])) {
          const { error: rescaleError, queued: entryQueued } = await updateMealEntry(e.id, userId, id, {
            weight_g: e.weight_g,
            calories: e.calories,
            protein_g: e.protein_g,
            fat_g: e.fat_g,
            carbs_g: e.carbs_g,
          });

          if (rescaleError && !entryQueued) {
            console.error('Update plan:', `rescale meal_entries (day ${day.day_number})`, 'failed on', 'meal_entries', '-', rescaleError.message);
            setSaving(false);
            setEditPlanModalOpen(false);
            setError(rescaleError.message);
            toast.error(rescaleError.message);
            await invalidateCache(cacheKeys.mealPlans(userId));
            await refreshPlanFromServer();
            return;
          }

          if (entryQueued) anyQueued = true;
        }
      }

      if (anyQueued) {
        // The queue owns (part of) the rescale; the local rows adopt the same numbers it
        // will replay, so the page matches the post-sync state.
        setSaving(false);
        setEditPlanModalOpen(false);
        setPlan(prev => prev ? { ...prev, ...planFields } : null);
        await persistTotalsOffline(nextDays, nextDays.map(d => d.id), planFields);
        toast.info(tCommon('saved_offline'));
        return;
      }
    } else if (anyQueued) {
      setSaving(false);
      setEditPlanModalOpen(false);
      setPlan(prev => prev ? { ...prev, ...planFields } : null);
      if (plan) {
        // The queued field update is invisible to the cache-first detail read.
        await cachePlanOutcome(userId, { ...plan, ...planFields }, days);
      }
      toast.info(tCommon('saved_offline'));
      return;
    }

    setSaving(false);
    setEditPlanModalOpen(false);
    setPlan(prev => prev ? { ...prev, ...planFields } : null);
    const totalsOk = await recalculateTotals();
    await invalidateCache(cacheKeys.mealPlanDetail(userId, id));
    await invalidateCache(cacheKeys.mealPlans(userId));
    if (!totalsOk) {
      // The plan row and entries were written; re-read so the page shows the server's totals.
      await refreshPlanFromServer();
      return;
    }
    toast.success(t('plan_updated'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setActionError(msg);
      toast.error(msg);
      setSaving(false);
    }
  }

  async function handleDeletePlan() {
    try {
    const userId = userIdRef.current;
    if (!userId) { toast.error(tCommon('error_loading')); return; }

    const { error: deleteError, queued } = await deleteMealPlan(id, userId);

    if (deleteError && !queued) {
      setError(deleteError.message);
      return;
    }

    if (queued) {
      // The service keeps all three cache keys on a queued delete — offline reads would
      // resurrect the deleted plan, so the snapshots are updated here instead.
      await cachePlanDeletion(userId);
      toast.info(tCommon('saved_offline'));
      router.push('/meals');
      return;
    }

    // All three keys must be dropped before navigating: the /meals list reads cache-first
    // and would otherwise render the deleted plan from the old snapshot.
    await invalidateCache(cacheKeys.mealPlanDetail(userId, id));
    await invalidateCache(cacheKeys.mealPlans(userId));
    await invalidateCache(cacheKeys.mealPlansLight(userId));
    toast.success(t('deleted'));
    router.push('/meals');
    } catch (err) {
      toast.error(tCommon('error'));
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  }

  async function handleAddDay() {
    // The day number is derived from the current state, so a second insert must not start
    // before the first one lands — both would compute the same day_number.
    if (addingDayRef.current) return;
    addingDayRef.current = true;
    setAddingDay(true);
    try {
    const userId = userIdRef.current;
    if (!userId) { toast.error(tCommon('error_loading')); return; }

    const maxDayNumber = days.reduce((max, d) => Math.max(max, d.day_number), 0);
    const newDayId = crypto.randomUUID();

    const { error: insertError, queued } = await addMealDays(userId, id, [{
      id: newDayId,
      day_number: maxDayNumber + 1,
      total_calories: 0,
      total_weight_g: 0,
    }]);

    if (insertError && !queued) {
      setError(insertError.message);
      return;
    }

    if (queued) {
      const newDay: MealDayWithEntries = {
        id: newDayId,
        plan_id: id,
        day_number: maxDayNumber + 1,
        total_calories: 0,
        total_weight_g: 0,
        meal_entries: [],
      };
      await persistTotalsOffline([...days, newDay], []);
      toast.info(tCommon('saved_offline'));
      return;
    }

    const totalsOk = await recalculateTotals();
    await invalidateCache(cacheKeys.mealPlanDetail(userId, id));
    await invalidateCache(cacheKeys.mealPlans(userId));
    if (!totalsOk) {
      // The day row exists; re-read so it is not hidden by stale local state.
      await refreshPlanFromServer();
      return;
    }
    toast.success(t('created'));
    } catch (err) {
      toast.error(tCommon('error'));
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      addingDayRef.current = false;
      setAddingDay(false);
    }
  }

  async function handleRemoveDay() {
    setRemovingDay(true);
    try {
    if (days.length <= 1) return;

    const userId = userIdRef.current;
    if (!userId) { toast.error(tCommon('error_loading')); return; }

    const lastDay = days[days.length - 1];

    const { error: deleteError, queued } = await deleteMealDay(lastDay.id, userId, id);

    if (deleteError && !queued) {
      setError(deleteError.message);
      toast.error(deleteError.message);
      return;
    }

    if (queued) {
      // The day delete cascades to its entries inside the DB; the queue holds the single
      // row delete and the totals of the remaining days.
      setConfirmRemoveDay(false);
      await persistTotalsOffline(days.slice(0, -1), []);
      toast.info(tCommon('saved_offline'));
      return;
    }

    const totalsOk = await recalculateTotals();
    await invalidateCache(cacheKeys.mealPlanDetail(userId, id));
    await invalidateCache(cacheKeys.mealPlans(userId));
    setConfirmRemoveDay(false);
    if (!totalsOk) {
      // The day is already gone; re-read so stale local state does not keep showing it.
      await refreshPlanFromServer();
      return;
    }
    toast.success(t('day_deleted'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setRemovingDay(false);
    }
  }

  function handleOpenEditPlan() {
    if (!plan) return;
    setEditForm({
      name: plan.name,
      plan_type: plan.plan_type || 'standard',
      people_count: plan.people_count || 1,
      target_calories: plan.target_calories || 3000,
      target_weight_g: plan.target_weight_g || 650,
    });
    setEditPlanModalOpen(true);
    setActionError(null);
  }

  // Stable identity: Modal restarts its focus effect whenever onClose changes, which
  // would steal focus back to the close button after every keystroke.
  const closeEditPlanModal = useCallback(() => {
    // Escape is delivered to every open dialog, so the stacked type-change
    // confirmation must not take this form down with it.
    if (!confirmTypeChange) setEditPlanModalOpen(false);
  }, [confirmTypeChange]);

  async function refreshPlanFromServer() {
    const userId = userIdRef.current;
    if (!userId) return;

    // Drop the cached detail first: fetchMealPlanDetail is cache-first, so a stale entry
    // would otherwise be returned as the post-failure server state.
    await invalidateCache(cacheKeys.mealPlanDetail(userId, id));
    const { data, error: reloadError } = await fetchMealPlanDetail(userId, id);
    if (reloadError || !data) {
      console.error('Failed to reload meal plan from server:', reloadError?.message ?? 'no plan data');
      return;
    }
    setPlan(data.plan);
    setDays(data.days);
  }

  async function handleApplyTemplate(templateId: string, peopleCountOverride?: number): Promise<boolean> {
    // Rebuilding deletes rows by filter (day_id / plan_id), which the offline queue cannot
    // replay; starting it without a connection would only produce a half-applied plan.
    if (!navigator.onLine) {
      toast.error(tCommon('connection_error'));
      return false;
    }

    const template = getMealTemplate(templateId);
    if (!template || !plan) return false;

    const userId = userIdRef.current;
    if (!userId) { toast.error(tCommon('error_loading')); return false; }

    setApplyingTemplate(true);
    const supabase = createClient();

    // supabase-js resolves PostgREST failures as `{ error }` instead of throwing, so every
    // mutation below is checked explicitly. The first failure stops the sequence — earlier
    // deletes may already have been applied, so the caller must not treat this as success.
    const failApply = async (step: string, table: string, message: string): Promise<false> => {
      console.error('Apply template:', step, 'failed on', table, '-', message);
      setConfirmTemplate(null);
      setError(tCommon('template_apply_error'));
      toast.error(tCommon('error_occurred'));
      await invalidateCache(cacheKeys.mealPlans(userId));
      await refreshPlanFromServer();
      return false;
    };

    try {
      const existingDayIds = days.map(d => d.id);
      if (existingDayIds.length > 0) {
        for (const dayId of existingDayIds) {
          const { error: entriesDeleteError } = await supabase.from('meal_entries').delete().eq('day_id', dayId);
          if (entriesDeleteError) {
            return await failApply('delete meal_entries', 'meal_entries', entriesDeleteError.message);
          }
        }
        const { error: daysDeleteError } = await supabase.from('meal_days').delete().eq('plan_id', plan.id);
        if (daysDeleteError) {
          return await failApply('delete meal_days', 'meal_days', daysDeleteError.message);
        }
      }

      const templatePlanType = template.planType;
      const planTypeConfig = getPlanType(templatePlanType);
      const peopleCount = peopleCountOverride ?? plan.people_count ?? 1;
      const daysCount = plan.days_count || 3;

      const { error: planUpdateError } = await supabase
        .from('meal_plans')
        .update({
          plan_type: templatePlanType,
          target_calories: planTypeConfig.targetCalories.default,
          target_weight_g: planTypeConfig.targetWeight.default,
        })
        .eq('id', plan.id);

      if (planUpdateError) {
        return await failApply('update meal_plans', 'meal_plans', planUpdateError.message);
      }

      setPlan(prev => prev ? { ...prev, plan_type: templatePlanType, target_calories: planTypeConfig.targetCalories.default, target_weight_g: planTypeConfig.targetWeight.default } : null);

      const loc = (['uk', 'ru', 'en'].includes(locale) ? locale : 'uk') as 'uk' | 'ru' | 'en';

      for (let i = 0; i < daysCount; i++) {
        const patternIndex = i % template.dayPatterns.length;
        const pattern = template.dayPatterns[patternIndex];

        const { data: dayData, error: dayInsertError } = await supabase
          .from('meal_days')
          .insert({ plan_id: plan.id, day_number: i + 1, total_calories: 0, total_weight_g: 0 })
          .select()
          .single();

        if (dayInsertError || !dayData) {
          return await failApply(`insert meal_days (day ${i + 1})`, 'meal_days', dayInsertError?.message ?? 'no row returned');
        }

        let dayCalories = 0;
        let dayWeight = 0;

        for (const entry of pattern.entries) {
          const foodItem = FOOD_CATALOG.find(f => f.id === entry.catalogId);
          if (!foodItem) continue;

          const portionMultiplier = entry.portionMultiplier || 1;
          const portionG = Math.round(foodItem.defaultPortion[templatePlanType] * portionMultiplier * peopleCount);
          const nutrition = calculateNutrition(foodItem, portionG);

          const { error: entryInsertError } = await supabase.from('meal_entries').insert({
            day_id: dayData.id,
            meal_type: entry.mealType,
            name: foodItem.name[loc],
            weight_g: portionG,
            calories: nutrition.calories,
            protein_g: nutrition.protein,
            fat_g: nutrition.fat,
            carbs_g: nutrition.carbs,
          });

          if (entryInsertError) {
            return await failApply(`insert meal_entries (day ${i + 1}, ${entry.mealType})`, 'meal_entries', entryInsertError.message);
          }

          dayCalories += nutrition.calories;
          dayWeight += portionG;
        }

        const { error: totalsError } = await supabase
          .from('meal_days')
          .update({ total_calories: dayCalories, total_weight_g: dayWeight })
          .eq('id', dayData.id);

        if (totalsError) {
          return await failApply(`update meal_days totals (day ${i + 1})`, 'meal_days', totalsError.message);
        }
      }

      setConfirmTemplate(null);
      setTemplateModalOpen(false);
      const totalsOk = await recalculateTotals();
      await invalidateCache(cacheKeys.mealPlanDetail(userId, id));
      await invalidateCache(cacheKeys.mealPlans(userId));
      if (!totalsOk) {
        // The template is applied, but recalculateTotals failed and already logged/toasted;
        // surface the error state and re-read instead of reporting success.
        setError(tCommon('template_apply_error'));
        await refreshPlanFromServer();
        return false;
      }
      toast.success(t('template_applied'));
      return true;
    } catch (err) {
      console.error('Apply template: unexpected failure -', err);
      setConfirmTemplate(null);
      setError(tCommon('template_apply_error'));
      toast.error(tCommon('error_occurred'));
      await refreshPlanFromServer();
      return false;
    } finally {
      setApplyingTemplate(false);
    }
  }

  const head = (
    <Head>
      <title>{`ProHikes — ${plan?.name ?? 'Meal Plan'}`}</title>
      <meta name="description" content="ProHikes — plan your hikes, manage gear and meals" />
    </Head>
  );

  if (loading) {
    return (
      <>
        {head}
        <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-zinc-200 dark:border-zinc-700 border-t-[var(--color-brand)] rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (!plan && !loading) {
    return (
      <>
        {head}
        <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
            <h3 className="text-base font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {error || tCommon('empty')}
            </h3>
            <button
              onClick={() => router.push('/meals')}
              className="mt-4 text-sm text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] font-medium"
            >
              {t('back_to_plans')}
            </button>
          </div>
        </div>
      </>
    );
  }

  const foodCategories = Object.keys(FOOD_CATEGORY_NAMES) as FoodCategory[];

  return (
    <>
      {head}
      <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center mb-2">
          <button
            onClick={() => router.push('/meals')}
            className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-[var(--color-brand)] transition-colors mr-3"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('back_to_plans')}
          </button>
        </div>

        <PlanHeader
          planName={plan?.name ?? ''}
          planId={id}
          onEdit={handleOpenEditPlan}
          onTemplate={() => setTemplateModalOpen(true)}
          onDelete={() => setConfirmDeletePlan(true)}
          t={t}
          tCommon={tCommon}
        />

        {plan && <StatsCards days={days} plan={plan} t={t} tCommon={tCommon} />}

        {days.length === 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center mb-6">
            <h3 className="text-base font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {t('no_entries')}
            </h3>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {days.map((day) => (
            <DayCard
              key={day.id}
              day={day}
              dayNumber={day.day_number}
              isExpanded={expandedDays.has(day.day_number)}
              onToggle={toggleDay}
              plan={plan}
              onEditEntry={openEntryModal}
              onDeleteEntry={(entryId: string) => setConfirmDeleteEntry(entryId)}
              onAddEntry={(dayId: string) => openEntryModal(dayId)}
              t={t}
              tCommon={tCommon}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAddDay}
            disabled={addingDay}
            className="min-h-[44px] flex items-center gap-2 px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('add_day')}
          </button>
          <button
            onClick={() => setConfirmRemoveDay(true)}
            disabled={days.length <= 1}
            className="min-h-[44px] flex items-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-red-600 hover:border-red-300 dark:hover:border-red-800 text-sm font-medium rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
            </svg>
            {t('remove_day')}
          </button>
        </div>

        <EntryModal
          open={entryModalOpen}
          editEntryId={editEntryId}
          entryMode={entryMode}
          entryForm={entryForm}
          selectedProduct={selectedProduct}
          selectedUserProduct={selectedUserProduct}
          portionG={portionG}
          categoryFilter={categoryFilter}
          productSearch={productSearch}
          userFoodItems={userFoodItems}
          saving={saving}
          actionError={actionError}
          locale={locale}
          foodCategories={foodCategories}
          onClose={() => setEntryModalOpen(false)}
          onSave={handleSaveEntry}
          onEntryModeChange={handleEntryModeChange}
          onSelectProduct={selectProduct}
          onSelectUserProduct={selectUserProduct}
          onPortionChange={setPortionG}
          onCategoryFilterChange={setCategoryFilter}
          onProductSearchChange={setProductSearch}
          onEntryFormChange={handleEntryFormChange}
          t={t}
          tCommon={tCommon}
        />

        <EditPlanModal
          open={editPlanModalOpen}
          editForm={editForm}
          saving={saving}
          actionError={actionError}
          locale={locale}
          onClose={closeEditPlanModal}
          onSave={() => handleUpdatePlan()}
          onFieldChange={handleEditFieldChange}
          t={t}
          tCommon={tCommon}
        />

        <ConfirmDeleteModal
          open={confirmDeletePlan}
          onCancel={() => setConfirmDeletePlan(false)}
          onConfirm={handleDeletePlan}
          title={t('delete_plan')}
          message={t('delete_confirm')}
        />

        <ConfirmDeleteModal
          open={confirmDeleteEntry !== null}
          onCancel={() => setConfirmDeleteEntry(null)}
          onConfirm={() => {
            if (confirmDeleteEntry) {
              handleDeleteEntry(confirmDeleteEntry);
            }
          }}
          title={t('confirm_delete_entry')}
          message={t('confirm_delete_entry_desc')}
          loading={deletingEntryId !== null}
        />

        <ConfirmDeleteModal
          open={confirmRemoveDay}
          onCancel={() => setConfirmRemoveDay(false)}
          onConfirm={() => {
            handleRemoveDay();
          }}
          title={t('confirm_remove_day')}
          message={t('confirm_remove_day_desc')}
          loading={removingDay}
        />

        <ConfirmDeleteModal
          open={confirmTemplate !== null}
          onCancel={() => setConfirmTemplate(null)}
          onConfirm={() => {
            if (confirmTemplate) {
              handleApplyTemplate(confirmTemplate);
            }
          }}
          title={t('confirm_apply_template')}
          message={t('confirm_apply_template_desc')}
          loading={applyingTemplate}
        />

        <ConfirmDeleteModal
          open={confirmTypeChange}
          onCancel={() => setConfirmTypeChange(false)}
          onConfirm={() => {
            setConfirmTypeChange(false);
            handleUpdatePlan(true);
          }}
          title={t('confirm_change_type')}
          message={t('confirm_change_type_desc')}
        />

        <TemplateModal
          open={templateModalOpen}
          planType={plan?.plan_type ?? 'standard'}
          applyingTemplate={applyingTemplate}
          locale={locale}
          onClose={() => setTemplateModalOpen(false)}
          onApply={(templateId: string) => { setTemplateModalOpen(false); setConfirmTemplate(templateId); }}
          t={t}
          tCommon={tCommon}
        />
      </div>
    </>
  );
}