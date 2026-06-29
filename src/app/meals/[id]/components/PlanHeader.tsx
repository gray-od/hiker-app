'use client';

interface PlanHeaderProps {
  planName: string;
  planId: string;
  onEdit: () => void;
  onTemplate: () => void;
  onDelete: () => void;
  t: (k: string) => string;
  tCommon: (k: string) => string;
}

export default function PlanHeader({
  planName,
  planId,
  onEdit,
  onTemplate,
  onDelete,
  t,
  tCommon,
}: PlanHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
        {planName}
      </h1>
      <div className="flex items-center gap-2">
        <a
          href={`/meals/${planId}/shopping`}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-[#75a93a] hover:bg-[#75a93a]/10 rounded-lg transition-colors"
          title={t('shopping_list')}
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-.532 2.062-1.434 2.683-2.566L19.5 6.75H5.106M7.5 14.25 5.106 6.75M7.5 14.25 6.106 18.75m0 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0Zm12 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0Z" />
          </svg>
        </a>
        <a
          href={`/meals/${planId}/print`}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-[#75a93a] hover:bg-[#75a93a]/10 rounded-lg transition-colors"
          title={tCommon('print')}
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 7.131H5.25" />
          </svg>
        </a>
        <button
          onClick={onEdit}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-[#75a93a] hover:bg-[#75a93a]/10 rounded-lg transition-colors"
          title={tCommon('edit')}
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onTemplate}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-[#75a93a] hover:bg-[#75a93a]/10 rounded-lg transition-colors"
          title={t('apply_template')}
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title={tCommon('delete')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
