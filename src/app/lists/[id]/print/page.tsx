'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { GearList, ListItemWithGear } from '@/lib/types';
import { formatWeight, formatDate } from '@/lib/format';

export default function PrintListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations('lists');
  const tGear = useTranslations('gear');
  const tCommon = useTranslations('common');

  const [list, setList] = useState<GearList | null>(null);
  const [listItems, setListItems] = useState<ListItemWithGear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);

      const { data: listData, error: listError } = await supabase
        .from('gear_lists')
        .select('*')
        .eq('id', id)
        .single();

      if (listError || !listData) {
        setError(listError?.message || 'List not found');
        setLoading(false);
        return;
      }

      setList(listData as GearList);

      const { data: itemsData } = await supabase
        .from('list_items')
        .select('*, gear_item:gear_items(*)')
        .eq('list_id', id);

      if (itemsData) {
        setListItems(itemsData as ListItemWithGear[]);
      }

      setLoading(false);
    });
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-[var(--color-brand)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-white p-8 text-center">
        <p className="text-zinc-500 mb-4">{error || tCommon('empty')}</p>
        <button
          onClick={() => router.push('/lists')}
          className="text-sm text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] font-medium"
        >
          {t('back_to_lists')}
        </button>
      </div>
    );
  }

  const sortedItems = [...listItems].sort((a, b) => {
    const catA = a.gear_item?.category || '';
    const catB = b.gear_item?.category || '';
    if (catA < catB) return -1;
    if (catA > catB) return 1;
    const nameA = a.gear_item?.name || '';
    const nameB = b.gear_item?.name || '';
    return nameA.localeCompare(nameB);
  });

  const baseWeight = sortedItems.reduce((sum, li) => {
    if (li.worn || li.consumable) return sum;
    return sum + (li.gear_item?.weight_g || 0) * li.quantity;
  }, 0);

  const wornWeight = sortedItems.reduce((sum, li) => {
    if (!li.worn) return sum;
    return sum + (li.gear_item?.weight_g || 0) * li.quantity;
  }, 0);

  const consumableWeight = sortedItems.reduce((sum, li) => {
    if (!li.consumable) return sum;
    return sum + (li.gear_item?.weight_g || 0) * li.quantity;
  }, 0);

  const totalWeight = baseWeight + wornWeight + consumableWeight;

  const today = new Date().toLocaleDateString('uk-UA');

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="print:hidden flex items-center justify-between p-4 border-b border-zinc-200">
        <button
          onClick={() => router.push(`/lists/${id}`)}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-[var(--color-brand)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          ← {t('back_to_lists')}
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-medium rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {tCommon('print')}
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-6 md:p-8">
        <div className="mb-6">
          <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">
            ProHikes
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {list.name}
          </h1>
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-sm font-medium px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200">
            {tGear(`season.${list.season}`)}
          </span>
          {list.trip_date && (
            <span className="text-sm text-zinc-500">
              {formatDate(list.trip_date)}
            </span>
          )}
        </div>

        {sortedItems.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8">{t('no_items')}</p>
        ) : (
          <>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-zinc-300">
                    <th className="text-left px-3 py-1.5 w-10">☐</th>
                    <th className="text-left px-3 py-1.5">{tGear('name')}</th>
                    <th className="text-left px-3 py-1.5 hidden md:table-cell">{tGear('category')}</th>
                    <th className="text-right px-3 py-1.5">{tCommon('weight_g')}</th>
                    <th className="text-right px-3 py-1.5 w-12">{t('quantity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => {
                    const gear = item.gear_item;
                    if (!gear) return null;
                    const itemWeight = gear.weight_g * item.quantity;
                    return (
                      <tr key={item.id} className="border-b border-zinc-200">
                        <td className="px-3 py-1.5 text-center text-lg">
                          ☐
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={item.is_packed ? 'line-through text-zinc-400' : ''}>
                            {gear.name}
                          </span>
                          {item.worn && (
                            <span className="ml-1.5 text-xs text-zinc-400">
                              ({t('worn').toLowerCase()})
                            </span>
                          )}
                          {item.consumable && (
                            <span className="ml-1.5 text-xs text-zinc-400">
                              ({t('consumable').toLowerCase()})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-zinc-500 hidden md:table-cell">
                          {tGear(`categories.${gear.category}`)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {formatWeight(itemWeight, tCommon)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {item.quantity}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t-2 border-zinc-300 pt-4 mb-8">
              <div className="grid grid-cols-2 gap-y-2 text-sm max-w-xs">
                <span className="text-zinc-500">{t('base_weight')}:</span>
                <span className="text-right tabular-nums font-medium">{formatWeight(baseWeight, tCommon)}</span>

                <span className="text-zinc-500">{t('worn_weight')}:</span>
                <span className="text-right tabular-nums font-medium">{formatWeight(wornWeight, tCommon)}</span>

                <span className="text-zinc-500">{t('consumable_weight')}:</span>
                <span className="text-right tabular-nums font-medium">{formatWeight(consumableWeight, tCommon)}</span>

                <span className="text-zinc-500 font-semibold border-t border-zinc-300 pt-1">{t('total_weight')}:</span>
                <span className="text-right tabular-nums font-bold border-t border-zinc-300 pt-1">{formatWeight(totalWeight, tCommon)}</span>
              </div>
            </div>
          </>
        )}

        <div className="text-xs text-zinc-400 border-t border-zinc-200 pt-4 mt-8">
          ProHikes &nbsp;|&nbsp; {tCommon('generated')}: {today}
        </div>
      </div>
    </div>
  );
}
