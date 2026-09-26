import { createClient } from './client';
import { resolveUser } from './resolveUser';
import { withCache, cacheKeys, cacheKeyPrefixes, removeCache, invalidateCacheByPrefix } from '@/lib/cache';
import { enqueue, syncQueue, type QueuedMutation } from '@/lib/offline-queue';
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

/**
 * Total packed weight of a list: Σ quantity × weight over its joined positions. Shared by
 * fetchUserLists and createList, so a just-created list reads exactly like a re-fetched one.
 */
function totalWeightOf(items: ListItemRaw[] | null | undefined): number {
  return (items || []).reduce(
    (sum, li) => sum + (li.gear_item?.weight_g || 0) * (li.quantity || 1),
    0,
  );
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
      totalWeight: totalWeightOf(list.list_items),
    }));

    return { data: lists, error: null };
  });
}

export async function fetchUserListDetail(
  userId: string,
  listId: string,
): Promise<{ data: GearList | null; error: Error | null; fromCache: boolean }> {
  return withCache(cacheKeys.listDetail(userId, listId), async () => {
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
  userId: string,
  listId: string,
): Promise<{ data: ListItemWithGear[] | null; error: Error | null; fromCache: boolean }> {
  return withCache(cacheKeys.listItems(userId, listId), async () => {
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
  userId: string,
  planId: string,
): Promise<{ data: { plan: MealPlan; days: MealDayWithEntries[] } | null; error: Error | null; fromCache: boolean }> {
  return withCache(cacheKeys.mealPlanDetail(userId, planId), async () => {
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

function stringId(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Drops every key a gear change can make stale. A list's total weight and each list-item
 * detail embed the item's weight (the joins in fetchUserLists/fetchListItems), and the lists
 * holding the item are not known before the write, so all of that user's item-detail keys go.
 */
async function invalidateGearCache(userId: string): Promise<void> {
  await Promise.all([
    removeCache(cacheKeys.gear(userId)),
    removeCache(cacheKeys.lists(userId)),
    invalidateCacheByPrefix(cacheKeyPrefixes.listItems(userId)),
  ]);
}

/**
 * Drops the cache keys a replayed mutation has made stale — the keys a page would have
 * dropped had the same write gone through online. A queued entry carries only the context
 * recorded at enqueue time; entries older than that context fall back to their collection.
 */
async function invalidateAfterReplay(userId: string, m: QueuedMutation): Promise<void> {
  switch (m.table) {
    case 'gear_items':
      await invalidateGearCache(userId);
      return;
    case 'user_food_items':
      await removeCache(cacheKeys.foodItems(userId));
      return;
    case 'gear_lists': {
      // The list's own id is the payload id of every queued gear_lists action.
      const listId = m.meta?.listId ?? stringId(m.payload.id);
      await removeCache(cacheKeys.lists(userId));
      if (!listId) return;
      await Promise.all([
        removeCache(cacheKeys.listDetail(userId, listId)),
        removeCache(cacheKeys.listItems(userId, listId)),
      ]);
      return;
    }
    case 'list_items': {
      // The payload id of a list-item write is the item's id — the list id comes from meta,
      // or from the row's own list_id on an insert queued before meta carried it.
      const listId = m.meta?.listId ?? stringId(m.payload.list_id);
      await removeCache(cacheKeys.lists(userId));
      if (listId) {
        await removeCache(cacheKeys.listItems(userId, listId));
      } else {
        await invalidateCacheByPrefix(cacheKeyPrefixes.listItems(userId));
      }
      return;
    }
    case 'meal_plans':
    case 'meal_days':
    case 'meal_entries':
      await invalidateMealCache(userId, m.meta?.planId);
  }
}

// Rows written here are tiny, so 15 s covers even a slow link; what it must not allow is the
// OS TCP timeout (minutes), which is what a half-dead connection used to cost while the Save
// button spun. An expired wait is a failure like any other — queued and replayed, never saved.
const MUTATION_TIMEOUT_MS = 15_000;

/**
 * Bounds the wait of one mutation. The signal is attached with `abortSignal()` so supabase-js
 * aborts the underlying fetch; an aborted request resolves as `{ error }` (status 0), never as
 * success, so callers take the same `if (error)` branch they take for a network failure —
 * enqueue plus "saved on device". The timer is cleared on every path.
 */
async function withWriteTimeout<T>(run: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MUTATION_TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

// ── Gear mutations ──

export async function createGearItem(
  userId: string,
  payload: { name: string; category: string; weight_g: number; season: string; notes?: string | null },
): Promise<{ data: GearItem | null; error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  // A client-generated id makes the row addressable before the server sees it: a replay of
  // an insert that already landed comes back as 23505 instead of writing a second row.
  const row = { user_id: userId, ...payload, id: crypto.randomUUID() };
  const { data, error } = await withWriteTimeout((signal) =>
    supabase
      .from('gear_items')
      .insert(row)
      .select()
      .abortSignal(signal)
      .single(),
  );
  if (error) {
    const queued = await enqueue('gear_items', 'insert', row, userId);
    // The queued row carries the client-generated id, so the caller can show it right away.
    // created_at is not part of the queued payload (the DB assigns it on replay); the local
    // value only keeps the returned row shaped like a fetched one.
    return {
      data: queued ? ({ ...row, created_at: new Date().toISOString() } as GearItem) : null,
      error: new Error(error.message),
      queued,
    };
  }
  await invalidateGearCache(userId);
  return { data: data as GearItem, error: null };
}

export async function updateGearItem(
  id: string, userId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('gear_items').update(payload).eq('id', id).abortSignal(signal),
  );
  if (error) {
    const queued = await enqueue('gear_items', 'update', { id, ...payload }, userId);
    return { error: new Error(error.message), queued };
  }
  await invalidateGearCache(userId);
  return { error: null };
}

export async function deleteGearItem(
  id: string, userId: string,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('gear_items').delete().eq('id', id).abortSignal(signal),
  );
  if (error) {
    const queued = await enqueue('gear_items', 'delete', { id }, userId);
    return { error: new Error(error.message), queued };
  }
  await invalidateGearCache(userId);
  return { error: null };
}

// ── Food mutations ──

export async function createFoodItem(
  userId: string,
  payload: Record<string, unknown>,
): Promise<{ data: UserFoodItem | null; error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  // Client-generated id: a replayed insert that already landed returns 23505, not a second row.
  const row = { user_id: userId, ...payload, id: crypto.randomUUID() };
  const { data, error } = await withWriteTimeout((signal) =>
    supabase
      .from('user_food_items')
      .insert(row)
      .select()
      .abortSignal(signal)
      .single(),
  );
  if (error) {
    const queued = await enqueue('user_food_items', 'insert', row, userId);
    // Same rule as createGearItem: a queued insert returns the row it queued (client-generated
    // id + local created_at), so the page can render it without waiting for the replay.
    return {
      data: queued ? ({ ...row, created_at: new Date().toISOString() } as UserFoodItem) : null,
      error: new Error(error.message),
      queued,
    };
  }
  invalidateCache(cacheKeys.foodItems(userId));
  return { data: data as UserFoodItem, error: null };
}

export async function updateFoodItem(
  id: string, userId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('user_food_items').update(payload).eq('id', id).abortSignal(signal),
  );
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
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('user_food_items').delete().eq('id', id).abortSignal(signal),
  );
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
  // Client-generated id: a replayed insert that already landed returns 23505, not a second list.
  const row = { user_id: userId, ...payload, id: crypto.randomUUID() };
  const { data, error } = await withWriteTimeout((signal) =>
    supabase
      .from('gear_lists')
      .insert(row)
      .select('*, list_items(id, quantity, is_packed, worn, consumable, gear_item:gear_items(weight_g))')
      .abortSignal(signal)
      .single(),
  );
  if (error) {
    const queued = await enqueue('gear_lists', 'insert', row, userId);
    // A queued list has no positions yet and the queued payload stays insert-only
    // (list_items/totalWeight are not columns), so the returned row adds exactly the fields
    // fetchUserLists produces for such a list: empty list_items and zero weight.
    return {
      data: queued
        ? ({ ...row, created_at: new Date().toISOString(), list_items: [], totalWeight: 0 } as unknown as GearListWithTotalWeight)
        : null,
      error: new Error(error.message),
      queued,
    };
  }
  invalidateCache(cacheKeys.lists(userId));
  // Same derivation as fetchUserLists: the list card reads totalWeight, and without it a
  // freshly created list renders an undefined weight until the next fetch replaces it.
  const created = data as unknown as GearList & { list_items: ListItemRaw[] };
  return { data: { ...created, totalWeight: totalWeightOf(created.list_items) }, error: null };
}

export async function deleteList(
  id: string, userId: string,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('gear_lists').delete().eq('id', id).abortSignal(signal),
  );
  if (error) {
    const queued = await enqueue('gear_lists', 'delete', { id }, userId);
    return { error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.lists(userId));
  invalidateCache(cacheKeys.listDetail(userId, id));
  invalidateCache(cacheKeys.listItems(userId, id));
  return { error: null };
}

// ── List item / detail mutations ──

/** Updates any gear_lists columns (metadata, gpx_data, meal_plan_id, etc.). */
export async function updateList(
  id: string, userId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('gear_lists').update(payload).eq('id', id).abortSignal(signal),
  );
  if (error) {
    const queued = await enqueue('gear_lists', 'update', { id, ...payload }, userId);
    return { error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.lists(userId));
  invalidateCache(cacheKeys.listDetail(userId, id));
  return { error: null };
}

/** Bulk-insert items into a list. */
export async function addListItems(
  listId: string, userId: string,
  gearItemIds: string[],
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const inserts = gearItemIds.map(gearItemId => ({
    // Client-generated id: a replayed insert that already landed returns 23505, not a second row.
    id: crypto.randomUUID(),
    list_id: listId,
    gear_item_id: gearItemId,
    quantity: 1,
    is_packed: false,
    worn: false,
    consumable: false,
  }));
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('list_items').insert(inserts).abortSignal(signal),
  );
  if (error) {
    // One queue entry per row: the replay executor inserts a single payload object,
    // and list_items has no `items` column for a bulk payload to ever apply against.
    // A partially persisted batch is reported as not queued — the caller must not
    // tell the user "saved offline" about rows the queue does not actually hold.
    // meta.listId is the only list context a replayed row-id write can carry.
    const queued = (
      await Promise.all(inserts.map((row) => enqueue('list_items', 'insert', row, userId, { listId })))
    ).every(Boolean);
    return { error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.listItems(userId, listId));
  invalidateCache(cacheKeys.lists(userId));
  return { error: null };
}

/** Updates a single list_item row (packed, worn, consumable, quantity, etc.). */
export async function updateListItem(
  id: string, userId: string, listId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('list_items').update(payload).eq('id', id).abortSignal(signal),
  );
  if (error) {
    const queued = await enqueue('list_items', 'update', { id, ...payload }, userId, { listId });
    return { error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.listItems(userId, listId));
  invalidateCache(cacheKeys.lists(userId));
  return { error: null };
}

/** Removes a single item from a list. */
export async function deleteListItem(
  id: string, userId: string, listId: string,
): Promise<{ error: Error | null; queued?: boolean }> {
  const supabase = createClient();
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('list_items').delete().eq('id', id).abortSignal(signal),
  );
  if (error) {
    const queued = await enqueue('list_items', 'delete', { id }, userId, { listId });
    return { error: new Error(error.message), queued };
  }
  invalidateCache(cacheKeys.listItems(userId, listId));
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
  if (planId) keys.push(cacheKeys.mealPlanDetail(userId, planId));
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
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('meal_plans').insert({ user_id: userId, ...plan }).abortSignal(signal),
  );
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
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('meal_days').insert(rows).abortSignal(signal),
  );
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
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('meal_entries').insert(entries).abortSignal(signal),
  );
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
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('meal_plans').update(payload).eq('id', id).abortSignal(signal),
  );
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
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('meal_plans').delete().eq('id', id).abortSignal(signal),
  );
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
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('meal_days').update(payload).eq('id', id).abortSignal(signal),
  );
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
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('meal_days').delete().eq('id', id).abortSignal(signal),
  );
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
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('meal_entries').update(payload).eq('id', id).abortSignal(signal),
  );
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
  const { error } = await withWriteTimeout((signal) =>
    supabase.from('meal_entries').delete().eq('id', id).abortSignal(signal),
  );
  if (error) {
    const queued = await enqueue('meal_entries', 'delete', { id }, userId, { planId });
    return { error: new Error(error.message), queued };
  }
  await invalidateMealCache(userId, planId);
  return { error: null };
}

let syncInFlight: Promise<number> | null = null;

/**
 * Replay the queued offline mutations of the signed-in user. Call on app load and when coming back online.
 * The shell fires this on mount, on `online` and on route changes, so same-tab callers share the in-flight
 * run instead of replaying the same entries twice, and the Web Locks API serialises runs across tabs.
 */
export function syncPendingMutations(): Promise<number> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = runQueueSync().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function runQueueSync(): Promise<number> {
  // Queue entries belong to the user who made them. Replaying someone else's entries
  // under the current session misattributes the write, and RLS turns each attempt into
  // a failure that stays queued forever. No resolvable user — no replay.
  const user = await resolveUser();
  if (!user) return 0;

  const supabase = createClient();

  const replay = () =>
    syncQueue(user.id, async (m) => {
      try {
        // supabase-js resolves network/RLS failures as `{ error }` instead of throwing;
        // treating them as success would delete the queued mutation and lose it.
        switch (m.action) {
          case 'insert': {
            const { error } = await withWriteTimeout((signal) =>
              supabase.from(m.table).insert(m.payload).abortSignal(signal),
            );
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
            const { error } = await withWriteTimeout((signal) =>
              supabase.from(m.table).update(rest).eq('id', id as string).abortSignal(signal),
            );
            if (error) {
              console.error('Offline queue error (syncPendingMutations): update on', m.table, '-', error.message);
              return false;
            }
            break;
          }
          case 'delete': {
            const { error } = await withWriteTimeout((signal) =>
              supabase.from(m.table).delete().eq('id', m.payload.id as string).abortSignal(signal),
            );
            if (error) {
              console.error('Offline queue error (syncPendingMutations): delete on', m.table, '-', error.message);
              return false;
            }
            break;
          }
        }
        // Replay runs outside the pages, so the executor owns the cache invalidation that a
        // page write would have done had it gone through online.
        await invalidateAfterReplay(user.id, m);
        return true;
      } catch (err) {
        console.error('Offline queue error (syncPendingMutations):', err);
        return false;
      }
    });

  // Web Locks is missing in older browsers and on non-secure origins; there the replay runs
  // unguarded, which the idempotent client-generated ids keep safe across tabs.
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks) return replay();
  return locks.request('prohikes-offline-queue', replay);
}
