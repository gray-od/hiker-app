const DATE_LOCALES: Record<string, string> = {
  uk: 'uk-UA',
  ru: 'ru-RU',
  en: 'en-US',
};

export function formatWeight(grams: number, t?: (key: string) => string): string {
  const kg = t?.('weight_kg') ?? 'кг';
  const g = t?.('weight_g') ?? 'г';
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} ${kg}`;
  return `${grams} ${g}`;
}

export function formatDate(dateStr: string | null, locale?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(DATE_LOCALES[locale ?? 'uk'] ?? 'uk-UA');
}

export function formatKbju(
  p: number,
  f: number,
  c: number,
  cal: number,
  labels: { kcal: string; protein: string; fat: string; carbs: string },
): string {
  return `${Math.round(cal)} ${labels.kcal} · ${labels.protein}:${p.toFixed(1)} ${labels.fat}:${f.toFixed(1)} ${labels.carbs}:${c.toFixed(1)}`;
}
