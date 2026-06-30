'use client';

import { useEffect, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import type { MealEntry, UserFoodItem } from '@/lib/types';
import {
  FOOD_CATALOG,
  FOOD_CATEGORY_NAMES,
  calculateNutrition,
  type FoodItem,
  type FoodCategory,
} from '@/lib/food-catalog';
import { inputClass, cn } from '@/lib/cn';

const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

interface EntryModalProps {
  open: boolean;
  editEntryId: string | null;
  entryMode: 'catalog' | 'my_products' | 'custom';
  entryForm: {
    meal_type: MealEntry['meal_type'];
    name: string;
    weight_g: number;
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  };
  selectedProduct: FoodItem | null;
  selectedUserProduct: UserFoodItem | null;
  portionG: number;
  categoryFilter: FoodCategory | '';
  productSearch: string;
  userFoodItems: UserFoodItem[];
  saving: boolean;
  actionError: string | null;
  locale: string;
  foodCategories: FoodCategory[];
  onClose: () => void;
  onSave: () => void;
  onEntryModeChange: (mode: 'catalog' | 'my_products' | 'custom') => void;
  onSelectProduct: (product: FoodItem) => void;
  onSelectUserProduct: (product: UserFoodItem) => void;
  onPortionChange: (g: number) => void;
  onCategoryFilterChange: (cat: FoodCategory | '') => void;
  onProductSearchChange: (q: string) => void;
  onEntryFormChange: (field: string, value: string | number) => void;
  t: (k: string) => string;
  tCommon: (k: string) => string;
}

export default function EntryModal({
  open,
  editEntryId,
  entryMode,
  entryForm,
  selectedProduct,
  selectedUserProduct,
  portionG,
  categoryFilter,
  productSearch,
  userFoodItems,
  saving,
  actionError,
  locale,
  foodCategories,
  onClose,
  onSave,
  onEntryModeChange,
  onSelectProduct,
  onSelectUserProduct,
  onPortionChange,
  onCategoryFilterChange,
  onProductSearchChange,
  onEntryFormChange,
  t,
  tCommon,
}: EntryModalProps) {
  if (!open) return null;

  const debouncedSearch = useDebounce(productSearch, 200);

  const filteredProducts = useMemo(() => FOOD_CATALOG.filter(p => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      const name = p.name[locale as 'uk' | 'ru' | 'en'].toLowerCase();
      if (!name.includes(search)) return false;
    }
    return true;
  }), [categoryFilter, debouncedSearch, locale]);

  const catalogNutrition = selectedProduct ? calculateNutrition(selectedProduct, portionG) : null;

  const filteredUserProducts = useMemo(() => userFoodItems.filter(p => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      if (!p.name.toLowerCase().includes(search)) return false;
    }
    return true;
  }), [categoryFilter, debouncedSearch, userFoodItems]);

  const userProductNutrition = selectedUserProduct ? {
    calories: Math.round(selectedUserProduct.calories_per100g * portionG / 100),
    protein: Math.round(selectedUserProduct.protein_per100g * portionG / 100 * 10) / 10,
    fat: Math.round(selectedUserProduct.fat_per100g * portionG / 100 * 10) / 10,
    carbs: Math.round(selectedUserProduct.carbs_per100g * portionG / 100 * 10) / 10,
  } : null;

  const isDisabled =
    saving ||
    (entryMode === 'catalog' && !editEntryId && (!selectedProduct || portionG <= 0)) ||
    (entryMode === 'my_products' && !editEntryId && (!selectedUserProduct || portionG <= 0)) ||
    (entryMode === 'custom' && !entryForm.name.trim());

  useEffect(() => {
    const onResize = () => {
      if (window.visualViewport) {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && activeEl.tagName === 'INPUT') {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };
    window.visualViewport?.addEventListener('resize', onResize);
    return () => window.visualViewport?.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom,1rem))]">
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
                onClick={() => onEntryModeChange('catalog')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${entryMode === 'catalog' ? 'border-[var(--color-brand)] text-[var(--color-brand)]' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                {t('from_catalog')}
              </button>
              <button
                onClick={() => onEntryModeChange('my_products')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${entryMode === 'my_products' ? 'border-[var(--color-brand)] text-[var(--color-brand)]' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                {t('my_products')}
              </button>
              <button
                onClick={() => onEntryModeChange('custom')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${entryMode === 'custom' ? 'border-[var(--color-brand)] text-[var(--color-brand)]' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                {t('custom_entry')}
              </button>
            </div>
          )}

          {entryMode === 'catalog' && !editEntryId ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('meal_type')}
                </label>
                <select
                  value={entryForm.meal_type}
                  onChange={(e) =>
                    onEntryFormChange('meal_type', e.target.value)
                  }
                  className={inputClass}
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
                  onChange={(e) => onCategoryFilterChange(e.target.value as FoodCategory | '')}
                  className={inputClass}
                >
                  <option value="">{t('all_categories')}</option>
                  {foodCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {FOOD_CATEGORY_NAMES[cat][locale as 'uk' | 'ru' | 'en']}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => onProductSearchChange(e.target.value)}
                  placeholder={t('search_product')}
                  maxLength={200}
                  className={cn(inputClass, 'placeholder-zinc-400')}
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
                    onClick={() => onSelectProduct(product)}
                    className={`w-full text-left px-3 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                      selectedProduct?.id === product.id
                        ? 'bg-[var(--color-brand)]/10 border-l-2 border-[var(--color-brand)]'
                        : ''
                    }`}
                  >
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {product.name[locale as 'uk' | 'ru' | 'en']}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {FOOD_CATEGORY_NAMES[product.category][locale as 'uk' | 'ru' | 'en']} · {product.per100g.calories} {t('kcal')}/{t('per_100g')}
                    </div>
                  </button>
                ))}
              </div>

              {selectedProduct && (
                <div className="space-y-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedProduct.name[locale as 'uk' | 'ru' | 'en']}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t('portion')}
                    </label>
                    <input
                      type="number"
                      value={portionG}
                      onChange={(e) => onPortionChange(Number(e.target.value))}
                      min="0"
                      step="1"
                      className={inputClass}
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
          ) : entryMode === 'my_products' && !editEntryId ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('meal_type')}
                </label>
                <select
                  value={entryForm.meal_type}
                  onChange={(e) =>
                    onEntryFormChange('meal_type', e.target.value)
                  }
                  className={inputClass}
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
                  onChange={(e) => onCategoryFilterChange(e.target.value as FoodCategory | '')}
                  className={inputClass}
                >
                  <option value="">{t('all_categories')}</option>
                  {foodCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {FOOD_CATEGORY_NAMES[cat][locale as 'uk' | 'ru' | 'en']}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => onProductSearchChange(e.target.value)}
                  placeholder={t('search_product')}
                  maxLength={200}
                  className={cn(inputClass, 'placeholder-zinc-400')}
                />
              </div>

              <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredUserProducts.length === 0 && (
                  <p className="px-3 py-4 text-sm text-zinc-400 dark:text-zinc-500 text-center">
                    {tCommon('empty')}
                  </p>
                )}
                {filteredUserProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => onSelectUserProduct(product)}
                    className={`w-full text-left px-3 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                      selectedUserProduct?.id === product.id
                        ? 'bg-[var(--color-brand)]/10 border-l-2 border-[var(--color-brand)]'
                        : ''
                    }`}
                  >
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {product.name}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {product.calories_per100g} {t('kcal')}/{t('per_100g')}
                    </div>
                  </button>
                ))}
              </div>

              {selectedUserProduct && (
                <div className="space-y-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedUserProduct.name}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t('portion')}
                    </label>
                    <input
                      type="number"
                      value={portionG}
                      onChange={(e) => onPortionChange(Number(e.target.value))}
                      min="0"
                      step="1"
                      className={inputClass}
                    />
                  </div>
                  {userProductNutrition && (
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-white dark:bg-zinc-900 rounded-lg p-2 text-center">
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('kcal')}</div>
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {userProductNutrition.calories}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 rounded-lg p-2 text-center">
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('protein')}</div>
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {userProductNutrition.protein}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 rounded-lg p-2 text-center">
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('fat')}</div>
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {userProductNutrition.fat}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 rounded-lg p-2 text-center">
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('carbs')}</div>
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {userProductNutrition.carbs}
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
                    onEntryFormChange('meal_type', e.target.value)
                  }
                  className={inputClass}
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
                  onChange={(e) => onEntryFormChange('name', e.target.value)}
                  required
                  maxLength={200}
                  className={cn(inputClass, 'placeholder-zinc-400')}
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
                    onChange={(e) => onEntryFormChange('weight_g', Number(e.target.value))}
                    min="0"
                    step="1"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('calories_label')}
                  </label>
                  <input
                    type="number"
                    value={entryForm.calories}
                    onChange={(e) => onEntryFormChange('calories', Number(e.target.value))}
                    min="0"
                    step="1"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('protein')}
                  </label>
                  <input
                    type="number"
                    value={entryForm.protein_g}
                    onChange={(e) => onEntryFormChange('protein_g', Number(e.target.value))}
                    min="0"
                    step="0.1"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('fat')}
                  </label>
                  <input
                    type="number"
                    value={entryForm.fat_g}
                    onChange={(e) => onEntryFormChange('fat_g', Number(e.target.value))}
                    min="0"
                    step="0.1"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('carbs')}
                  </label>
                  <input
                    type="number"
                    value={entryForm.carbs_g}
                    onChange={(e) => onEntryFormChange('carbs_g', Number(e.target.value))}
                    min="0"
                    step="0.1"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              {tCommon('cancel')}
            </button>
            <button
              onClick={onSave}
              disabled={isDisabled}
              className="min-h-[44px] px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed"
            >
              {saving ? tCommon('loading') : tCommon('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
