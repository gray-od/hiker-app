'use client';

import Modal from '@/components/Modal';
import { inputClass, cn } from '@/lib/cn';

const SEASONS = ['summer', 'winter', 'demi'] as const;

interface EditListModalProps {
  open: boolean;
  onClose: () => void;
  editForm: { name: string; season: string; trip_date: string };
  saving: boolean;
  onSave: () => void;
  onFieldChange: (field: string, value: string) => void;
  t: (key: string) => string;
  tCommon: (key: string) => string;
  tGear: (key: string) => string;
}

export default function EditListModal({
  open,
  onClose,
  editForm,
  saving,
  onSave,
  onFieldChange,
  t,
  tCommon,
  tGear,
}: EditListModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={t('edit_list')} maxWidth="max-w-md">
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
            {t('season')}
          </label>
          <select
            value={editForm.season}
            onChange={(e) => onFieldChange('season', e.target.value)}
            className={inputClass}
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
            onChange={(e) => onFieldChange('trip_date', e.target.value)}
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
          className="px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed"
        >
          {saving ? tCommon('loading') : tCommon('save')}
        </button>
      </div>
    </Modal>
  );
}
