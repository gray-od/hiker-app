import { createClient } from './client';
import { getCached, setCache } from '@/lib/cache';
import type {
  Profile,
  GearItem,
  GearList,
  ListItemWithGear,
  MealPlan,
  MealDayWithEntries,
  UserFoodItem,
} from '@/lib/types';

interface ListItemRaw {
  id: string;
  list_id: string;
  gear_item_id: string;
  quantity: number;
  is_packed: boolean;
  worn: boolean;
  consumable: boolean;
  gear_item: { weight_g: number } | null;
}

export interface GearListWithTotalWeight extends GearList {
  totalWeight: number;
  list_items: ListItemRaw[];
}

interface MealPlanWithDays extends MealPlan {
  meal_days: { total_calories: number; total_weight_g: number }[];
}

export interface MealPlanLight {
  id: string;
  name: string;
  people_count: number;
  total_weight_g: number;
}

export async function fetchUserProfile(
  userId: string,
): Promise<{ data: Profile | null; error: Error | null }> {
  const cacheKey = `profile:${userId}`;
  const cached = typeof window !== 'undefined' ? await getCached<Profile>(cacheKey) : null;
  if (cached && !navigator.onLine) return { data: cached, error: null };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!error && data) setCache(cacheKey, data as Profile);
  if (error && cached) return { data: cached, error: null };
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Profile, error: null };
}

export async function fetchUserGear(
  userId: string,
): Promise<{ data: GearItem[] | null; error: Error | null }> {
  const cacheKey = `gear:${userId}`;
  const cached = typeof window !== 'undefined' ? await getCached<GearItem[]>(cacheKey) : null;
  if (cached && !navigator.onLine) return { data: cached, error: null };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('gear_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!error && data) setCache(cacheKey, data as GearItem[]);
  if (error && cached) return { data: cached, error: null };
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as GearItem[], error: null };
}

export async function fetchUserFoodItems(
  userId: string,
): Promise<{ data: UserFoodItem[] | null; error: Error | null }> {
  const cacheKey = `food:${userId}`;
  const cached = typeof window !== 'undefined' ? await getCached<UserFoodItem[]>(cacheKey) : null;
  if (cached && !navigator.onLine) return { data: cached, error: null };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_food_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!error && data) setCache(cacheKey, data as UserFoodItem[]);
  if (error && cached) return { data: cached, error: null };
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as UserFoodItem[], error: null };
}

export async function fetchUserLists(
  userId: string,
): Promise<{ data: GearListWithTotalWeight[] | null; error: Error | null }> {
  const cacheKey = `lists:${userId}`;
  const cached = typeof window !== 'undefined' ? await getCached<GearListWithTotalWeight[]>(cacheKey) : null;
  if (cached && !navigator.onLine) return { data: cached, error: null };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('gear_lists')
    .select('*, list_items!inner(id, quantity, is_packed, worn, consumable, gear_item:gear_items(weight_g))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error && cached) return { data: cached, error: null };
  if (error) return { data: null, error: new Error(error.message) };
  if (!data) return { data: [], error: null };

  const lists: GearListWithTotalWeight[] = (data as unknown as Array<GearList & { list_items: ListItemRaw[] }>).map((list) => ({
    ...list,
    totalWeight: (list.list_items || []).reduce(
      (sum, li) => sum + (li.gear_item?.weight_g || 0) * (li.quantity || 1),
      0,
    ),
  }));

  setCache(cacheKey, lists);
  return { data: lists, error: null };
}

export async function fetchUserListDetail(
  listId: string,
): Promise<{ data: GearList | null; error: Error | null }> {
  const cacheKey = `list:${listId}`;
  const cached = typeof window !== 'undefined' ? await getCached<GearList>(cacheKey) : null;
  if (cached && !navigator.onLine) return { data: cached, error: null };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('gear_lists')
    .select('*')
    .eq('id', listId)
    .single();

  if (!error && data) setCache(cacheKey, data as GearList);
  if (error && cached) return { data: cached, error: null };
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as GearList, error: null };
}

export async function fetchListItems(
  listId: string,
): Promise<{ data: ListItemWithGear[] | null; error: Error | null }> {
  const cacheKey = `listItems:${listId}`;
  const cached = typeof window !== 'undefined' ? await getCached<ListItemWithGear[]>(cacheKey) : null;
  if (cached && !navigator.onLine) return { data: cached, error: null };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('list_items')
    .select('*, gear_item:gear_items(*)')
    .eq('list_id', listId);

  if (!error && data) setCache(cacheKey, data as ListItemWithGear[]);
  if (error && cached) return { data: cached, error: null };
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as ListItemWithGear[], error: null };
}

export async function fetchUserMealPlans(
  userId: string,
): Promise<{ data: MealPlanWithDays[] | null; error: Error | null }> {
  const cacheKey = `meals:${userId}`;
  const cached = typeof window !== 'undefined' ? await getCached<MealPlanWithDays[]>(cacheKey) : null;
  if (cached && !navigator.onLine) return { data: cached, error: null };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*, meal_days(total_calories, total_weight_g)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!error && data) setCache(cacheKey, data as unknown as MealPlanWithDays[]);
  if (error && cached) return { data: cached, error: null };
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as unknown as MealPlanWithDays[], error: null };
}

export async function fetchMealPlanDetail(
  planId: string,
): Promise<{ data: { plan: MealPlan; days: MealDayWithEntries[] } | null; error: Error | null }> {
  const cacheKey = `meal:${planId}`;
  const cached = typeof window !== 'undefined' ? await getCached<{ plan: MealPlan; days: MealDayWithEntries[] }>(cacheKey) : null;
  if (cached && !navigator.onLine) return { data: cached, error: null };

  const supabase = createClient();
  const { data: planData, error: planError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError && cached) return { data: cached, error: null };
  if (planError) return { data: null, error: new Error(planError.message) };
  if (!planData) return { data: null, error: new Error('Plan not found') };

  const { data: daysData, error: daysError } = await supabase
    .from('meal_days')
    .select('*, meal_entries(*)')
    .eq('plan_id', planId)
    .order('day_number');

  if (daysError && cached) return { data: cached, error: null };
  if (daysError) return { data: null, error: new Error(daysError.message) };

  const result = {
    plan: planData as MealPlan,
    days: (daysData as MealDayWithEntries[]) || [],
  };
  setCache(cacheKey, result);
  return { data: result, error: null };
}

export async function fetchUserMealPlansLight(
  userId: string,
): Promise<{ data: MealPlanLight[] | null; error: Error | null }> {
  const cacheKey = `mealsLight:${userId}`;
  const cached = typeof window !== 'undefined' ? await getCached<MealPlanLight[]>(cacheKey) : null;
  if (cached && !navigator.onLine) return { data: cached, error: null };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('meal_plans')
    .select('id, name, people_count, total_weight_g')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!error && data) setCache(cacheKey, data as MealPlanLight[]);
  if (error && cached) return { data: cached, error: null };
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as MealPlanLight[], error: null };
}
