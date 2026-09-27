const DATE_LOCALES: Record<string, string> = {
  uk: 'uk-UA',
  ru: 'ru-RU',
  en: 'en-US',
};

const numberFormats = new Map<string, Intl.NumberFormat>();

/** Locale-aware number, no grouping; minimumFractionDigits forces decimals (kg), 0 keeps integers (g). */
export function formatNumber(value: number, locale: string, minimumFractionDigits = 0): string {
  const key = `${locale}:${minimumFractionDigits}`;
  let formatter = numberFormats.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { minimumFractionDigits, maximumFractionDigits: 1, useGrouping: false });
    numberFormats.set(key, formatter);
  }
  return formatter.format(value);
}

export function formatWeight(grams: number, locale: string, t?: (key: string) => string): string {
  const kg = t?.('weight_kg') ?? 'кг';
  const g = t?.('weight_g') ?? 'г';
  if (grams >= 1000) return `${formatNumber(grams / 1000, locale, 1)} ${kg}`;
  return `${formatNumber(grams, locale)} ${g}`;
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
  locale: string,
): string {
  return `${Math.round(cal)} ${labels.kcal} · ${labels.protein}:${formatNumber(p, locale, 1)} ${labels.fat}:${formatNumber(f, locale, 1)} ${labels.carbs}:${formatNumber(c, locale, 1)}`;
}
