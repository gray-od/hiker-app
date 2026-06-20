import { createClient } from '@/lib/supabase/client';

const MAX_CACHED_ITEMS = 20;

export async function cacheMealPlan(planId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: plan } = await supabase.from('meal_plans').select('*').eq('id', planId).single();
    if (!plan) return false;

    const { data: days } = await supabase.from('meal_days').select('*, meal_entries(*)').eq('plan_id', planId).order('day_number');
    if (!days) return false;

    enforceLimit();
    localStorage.setItem(`offline_meal_${planId}`, JSON.stringify({ plan, days, cachedAt: Date.now() }));
    fetch(`/meals/${planId}`).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export async function cacheGearList(listId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: list } = await supabase.from('gear_lists').select('*').eq('id', listId).single();
    if (!list) return false;

    const { data: items } = await supabase.from('list_items').select('*, gear_item:gear_items(*)').eq('list_id', listId);
    if (!items) return false;

    enforceLimit();
    localStorage.setItem(`offline_list_${listId}`, JSON.stringify({ list, items, cachedAt: Date.now() }));
    fetch(`/lists/${listId}`).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export function removeCachedMeal(planId: string) {
  localStorage.removeItem(`offline_meal_${planId}`);
}

export function removeCachedList(listId: string) {
  localStorage.removeItem(`offline_list_${listId}`);
}

export function getCachedItems(): { meals: { id: string; name: string; cachedAt: number }[]; lists: { id: string; name: string; cachedAt: number }[] } {
  const meals: { id: string; name: string; cachedAt: number }[] = [];
  const lists: { id: string; name: string; cachedAt: number }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('offline_meal_')) {
        const data = JSON.parse(localStorage.getItem(key)!);
        meals.push({ id: key.replace('offline_meal_', ''), name: data.plan?.name || '—', cachedAt: data.cachedAt || 0 });
      }
      if (key?.startsWith('offline_list_')) {
        const data = JSON.parse(localStorage.getItem(key)!);
        lists.push({ id: key.replace('offline_list_', ''), name: data.list?.name || '—', cachedAt: data.cachedAt || 0 });
      }
    }
  } catch {}
  return { meals, lists };
}

export function clearAllCache() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('offline_meal_') || key?.startsWith('offline_list_')) {
      keys.push(key);
    }
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

export function getCacheSize(): number {
  let size = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('offline_meal_') || key?.startsWith('offline_list_')) {
      size += (localStorage.getItem(key) || '').length * 2;
    }
  }
  return size;
}

function enforceLimit() {
  const all: { key: string; cachedAt: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('offline_meal_') || key?.startsWith('offline_list_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key)!);
        all.push({ key, cachedAt: data.cachedAt || 0 });
      } catch {}
    }
  }
  if (all.length >= MAX_CACHED_ITEMS) {
    all.sort((a, b) => a.cachedAt - b.cachedAt);
    const toRemove = all.slice(0, all.length - MAX_CACHED_ITEMS + 1);
    toRemove.forEach((item) => localStorage.removeItem(item.key));
  }
}
