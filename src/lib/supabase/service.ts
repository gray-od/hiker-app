import { createClient } from './client';
import { resolveUser } from './resolveUser';
import { withCache, cacheKeys, removeCache } from '@/lib/cache';
import { enqueue, syncQueue } from '@/lib/offline-queue';
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
      // No !inner: an inner join drops lists without items entirely; a left join returns them with list_items: [].
      .select('*, list_items(id, quantity, is_packed, worn, consumable, gear_item:gear_items(weight_g))')
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

/** Invalidates a specific cache key — call after mutations. */
export function invalidateCache(key: string): Promise<void> {
  return removeCache(key);
}

// ── Gear mutations ──

export async function createGearItem(
  userId: string,
  payload: { name: string; category: string; weight_g: number; season: string; notes?: string | null },
): Promise<{ data: GearItem | null; error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('gear_items')
    .insert({ user_id: userId, ...payload })
    .select()
    .single();
  if (error) {
    const queued = await enqueue('gear_items', 'insert', { user_id: userId, ...payload }, userId);
    return { data: null, error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.gear(userId));
  return { data: data as GearItem, error: null };
}

export async function updateGearItem(
  id: string, userId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('gear_items').update(payload).eq('id', id);
  if (error) {
    const queued = await enqueue('gear_items', 'update', { id, ...payload }, userId);
    return { error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.gear(userId));
  return { error: null };
}

export async function deleteGearItem(
  id: string, userId: string,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('gear_items').delete().eq('id', id);
  if (error) {
    const queued = await enqueue('gear_items', 'delete', { id }, userId);
    return { error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.gear(userId));
  return { error: null };
}

// ── Food mutations ──

export async function createFoodItem(
  userId: string,
  payload: Record<string, unknown>,
): Promise<{ data: UserFoodItem | null; error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_food_items')
    .insert({ user_id: userId, ...payload })
    .select()
    .single();
  if (error) {
    const queued = await enqueue('user_food_items', 'insert', { user_id: userId, ...payload }, userId);
    return { data: null, error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.foodItems(userId));
  return { data: data as UserFoodItem, error: null };
}

export async function updateFoodItem(
  id: string, userId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('user_food_items').update(payload).eq('id', id);
  if (error) {
    const queued = await enqueue('user_food_items', 'update', { id, ...payload }, userId);
    return { error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.foodItems(userId));
  return { error: null };
}

export async function deleteFoodItem(
  id: string, userId: string,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('user_food_items').delete().eq('id', id);
  if (error) {
    const queued = await enqueue('user_food_items', 'delete', { id }, userId);
    return { error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.foodItems(userId));
  return { error: null };
}

// ── List mutations ──

export async function createList(
  userId: string,
  payload: { name: string; season: string; trip_date: string | null; meal_plan_id: string | null },
): Promise<{ data: GearListWithTotalWeight | null; error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('gear_lists')
    .insert({ user_id: userId, ...payload })
    .select('*, list_items(id, quantity, is_packed, worn, consumable, gear_item:gear_items(weight_g))')
    .single();
  if (error) {
    const queued = await enqueue('gear_lists', 'insert', { user_id: userId, ...payload }, userId);
    return { data: null, error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.lists(userId));
  return { data: data as unknown as GearListWithTotalWeight, error: null };
}

export async function deleteList(
  id: string, userId: string,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('gear_lists').delete().eq('id', id);
  if (error) {
    const queued = await enqueue('gear_lists', 'delete', { id }, userId);
    return { error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.lists(userId));
  invalidateCache(cacheKeys.listDetail(id));
  invalidateCache(cacheKeys.listItems(id));
  return { error: null };
}

// ── List item / detail mutations ──

/** Updates any gear_lists columns (metadata, gpx_data, meal_plan_id, etc.). */
export async function updateList(
  id: string, userId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('gear_lists').update(payload).eq('id', id);
  if (error) {
    const queued = await enqueue('gear_lists', 'update', { id, ...payload }, userId);
    return { error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.lists(userId));
  invalidateCache(cacheKeys.listDetail(id));
  return { error: null };
}

/** Bulk-insert items into a list. */
export async function addListItems(
  listId: string, userId: string,
  gearItemIds: string[],
): Promise<{ error: Error | null; queued?: boolean }> {
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
  if (error) {
    // One queue entry per row: the replay executor inserts a single payload object,
    // and list_items has no `items` column for a bulk payload to ever apply against.
    // A partially persisted batch is reported as not queued — the caller must not
    // tell the user "saved offline" about rows the queue does not actually hold.
    const queued = (
      await Promise.all(inserts.map((row) => enqueue('list_items', 'insert', row, userId)))
    ).every(Boolean);
    return { error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.listItems(listId));
  invalidateCache(cacheKeys.lists(userId));
  return { error: null };
}

/** Updates a single list_item row (packed, worn, consumable, quantity, etc.). */
export async function updateListItem(
  id: string, userId: string, listId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('list_items').update(payload).eq('id', id);
  if (error) {
    const queued = await enqueue('list_items', 'update', { id, ...payload }, userId);
    return { error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.listItems(listId));
  invalidateCache(cacheKeys.lists(userId));
  return { error: null };
}

/** Removes a single item from a list. */
export async function deleteListItem(
  id: string, userId: string, listId: string,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('list_items').delete().eq('id', id);
  if (error) {
    const queued = await enqueue('list_items', 'delete', { id }, userId);
    return { error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.listItems(listId));
  invalidateCache(cacheKeys.lists(userId));
  return { error: null };
}

// ── Meal mutations ──

/**
 * Drops every cache key a meal mutation can make stale: the plan list, the light list
 * (linked-plan selects) and the plan detail when the plan is known. Only called on a
 * confirmed write — dropping keys while a mutation sits in the queue would break the
 * offline cache-first reads it can still serve.
 */
async function invalidateMealCache(userId: string, planId?: string): Promise<void> {
  const keys = [cacheKeys.mealPlans(userId), cacheKeys.mealPlansLight(userId)];
  if (planId) keys.push(cacheKeys.mealPlanDetail(planId));
  await Promise.all(keys.map((key) => removeCache(key)));
}

/** Creates a meal plan with a client-generated id, so an offline create can be queued and replayed. */
export async function createMealPlan(
  userId: string,
  plan: {
    id: string;
    name: string;
    days_count: number;
    plan_type: string;
    people_count: number;
    target_calories: number;
    target_weight_g: number;
    total_weight_g: number;
  },
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('meal_plans').insert({ user_id: userId, ...plan });
  if (error) {
    const queued = await enqueue('meal_plans', 'insert', { user_id: userId, ...plan }, userId, { planId: plan.id });
    return { error: new Error(error.message), queued };
  }
  await invalidateMealCache(userId, plan.id);
  return { error: null };
}

/** Bulk-inserts plan days; rows carry client-generated ids so the offline replay can insert them as-is. */
export async function addMealDays(
  userId: string,
  planId: string,
  days: { id: string; day_number: number; total_calories?: number; total_weight_g?: number }[],
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const rows = days.map((day) => ({ plan_id: planId, ...day }));
  const { error } = await supabase.from('meal_days').insert(rows);
  if (error) {
    // One queue entry per row: the replay executor inserts a single payload object.
    // A partially persisted batch reports queued: false — "saved offline" may not be
    // claimed while some rows are not actually in the queue.
    const queued = (
      await Promise.all(rows.map((row) => enqueue('meal_days', 'insert', row, userId, { planId })))
    ).every(Boolean);
    return { error: new Error(error.message), queued };
  }
  await invalidateMealCache(userId, planId);
  return { error: null };
}

/** Bulk-inserts meal entries; rows carry client-generated ids and day references. */
export async function addMealEntries(
  userId: string,
  planId: string,
  entries: {
    id: string;
    day_id: string;
    meal_type: string;
    name: string;
    weight_g: number;
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  }[],
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('meal_entries').insert(entries);
  if (error) {
    const queued = (
      await Promise.all(entries.map((row) => enqueue('meal_entries', 'insert', row, userId, { planId })))
    ).every(Boolean);
    return { error: new Error(error.message), queued };
  }
  await invalidateMealCache(userId, planId);
  return { error: null };
}

export async function updateMealPlan(
  id: string, userId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('meal_plans').update(payload).eq('id', id);
  if (error) {
    const queued = await enqueue('meal_plans', 'update', { id, ...payload }, userId, { planId: id });
    return { error: new Error(error.message), queued };
  }
  await invalidateMealCache(userId, id);
  return { error: null };
}

/** Deletes a plan; its days and entries go with it through the DB cascade. */
export async function deleteMealPlan(
  id: string, userId: string,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('meal_plans').delete().eq('id', id);
  if (error) {
    const queued = await enqueue('meal_plans', 'delete', { id }, userId, { planId: id });
    return { error: new Error(error.message), queued };
  }
  await invalidateMealCache(userId, id);
  return { error: null };
}

export async function updateMealDay(
  id: string, userId: string, planId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('meal_days').update(payload).eq('id', id);
  if (error) {
    const queued = await enqueue('meal_days', 'update', { id, ...payload }, userId, { planId });
    return { error: new Error(error.message), queued };
  }
  await invalidateMealCache(userId, planId);
  return { error: null };
}

/** Deletes a day; its entries go with it through the DB cascade. */
export async function deleteMealDay(
  id: string, userId: string, planId: string,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('meal_days').delete().eq('id', id);
  if (error) {
    const queued = await enqueue('meal_days', 'delete', { id }, userId, { planId });
    return { error: new Error(error.message), queued };
  }
  await invalidateMealCache(userId, planId);
  return { error: null };
}

export async function updateMealEntry(
  id: string, userId: string, planId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('meal_entries').update(payload).eq('id', id);
  if (error) {
    const queued = await enqueue('meal_entries', 'update', { id, ...payload }, userId, { planId });
    return { error: new Error(error.message), queued };
  }
  await invalidateMealCache(userId, planId);
  return { error: null };
}

export async function deleteMealEntry(
  id: string, userId: string, planId: string,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('meal_entries').delete().eq('id', id);
  if (error) {
    const queued = await enqueue('meal_entries', 'delete', { id }, userId, { planId });
    return { error: new Error(error.message), queued };
  }
  await invalidateMealCache(userId, planId);
  return { error: null };
}

/** Replay the queued offline mutations of the signed-in user. Call on app load and when coming back online. */
export async function syncPendingMutations(): Promise<number> {
  // Queue entries belong to the user who made them. Replaying someone else's entries
  // under the current session misattributes the write, and RLS turns each attempt into
  // a failure that stays queued forever. No resolvable user — no replay.
  const user = await resolveUser();
  if (!user) return 0;

  const supabase = createClient();

  return syncQueue(user.id, async (m) => {
    try {
      // supabase-js resolves network/RLS failures as `{ error }` instead of throwing;
      // treating them as success would delete the queued mutation and lose it.
      switch (m.action) {
        case 'insert': {
          const { error } = await supabase.from(m.table).insert(m.payload);
          if (error) {
            // 23505 (duplicate key) on a client-generated id means an earlier attempt already
            // wrote the row and only its response was lost — the desired end state is reached.
            if (error.code === '23505') {
              console.info('Offline queue info (syncPendingMutations): insert into', m.table, 'already applied');
            } else {
              console.error('Offline queue error (syncPendingMutations): insert into', m.table, '-', error.message);
              return false;
            }
          }
          break;
        }
        case 'update': {
          const { id, ...rest } = m.payload;
          if (!id) {
            console.error('Offline queue error (syncPendingMutations): update without id on', m.table);
            return false;
          }
          const { error } = await supabase.from(m.table).update(rest).eq('id', id as string);
          if (error) {
            console.error('Offline queue error (syncPendingMutations): update on', m.table, '-', error.message);
            return false;
          }
          break;
        }
        case 'delete': {
          const { error } = await supabase.from(m.table).delete().eq('id', m.payload.id as string);
          if (error) {
            console.error('Offline queue error (syncPendingMutations): delete on', m.table, '-', error.message);
            return false;
          }
          break;
        }
      }
      // A meal mutation leaves the cache-first reads (plan list, light list, plan detail)
      // stale; replay runs outside the pages, so the executor owns this invalidation.
      if (m.table.startsWith('meal_')) {
        await invalidateMealCache(user.id, m.meta?.planId);
      }
      return true;
    } catch (err) {
      console.error('Offline queue error (syncPendingMutations):', err);
      return false;
    }
  });
}
