'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { MealPlan, MealDay, MealEntry, MealDayWithEntries } from '@/lib/types';
import { FOOD_CATALOG, FOOD_CATEGORY_NAMES, calculateNutrition } from '@/lib/food-catalog';
import type { FoodItem, FoodCategory } from '@/lib/food-catalog';
import { getAdaptationCoefficient } from '@/lib/hiking-standards';
import type { PlanTypeId } from '@/lib/hiking-standards';

const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

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
  const [editPlanName, setEditPlanName] = useState('');
  const [confirmDeletePlan, setConfirmDeletePlan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [locale, setLocale] = useState<'uk' | 'ru' | 'en'>('uk');
  const [catalogMode, setCatalogMode] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<FoodItem | null>(null);
  const [portionG, setPortionG] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<FoodCategory | ''>('');
  const [productSearch, setProductSearch] = useState('');

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

      const { data: planData, error: planError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', id)
        .single();

      if (planError || !planData) {
        setError(planError?.message || 'Plan not found');
        setLoading(false);
        return;
      }

      setPlan(planData as MealPlan);

      const { data: daysData } = await supabase
        .from('meal_days')
        .select('*, meal_entries(*)')
        .eq('plan_id', id)
        .order('day_number');

      if (daysData) {
        setDays(daysData as MealDayWithEntries[]);
      }

      setLoading(false);
    });
  }, [id, router]);

  function formatWeight(grams: number): string {
    if (grams >= 1000) return `${(grams / 1000).toFixed(2)} ${tCommon('weight_kg')}`;
    return `${grams} ${tCommon('weight_g')}`;
  }

  function getProgressColor(ratio: number): string {
    if (ratio >= 0.8 && ratio <= 1.1) return '#75a93a';
    if (ratio >= 0.5 && ratio < 0.8) return '#f5a623';
    return '#ef4444';
  }

  async function recalculateTotals() {
    const supabase = createClient();

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

  function openEntryModal(dayId: string, entry?: MealEntry) {
    setActiveDayId(dayId);
    setActionError(null);
    setSelectedProduct(null);
    setProductSearch('');
    setCategoryFilter('');
    setPortionG(0);

    if (entry) {
      setEditEntryId(entry.id);
      setCatalogMode(false);
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
      setCatalogMode(true);
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

  async function handleSaveEntry() {
    if (!activeDayId) return;

    if (!catalogMode && !entryForm.name.trim()) return;
    if (catalogMode && !selectedProduct) return;

    const supabase = createClient();
    setSaving(true);
    setActionError(null);

    let saveName: string;
    let saveWeight: number;
    let saveCalories: number;
    let saveProtein: number;
    let saveFat: number;
    let saveCarbs: number;

    if (catalogMode && selectedProduct) {
      const nutrition = calculateNutrition(selectedProduct, portionG);
      saveName = selectedProduct.name[locale];
      saveWeight = portionG;
      saveCalories = nutrition.calories;
      saveProtein = nutrition.protein;
      saveFat = nutrition.fat;
      saveCarbs = nutrition.carbs;
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
        setSaving(false);
        return;
      }
    }

    setEntryModalOpen(false);
    setSaving(false);
    await recalculateTotals();
  }

  async function handleDeleteEntry(entryId: string) {
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('meal_entries')
      .delete()
      .eq('id', entryId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await recalculateTotals();
  }

  async function handleUpdatePlan() {
    if (!editPlanName.trim()) return;

    const supabase = createClient();
    setSaving(true);
    setActionError(null);

    const { error: updateError } = await supabase
      .from('meal_plans')
      .update({ name: editPlanName.trim() })
      .eq('id', id);

    if (updateError) {
      setActionError(updateError.message);
      setSaving(false);
      return;
    }

    setPlan(prev => prev ? { ...prev, name: editPlanName.trim() } : null);
    setSaving(false);
    setEditPlanModalOpen(false);
  }

  async function handleDeletePlan() {
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
  }

  async function handleAddDay() {
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
  }

  async function handleRemoveDay() {
    if (days.length <= 1) return;

    const supabase = createClient();
    const lastDay = days[days.length - 1];

    const { error: deleteError } = await supabase
      .from('meal_days')
      .delete()
      .eq('id', lastDay.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await recalculateTotals();
  }

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-zinc-200 dark:border-zinc-700 border-t-[#75a93a] rounded-full animate-spin" />
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
            className="mt-4 text-sm text-[#75a93a] hover:text-[#5d8a2e] font-medium"
          >
            {t('back_to_plans')}
          </button>
        </div>
      </div>
    );
  }

  const totalCalories = days.reduce(
    (sum, d) => sum + (d.meal_entries || []).reduce((s, e) => s + e.calories, 0),
    0,
  );
  const totalWeight = days.reduce(
    (sum, d) => sum + (d.meal_entries || []).reduce((s, e) => s + e.weight_g, 0),
    0,
  );
  const daysCount = days.length || 1;
  const peopleCount = plan!.people_count || 1;
  const avgCalories = Math.round(totalCalories / daysCount);
  const avgWeight = Math.round(totalWeight / daysCount);
  const avgCalPerPersonDay = Math.round(totalCalories / daysCount / peopleCount);
  const avgWeightPerPersonDay = Math.round(totalWeight / daysCount / peopleCount);

  const foodCategories = Object.keys(FOOD_CATEGORY_NAMES) as FoodCategory[];

  const filteredProducts = FOOD_CATALOG.filter(p => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (productSearch) {
      const search = productSearch.toLowerCase();
      const name = p.name[locale].toLowerCase();
      if (!name.includes(search)) return false;
    }
    return true;
  });

  const catalogNutrition = selectedProduct ? calculateNutrition(selectedProduct, portionG) : null;

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
          className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-[#75a93a] transition-colors mr-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t('back_to_plans')}
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {plan!.name}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditPlanName(plan!.name);
              setEditPlanModalOpen(true);
              setActionError(null);
            }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-[#75a93a] hover:bg-[#75a93a]/10 rounded-lg transition-colors"
            title={tCommon('edit')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => setConfirmDeletePlan(true)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title={tCommon('delete')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t('total_calories')}</div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {totalCalories} {t('kcal')}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t('total_weight')}</div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatWeight(totalWeight)}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t('days')}</div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {daysCount}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            {t('kcal')} / {t('per_person')} / {tCommon('day')}
          </div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {avgCalPerPersonDay}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            {tCommon('weight_g')} / {t('per_person')} / {tCommon('day')}
          </div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {avgWeightPerPersonDay}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t('people')}</div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {peopleCount}
          </div>
        </div>
      </div>

      {days.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center mb-6">
          <h3 className="text-base font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            {t('no_entries')}
          </h3>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {days.map((day) => {
          const isExpanded = expandedDays.has(day.day_number);
          const entries = day.meal_entries || [];

          const groupedEntries: Record<string, MealEntry[]> = {
            breakfast: [],
            lunch: [],
            snack: [],
            dinner: [],
          };
          entries.forEach((e) => {
            if (groupedEntries[e.meal_type]) {
              groupedEntries[e.meal_type].push(e);
            }
          });

          const dayTotalCal = entries.reduce((s, e) => s + e.calories, 0);
          const dayTotalWeight = entries.reduce((s, e) => s + e.weight_g, 0);
          const adaptationCoeff = getAdaptationCoefficient(day.day_number);
          const calTarget = (plan!.target_calories || 3000) * adaptationCoeff * peopleCount;
          const weightTarget = (plan!.target_weight_g || 650) * peopleCount;
          const calRatio = calTarget > 0 ? dayTotalCal / calTarget : 0;
          const weightRatio = weightTarget > 0 ? dayTotalWeight / weightTarget : 0;

          return (
            <div
              key={day.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <button
                onClick={() => toggleDay(day.day_number)}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('day')} {day.day_number}
                  </h3>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                    {dayTotalCal} {t('kcal')} / {formatWeight(dayTotalWeight)}
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-500 dark:text-zinc-400">{t('calories_label')}</span>
                        <span className="text-zinc-600 dark:text-zinc-300 tabular-nums">
                          {dayTotalCal} / {Math.round(calTarget)} {t('kcal')}
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(calRatio * 100, 100)}%`, backgroundColor: getProgressColor(calRatio) }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-500 dark:text-zinc-400">{t('weight')}</span>
                        <span className="text-zinc-600 dark:text-zinc-300 tabular-nums">
                          {dayTotalWeight} / {Math.round(weightTarget)} {tCommon('weight_g')}
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(weightRatio * 100, 100)}%`, backgroundColor: getProgressColor(weightRatio) }}
                        />
                      </div>
                    </div>
                  </div>

                  {MEAL_TYPES.map((mealType) => {
                    const mealEntries = groupedEntries[mealType];
                    return (
                      <div key={mealType}>
                        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                          {t(mealType)}
                        </h4>
                        {mealEntries.length === 0 && (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                            {t('no_entries')}
                          </p>
                        )}
                        {mealEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center gap-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                {entry.name}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                <span className="tabular-nums">
                                  {entry.weight_g} {tCommon('weight_g')}
                                </span>
                                <span className="tabular-nums">
                                  {entry.calories} {t('kcal')}
                                </span>
                                <span className="text-zinc-400 dark:text-zinc-500 tabular-nums">
                                  {t('protein')}: {entry.protein_g}{tCommon('weight_g')}{' '}
                                  {t('fat')}: {entry.fat_g}{tCommon('weight_g')}{' '}
                                  {t('carbs')}: {entry.carbs_g}{tCommon('weight_g')}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => openEntryModal(day.id, entry)}
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-[#75a93a] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
                              title={t('edit_entry')}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                              title={t('remove_entry')}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  <button
                    onClick={() => openEntryModal(day.id)}
                    className="min-h-[44px] inline-flex items-center gap-1.5 text-sm font-medium text-[#75a93a] hover:text-[#5d8a2e] transition-colors mt-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {t('add_entry')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleAddDay}
          className="min-h-[44px] flex items-center gap-2 px-4 py-2 bg-[#75a93a] hover:bg-[#5d8a2e] text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t('add_day')}
        </button>
        <button
          onClick={handleRemoveDay}
          disabled={days.length <= 1}
          className="min-h-[44px] flex items-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-red-600 hover:border-red-300 dark:hover:border-red-800 text-sm font-medium rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
          {t('remove_day')}
        </button>
      </div>

      {entryModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                {editEntryId ? t('edit_entry') : t('add_entry')}
              </h2>

              {actionError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                  {actionError}
                </div>
              )}

              {!editEntryId && (
                <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-4">
                  <button
                    onClick={() => { setCatalogMode(true); setActionError(null); }}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${catalogMode ? 'border-[#75a93a] text-[#75a93a]' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >
                    {t('from_catalog')}
                  </button>
                  <button
                    onClick={() => { setCatalogMode(false); setActionError(null); }}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${!catalogMode ? 'border-[#75a93a] text-[#75a93a]' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >
                    {t('custom_entry')}
                  </button>
                </div>
              )}

              {catalogMode && !editEntryId ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t('meal_type')}
                    </label>
                    <select
                      value={entryForm.meal_type}
                      onChange={(e) =>
                        setEntryForm((prev) => ({
                          ...prev,
                          meal_type: e.target.value as MealEntry['meal_type'],
                        }))
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                    >
                      {MEAL_TYPES.map((mt) => (
                        <option key={mt} value={mt}>
                          {t(mt)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t('category')}
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value as FoodCategory | '')}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                    >
                      <option value="">{t('all_categories')}</option>
                      {foodCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {FOOD_CATEGORY_NAMES[cat][locale]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder={t('search_product')}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredProducts.length === 0 && (
                      <p className="px-3 py-4 text-sm text-zinc-400 dark:text-zinc-500 text-center">
                        {tCommon('empty')}
                      </p>
                    )}
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => selectProduct(product)}
                        className={`w-full text-left px-3 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                          selectedProduct?.id === product.id
                            ? 'bg-[#75a93a]/10 border-l-2 border-[#75a93a]'
                            : ''
                        }`}
                      >
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {product.name[locale]}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {FOOD_CATEGORY_NAMES[product.category][locale]} · {product.per100g.calories} {t('kcal')}/{t('per_100g')}
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedProduct && (
                    <div className="space-y-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {selectedProduct.name[locale]}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          {t('portion')}
                        </label>
                        <input
                          type="number"
                          value={portionG}
                          onChange={(e) => setPortionG(Number(e.target.value))}
                          min="0"
                          step="1"
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                        />
                      </div>
                      {catalogNutrition && (
                        <div className="grid grid-cols-4 gap-2">
                          <div className="bg-white dark:bg-zinc-900 rounded-lg p-2 text-center">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('kcal')}</div>
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                              {catalogNutrition.calories}
                            </div>
                          </div>
                          <div className="bg-white dark:bg-zinc-900 rounded-lg p-2 text-center">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('protein')}</div>
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                              {catalogNutrition.protein}
                            </div>
                          </div>
                          <div className="bg-white dark:bg-zinc-900 rounded-lg p-2 text-center">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('fat')}</div>
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                              {catalogNutrition.fat}
                            </div>
                          </div>
                          <div className="bg-white dark:bg-zinc-900 rounded-lg p-2 text-center">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('carbs')}</div>
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                              {catalogNutrition.carbs}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t('meal_type')}
                    </label>
                    <select
                      value={entryForm.meal_type}
                      onChange={(e) =>
                        setEntryForm((prev) => ({
                          ...prev,
                          meal_type: e.target.value as MealEntry['meal_type'],
                        }))
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                    >
                      {MEAL_TYPES.map((mt) => (
                        <option key={mt} value={mt}>
                          {t(mt)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t('meal_name')}
                    </label>
                    <input
                      type="text"
                      value={entryForm.name}
                      onChange={(e) => setEntryForm((prev) => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        {t('weight')}
                      </label>
                      <input
                        type="number"
                        value={entryForm.weight_g}
                        onChange={(e) => setEntryForm((prev) => ({ ...prev, weight_g: Number(e.target.value) }))}
                        min="0"
                        step="1"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        {t('calories_label')}
                      </label>
                      <input
                        type="number"
                        value={entryForm.calories}
                        onChange={(e) => setEntryForm((prev) => ({ ...prev, calories: Number(e.target.value) }))}
                        min="0"
                        step="1"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        {t('protein')}
                      </label>
                      <input
                        type="number"
                        value={entryForm.protein_g}
                        onChange={(e) => setEntryForm((prev) => ({ ...prev, protein_g: Number(e.target.value) }))}
                        min="0"
                        step="0.1"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        {t('fat')}
                      </label>
                      <input
                        type="number"
                        value={entryForm.fat_g}
                        onChange={(e) => setEntryForm((prev) => ({ ...prev, fat_g: Number(e.target.value) }))}
                        min="0"
                        step="0.1"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        {t('carbs')}
                      </label>
                      <input
                        type="number"
                        value={entryForm.carbs_g}
                        onChange={(e) => setEntryForm((prev) => ({ ...prev, carbs_g: Number(e.target.value) }))}
                        min="0"
                        step="0.1"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setEntryModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={handleSaveEntry}
                  disabled={
                    saving ||
                    (catalogMode && !editEntryId && (!selectedProduct || portionG <= 0)) ||
                    (!catalogMode && !entryForm.name.trim())
                  }
                  className="px-4 py-2 bg-[#75a93a] hover:bg-[#5d8a2e] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed"
                >
                  {saving ? tCommon('loading') : tCommon('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editPlanModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                {t('edit_plan')}
              </h2>

              {actionError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                  {actionError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('name')}
                </label>
                <input
                  type="text"
                  value={editPlanName}
                  onChange={(e) => setEditPlanName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditPlanModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={handleUpdatePlan}
                  disabled={saving || !editPlanName.trim()}
                  className="px-4 py-2 bg-[#75a93a] hover:bg-[#5d8a2e] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed"
                >
                  {saving ? tCommon('loading') : tCommon('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeletePlan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {t('delete_plan')}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              {t('delete_confirm')}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDeletePlan(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={handleDeletePlan}
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
