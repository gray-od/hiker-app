'use client';

import type { GearItem, ListItemWithGear } from '@/lib/types';
import { formatWeight } from '@/lib/format';
import { inputClass, cn } from '@/lib/cn';
import Modal from '@/components/Modal';

interface AddItemsModalProps {
  open: boolean;
  onClose: () => void;
  allGear: GearItem[];
  listItems: ListItemWithGear[];
  searchQuery: string;
  selectedGearIds: Set<string>;
  onToggleGearSelection: (id: string) => void;
  onSearchChange: (q: string) => void;
  onAdd: () => void;
  t: (key: string) => string;
  tCommon: (key: string) => string;
  tGear: (key: string) => string;
}

export default function AddItemsModal({
  open,
  onClose,
  allGear,
  listItems,
  searchQuery,
  selectedGearIds,
  onToggleGearSelection,
  onSearchChange,
  onAdd,
  t,
  tCommon,
  tGear,
}: AddItemsModalProps) {
  const listItemGearIds = new Set(listItems.map(li => li.gear_item_id));
  const filteredGear = allGear.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const availableGear = filteredGear.filter(g => !listItemGearIds.has(g.id));

  return (
    <Modal open={open} onClose={onClose} title={t('select_items')} maxWidth="max-w-md">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('search_gear')}
          maxLength={200}
          className={cn(inputClass, 'placeholder-zinc-400')}
        />
      </div>

      <div className="max-h-[50vh] overflow-y-auto space-y-2 py-2">
        {allGear.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
            {t('no_gear_hint')}
          </p>
        )}

        {allGear.length > 0 && filteredGear.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
            {tCommon('empty')}
          </p>
        )}

        {allGear.length > 0 && filteredGear.length > 0 && availableGear.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
            {t('all_added')}
          </p>
        )}

        {availableGear.map((gear) => (
          <label
            key={gear.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedGearIds.has(gear.id)}
              onChange={() => onToggleGearSelection(gear.id)}
              className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
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
                  {formatWeight(gear.weight_g, tCommon)}
                </span>
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {selectedGearIds.size > 0
            ? `${tCommon('add')}: ${selectedGearIds.size}`
            : ''}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            {tCommon('cancel')}
          </button>
          <button
            onClick={onAdd}
            disabled={selectedGearIds.size === 0}
            className="px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed"
          >
            {tCommon('add')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
