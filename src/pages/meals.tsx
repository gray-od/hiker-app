import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { MealPlan } from '@/lib/types';
import { fetchUserMealPlans } from '@/lib/supabase/service';
import { getPlanTypeBadgeClass } from '@/lib/badges';
import { formatWeight } from '@/lib/format';
import { inputClass, cn } from '@/lib/cn';
import { PLAN_TYPES, getPlanType } from '@/lib/hiking-standards';
import type { PlanTypeId } from '@/lib/hiking-standards';
import { calculateNutrition, getFoodItem } from '@/lib/food-catalog';
import { MEAL_TEMPLATES, getMealTemplate } from '@/lib/meal-templates';
import { toast } from '@/lib/toast';
import LoadingSpinner from '@/components/LoadingSpinner';

const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

type MealPlanWithDays = MealPlan & {
  meal_days: { total_calories: number; total_weight_g: number }[];
};

const EMPTY_FORM = {
  name: '',
  days_count: 3,
  plan_type: 'standard' as PlanTypeId,
  people_count: 1,
  target_calories: 3000,
  target_weight_g: 650,
  template_id: '',
};

export default function MealsPage() {
  const router = useRouter();
  const t = useTranslations('meals');
  const tCommon = useTranslations('common');

  const [plans, setPlans] = useState<MealPlanWithDays[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locale] = useState(() => {
    if (typeof document === 'undefined') return 'uk';
    const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
    return match ? match[1] : 'uk';
  });

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);

      fetchUserMealPlans(user.id).then(({ data, error: fetchError }) => {
        if (fetchError) {
          console.error('Failed to load meals:', fetchError);
          setError(tCommon('error_loading'));
        } else if (data) {
          setPlans(data);
        }
        setLoading(false);
      });
    });
  }, [router]);

  function getTotalCalories(plan: MealPlanWithDays): number {
    return (plan.meal_days ?? []).reduce((sum, d) => sum + (d.total_calories ?? 0), 0);
  }

  function getTotalWeight(plan: MealPlanWithDays): number {
    return (plan.meal_days ?? []).reduce((sum, d) => sum + (d.total_weight_g ?? 0), 0);
  }

  async function fetchPlans() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error: fetchError } = await fetchUserMealPlans(user.id);
    if (!fetchError && data) {
      setPlans(data);
    }
  }

  async function handleCreate() {
    try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    setSaving(true);
    setError(null);

    const { data: plan, error: insertError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user.id,
        name: formData.name,
        days_count: formData.days_count,
        plan_type: formData.plan_type,
        people_count: formData.people_count,
        target_calories: formData.target_calories,
        target_weight_g: formData.target_weight_g,
      })
      .select('*, meal_days(total_calories, total_weight_g)')
      .single();

    if (insertError) {
      toast.error(insertError.message || tCommon('error_occurred'));
      setError(insertError.message);
      setSaving(false);
      return;
    }

    if (plan) {
      const days = Array.from({ length: formData.days_count }, (_, i) => ({
        plan_id: plan.id,
        day_number: i + 1,
      }));

      const { data: createdDays, error: daysError } = await supabase
        .from('meal_days')
        .insert(days)
        .select('id, day_number')
        .order('day_number', { ascending: true });

      if (daysError || !createdDays) {
        toast.error(daysError?.message || tCommon('error_occurred'));
        setError(daysError?.message ?? 'Failed to create days');
        setSaving(false);
        return;
      }

      if (formData.template_id) {
        const template = getMealTemplate(formData.template_id);
        if (template) {
          const entries: {
            day_id: string;
            meal_type: string;
            name: string;
            weight_g: number;
            calories: number;
            protein_g: number;
            fat_g: number;
            carbs_g: number;
          }[] = [];

          for (let i = 0; i < createdDays.length; i++) {
            const day = createdDays[i];
            const patternIndex = i % template.dayPatterns.length;
            const pattern = template.dayPatterns[patternIndex];

            for (const entry of pattern.entries) {
              const foodItem = getFoodItem(entry.catalogId);
              if (!foodItem) continue;

              let portionG = foodItem.defaultPortion[formData.plan_type];
              if (entry.portionMultiplier) {
                portionG = Math.round(portionG * entry.portionMultiplier);
              }
              portionG = portionG * formData.people_count;

              const nutrition = calculateNutrition(foodItem, portionG);
              const loc = locale as keyof typeof foodItem.name;

              entries.push({
                day_id: day.id,
                meal_type: entry.mealType,
                name: (foodItem.name[loc] as string) ?? foodItem.name.uk,
                weight_g: nutrition.weight_g,
                calories: nutrition.calories,
                protein_g: nutrition.protein,
                fat_g: nutrition.fat,
                carbs_g: nutrition.carbs,
              });
            }
          }

          if (entries.length > 0) {
            const { error: entriesError } = await supabase
              .from('meal_entries')
              .insert(entries);

            if (entriesError) {
              toast.error(entriesError.message || tCommon('error_occurred'));
              setError(entriesError.message);
              setSaving(false);
              return;
            }

            const { data: daysWithEntries } = await supabase
              .from('meal_days')
              .select('id, meal_entries(calories, weight_g)')
              .eq('plan_id', plan.id);

            if (daysWithEntries) {
              let planTotalWeight = 0;
              for (const day of daysWithEntries) {
                const dayCalories = (day.meal_entries || []).reduce((s: number, e: { calories: number }) => s + e.calories, 0);
                const dayWeight = (day.meal_entries || []).reduce((s: number, e: { weight_g: number }) => s + e.weight_g, 0);
                planTotalWeight += dayWeight;
                await supabase.from('meal_days').update({ total_calories: dayCalories, total_weight_g: dayWeight }).eq('id', day.id);
              }
              await supabase.from('meal_plans').update({ total_weight_g: planTotalWeight }).eq('id', plan.id);
            }
          }
        }
      }

      await fetchPlans();
    }

    toast.success(t('created'));
    setSaving(false);
    setModalOpen(false);
    setFormData(EMPTY_FORM);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      toast.error(msg || tCommon('error_occurred'));
      setSaving(false);
      setError(msg);
    }
  }

  async function handleDelete(id: string) {
    try {
    setDeleting(true);
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id);

    if (deleteError) {
      toast.error(deleteError.message || tCommon('error_occurred'));
      setError(deleteError.message);
      setConfirmDelete(null);
      setDeleting(false);
      return;
    }

    toast.success(t('deleted'));
    setPlans((prev) => prev.filter((p) => p.id !== id));
    setConfirmDelete(null);
    setDeleting(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      toast.error(msg || tCommon('error_occurred'));
      setError(msg);
      setDeleting(false);
    }
  }

  function handleFormChange(field: string, value: string | number) {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'plan_type') {
        const pt = getPlanType(value as PlanTypeId);
        next.target_calories = pt.targetCalories.default;
        next.target_weight_g = pt.targetWeight.default;
        next.template_id = '';
      }

      return next;
    });
  }

  function openCreateModal() {
    setFormData(EMPTY_FORM);
    setModalOpen(true);
  }

  const templatesForPlanType = MEAL_TEMPLATES.filter(
    (t) => t.planType === formData.plan_type
  );

  const planTypeConfig = getPlanType(formData.plan_type);
  const localeKey = (locale in planTypeConfig.name ? locale : 'uk') as 'uk' | 'ru' | 'en';

  return (
    <>
      <Head>
        <title>ProHikes — Meals</title>
        <meta name="description" content="ProHikes — plan your hikes, manage gear and meals" />
      </Head>
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
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
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
            <div className="w-8 h-8 border-4 border-zinc-200 dark:border-zinc-700 border-t-[var(--color-brand)] rounded-full animate-spin" />
          </div>
        )}

        {!loading && plans.length === 0 && (
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
                d="M9 9h10.5M9 12h10.5M9 15h10.5M9 18h10.5M3 9h.008v.008H3V9zm0 3h.008v.008H3V12zm0 3h.008v.008H3V15zm0 3h.008v.008H3V18zm12-10.5V3m0 0l-3 3m3-3l3 3"
              />
            </svg>
            <h2 className="text-base font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {t('empty')}
            </h2>
          </div>
        )}

        {!loading && plans.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plans.map((plan) => {
              const totalCalories = getTotalCalories(plan);
              const totalWeight = getTotalWeight(plan);
              const pt = getPlanType((plan.plan_type as PlanTypeId) ?? 'standard');
              const loc = (locale in pt.name ? locale : 'uk') as 'uk' | 'ru' | 'en';

              return (
                <div
                  key={plan.id}
                  onClick={() => router.push(`/meals/${plan.id}`)}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:border-[var(--color-brand)]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                        {plan.name}
                      </h3>
                      {plan.people_count > 1 && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {plan.people_count} {t('people')}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(plan.id);
                      }}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                      title={tCommon('delete')}
                      aria-label={tCommon('delete')}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPlanTypeBadgeClass(plan.plan_type ?? 'standard')}`}>
                      {pt.name[loc]}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                    <span>
                      {plan.days_count} {t('days')}
                    </span>
                    <span>
                      {totalCalories} {t('kcal')}
                    </span>
                    <span>
                      {formatWeight(totalWeight, tCommon)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {MEAL_TYPES.map((mt) => (
                      <span
                        key={mt}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      >
                        {t(mt)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom,1rem))]">
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
                      className={cn(inputClass, 'placeholder-zinc-400')}
                      placeholder={t('name')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t('days_count')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={formData.days_count}
                      onChange={(e) => handleFormChange('days_count', parseInt(e.target.value) || 1)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      {t('plan_type')}
                    </label>
                    <div className="space-y-2">
                      {PLAN_TYPES.map((pt) => {
                        const isSelected = formData.plan_type === pt.id;
                        const loc2 = (locale in pt.name ? locale : 'uk') as 'uk' | 'ru' | 'en';
                        const isComfort = pt.id === 'comfort';
                        const isUltralight = pt.id === 'ultralight';
                        const ringColor = isComfort
                          ? 'ring-emerald-500'
                          : isUltralight
                            ? 'ring-amber-500'
                            : 'ring-sky-500';
                        const bgChecked = isComfort
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                          : isUltralight
                            ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                            : 'bg-sky-50 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800';
                        return (
                          <label
                            key={pt.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? `${bgChecked} ring-2 ${ringColor}`
                                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                            }`}
                          >
                            <input
                              type="radio"
                              name="plan_type"
                              value={pt.id}
                              checked={isSelected}
                              onChange={(e) => handleFormChange('plan_type', e.target.value)}
                              className="mt-0.5 h-4 w-4 text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {(pt.name as Record<string, string>)[loc2]}
                              </div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {(pt.description as Record<string, string>)[loc2]}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t('people_count')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={formData.people_count}
                      onChange={(e) => handleFormChange('people_count', parseInt(e.target.value) || 1)}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        {t('target_calories')}
                      </label>
                      <input
                        type="number"
                        min={planTypeConfig.targetCalories.min}
                        max={planTypeConfig.targetCalories.max}
                        step={50}
                        value={formData.target_calories}
                        onChange={(e) => handleFormChange('target_calories', parseInt(e.target.value) || planTypeConfig.targetCalories.default)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        {t('target_weight')}
                      </label>
                      <input
                        type="number"
                        min={planTypeConfig.targetWeight.min}
                        max={planTypeConfig.targetWeight.max}
                        step={10}
                        value={formData.target_weight_g}
                        onChange={(e) => handleFormChange('target_weight_g', parseInt(e.target.value) || planTypeConfig.targetWeight.default)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    {templatesForPlanType.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-2 text-xs text-[var(--color-brand)] font-medium">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        {t('template_hint')}
                      </div>
                    )}
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t('from_template')}
                    </label>
                    <select
                      value={formData.template_id}
                      onChange={(e) => handleFormChange('template_id', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">{t('no_template')}</option>
                      {templatesForPlanType.map((tmpl) => {
                        const loc3 = (locale in tmpl.name ? locale : 'uk') as 'uk' | 'ru' | 'en';
                        return (
                          <option key={tmpl.id} value={tmpl.id}>
                            {(tmpl.name as Record<string, string>)[loc3]}
                          </option>
                        );
                      })}
                    </select>
                    {formData.template_id && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {t('template_applied')}: {
                          (() => {
                            const sel = getMealTemplate(formData.template_id);
                            if (!sel) return '';
                            const loc4 = (locale in sel.description ? locale : 'uk') as 'uk' | 'ru' | 'en';
                            return (sel.description as Record<string, string>)[loc4];
                          })()
                        }
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="min-h-[44px] px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={saving || !formData.name.trim()}
                    className="min-h-[44px] px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed"
                  >
                    {saving ? tCommon('loading') : tCommon('save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {confirmDelete && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-sm p-6 pb-[max(1rem,env(safe-area-inset-bottom,1rem))]">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                {tCommon('delete')}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                {t('delete_confirm')}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="min-h-[44px] px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={deleting}
                  className="min-h-[44px] px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Deleting...
                    </>
                  ) : tCommon('delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}