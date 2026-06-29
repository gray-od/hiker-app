'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { UserFoodItem } from '@/lib/types';

export default function PrintFoodPage() {
  const router = useRouter();
  const tFood = useTranslations('food');
  const tCommon = useTranslations('common');

  const [items, setItems] = useState<UserFoodItem[]>([]);
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

      const { data, error: fetchError } = await supabase
        .from('user_food_items')
        .select('*')
        .eq('user_id', user.id)
        .order('category')
        .order('name');

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (data) {
        setItems(data as UserFoodItem[]);
      }

      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-[var(--color-brand)] rounded-full animate-spin" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString('uk-UA');

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="print:hidden flex items-center justify-between p-4 border-b border-zinc-200">
        <button
          onClick={() => router.push('/food')}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-[var(--color-brand)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          ← {tCommon('back')}
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
            {tFood('title')}
          </h1>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8">{tFood('empty')}</p>
        ) : (
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-zinc-300">
                  <th className="text-left px-3 py-1.5">{tFood('name')}</th>
                  <th className="text-left px-3 py-1.5">{tFood('category')}</th>
                  <th className="text-right px-3 py-1.5">{tFood('calories')}</th>
                  <th className="text-right px-3 py-1.5">{tFood('protein_short')}</th>
                  <th className="text-right px-3 py-1.5">{tFood('fat_short')}</th>
                  <th className="text-right px-3 py-1.5">{tFood('carbs_short')}</th>
                  <th className="text-right px-3 py-1.5">{tFood('portion_short')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-200">
                    <td className="px-3 py-1.5">
                      {item.name}
                    </td>
                    <td className="px-3 py-1.5 text-zinc-500">
                      {tFood(`categories.${item.category}`)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {item.calories_per100g}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {item.protein_per100g}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {item.fat_per100g}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {item.carbs_per100g}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {item.default_portion_g} {tCommon('weight_g')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-xs text-zinc-400 border-t border-zinc-200 pt-4 mt-8">
          ProHikes &nbsp;|&nbsp; {tCommon('generated')}: {today}
        </div>
      </div>
    </div>
  );
}
