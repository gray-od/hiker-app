import type { PlanTypeId } from './hiking-standards';

export interface TemplateMealEntry {
  catalogId: string;
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  portionMultiplier?: number;
}

export interface TemplateDayPattern {
  entries: TemplateMealEntry[];
}

export interface MealTemplate {
  id: string;
  name: { uk: string; ru: string; en: string };
  description: { uk: string; ru: string; en: string };
  planType: PlanTypeId;
  dayPatterns: TemplateDayPattern[];
}

export const MEAL_TEMPLATES: MealTemplate[] = [
  {
    id: 'standard_3day',
    name: {
      uk: 'Стандартний похід',
      ru: 'Стандартный поход',
      en: 'Standard Hike',
    },
    description: {
      uk: 'Збалансована розкладка 600–700 г/день. Ротація 3 дні.',
      ru: 'Сбалансированная раскладка 600–700 г/день. Ротация 3 дня.',
      en: 'Balanced plan 600–700 g/day. 3-day rotation.',
    },
    planType: 'standard',
    dayPatterns: [
      {
        entries: [
          { catalogId: 'oatmeal', mealType: 'breakfast' },
          { catalogId: 'dry_milk', mealType: 'breakfast' },
          { catalogId: 'raisins', mealType: 'breakfast' },
          { catalogId: 'sugar', mealType: 'breakfast' },
          { catalogId: 'black_tea', mealType: 'breakfast' },
          { catalogId: 'crackers', mealType: 'breakfast' },

          { catalogId: 'smoked_sausage', mealType: 'lunch' },
          { catalogId: 'hard_cheese', mealType: 'lunch' },
          { catalogId: 'crispbread', mealType: 'lunch' },
          { catalogId: 'black_tea', mealType: 'lunch' },

          { catalogId: 'trail_mix', mealType: 'snack' },
          { catalogId: 'dark_chocolate', mealType: 'snack' },

          { catalogId: 'buckwheat', mealType: 'dinner' },
          { catalogId: 'jerky', mealType: 'dinner' },
          { catalogId: 'dried_vegetables', mealType: 'dinner' },
          { catalogId: 'vegetable_oil', mealType: 'dinner' },
          { catalogId: 'black_tea', mealType: 'dinner' },
          { catalogId: 'sugar', mealType: 'dinner' },
        ],
      },
      {
        entries: [
          { catalogId: 'millet', mealType: 'breakfast' },
          { catalogId: 'dry_milk', mealType: 'breakfast' },
          { catalogId: 'dried_apricots', mealType: 'breakfast' },
          { catalogId: 'sugar', mealType: 'breakfast' },
          { catalogId: 'instant_coffee', mealType: 'breakfast' },
          { catalogId: 'crackers', mealType: 'breakfast' },

          { catalogId: 'canned_tuna', mealType: 'lunch' },
          { catalogId: 'crispbread', mealType: 'lunch' },
          { catalogId: 'hard_cheese', mealType: 'lunch' },
          { catalogId: 'black_tea', mealType: 'lunch' },

          { catalogId: 'peanuts', mealType: 'snack' },
          { catalogId: 'energy_bar', mealType: 'snack' },

          { catalogId: 'pasta', mealType: 'dinner' },
          { catalogId: 'smoked_sausage', mealType: 'dinner' },
          { catalogId: 'tomato_paste', mealType: 'dinner' },
          { catalogId: 'vegetable_oil', mealType: 'dinner' },
          { catalogId: 'black_tea', mealType: 'dinner' },
          { catalogId: 'sugar', mealType: 'dinner' },
        ],
      },
      {
        entries: [
          { catalogId: 'rice', mealType: 'breakfast' },
          { catalogId: 'dry_milk', mealType: 'breakfast' },
          { catalogId: 'dates', mealType: 'breakfast' },
          { catalogId: 'sugar', mealType: 'breakfast' },
          { catalogId: 'cocoa', mealType: 'breakfast' },
          { catalogId: 'crackers', mealType: 'breakfast' },

          { catalogId: 'basturma', mealType: 'lunch' },
          { catalogId: 'hard_cheese', mealType: 'lunch' },
          { catalogId: 'lavash', mealType: 'lunch' },
          { catalogId: 'black_tea', mealType: 'lunch' },

          { catalogId: 'walnuts', mealType: 'snack' },
          { catalogId: 'milk_chocolate', mealType: 'snack' },

          { catalogId: 'couscous', mealType: 'dinner' },
          { catalogId: 'jerky', mealType: 'dinner' },
          { catalogId: 'dried_mushrooms', mealType: 'dinner' },
          { catalogId: 'ghee', mealType: 'dinner' },
          { catalogId: 'black_tea', mealType: 'dinner' },
          { catalogId: 'sugar', mealType: 'dinner' },
        ],
      },
    ],
  },
  {
    id: 'comfort_winter',
    name: {
      uk: 'Зимовий похід',
      ru: 'Зимний поход',
      en: 'Winter Hike',
    },
    description: {
      uk: 'Посилена розкладка 800–900 г/день. Більше жирів та калорій. Ротація 3 дні.',
      ru: 'Усиленная раскладка 800–900 г/день. Больше жиров и калорий. Ротация 3 дня.',
      en: 'Enhanced plan 800–900 g/day. More fats & calories. 3-day rotation.',
    },
    planType: 'comfort',
    dayPatterns: [
      {
        entries: [
          { catalogId: 'oatmeal', mealType: 'breakfast' },
          { catalogId: 'dry_milk', mealType: 'breakfast' },
          { catalogId: 'condensed_milk', mealType: 'breakfast' },
          { catalogId: 'raisins', mealType: 'breakfast' },
          { catalogId: 'ghee', mealType: 'breakfast' },
          { catalogId: 'crackers', mealType: 'breakfast' },
          { catalogId: 'cocoa', mealType: 'breakfast' },

          { catalogId: 'instant_soup', mealType: 'lunch' },
          { catalogId: 'smoked_sausage', mealType: 'lunch' },
          { catalogId: 'hard_cheese', mealType: 'lunch' },
          { catalogId: 'crispbread', mealType: 'lunch' },
          { catalogId: 'black_tea', mealType: 'lunch' },
          { catalogId: 'sugar', mealType: 'lunch' },

          { catalogId: 'trail_mix', mealType: 'snack' },
          { catalogId: 'dark_chocolate', mealType: 'snack' },
          { catalogId: 'cookies_galettes', mealType: 'snack' },

          { catalogId: 'buckwheat', mealType: 'dinner' },
          { catalogId: 'canned_beef', mealType: 'dinner' },
          { catalogId: 'salo', mealType: 'dinner' },
          { catalogId: 'dried_vegetables', mealType: 'dinner' },
          { catalogId: 'crackers', mealType: 'dinner' },
          { catalogId: 'black_tea', mealType: 'dinner' },
          { catalogId: 'sugar', mealType: 'dinner' },
        ],
      },
      {
        entries: [
          { catalogId: 'muesli', mealType: 'breakfast' },
          { catalogId: 'dry_milk', mealType: 'breakfast' },
          { catalogId: 'dried_apricots', mealType: 'breakfast' },
          { catalogId: 'peanut_butter', mealType: 'breakfast' },
          { catalogId: 'crackers', mealType: 'breakfast' },
          { catalogId: 'instant_coffee', mealType: 'breakfast' },
          { catalogId: 'sugar', mealType: 'breakfast' },

          { catalogId: 'soup_mix', mealType: 'lunch' },
          { catalogId: 'pate', mealType: 'lunch' },
          { catalogId: 'lavash', mealType: 'lunch' },
          { catalogId: 'hard_cheese', mealType: 'lunch' },
          { catalogId: 'black_tea', mealType: 'lunch' },
          { catalogId: 'sugar', mealType: 'lunch' },

          { catalogId: 'hazelnuts', mealType: 'snack' },
          { catalogId: 'halva', mealType: 'snack' },
          { catalogId: 'energy_bar', mealType: 'snack' },

          { catalogId: 'pasta', mealType: 'dinner' },
          { catalogId: 'canned_pork', mealType: 'dinner' },
          { catalogId: 'vegetable_oil', mealType: 'dinner' },
          { catalogId: 'tomato_paste', mealType: 'dinner' },
          { catalogId: 'crackers', mealType: 'dinner' },
          { catalogId: 'black_tea', mealType: 'dinner' },
          { catalogId: 'sugar', mealType: 'dinner' },
        ],
      },
      {
        entries: [
          { catalogId: 'instant_oats', mealType: 'breakfast' },
          { catalogId: 'dry_milk', mealType: 'breakfast' },
          { catalogId: 'dates', mealType: 'breakfast' },
          { catalogId: 'ghee', mealType: 'breakfast' },
          { catalogId: 'crackers', mealType: 'breakfast' },
          { catalogId: 'cocoa', mealType: 'breakfast' },
          { catalogId: 'sugar', mealType: 'breakfast' },

          { catalogId: 'lentils', mealType: 'lunch' },
          { catalogId: 'smoked_sausage', mealType: 'lunch' },
          { catalogId: 'crispbread', mealType: 'lunch' },
          { catalogId: 'hard_cheese', mealType: 'lunch' },
          { catalogId: 'black_tea', mealType: 'lunch' },
          { catalogId: 'sugar', mealType: 'lunch' },

          { catalogId: 'cashews', mealType: 'snack' },
          { catalogId: 'kozinaki', mealType: 'snack' },
          { catalogId: 'protein_bar', mealType: 'snack' },

          { catalogId: 'rice', mealType: 'dinner' },
          { catalogId: 'pemmican', mealType: 'dinner' },
          { catalogId: 'dried_mushrooms', mealType: 'dinner' },
          { catalogId: 'vegetable_oil', mealType: 'dinner' },
          { catalogId: 'crackers', mealType: 'dinner' },
          { catalogId: 'black_tea', mealType: 'dinner' },
          { catalogId: 'sugar', mealType: 'dinner' },
        ],
      },
    ],
  },
  {
    id: 'ultralight_3day',
    name: {
      uk: 'Легкий трек',
      ru: 'Лёгкий трек',
      en: 'Ultralight Trek',
    },
    description: {
      uk: 'Мінімальна вага 400–550 г/день. Висококалорійні продукти. Ротація 2 дні.',
      ru: 'Минимальный вес 400–550 г/день. Высококалорийные продукты. Ротация 2 дня.',
      en: 'Minimum weight 400–550 g/day. Calorie-dense foods. 2-day rotation.',
    },
    planType: 'ultralight',
    dayPatterns: [
      {
        entries: [
          { catalogId: 'instant_oats', mealType: 'breakfast' },
          { catalogId: 'peanut_butter', mealType: 'breakfast' },
          { catalogId: 'dates', mealType: 'breakfast' },
          { catalogId: 'instant_coffee', mealType: 'breakfast' },

          { catalogId: 'jerky', mealType: 'lunch' },
          { catalogId: 'tortilla', mealType: 'lunch' },
          { catalogId: 'hard_cheese', mealType: 'lunch' },

          { catalogId: 'trail_mix', mealType: 'snack' },
          { catalogId: 'energy_bar', mealType: 'snack' },

          { catalogId: 'couscous', mealType: 'dinner' },
          { catalogId: 'freeze_dried_meat', mealType: 'dinner' },
          { catalogId: 'vegetable_oil', mealType: 'dinner' },
          { catalogId: 'black_tea', mealType: 'dinner' },
        ],
      },
      {
        entries: [
          { catalogId: 'muesli', mealType: 'breakfast' },
          { catalogId: 'dry_milk', mealType: 'breakfast' },
          { catalogId: 'dried_bananas', mealType: 'breakfast' },
          { catalogId: 'instant_coffee', mealType: 'breakfast' },

          { catalogId: 'smoked_sausage', mealType: 'lunch' },
          { catalogId: 'crispbread', mealType: 'lunch' },
          { catalogId: 'peanut_butter', mealType: 'lunch' },

          { catalogId: 'almonds', mealType: 'snack' },
          { catalogId: 'dark_chocolate', mealType: 'snack' },

          { catalogId: 'instant_noodles', mealType: 'dinner' },
          { catalogId: 'jerky', mealType: 'dinner' },
          { catalogId: 'vegetable_oil', mealType: 'dinner' },
          { catalogId: 'black_tea', mealType: 'dinner' },
        ],
      },
    ],
  },
];

export function getMealTemplate(id: string): MealTemplate | undefined {
  return MEAL_TEMPLATES.find((t) => t.id === id);
}
