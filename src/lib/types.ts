export interface GearItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  weight_g: number;
  season: string;
  notes: string;
  created_at: string;
}

export interface GearList {
  id: string;
  user_id: string;
  name: string;
  season: string;
  trip_date: string;
  shared_link: string;
  created_at: string;
}

export interface ListItem {
  id: string;
  list_id: string;
  gear_item_id: string;
  quantity: number;
  is_packed: boolean;
  worn: boolean;
  consumable: boolean;
}

export interface MealPlan {
  id: string;
  user_id: string;
  name: string;
  days_count: number;
  total_weight_g: number;
  created_at: string;
}

export interface MealDay {
  id: string;
  plan_id: string;
  day_number: number;
  total_calories: number;
  total_weight_g: number;
}

export interface MealEntry {
  id: string;
  day_id: string;
  meal_type: "breakfast" | "lunch" | "snack" | "dinner";
  name: string;
  weight_g: number;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}
