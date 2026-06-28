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
  participants?: {
    name: string;
    weight_kg?: number;
  }[];
  meal_plan_id?: string | null;
  gpx_data?: {
    track_name?: string;
    distance_km?: number;
    elevation_gain_m?: number;
    elevation_loss_m?: number;
    max_elevation_m?: number;
    points?: [number, number, number][];
    raw_file_base64?: string;
    weather?: string | null;
  } | null;
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
  assigned_to: string;
}

export interface ListItemWithGear extends ListItem {
  gear_item: GearItem;
  assigned_to: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  name: string;
  days_count: number;
  total_weight_g: number;
  plan_type: string;
  people_count: number;
  target_calories: number;
  target_weight_g: number;
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

export interface MealDayWithEntries extends MealDay {
  meal_entries: MealEntry[];
}

export interface UserFoodItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  calories_per100g: number;
  protein_per100g: number;
  fat_per100g: number;
  carbs_per100g: number;
  default_portion_g: number;
  created_at: string;
}
