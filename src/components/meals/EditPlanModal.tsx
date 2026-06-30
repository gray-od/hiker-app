'use client';

import Modal from '@/components/Modal';
import LoadingSpinner from '@/components/LoadingSpinner';
import { inputClass, cn } from '@/lib/cn';
import { PLAN_TYPES } from '@/lib/hiking-standards';

interface EditPlanModalProps {
  open: boolean;
  editForm: {
    name: string;
    plan_type: string;
    people_count: number;
    target_calories: number;
    target_weight_g: number;
  };
  saving: boolean;
  actionError: string | null;
  locale: string;
  onClose: () => void;
  onSave: () => void;
  onFieldChange: (field: string, value: string | number) => void;
  t: (k: string) => string;
  tCommon: (k: string) => string;
}

export default function EditPlanModal({
  open,
  editForm,
  saving,
  actionError,
  locale,
  onClose,
  onSave,
  onFieldChange,
  t,
  tCommon,
}: EditPlanModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={t('edit_plan')}>
      {actionError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {actionError}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t('name')}
          </label>
          <input
            type="text"
            value={editForm.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            required
            maxLength={200}
            className={cn(inputClass, 'placeholder-zinc-400')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t('plan_type')}
          </label>
          <select
            value={editForm.plan_type}
            onChange={(e) => onFieldChange('plan_type', e.target.value)}
            className={inputClass}
          >
            {PLAN_TYPES.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name[locale as 'uk' | 'ru' | 'en']}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t('people_count')}
          </label>
          <input
            type="number"
            value={editForm.people_count}
            onChange={(e) => onFieldChange('people_count', Number(e.target.value))}
            min="1"
            step="1"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t('target_calories')}
          </label>
          <input
            type="number"
            value={editForm.target_calories}
            onChange={(e) => onFieldChange('target_calories', Number(e.target.value))}
            min="0"
            step="1"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t('target_weight')}
          </label>
          <input
            type="number"
            value={editForm.target_weight_g}
            onChange={(e) => onFieldChange('target_weight_g', Number(e.target.value))}
            min="0"
            step="1"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className="min-h-[44px] px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          {tCommon('cancel')}
        </button>
        <button
          onClick={onSave}
          disabled={saving || !editForm.name.trim()}
          className="min-h-[44px] px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {saving && <LoadingSpinner size="sm" />}
          {tCommon('save')}
        </button>
      </div>
    </Modal>
  );
}
