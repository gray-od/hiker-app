'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { fetchMealPlanDetail, fetchUserFoodItems } from '@/lib/supabase/service';
import type { MealPlan, MealEntry, MealDayWithEntries, UserFoodItem } from '@/lib/types';
import { FOOD_CATALOG, FOOD_CATEGORY_NAMES, calculateNutrition } from '@/lib/food-catalog';
import type { FoodItem, FoodCategory } from '@/lib/food-catalog';
import { type PlanTypeId, getPlanType } from '@/lib/hiking-standards';
import { getMealTemplate } from '@/lib/meal-templates';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { toast } from '@/lib/toast';
import StatsCards from './components/StatsCards';
import PlanHeader from './components/PlanHeader';
import DayCard from './components/DayCard';
import EntryModal from './components/EntryModal';
import EditPlanModal from './components/EditPlanModal';
import TemplateModal from './components/TemplateModal';

export default function MealPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
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
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
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
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);

      const [planResult, foodResult] = await Promise.all([
        fetchMealPlanDetail(id),
        fetchUserFoodItems(user.id),
      ]);
      const { data: planData, error: planError } = planResult;
      const { data: userFoodData, error: foodError } = foodResult;

      if (planError || !planData) {
        setError(planError?.message || 'Plan not found');
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

  async function recalculateTotals() {
    const supabase = createClient();
    try {
      const { data: currentDays } = await supabase
        .from('meal_days')
        .select('*, meal_entries(*)')
        .eq('plan_id', id)
        .order('day_number');

      if (!currentDays) return;

      const typedDays = currentDays as MealDayWithEntries[];

      for (const day of typedDays) {
        const entries = day.meal_entries || [];
        const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);
        const totalWeight = entries.reduce((sum, e) => sum + e.weight_g, 0);
        await supabase
          .from('meal_days')
          .update({ total_calories: totalCalories, total_weight_g: totalWeight })
          .eq('id', day.id);
        day.total_calories = totalCalories;
        day.total_weight_g = totalWeight;
      }

      const planTotalWeight = typedDays.reduce((sum, d) => sum + d.total_weight_g, 0);
      const planDaysCount = typedDays.length;

      await supabase
        .from('meal_plans')
        .update({ total_weight_g: planTotalWeight, days_count: planDaysCount })
        .eq('id', id);

      setDays(typedDays);
      setPlan(prev => prev ? { ...prev, total_weight_g: planTotalWeight, days_count: planDaysCount } : null);
    } catch (err) {
      console.error('recalculateTotals failed', err);
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

    const supabase = createClient();
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

    if (editEntryId) {
      const { error: updateError } = await supabase
        .from('meal_entries')
        .update({
          meal_type: entryForm.meal_type,
          name: saveName,
          weight_g: saveWeight,
          calories: saveCalories,
          protein_g: saveProtein,
          fat_g: saveFat,
          carbs_g: saveCarbs,
        })
        .eq('id', editEntryId);

      if (updateError) {
        setActionError(updateError.message);
        toast.error(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from('meal_entries')
        .insert({
          day_id: activeDayId,
          meal_type: entryForm.meal_type,
          name: saveName,
          weight_g: saveWeight,
          calories: saveCalories,
          protein_g: saveProtein,
          fat_g: saveFat,
          carbs_g: saveCarbs,
        });

      if (insertError) {
        setActionError(insertError.message);
        toast.error(insertError.message);
        setSaving(false);
        return;
      }
    }

    setEntryModalOpen(false);
    setSaving(false);
    await recalculateTotals();
    toast.success(editEntryId ? t('updated') : t('added'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setActionError(msg);
      toast.error(msg);
    }
  }

  async function handleDeleteEntry(entryId: string) {
    setDeletingEntryId(entryId);
    try {
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('meal_entries')
      .delete()
      .eq('id', entryId);

    if (deleteError) {
      setError(deleteError.message);
      toast.error(deleteError.message);
      return;
    }

    toast.success(t('entry_deleted'));
    await recalculateTotals();
    setConfirmDeleteEntry(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingEntryId(null);
    }
  }

  async function handleUpdatePlan() {
    try {
    if (!editForm.name.trim()) return;

    const supabase = createClient();
    setSaving(true);
    setActionError(null);

    const { error: updateError } = await supabase
      .from('meal_plans')
      .update({
        name: editForm.name.trim(),
        plan_type: editForm.plan_type,
        people_count: editForm.people_count,
        target_calories: editForm.target_calories,
        target_weight_g: editForm.target_weight_g,
      })
      .eq('id', id);

    if (updateError) {
      setActionError(updateError.message);
      toast.error(updateError.message);
      setSaving(false);
      return;
    }

    const oldType = plan?.plan_type || 'standard';
    const oldPeople = plan?.people_count || 1;

    if (oldType !== editForm.plan_type && days.length > 0) {
      const templateId = `${editForm.plan_type}_3day`;
      setSaving(false);
      setEditPlanModalOpen(false);
      await handleApplyTemplate(templateId, editForm.people_count);
      const supabase2 = createClient();
      await supabase2.from('meal_plans').update({
        name: editForm.name.trim(),
        people_count: editForm.people_count,
      }).eq('id', id);
      setPlan(prev => prev ? { ...prev, name: editForm.name.trim(), people_count: editForm.people_count } : null);
      return;
    }

    if (oldPeople !== editForm.people_count && days.length > 0) {
      const pRatio = editForm.people_count / oldPeople;
      for (const day of days) {
        for (const e of (day.meal_entries || [])) {
          await supabase.from('meal_entries').update({
            weight_g: Math.round(e.weight_g * pRatio),
            calories: Math.round(e.calories * pRatio),
            protein_g: Math.round(e.protein_g * pRatio * 10) / 10,
            fat_g: Math.round(e.fat_g * pRatio * 10) / 10,
            carbs_g: Math.round(e.carbs_g * pRatio * 10) / 10,
          }).eq('id', e.id);
        }
      }
    }

    setSaving(false);
    setEditPlanModalOpen(false);
    setPlan(prev => prev ? {
      ...prev,
      name: editForm.name.trim(),
      plan_type: editForm.plan_type,
      people_count: editForm.people_count,
      target_calories: editForm.target_calories,
      target_weight_g: editForm.target_weight_g,
    } : null);
    await recalculateTotals();
    toast.success(t('plan_updated'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setActionError(msg);
      toast.error(msg);
    }
  }

  async function handleDeletePlan() {
    try {
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    router.push('/meals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  }

  async function handleAddDay() {
    try {
    const supabase = createClient();
    const maxDayNumber = days.reduce((max, d) => Math.max(max, d.day_number), 0);

    const { error: insertError } = await supabase
      .from('meal_days')
      .insert({
        plan_id: id,
        day_number: maxDayNumber + 1,
        total_calories: 0,
        total_weight_g: 0,
      });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    await recalculateTotals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  }

  async function handleRemoveDay() {
    setRemovingDay(true);
    try {
    if (days.length <= 1) return;

    const supabase = createClient();
    const lastDay = days[days.length - 1];

    const { error: deleteError } = await supabase
      .from('meal_days')
      .delete()
      .eq('id', lastDay.id);

    if (deleteError) {
      setError(deleteError.message);
      toast.error(deleteError.message);
      return;
    }

    toast.success(t('day_deleted'));
    await recalculateTotals();
    setConfirmRemoveDay(false);
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

  async function handleApplyTemplate(templateId: string, peopleCountOverride?: number) {
    const template = getMealTemplate(templateId);
    if (!template || !plan) return;

    setApplyingTemplate(true);
    const supabase = createClient();

    try {
      const existingDayIds = days.map(d => d.id);
      if (existingDayIds.length > 0) {
        for (const dayId of existingDayIds) {
          await supabase.from('meal_entries').delete().eq('day_id', dayId);
        }
        await supabase.from('meal_days').delete().eq('plan_id', plan.id);
      }

      const templatePlanType = template.planType;
      const planTypeConfig = getPlanType(templatePlanType);
      const peopleCount = peopleCountOverride ?? plan.people_count ?? 1;
      const daysCount = plan.days_count || 3;

      await supabase
        .from('meal_plans')
        .update({
          plan_type: templatePlanType,
          target_calories: planTypeConfig.targetCalories.default,
          target_weight_g: planTypeConfig.targetWeight.default,
        })
        .eq('id', plan.id);

      setPlan(prev => prev ? { ...prev, plan_type: templatePlanType, target_calories: planTypeConfig.targetCalories.default, target_weight_g: planTypeConfig.targetWeight.default } : null);

      const loc = (['uk', 'ru', 'en'].includes(locale) ? locale : 'uk') as 'uk' | 'ru' | 'en';

      for (let i = 0; i < daysCount; i++) {
        const patternIndex = i % template.dayPatterns.length;
        const pattern = template.dayPatterns[patternIndex];

        const { data: dayData } = await supabase
          .from('meal_days')
          .insert({ plan_id: plan.id, day_number: i + 1, total_calories: 0, total_weight_g: 0 })
          .select()
          .single();

        if (!dayData) continue;

        let dayCalories = 0;
        let dayWeight = 0;

        for (const entry of pattern.entries) {
          const foodItem = FOOD_CATALOG.find(f => f.id === entry.catalogId);
          if (!foodItem) continue;

          const portionMultiplier = entry.portionMultiplier || 1;
          const portionG = Math.round(foodItem.defaultPortion[templatePlanType] * portionMultiplier * peopleCount);
          const nutrition = calculateNutrition(foodItem, portionG);

          await supabase.from('meal_entries').insert({
            day_id: dayData.id,
            meal_type: entry.mealType,
            name: foodItem.name[loc],
            weight_g: portionG,
            calories: nutrition.calories,
            protein_g: nutrition.protein,
            fat_g: nutrition.fat,
            carbs_g: nutrition.carbs,
          });

          dayCalories += nutrition.calories;
          dayWeight += portionG;
        }

        await supabase
          .from('meal_days')
          .update({ total_calories: dayCalories, total_weight_g: dayWeight })
          .eq('id', dayData.id);
      }

      setConfirmTemplate(null);
      setTemplateModalOpen(false);
      await recalculateTotals();
      toast.success(t('template_applied'));
    } catch (err) {
      setConfirmTemplate(null);
      setError(tCommon('template_apply_error'));
    } finally {
      setApplyingTemplate(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-zinc-200 dark:border-zinc-700 border-t-[var(--color-brand)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!plan && !loading) {
    return (
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
    );
  }

  const foodCategories = Object.keys(FOOD_CATEGORY_NAMES) as FoodCategory[];

  return (
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
            onDeleteEntry={(entryId) => setConfirmDeleteEntry(entryId)}
            onAddEntry={(dayId) => openEntryModal(dayId)}
            t={t}
            tCommon={tCommon}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleAddDay}
          className="min-h-[44px] flex items-center gap-2 px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
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
        onClose={() => setEditPlanModalOpen(false)}
        onSave={handleUpdatePlan}
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

      <TemplateModal
        open={templateModalOpen}
        planType={plan?.plan_type ?? 'standard'}
        applyingTemplate={applyingTemplate}
        locale={locale}
        onClose={() => setTemplateModalOpen(false)}
        onApply={(templateId) => { setTemplateModalOpen(false); setConfirmTemplate(templateId); }}
        t={t}
        tCommon={tCommon}
      />
    </div>
  );
}
