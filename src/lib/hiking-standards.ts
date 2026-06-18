export type PlanTypeId = 'comfort' | 'standard' | 'ultralight';

export interface PlanTypeConfig {
  id: PlanTypeId;
  name: { uk: string; ru: string; en: string };
  description: { uk: string; ru: string; en: string };
  targetWeight: { min: number; max: number; default: number };
  targetCalories: { min: number; max: number; default: number };
  mealDistribution: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
  };
  macroRatio: {
    protein: number;
    fat: number;
    carbs: number;
  };
}

export const PLAN_TYPES: PlanTypeConfig[] = [
  {
    id: 'comfort',
    name: { uk: 'Комфортна', ru: 'Комфортная', en: 'Comfort' },
    description: {
      uk: '800–900 г/день. ПВД, легкі маршрути, базовий табір.',
      ru: '800–900 г/день. ПВД, лёгкие маршруты, базовый лагерь.',
      en: '800–900 g/day. Day hikes, easy routes, base camp.',
    },
    targetWeight: { min: 800, max: 900, default: 850 },
    targetCalories: { min: 3000, max: 3500, default: 3250 },
    mealDistribution: { breakfast: 0.28, lunch: 0.22, dinner: 0.33, snack: 0.17 },
    macroRatio: { protein: 0.15, fat: 0.30, carbs: 0.55 },
  },
  {
    id: 'standard',
    name: { uk: 'Стандартна', ru: 'Стандартная', en: 'Standard' },
    description: {
      uk: '600–700 г/день. Багатоденні походи 1–3 к.с.',
      ru: '600–700 г/день. Многодневные походы 1–3 к.с.',
      en: '600–700 g/day. Multi-day hikes, moderate difficulty.',
    },
    targetWeight: { min: 600, max: 700, default: 650 },
    targetCalories: { min: 2800, max: 3200, default: 3000 },
    mealDistribution: { breakfast: 0.28, lunch: 0.22, dinner: 0.33, snack: 0.17 },
    macroRatio: { protein: 0.15, fat: 0.30, carbs: 0.55 },
  },
  {
    id: 'ultralight',
    name: { uk: 'Легка', ru: 'Лёгкая', en: 'Ultralight' },
    description: {
      uk: '400–550 г/день. Складні маршрути, альпінізм, ультралайт.',
      ru: '400–550 г/день. Сложные маршруты, альпинизм, ультралайт.',
      en: '400–550 g/day. Hard routes, alpine, ultralight style.',
    },
    targetWeight: { min: 400, max: 550, default: 500 },
    targetCalories: { min: 2000, max: 2500, default: 2250 },
    mealDistribution: { breakfast: 0.28, lunch: 0.22, dinner: 0.33, snack: 0.17 },
    macroRatio: { protein: 0.15, fat: 0.30, carbs: 0.55 },
  },
];

export const DAY_ADAPTATION = [
  { fromDay: 1, toDay: 3, coefficient: 0.8, note: 'Adaptation, reduced appetite' },
  { fromDay: 4, toDay: 6, coefficient: 0.95, note: 'Adaptation completing' },
  { fromDay: 7, toDay: Infinity, coefficient: 1.0, note: 'Full caloric needs' },
];

export function getAdaptationCoefficient(dayNumber: number): number {
  const rule = DAY_ADAPTATION.find((r) => dayNumber >= r.fromDay && dayNumber <= r.toDay);
  return rule?.coefficient ?? 1.0;
}

export function getPlanType(id: PlanTypeId): PlanTypeConfig {
  return PLAN_TYPES.find((p) => p.id === id) ?? PLAN_TYPES[1];
}
