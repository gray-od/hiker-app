export function formatWeight(grams: number, t?: (key: string) => string): string {
  const kg = t?.('weight_kg') ?? 'кг';
  const g = t?.('weight_g') ?? 'г';
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} ${kg}`;
  return `${grams} ${g}`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export function formatKbju(p: number, f: number, c: number, cal: number): string {
  return `${Math.round(cal)} ккал · Б:${p.toFixed(1)} Ж:${f.toFixed(1)} В:${c.toFixed(1)}`;
}
