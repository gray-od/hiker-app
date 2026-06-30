import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { GearItem } from '@/lib/types';
import { formatWeight } from '@/lib/format';
import { inputClass, cn } from '@/lib/cn';
import { fetchUserGear } from '@/lib/supabase/service';
import { toast } from '@/lib/toast';
import LoadingSpinner from '@/components/LoadingSpinner';

const CATEGORIES = [
  'backpack', 'shelter', 'sleep_system', 'cooking', 'water',
  'clothing', 'footwear', 'lighting', 'navigation', 'safety',
  'hygiene', 'electronics', 'tools', 'documents', 'technical', 'other',
] as const;

const SEASONS = ['all', 'summer', 'winter', 'demi'] as const;

const EMPTY_FORM = {
  name: '',
  category: 'other',
  weight_g: 0,
  season: 'all',
  notes: '',
};

export default function GearPage() {
  const router = useRouter();
  const tGear = useTranslations('gear');
  const tCommon = useTranslations('common');

  const [items, setItems] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<GearItem | null>(null);
  const [formData, setFormData] = useState<Omit<GearItem, 'id' | 'user_id' | 'created_at'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);

      fetchUserGear(user.id).then(({ data, error }) => {
        if (error) {
          console.error('Failed to load gear:', error);
          setError(tCommon('error_loading'));
        } else if (data) {
          setItems(data);
        }
        setLoading(false);
      });
    });
  }, [router]);

  function openAddModal() {
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditModal(item: GearItem) {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      weight_g: item.weight_g,
      season: item.season,
      notes: item.notes || '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    setSaving(true);
    setError(null);

    const payload = {
      name: formData.name,
      category: formData.category,
      weight_g: Math.round(formData.weight_g),
      season: formData.season,
      notes: formData.notes,
    };

    if (editingItem) {
      const { error: updateError } = await supabase
        .from('gear_items')
        .update(payload)
        .eq('id', editingItem.id);

      if (updateError) {
        toast.error(updateError.message || tCommon('error_occurred'));
        setError(updateError.message);
        setSaving(false);
        return;
      }

      toast.success(tGear('updated'));
      setItems(prev =>
        prev.map(i =>
          i.id === editingItem.id
            ? { ...i, ...payload }
            : i,
        ),
      );
    } else {
      const { data, error: insertError } = await supabase
        .from('gear_items')
        .insert({
          user_id: user.id,
          ...payload,
        })
        .select()
        .single();

      if (insertError) {
        toast.error(insertError.message || tCommon('error_occurred'));
        setError(insertError.message);
        setSaving(false);
        return;
      }

      toast.success(tGear('created'));
      if (data) {
        setItems(prev => [data as GearItem, ...prev]);
      }
    }

    setSaving(false);
    setModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      toast.error(msg || tCommon('error_occurred'));
      setError(msg);
    }
  }

  async function handleDelete(id: string) {
    try {
    setDeleting(true);
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('gear_items')
      .delete()
      .eq('id', id);

    if (deleteError) {
      toast.error(deleteError.message || tCommon('error_occurred'));
      setError(deleteError.message);
      setConfirmDelete(null);
      setDeleting(false);
      return;
    }

    toast.success(tGear('deleted'));
    setItems(prev => prev.filter(i => i.id !== id));
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
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <Head>
        <title>ProHikes — {tGear('title')}</title>
      </Head>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {tGear('title')}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{tGear('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/gear/print"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 text-zinc-500 hover:text-[var(--color-brand)] text-sm font-medium rounded-xl transition-colors"
            title={tCommon('print')}
          >
            <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 7.131H5.25" />
            </svg>
            <span className="hidden md:inline">{tCommon('print')}</span>
          </a>
          <button
            onClick={openAddModal}
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
            {tGear('add_item')}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-zinc-200 dark:border-zinc-700 border-t-[var(--color-brand)] rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
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
              d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
          <h2 className="text-base font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            {tGear('empty')}
          </h2>
        </div>
      )}

      {/* Gear items */}
      {!loading && items.length > 0 && (
        <>
          <div className="mt-6 space-y-3 md:hidden">
            {items.map((item) => (
              <div key={item.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {item.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {tGear(`categories.${item.category}`)}
                      </span>
                      <span className="text-zinc-300 dark:text-zinc-600">·</span>
                      <span className="text-sm text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {formatWeight(item.weight_g, tCommon)}
                      </span>
                      <span className="text-zinc-300 dark:text-zinc-600">·</span>
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {tGear(`season.${item.season}`)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(item)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-[var(--color-brand)] hover:bg-[var(--color-brand)]/10 rounded-lg transition-colors"
                      title={tCommon('edit')}
                      aria-label={tCommon('edit')}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setConfirmDelete(item.id)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title={tCommon('delete')}
                      aria-label={tCommon('delete')}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                      {tGear('name')}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                      {tGear('category')}
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                      {tGear('weight')}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                      {tGear('season_label')}
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {tGear(`categories.${item.category}`)}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400 whitespace-nowrap tabular-nums">
                        {formatWeight(item.weight_g, tCommon)}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {tGear(`season.${item.season}`)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-[var(--color-brand)] hover:bg-[var(--color-brand)]/10 rounded-lg transition-colors"
                            title={tCommon('edit')}
                            aria-label={tCommon('edit')}
                          >
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setConfirmDelete(item.id)}
                            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title={tCommon('delete')}
                            aria-label={tCommon('delete')}
                          >
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md pb-[max(1rem,env(safe-area-inset-bottom,1rem))]">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                {editingItem ? tCommon('edit') : tGear('add_item')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {tGear('name')}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    required
                    maxLength={200}
                    className={cn(inputClass, 'placeholder-zinc-400')}
                    placeholder={tGear('name')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {tGear('category')}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    className={inputClass}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {tGear(`categories.${cat}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {tGear('weight')}, г
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.weight_g > 0 ? formData.weight_g : ''}
                    onChange={(e) => { const v = e.target.value; handleFormChange('weight_g', v === '' ? 0 : parseFloat(v)); }}
                    min={0}
                    step={1}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {tGear('season_label')}
                  </label>
                  <select
                    value={formData.season}
                    onChange={(e) => handleFormChange('season', e.target.value)}
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
                    {tGear('notes')}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    rows={3}
                    className={cn(inputClass, 'placeholder-zinc-400 resize-none')}
                    placeholder={tGear('notes')}
                  />
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
                  onClick={handleSave}
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

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-sm p-6 pb-[max(1rem,env(safe-area-inset-bottom,1rem))]">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {tCommon('delete')}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              {tGear('delete_confirm')}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed flex items-center gap-2"
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
  );
}
