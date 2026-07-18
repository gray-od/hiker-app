import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { fetchUserGear } from '@/lib/supabase/service';
import type { GearItem } from '@/lib/types';
import { formatWeight } from '@/lib/format';

export default function PrintGearPage() {
  const router = useRouter();
  const tGear = useTranslations('gear');
  const tCommon = useTranslations('common');

  const [items, setItems] = useState<GearItem[]>([]);
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

      const { data, error: fetchError } = await fetchUserGear(user.id);

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (data) {
        setItems(data);
      }

      setLoading(false);
    }).catch((err) => {
      console.error('Failed to load gear print:', err);
      setLoading(false);
      setError(tCommon('error_loading'));
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
  const totalWeight = items.reduce((sum, item) => sum + item.weight_g, 0);

  return (
    <div className="min-h-screen bg-white text-black">
      <Head>
        <title>ProHikes — {tGear('title')}</title>
      </Head>

      <div className="print:hidden flex items-center justify-between p-4 border-b border-zinc-200">
        <button
          onClick={() => router.push('/gear')}
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
            {tGear('title')}
          </h1>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8">{tGear('empty')}</p>
        ) : (
          <>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-zinc-300">
                    <th className="text-left px-3 py-1.5">{tGear('name')}</th>
                    <th className="text-left px-3 py-1.5">{tGear('category')}</th>
                    <th className="text-right px-3 py-1.5">{tGear('weight')}</th>
                    <th className="text-left px-3 py-1.5">{tGear('season_label')}</th>
                    <th className="text-left px-3 py-1.5">{tGear('notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-zinc-200">
                      <td className="px-3 py-1.5">
                        {item.name}
                      </td>
                      <td className="px-3 py-1.5 text-zinc-500">
                        {tGear(`categories.${item.category}`)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {formatWeight(item.weight_g, tCommon)}
                      </td>
                      <td className="px-3 py-1.5 text-zinc-500">
                        {tGear(`season.${item.season}`)}
                      </td>
                      <td className="px-3 py-1.5 text-zinc-500">
                        {item.notes || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t-2 border-zinc-300 pt-4 mb-8">
              <div className="grid grid-cols-2 gap-y-2 text-sm max-w-xs">
                <span className="text-zinc-500">{tGear('weight')}:</span>
                <span className="text-right tabular-nums font-medium">{formatWeight(totalWeight, tCommon)}</span>
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
