'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { MealPlan, MealDayWithEntries } from '@/lib/types';
import { formatWeight } from '@/lib/format';

const planTypeNames: Record<string, Record<string, string>> = {
  comfort: { uk: 'Комфорт', ru: 'Комфорт', en: 'Comfort' },
  standard: { uk: 'Стандарт', ru: 'Стандарт', en: 'Standard' },
  ultralight: { uk: 'Ультралайт', ru: 'Ультралайт', en: 'Ultralight' },
};

export default function ShoppingListPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const t = useTranslations('meals');
  const tCommon = useTranslations('common');

  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [days, setDays] = useState<MealDayWithEntries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<'uk' | 'ru' | 'en'>('uk');

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-[var(--color-brand)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!plan && !loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center p-12">
          <h3 className="text-base font-medium text-zinc-700 mb-2">
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

  const daysCount = days.length || 1;
  const peopleCount = plan?.people_count ?? 1;

  const planTypeName = planTypeNames[plan?.plan_type ?? 'standard']?.[locale] ?? plan?.plan_type ?? '';
  const today = new Date().toLocaleDateString(locale === 'uk' ? 'uk-UA' : locale === 'ru' ? 'ru-RU' : 'en-US');

  // Aggregate all meal entries across days, group by normalized name
  const map = new Map<string, { name: string; weight_g: number }>();
  for (const day of days) {
    for (const e of day.meal_entries || []) {
      const key = e.name.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.weight_g += e.weight_g;
      } else {
        map.set(key, { name: e.name.trim(), weight_g: e.weight_g });
      }
    }
  }
  const items = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, locale));
  const totalWeight = items.reduce((s, i) => s + i.weight_g, 0);

  return (
    <>
      <style>{`
        @page { margin: 1cm; }
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-white text-black w-full max-w-4xl mx-auto px-3 py-4 sm:p-6">

        <div className="no-print flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push(`/meals/${id}`)}
            className="flex items-center gap-1 text-sm text-zinc-600 hover:text-[var(--color-brand)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('back_to_plans')}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {tCommon('print')}
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-black mb-1">{t('shopping_list')}: {plan?.name ?? ''}</h1>
          <div className="text-sm text-zinc-600">
            {t('plan_type')}: {planTypeName} &nbsp;|&nbsp; {t('people')}: {peopleCount} &nbsp;|&nbsp; {t('days')}: {daysCount}
          </div>
          <div className="text-sm text-zinc-500 mt-1">{t('shopping_list_subtitle')}</div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p>{t('shopping_list_empty')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-zinc-300 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-zinc-100">
                    <th className="border border-zinc-300 px-2 py-1 text-right font-medium text-zinc-700 whitespace-nowrap w-10">#</th>
                    <th className="border border-zinc-300 px-2 py-1 text-left font-medium text-zinc-700">{t('product')}</th>
                    <th className="border border-zinc-300 px-2 py-1 text-right font-medium text-zinc-700 whitespace-nowrap">{tCommon('weight_g')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.name}>
                      <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums text-zinc-500">{idx + 1}</td>
                      <td className="border border-zinc-300 px-2 py-1 text-black break-words">{item.name}</td>
                      <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums text-black whitespace-nowrap">{formatWeight(item.weight_g, tCommon)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t-2 border-black pt-3 mt-4 text-right">
              <span className="text-base font-semibold text-black">
                {t('total_weight')}: {formatWeight(totalWeight, tCommon)}
              </span>
            </div>
          </>
        )}

        <div className="text-xs text-zinc-400 text-center pt-4 border-t border-zinc-200 mt-6">
          ProHikes &nbsp;|&nbsp; {today}
        </div>
      </div>
    </>
  );
}
