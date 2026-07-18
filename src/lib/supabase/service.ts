import { createClient } from './client';
import { withCache, cacheKeys, clearCache as clearIDBCache, removeCache } from '@/lib/cache';
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
): Promise<{ data: Profile | null; error: Error | null; fromCache: boolean }> {
  return withCache(cacheKeys.profile(userId), async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as Profile, error: null };
  });
}

export async function fetchUserGear(
  userId: string,
): Promise<{ data: GearItem[] | null; error: Error | null; fromCache: boolean }> {
  return withCache(cacheKeys.gear(userId), async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gear_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as GearItem[], error: null };
  });
}

export async function fetchUserFoodItems(
  userId: string,
): Promise<{ data: UserFoodItem[] | null; error: Error | null; fromCache: boolean }> {
  return withCache(cacheKeys.foodItems(userId), async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_food_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as UserFoodItem[], error: null };
  });
}

export async function fetchUserLists(
  userId: string,
): Promise<{ data: GearListWithTotalWeight[] | null; error: Error | null; fromCache: boolean }> {
  return withCache(cacheKeys.lists(userId), async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gear_lists')
      .select('*, list_items!inner(id, quantity, is_packed, worn, consumable, gear_item:gear_items(weight_g))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: new Error(error.message) };
    if (!data) return { data: [], error: null };

    const lists: GearListWithTotalWeight[] = (data as unknown as Array<GearList & { list_items: ListItemRaw[] }>).map((list) => ({
      ...list,
      totalWeight: (list.list_items || []).reduce(
        (sum, li) => sum + (li.gear_item?.weight_g || 0) * (li.quantity || 1),
        0,
      ),
    }));

    return { data: lists, error: null };
  });
}

export async function fetchUserListDetail(
  listId: string,
): Promise<{ data: GearList | null; error: Error | null; fromCache: boolean }> {
  return withCache(cacheKeys.listDetail(listId), async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gear_lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as GearList, error: null };
  });
}

export async function fetchListItems(
  listId: string,
): Promise<{ data: ListItemWithGear[] | null; error: Error | null; fromCache: boolean }> {
  return withCache(cacheKeys.listItems(listId), async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('list_items')
      .select('*, gear_item:gear_items(*)')
      .eq('list_id', listId);

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as ListItemWithGear[], error: null };
  });
}

export async function fetchUserMealPlans(
  userId: string,
): Promise<{ data: MealPlanWithDays[] | null; error: Error | null; fromCache: boolean }> {
  return withCache(cacheKeys.mealPlans(userId), async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*, meal_days(total_calories, total_weight_g)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as unknown as MealPlanWithDays[], error: null };
  });
}

export async function fetchMealPlanDetail(
  planId: string,
): Promise<{ data: { plan: MealPlan; days: MealDayWithEntries[] } | null; error: Error | null; fromCache: boolean }> {
  return withCache(cacheKeys.mealPlanDetail(planId), async () => {
    const supabase = createClient();
    const { data: planData, error: planError } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError) return { data: null, error: new Error(planError.message) };
    if (!planData) return { data: null, error: new Error('Plan not found') };

    const { data: daysData, error: daysError } = await supabase
      .from('meal_days')
      .select('*, meal_entries(*)')
      .eq('plan_id', planId)
      .order('day_number');

    if (daysError) return { data: null, error: new Error(daysError.message) };

    return {
      data: {
        plan: planData as MealPlan,
        days: (daysData as MealDayWithEntries[]) || [],
      },
      error: null,
    };
  });
}

export async function fetchUserMealPlansLight(
  userId: string,
): Promise<{ data: MealPlanLight[] | null; error: Error | null; fromCache: boolean }> {
  return withCache(cacheKeys.mealPlansLight(userId), async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('meal_plans')
      .select('id, name, people_count, total_weight_g')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as MealPlanLight[], error: null };
  });
}

/** Clears all cached data (entire IndexedDB cache store). */
export function clearAllCache(): Promise<void> {
  return clearIDBCache();
}

/** Invalidates a specific cache key — call after mutations. */
export function invalidateCache(key: string): Promise<void> {
  return removeCache(key);
}

// ── Gear mutations ──

export async function createGearItem(
  userId: string,
  payload: { name: string; category: string; weight_g: number; season: string; notes?: string | null },
): Promise<{ data: GearItem | null; error: Error | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('gear_items')
    .insert({ user_id: userId, ...payload })
    .select()
    .single();
  invalidateCache(cacheKeys.gear(userId));
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as GearItem, error: null };
}

export async function updateGearItem(
  id: string, userId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.from('gear_items').update(payload).eq('id', id);
  invalidateCache(cacheKeys.gear(userId));
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function deleteGearItem(
  id: string, userId: string,
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.from('gear_items').delete().eq('id', id);
  invalidateCache(cacheKeys.gear(userId));
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

// ── Food mutations ──

export async function createFoodItem(
  userId: string,
  payload: Record<string, unknown>,
): Promise<{ data: UserFoodItem | null; error: Error | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_food_items')
    .insert({ user_id: userId, ...payload })
    .select()
    .single();
  invalidateCache(cacheKeys.foodItems(userId));
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as UserFoodItem, error: null };
}

export async function updateFoodItem(
  id: string, userId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.from('user_food_items').update(payload).eq('id', id);
  invalidateCache(cacheKeys.foodItems(userId));
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function deleteFoodItem(
  id: string, userId: string,
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.from('user_food_items').delete().eq('id', id);
  invalidateCache(cacheKeys.foodItems(userId));
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

// ── List mutations ──

export async function createList(
  userId: string,
  payload: { name: string; season: string; trip_date: string | null; meal_plan_id: string | null },
): Promise<{ data: GearListWithTotalWeight | null; error: Error | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('gear_lists')
    .insert({ user_id: userId, ...payload })
    .select('*, list_items(id, quantity, is_packed, worn, consumable, gear_item:gear_items(weight_g))')
    .single();
  invalidateCache(cacheKeys.lists(userId));
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as unknown as GearListWithTotalWeight, error: null };
}

export async function deleteList(
  id: string, userId: string,
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.from('gear_lists').delete().eq('id', id);
  invalidateCache(cacheKeys.lists(userId));
  invalidateCache(cacheKeys.listDetail(id));
  invalidateCache(cacheKeys.listItems(id));
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

// ── List item / detail mutations ──

/** Updates any gear_lists columns (metadata, gpx_data, meal_plan_id, etc.). */
export async function updateList(
  id: string, userId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.from('gear_lists').update(payload).eq('id', id);
  invalidateCache(cacheKeys.lists(userId));
  invalidateCache(cacheKeys.listDetail(id));
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

/** Bulk-insert items into a list. */
export async function addListItems(
  listId: string, userId: string,
  gearItemIds: string[],
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const inserts = gearItemIds.map(gearItemId => ({
    list_id: listId,
    gear_item_id: gearItemId,
    quantity: 1,
    is_packed: false,
    worn: false,
    consumable: false,
  }));
  const { error } = await supabase.from('list_items').insert(inserts);
  invalidateCache(cacheKeys.listItems(listId));
  invalidateCache(cacheKeys.lists(userId));
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

/** Updates a single list_item row (packed, worn, consumable, quantity, etc.). */
export async function updateListItem(
  id: string, userId: string, listId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.from('list_items').update(payload).eq('id', id);
  invalidateCache(cacheKeys.listItems(listId));
  invalidateCache(cacheKeys.lists(userId));
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

/** Removes a single item from a list. */
export async function deleteListItem(
  id: string, userId: string, listId: string,
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.from('list_items').delete().eq('id', id);
  invalidateCache(cacheKeys.listItems(listId));
  invalidateCache(cacheKeys.lists(userId));
  if (error) return { error: new Error(error.message) };
  return { error: null };
}
