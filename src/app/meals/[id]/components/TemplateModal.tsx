'use client';

import { MEAL_TEMPLATES } from '@/lib/meal-templates';

interface TemplateModalProps {
  open: boolean;
  planType: string;
  applyingTemplate: boolean;
  locale: string;
  onClose: () => void;
  onApply: (templateId: string) => void;
  t: (k: string) => string;
  tCommon: (k: string) => string;
}

export default function TemplateModal({
  open,
  planType,
  applyingTemplate,
  locale,
  onClose,
  onApply,
  t,
  tCommon,
}: TemplateModalProps) {
  if (!open) return null;

  const loc = (['uk', 'ru', 'en'].includes(locale) ? locale : 'uk') as 'uk' | 'ru' | 'en';
  const matchingTemplates = MEAL_TEMPLATES.filter(tmpl => tmpl.planType === planType);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">{t('apply_template')}</h3>
        <div className="space-y-2">
          {matchingTemplates.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => onApply(tmpl.id)}
              disabled={applyingTemplate}
              className="w-full text-left p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand)]/5 transition-colors"
            >
              <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                {tmpl.name[loc]}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {tmpl.description[loc]}
              </div>
            </button>
          ))}
          {matchingTemplates.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">{t('no_template')}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          {tCommon('cancel')}
        </button>
      </div>
    </div>
  );
}
