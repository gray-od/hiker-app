'use client';

import type { GearList } from '@/lib/types';
import { getSeasonBadgeClass } from '@/lib/badges';
import { formatDate } from '@/lib/format';

interface GpxSectionProps {
  list: GearList | null;
  gpxUploading: boolean;
  gpxError: string | null;
  t: (key: string) => string;
  tGear: (key: string) => string;
  onGpxUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onShowOnMap: () => void;
  onDownload: () => void;
  onRemove: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function GpxSection({
  list,
  gpxUploading,
  gpxError,
  t,
  tGear,
  onGpxUpload,
  onShowOnMap,
  onDownload,
  onRemove,
  fileInputRef,
}: GpxSectionProps) {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx"
        onChange={onGpxUpload}
        className="hidden"
      />

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getSeasonBadgeClass(list!.season)}`}>
            {tGear(`season.${list!.season}`)}
          </span>
          {list!.trip_date && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {formatDate(list!.trip_date)}
            </span>
          )}
          {list!.gpx_data && (
            <>
              <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1" title={t('gpx_distance')}>
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="2.5" cy="8" r="1.5"/><line x1="4" y1="8" x2="12" y2="8"/><circle cx="13.5" cy="8" r="1.5"/></svg>
                {list!.gpx_data.distance_km} {t('gpx_km')}
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1" title={t('gpx_elevation_gain')}>
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,11 8,5 8,5"/><polyline points="5,7 8,5 11,7"/><line x1="8" y1="5" x2="8" y2="14"/></svg>
                +{list!.gpx_data.elevation_gain_m} {t('gpx_m')}
              </span>
              {list!.gpx_data.max_elevation_m != null && list!.gpx_data.max_elevation_m > 0 && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1" title={t('gpx_max_elevation')}>
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><polygon points="8,2 14,12 2,12"/></svg>
                  {list!.gpx_data.max_elevation_m} {t('gpx_m')}
                </span>
              )}
            </>
          )}
        </div>
        {!list!.gpx_data && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={gpxUploading}
            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-[var(--color-brand)]/10 hover:text-[var(--color-brand)] transition-colors min-h-[44px] flex items-center gap-1.5"
            aria-label={t('upload_gpx')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17,8 12,3 7,8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {gpxUploading ? t('gpx_loading') : t('upload_gpx')}
          </button>
        )}
        {gpxError && (
          <div className="text-xs text-red-500 w-full">{gpxError}</div>
        )}
      </div>

      {list?.gpx_data?.weather && (
        <div className="flex items-center gap-2 mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
          </svg>
          <span>{t('gpx_weather')}: {list.gpx_data.weather}</span>
        </div>
      )}
      {list?.gpx_data && (
        <div className="flex items-center gap-2 mb-4">
          {typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && (
            <button
              onClick={onShowOnMap}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-[var(--color-brand)]/10 hover:text-[var(--color-brand)] transition-colors min-h-[44px] flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {t('gpx_show_on_map')}
            </button>
          )}
          <button
            onClick={onDownload}
            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-[var(--color-brand)]/10 hover:text-[var(--color-brand)] transition-colors min-h-[44px] flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {t('gpx_download')}
          </button>
          <button
            onClick={onRemove}
            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px] flex items-center gap-1.5"
            title={t('gpx_remove')}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            {t('gpx_remove')}
          </button>
        </div>
      )}
    </>
  );
}
