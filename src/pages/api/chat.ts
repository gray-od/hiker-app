import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { buildSystemPrompt } from '@/lib/chat-system-prompt';
import { FOOD_CATALOG, calculateNutrition } from '@/lib/food-catalog';
import { fetchJson } from '@/lib/fetchJson';
import { getMealTemplate } from '@/lib/meal-templates';
import { resolveUserModel, validateAiKey } from '@/lib/ai-providers';
import { isValidSearch, runUserSearch, SearchError } from '@/lib/search-providers';
import { serializeCookie } from '@/lib/supabase/cookieHeader';

function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

function sanitizeLog(msg: string, secrets: string[] = []): string {
  let out = msg;
  for (const s of secrets) {
    if (s && s.length >= 8) out = out.split(s).join('***REDACTED***');
  }
  return out.replace(
    /\b(sk-[a-zA-Z0-9._-]{4,}|AIza[a-zA-Z0-9_-]{4,}|pplx-[a-zA-Z0-9_-]{4,}|tvly-[a-zA-Z0-9_-]{4,}|fc-[a-zA-Z0-9_-]{4,})\b/g,
    '***REDACTED***',
  );
}

// Limits sit above the client's own caps (100 KB attachments, unbounded page-session
// history) but well below the 1 MB route body limit, so real chats never trip them.
const MAX_CHAT_MESSAGES = 200;
const MAX_CHAT_MESSAGE_CHARS = 150_000;
const MAX_CHAT_TOTAL_CHARS = 600_000;

// Strict client contract: role + string content only. Unknown fields are stripped, so a
// forged "system" role (or provider-specific extras) can never reach the model or join
// the server-side system prompt.
const chatRequestBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(MAX_CHAT_MESSAGE_CHARS),
      }),
    )
    .min(1)
    .max(MAX_CHAT_MESSAGES)
    .refine(
      (messages) =>
        messages.reduce((sum, message) => sum + message.content.length, 0) <= MAX_CHAT_TOTAL_CHARS,
      { message: 'total message length exceeded' },
    ),
  // BYOK configs mirror ai-providers.ts / search-providers.ts; null = use the free key.
  ai: z
    .object({
      provider: z.string(),
      apiKey: z.string(),
      model: z.string().optional(),
    })
    .nullish(),
  search: z
    .object({
      provider: z.string(),
      apiKey: z.string(),
      cx: z.string().optional(),
    })
    .nullish(),
});

type CreationKind = 'meal_plan' | 'list_item' | 'gear_list' | 'gear_item';

const CREATION_TABLE: Record<CreationKind, string> = {
  meal_plan: 'meal_plans',
  list_item: 'list_items',
  gear_list: 'gear_lists',
  gear_item: 'gear_items',
};

// Children before the rows they point at, so no foreign key can block a batch rollback.
const ROLLBACK_ORDER: CreationKind[] = ['meal_plan', 'list_item', 'gear_list', 'gear_item'];

const google = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ? createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })
  : null;

interface GeocodeResponse {
  results?: Array<{
    latitude: number;
    longitude: number;
    name: string;
    country?: string;
    elevation?: number;
  }>;
}

interface WeatherResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    precipitation: number;
  };
  daily: {
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    weather_code: number[];
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secrets: string[] = [];
  try {
    const parsedBody = chatRequestBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: 'invalid_request' });
    }

    const { messages, ai, search } = parsedBody.data;
    if (ai?.apiKey) secrets.push(ai.apiKey);
    if (search?.apiKey) secrets.push(search.apiKey);
    if (search?.cx) secrets.push(search.cx);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return Object.entries(req.cookies).map(([name, value]) => ({
              name,
              value: value as string,
            })) as { name: string; value: string }[];
          },
          setAll(cookiesToSet) {
            const existing = res.getHeader('Set-Cookie');
            const existingCookies: string[] = existing
              ? (Array.isArray(existing) ? existing.map(String) : [String(existing)])
              : [];
            cookiesToSet.forEach(({ name, value, options }) => {
              existingCookies.push(serializeCookie(name, value, options));
            });
            res.setHeader('Set-Cookie', existingCookies);
          },
        },
      },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).end('Unauthorized');
    }

    let userModel = resolveUserModel(ai);
    let usingOwnKey = userModel !== null;

    if (usingOwnKey) {
      const check = await validateAiKey(ai);
      if (!check.ok) {
        console.error(
          '[chat] BYOK key invalid, falling back to default:',
          sanitizeLog(check.error ?? '', secrets),
        );
        userModel = null;
        usingOwnKey = false;
      }
    }

    if (!usingOwnKey && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return res.status(500).end('GOOGLE_GENERATIVE_AI_API_KEY not configured');
    }

    const FREE_DAILY_LIMIT = 15;

    let todayCount = 0;

    if (!usingOwnKey) {
      const { data: usage, error: usageError } = await supabase
        .from('ai_usage')
        .select('message_count')
        .eq('user_id', user.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .maybeSingle();

      if (usageError) {
        // Fail closed: an unreadable counter must not silently grant unlimited use.
        console.error('[chat] ai_usage read failed:', usageError.message);
        return res.status(503).end('USAGE_CHECK_FAILED');
      }

      todayCount = usage?.message_count || 0;

      if (todayCount >= FREE_DAILY_LIMIT) {
        return res.status(429).end('RATE_LIMIT');
      }
    }

    const locale = req.cookies['NEXT_LOCALE'] || 'uk';

    const [{ data: gear }, { data: lists }, { data: meals }] = await Promise.all([
      supabase
        .from('gear_items')
        .select('id, name, category, weight_g, season')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('gear_lists')
        .select('id, name, season, created_at, list_items(id)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('meal_plans')
        .select('id, name, plan_type, days_count, people_count, target_calories, target_weight_g')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    let userContext = `Language: ${locale}\n`;

    if (gear && gear.length > 0) {
      userContext += `\n### Gear Items (${gear.length}):\n`;
      gear.forEach(
        (g: { id: string; name: string; category: string; weight_g: number; season: string }) => {
          userContext += `- [${g.id}] ${g.name} | ${g.category} | ${g.weight_g}g | ${g.season}\n`;
        },
      );
    } else {
      userContext += '\n### Gear Items: none yet\n';
    }

    if (lists && lists.length > 0) {
      userContext += `\n### Packing Lists (${lists.length}):\n`;
      lists.forEach(
        (l: { id: string; name: string; season: string; list_items: { id: string }[] }) => {
          userContext += `- [${l.id}] ${l.name} | ${l.season} | ${l.list_items?.length || 0} items\n`;
        },
      );
    } else {
      userContext += '\n### Packing Lists: none yet\n';
    }

    if (meals && meals.length > 0) {
      userContext += `\n### Meal Plans (${meals.length}):\n`;
      meals.forEach(
        (m: {
          id: string;
          name: string;
          plan_type: string;
          days_count: number;
          people_count: number;
          target_calories: number;
          target_weight_g: number;
        }) => {
          userContext += `- [${m.id}] ${m.name} | ${m.plan_type || 'standard'} | ${m.days_count} days | ${m.people_count || 1} people | ${m.target_calories || '—'} kcal target\n`;
        },
      );
    } else {
      userContext += '\n### Meal Plans: none yet\n';
    }

    const systemPrompt = buildSystemPrompt(locale, userContext);

    const userId = user.id;
    const dataLocale =
      locale === 'uk' || locale === 'ru' ? (locale as 'uk' | 'ru') : ('en' as const);

    const createdByRequest: { kind: CreationKind; id: string }[] = [];

    // A "full trip" request creates gear, a list, its items and a meal plan in one go.
    // Journaling every insert lets a failed step undo the whole batch: the model then
    // sees an honest failure instead of a half-built trip, and a retry cannot duplicate.
    async function rollbackRequestCreations(): Promise<{
      rolledBack?: number;
      rollbackFailed?: { table: string; id: string; error: string }[];
    }> {
      let rolledBack = 0;
      const rollbackFailed: { table: string; id: string; error: string }[] = [];

      for (const kind of ROLLBACK_ORDER) {
        const ids = createdByRequest
          .filter((entry) => entry.kind === kind)
          .map((entry) => entry.id);
        if (ids.length === 0) continue;

        const { data: deleted, error } = await supabase
          .from(CREATION_TABLE[kind])
          .delete()
          .in('id', ids)
          .select('id');

        if (error) {
          console.error(`[chat] rollback of ${CREATION_TABLE[kind]} failed:`, error.message);
          rollbackFailed.push(
            ...ids.map((id) => ({ table: CREATION_TABLE[kind], id, error: error.message })),
          );
        } else {
          rolledBack += deleted?.length ?? 0;
        }
      }

      return {
        rolledBack: rolledBack > 0 ? rolledBack : undefined,
        rollbackFailed: rollbackFailed.length > 0 ? rollbackFailed : undefined,
      };
    }

    const result = streamText({
      model: userModel ?? google!('gemma-4-26b-a4b-it'),
      system: systemPrompt,
      messages,
      tools: {
        searchWeb: tool({
          description:
            'Search the internet for current information: emergency contacts, route conditions, transport, trail closures, gear info. For WEATHER, use getWeather instead. Use when the user asks about specific locations or you need up-to-date data. Cite the returned source URLs and advise verifying safety-critical info.',
          parameters: z.object({
            query: z.string().describe('Search query in the language most likely to return good results'),
          }),
          execute: async ({ query }: { query: string }) => {
            if (isValidSearch(search)) {
              return runUserSearch(search, query);
            }
            if (!process.env.EXA_API_KEY) return 'Search is unavailable right now';
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 10000);
              const exaRes = await fetch('https://api.exa.ai/search', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': process.env.EXA_API_KEY,
                },
                body: JSON.stringify({
                  query,
                  type: 'auto',
                  numResults: 5,
                  contents: { highlights: true },
                }),
                signal: controller.signal,
              });
              clearTimeout(timeout);
              if (!exaRes.ok) throw new SearchError('unavailable');
              const data = await exaRes.json();
              const results = data.results || [];
              if (results.length === 0) return 'No search results found';
              return results
                .map(
                  (r: { title?: string; url?: string; highlights?: string[]; text?: string }) => {
                    const snippet =
                      r.highlights && r.highlights.length > 0
                        ? r.highlights.join(' … ')
                        : r.text || '';
                    return `- ${r.title || r.url}: ${snippet} (${r.url})`;
                  },
                )
                .join('\n');
            } catch (error) {
              if (error instanceof SearchError) throw error;
              throw new SearchError('unavailable');
            }
          },
        }),

        getWeather: tool({
          description:
            'Get current weather and a 7-day forecast for any location (mountains, trailheads, towns). Use this for ANY weather question. No API key needed.',
          parameters: z.object({
            location: z.string().describe('Place name, e.g. "Hoverla", "Yaremche", "Zakopane"'),
          }),
          execute: async ({ location }: { location: string }) => {
            if (isValidSearch(search)) {
              return runUserSearch(search, 'weather forecast 7 day ' + location);
            }
            try {
              // Open-Meteo отвечает JSON и на отказ (429/500 с error): без проверки ok такой
              // ответ выглядел как пустой результат. Сбой уходит в catch ниже — «сервис
              // недоступен»; «место не найдено» остаётся только для успешного пустого results.
              const geo = await fetchJson<GeocodeResponse>(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
                { timeoutMs: 10000 },
              );
              const place = geo.results?.[0];
              if (!place) return `Location "${location}" not found`;
              const w = await fetchJson<WeatherResponse>(
                `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code&forecast_days=7&timezone=auto`,
                { timeoutMs: 10000 },
              );
              const wmo: Record<number, string> = {
                0: 'Clear',
                1: 'Mainly clear',
                2: 'Partly cloudy',
                3: 'Overcast',
                45: 'Fog',
                48: 'Rime fog',
                51: 'Light drizzle',
                53: 'Drizzle',
                55: 'Heavy drizzle',
                61: 'Light rain',
                63: 'Rain',
                65: 'Heavy rain',
                71: 'Light snow',
                73: 'Snow',
                75: 'Heavy snow',
                77: 'Snow grains',
                80: 'Rain showers',
                81: 'Rain showers',
                82: 'Violent rain showers',
                85: 'Snow showers',
                86: 'Heavy snow showers',
                95: 'Thunderstorm',
                96: 'Thunderstorm w/ hail',
                99: 'Severe thunderstorm',
              };
              const c = w.current;
              let out = `Weather for ${place.name}${place.country ? ', ' + place.country : ''}${place.elevation ? ' (' + place.elevation + 'm)' : ''}:\n`;
              out += `Now: ${c.temperature_2m}°C (feels ${c.apparent_temperature}°C), ${wmo[c.weather_code] || 'code ' + c.weather_code}, wind ${c.wind_speed_10m} km/h, precip ${c.precipitation} mm\n\n7-day forecast:\n`;
              const d = w.daily;
              for (let i = 0; i < d.time.length; i++) {
                out += `- ${d.time[i]}: ${d.temperature_2m_min[i]}…${d.temperature_2m_max[i]}°C, ${wmo[d.weather_code[i]] || 'code ' + d.weather_code[i]}, precip ${d.precipitation_sum[i]} mm, wind max ${d.wind_speed_10m_max[i]} km/h\n`;
              }
              return out;
            } catch {
              return 'Weather data unavailable right now';
            }
          },
        }),

        getPackingList: tool({
          description:
            "Read the FULL contents of one of the user's packing lists — every gear item with weight, quantity, and packed/worn/consumable status. The context below only lists names and item counts, NOT the items themselves, so you MUST call this before analyzing or editing a specific list.",
          parameters: z.object({
            listId: z
              .string()
              .describe('ID of the packing list (from the Packing Lists context below)'),
          }),
          execute: async ({ listId }: { listId: string }) => {
            const { data: listData } = await supabase
              .from('gear_lists')
              .select('name, season, trip_date, gpx_data')
              .eq('id', listId)
              .single();
            const { data } = await supabase
              .from('list_items')
              .select('quantity, is_packed, worn, consumable, gear_items(name, category, weight_g)')
              .eq('list_id', listId);
            const items = (data ?? []) as unknown as Array<{
              quantity: number;
              is_packed: boolean;
              worn: boolean;
              consumable: boolean;
              gear_items:
                | { name: string; category: string; weight_g: number }
                | { name: string; category: string; weight_g: number }[]
                | null;
            }>;
            if (items.length === 0) return 'This list has no items yet.';
            let total = 0;
            const lines: string[] = [];
            for (const it of items) {
              const g = Array.isArray(it.gear_items) ? it.gear_items[0] : it.gear_items;
              if (!g) continue;
              total += (g.weight_g || 0) * (it.quantity || 1);
              const flags = [it.worn ? 'worn' : '', it.consumable ? 'consumable' : '', it.is_packed ? 'packed' : '']
                .filter(Boolean)
                .join(', ');
              lines.push(
                `- ${g.name} | ${g.category} | ${g.weight_g}g ×${it.quantity}${flags ? ' (' + flags + ')' : ''}`,
              );
            }
            let routeText = '';
            if (listData?.gpx_data) {
              const g = listData.gpx_data;
              routeText = `\n\nRoute: ${g.track_name || 'Track'}\n  Trip date: ${listData.trip_date || 'not set'}\n  Distance: ${g.distance_km} km\n  Elevation gain: ${g.elevation_gain_m} m\n  Elevation loss: ${g.elevation_loss_m} m\n  Max elevation: ${g.max_elevation_m} m\n  Weather (for trip date): ${g.weather || 'not available'}`;
            }
            return `Items (${lines.length}), total ${total}g:\n${lines.join('\n')}${routeText}`;
          },
        }),

        getMealPlanDetails: tool({
          description:
            "Read the FULL day-by-day contents of one of the user's meal plans — meals, foods, calories and weight per day. The context below only has plan summaries, NOT the entries, so you MUST call this before analyzing or editing a specific plan.",
          parameters: z.object({
            planId: z
              .string()
              .describe('ID of the meal plan (from the Meal Plans context below)'),
          }),
          execute: async ({ planId }: { planId: string }) => {
            const { data } = await supabase
              .from('meal_days')
              .select(
                'day_number, total_calories, total_weight_g, meal_entries(meal_type, name, weight_g, calories)',
              )
              .eq('plan_id', planId)
              .order('day_number');
            const days = (data ?? []) as unknown as Array<{
              day_number: number;
              total_calories: number;
              total_weight_g: number;
              meal_entries:
                | { meal_type: string; name: string; weight_g: number; calories: number }[]
                | null;
            }>;
            if (days.length === 0) return 'This plan has no days yet.';
            let out = '';
            for (const day of days) {
              out += `Day ${day.day_number} (${day.total_calories || 0} kcal, ${day.total_weight_g || 0}g):\n`;
              const entries = day.meal_entries || [];
              if (entries.length === 0) out += '  (no entries)\n';
              for (const e of entries) {
                out += `  - ${e.meal_type}: ${e.name} | ${e.weight_g}g | ${e.calories} kcal\n`;
              }
            }
            return out;
          },
        }),

        createMealPlan: tool({
          description:
            'Create a new meal plan in the app. Can optionally apply a template to auto-fill days with food entries. Available templates: standard_3day, comfort_winter, ultralight_3day.',
          parameters: z.object({
            name: z.string().describe('Name of the meal plan'),
            planType: z.enum(['comfort', 'standard', 'ultralight']).describe('Plan type'),
            daysCount: z.number().min(1).max(30).describe('Number of days'),
            peopleCount: z.number().min(1).max(20).describe('Number of people'),
            targetCalories: z.number().nullable().describe('Target calories per day (optional)'),
            targetWeightG: z.number().nullable().describe('Target weight per day in grams (optional)'),
            templateId: z
              .string()
              .nullable()
              .describe(
                'Template ID to auto-fill entries: standard_3day, comfort_winter, or ultralight_3day',
              ),
          }),
          execute: async ({
            name,
            planType,
            daysCount,
            peopleCount,
            targetCalories,
            targetWeightG,
            templateId,
          }: {
            name: string;
            planType: 'comfort' | 'standard' | 'ultralight';
            daysCount: number;
            peopleCount: number;
            targetCalories: number | null;
            targetWeightG: number | null;
            templateId: string | null;
          }) => {
            const defaults: Record<string, { cal: number; weight: number }> = {
              comfort: { cal: 3250, weight: 850 },
              standard: { cal: 3000, weight: 650 },
              ultralight: { cal: 2250, weight: 500 },
            };
            const d = defaults[planType] || defaults.standard;

            const { data: plan, error: planError } = await supabase
              .from('meal_plans')
              .insert({
                user_id: userId,
                name,
                plan_type: planType,
                days_count: daysCount,
                people_count: peopleCount,
                target_calories: targetCalories || d.cal,
                target_weight_g: targetWeightG || d.weight,
              })
              .select()
              .single();

            if (planError || !plan) return { error: 'Failed to create plan' };

            // meal_days and meal_entries cascade from the plan row.
            createdByRequest.push({ kind: 'meal_plan', id: plan.id });

            let totalEntries = 0;
            let totalWeight = 0;

            const template = templateId ? getMealTemplate(templateId) : null;

            const daysToInsert: {
              plan_id: string;
              day_number: number;
              total_calories: number;
              total_weight_g: number;
            }[] = [];
            const entriesByDay: {
              meal_type: string;
              name: string;
              weight_g: number;
              calories: number;
              protein_g: number;
              fat_g: number;
              carbs_g: number;
            }[][] = [];

            for (let i = 0; i < daysCount; i++) {
              let dayCalories = 0;
              let dayWeight = 0;
              const dayEntries: (typeof entriesByDay)[0] = [];

              if (template) {
                const pattern = template.dayPatterns[i % template.dayPatterns.length];
                for (const entry of pattern.entries) {
                  const foodItem = FOOD_CATALOG.find((f) => f.id === entry.catalogId);
                  if (!foodItem) continue;
                  const portionG = Math.round(
                    foodItem.defaultPortion[planType] * (entry.portionMultiplier || 1) * peopleCount,
                  );
                  const nutrition = calculateNutrition(foodItem, portionG);
                  dayEntries.push({
                    meal_type: entry.mealType,
                    name: foodItem.name[dataLocale],
                    weight_g: portionG,
                    calories: nutrition.calories,
                    protein_g: nutrition.protein,
                    fat_g: nutrition.fat,
                    carbs_g: nutrition.carbs,
                  });
                  dayCalories += nutrition.calories;
                  dayWeight += portionG;
                }
              }

              daysToInsert.push({
                plan_id: plan.id,
                day_number: i + 1,
                total_calories: dayCalories,
                total_weight_g: dayWeight,
              });
              entriesByDay.push(dayEntries);
              totalEntries += dayEntries.length;
              totalWeight += dayWeight;
            }

            const { data: insertedDays, error: daysErr } = await supabase
              .from('meal_days')
              .insert(daysToInsert)
              .select('id');

            if (daysErr) {
              console.error('[chat] createMealPlan days insert failed:', daysErr);
              const rollback = await rollbackRequestCreations();
              return { success: false, error: 'Failed to create the meal plan', ...rollback };
            }

            if (insertedDays && template) {
              const allEntries = insertedDays.flatMap((day, i) =>
                entriesByDay[i].map((entry) => ({ ...entry, day_id: day.id })),
              );
              if (allEntries.length > 0) {
                const { error: entriesErr } = await supabase
                  .from('meal_entries')
                  .insert(allEntries);
                if (entriesErr) {
                  console.error('[chat] createMealPlan entries insert failed:', entriesErr);
                  const rollback = await rollbackRequestCreations();
                  return { success: false, error: 'Failed to create the meal plan', ...rollback };
                }
              }
            }

            return {
              success: true,
              id: plan.id,
              name: plan.name,
              daysCount,
              peopleCount,
              planType,
              templateApplied: !!template,
              totalEntries,
              totalWeightG: totalWeight,
              link: `/meals/${plan.id}`,
            };
          },
        }),

        addGearItems: tool({
          description:
            "Add one or more gear items to the user's gear library. Use real product names and accurate weights. Check existing gear first to avoid duplicates.",
          parameters: z.object({
            items: z
              .array(
                z.object({
                  name: z.string().describe('Gear item name (in app locale language)'),
                  category: z
                    .enum([
                      'backpack',
                      'shelter',
                      'sleep_system',
                      'cooking',
                      'water',
                      'clothing',
                      'footwear',
                      'lighting',
                      'navigation',
                      'safety',
                      'hygiene',
                      'electronics',
                      'tools',
                      'documents',
                      'technical',
                      'other',
                    ])
                    .describe('Gear category'),
                  weightG: z.number().min(0).describe('Weight in grams'),
                  season: z.enum(['summer', 'winter', 'demi']).describe('Season'),
                  notes: z.string().nullable().describe('Optional notes'),
                }),
              )
              .describe('Array of gear items to add'),
          }),
          execute: async ({ items }: {
            items: Array<{
              name: string;
              category: string;
              weightG: number;
              season: string;
              notes: string | null;
            }>;
          }) => {
            const itemsToInsert = items.map((item: {
              name: string;
              category: string;
              weightG: number;
              season: string;
              notes: string | null;
            }) => ({
              user_id: userId,
              name: item.name,
              category: item.category,
              weight_g: item.weightG,
              season: item.season,
              notes: item.notes || null,
            }));

            const { data, error: gearErr } = await supabase
              .from('gear_items')
              .insert(itemsToInsert)
              .select('id, name, weight_g');

            if (gearErr) {
              const rollback = await rollbackRequestCreations();
              return { success: false, error: 'Failed to add gear items', ...rollback };
            }

            const inserted = (data || []).map((d) => ({
              id: d.id,
              name: d.name,
              weightG: d.weight_g,
            }));
            inserted.forEach((item) => createdByRequest.push({ kind: 'gear_item', id: item.id }));
            const totalWeight = inserted.reduce((sum, i) => sum + i.weightG, 0);

            return {
              success: true,
              count: inserted.length,
              totalWeightG: totalWeight,
              items: inserted,
              link: '/gear',
            };
          },
        }),

        createGearList: tool({
          description: 'Create a new packing list for a trip.',
          parameters: z.object({
            name: z.string().describe('List name (e.g., trip name)'),
            season: z.enum(['summer', 'winter', 'demi']).describe('Season'),
            tripDate: z
              .string()
              .nullable()
              .describe('Trip date in YYYY-MM-DD format (optional)'),
          }),
          execute: async ({
            name,
            season,
            tripDate,
          }: {
            name: string;
            season: string;
            tripDate: string | null;
          }) => {
            const { data: list, error } = await supabase
              .from('gear_lists')
              .insert({
                user_id: userId,
                name,
                season,
                trip_date: tripDate || null,
              })
              .select()
              .single();

            if (error || !list) {
              const rollback = await rollbackRequestCreations();
              return { success: false, error: 'Failed to create list', ...rollback };
            }

            createdByRequest.push({ kind: 'gear_list', id: list.id });

            return {
              success: true,
              id: list.id,
              name: list.name,
              season: list.season,
              link: `/lists/${list.id}`,
            };
          },
        }),

        addItemsToList: tool({
          description:
            "Add gear items to an existing packing list. Items are matched by name from the user's gear library.",
          parameters: z.object({
            listId: z.string().describe('ID of the packing list'),
            itemNames: z
              .array(z.string())
              .describe("Array of gear item names to add (matched against user's gear library)"),
          }),
          execute: async ({
            listId,
            itemNames,
          }: {
            listId: string;
            itemNames: string[];
          }) => {
            const added: { name: string; weightG: number }[] = [];
            const notFound: string[] = [];
            const failed: { name: string; reason: string }[] = [];
            let totalWeight = 0;

            for (const itemName of itemNames) {
              const { data: gearItem } = await supabase
                .from('gear_items')
                .select('id, name, weight_g')
                .eq('user_id', userId)
                .ilike('name', `%${escapeLike(itemName)}%`)
                .limit(1)
                .single();

              if (!gearItem) {
                notFound.push(itemName);
                continue;
              }

              const { data: insertedItem, error } = await supabase
                .from('list_items')
                .insert({
                  list_id: listId,
                  gear_item_id: gearItem.id,
                  quantity: 1,
                  is_packed: false,
                  worn: false,
                  consumable: false,
                })
                .select('id')
                .single();

              if (error || !insertedItem) {
                console.error('[chat] addItemsToList insert failed:', error?.message ?? 'no row');
                failed.push({ name: gearItem.name, reason: error?.message ?? 'insert failed' });
                continue;
              }

              createdByRequest.push({ kind: 'list_item', id: insertedItem.id });
              added.push({ name: gearItem.name, weightG: gearItem.weight_g });
              totalWeight += gearItem.weight_g;
            }

            // A step that wrote nothing is a failed step: undo the batch it was part of so
            // the model cannot build further on a half-created trip. A partial result is
            // kept and reported — the failed entries below tell the model what is missing.
            const rollback =
              added.length === 0 && failed.length > 0 ? await rollbackRequestCreations() : undefined;

            return {
              success: failed.length === 0,
              added: added.length,
              totalWeightG: totalWeight,
              items: added,
              notFound: notFound.length > 0 ? notFound : undefined,
              failed: failed.length > 0 ? failed : undefined,
              error:
                failed.length > 0
                  ? `Failed to add ${failed.length} of ${itemNames.length} items to the list`
                  : undefined,
              ...(rollback ?? {}),
              link: added.length > 0 ? `/lists/${listId}` : undefined,
            };
          },
        }),
      },
      maxSteps: 4,
      maxTokens: 4096,
      onFinish: async () => {
        if (!usingOwnKey) {
          try {
            const { error: usageWriteError } = await supabase.from('ai_usage').upsert(
              {
                user_id: user.id,
                date: new Date().toISOString().split('T')[0],
                message_count: todayCount + 1,
              },
              { onConflict: 'user_id,date' },
            );
            if (usageWriteError) {
              console.error('[chat] ai_usage upsert failed:', usageWriteError.message);
            }
          } catch (error) {
            // The reply has already streamed; the worst case is one uncounted message.
            console.error(
              '[chat] ai_usage upsert threw:',
              error instanceof Error ? error.message : String(error),
            );
          }
        }
      },
    });

    result.pipeDataStreamToResponse(res, {
      getErrorMessage: (error: unknown) => {
        // Search failures are wrapped in a ToolExecutionError whose message also
        // matches the "tool" check below, so inspect the cause first.
        const cause = (error as { cause?: unknown } | null | undefined)?.cause;
        if (cause instanceof SearchError) {
          console.error('[chat] search error:', cause.kind);
          return cause.kind === 'key' ? 'SEARCH_KEY_INVALID' : 'SEARCH_UNAVAILABLE';
        }
        const msg = error instanceof Error ? error.message : String(error);
        const lower = msg.toLowerCase();
        if (
          lower.includes('tool') ||
          lower.includes('function call') ||
          lower.includes('function_call') ||
          lower.includes('tool_choice') ||
          lower.includes('tool_calls')
        ) {
          return 'MODEL_NO_TOOLS';
        }
        if (usingOwnKey) {
          if (
            lower.includes('401') ||
            lower.includes('403') ||
            lower.includes('429') ||
            lower.includes('unauthorized') ||
            lower.includes('quota') ||
            lower.includes('insufficient') ||
            lower.includes('invalid api key') ||
            lower.includes('rate limit')
          ) {
            console.error('[chat] stream error:', sanitizeLog(msg, secrets));
            return 'BYOK_FAILED';
          }
        }
        console.error('[chat] stream error:', sanitizeLog(msg, secrets));
        return 'AI service is temporarily unavailable. Please try again in a moment.';
      },
    });

    return;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[chat] route error:', sanitizeLog(msg, secrets));
    return res.status(500).json({ error: 'Internal server error' });
  }
}
