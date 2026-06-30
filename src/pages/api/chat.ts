import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool, isStepCount } from 'ai';
import { z } from 'zod';
import { buildSystemPrompt } from '@/lib/chat-system-prompt';
import { FOOD_CATALOG, calculateNutrition } from '@/lib/food-catalog';
import { getMealTemplate } from '@/lib/meal-templates';
import { resolveUserModel, validateAiKey } from '@/lib/ai-providers';
import { isValidSearch, runUserSearch } from '@/lib/search-providers';

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

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secrets: string[] = [];
  try {
    const { messages, ai, search } = req.body;
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
              const parts = [`${name}=${encodeURIComponent(value)}`];
              if (options?.maxAge) parts.push(`Max-Age=${options.maxAge}`);
              if (options?.path) parts.push(`Path=${options.path}`);
              if (options?.domain) parts.push(`Domain=${options.domain}`);
              if (options?.secure) parts.push('Secure');
              if (options?.httpOnly) parts.push('HttpOnly');
              if (options?.sameSite) parts.push(`SameSite=${options.sameSite}`);
              existingCookies.push(parts.join('; '));
            });
            res.setHeader('Set-Cookie', existingCookies);
          },
        },
      },
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
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
      const { data: usage } = await supabase
        .from('ai_usage')
        .select('message_count')
        .eq('user_id', session.user.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

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
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('gear_lists')
        .select('id, name, season, created_at, list_items(id)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('meal_plans')
        .select('id, name, plan_type, days_count, people_count, target_calories, target_weight_g')
        .eq('user_id', session.user.id)
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

    const userId = session.user.id;
    const dataLocale =
      locale === 'uk' || locale === 'ru' ? (locale as 'uk' | 'ru') : ('en' as const);

    const result = streamText({
      model: userModel ?? google('gemma-4-26b-a4b-it'),
      system: systemPrompt,
      messages,
      tools: {
        searchWeb: tool({
          description:
            'Search the internet for current information: emergency contacts, route conditions, transport, trail closures, gear info. For WEATHER, use getWeather instead. Use when the user asks about specific locations or you need up-to-date data. Cite the returned source URLs and advise verifying safety-critical info.',
          inputSchema: z.object({
            query: z.string().describe('Search query in the language most likely to return good results'),
          }),
          execute: async ({ query }: { query: string }) => {
            if (isValidSearch(search)) {
              return runUserSearch(search, query);
            }
            if (!process.env.EXA_API_KEY) return 'Search is unavailable right now';
            try {
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
              });
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
            } catch {
              return 'Search temporarily unavailable';
            }
          },
        }),

        getWeather: tool({
          description:
            'Get current weather and a 7-day forecast for any location (mountains, trailheads, towns). Use this for ANY weather question. No API key needed.',
          inputSchema: z.object({
            location: z.string().describe('Place name, e.g. "Hoverla", "Yaremche", "Zakopane"'),
          }),
          execute: async ({ location }: { location: string }) => {
            if (isValidSearch(search)) {
              return runUserSearch(search, 'weather forecast 7 day ' + location);
            }
            try {
              const geoRes = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
              );
              const geo = await geoRes.json();
              const place = geo.results?.[0];
              if (!place) return `Location "${location}" not found`;
              const wRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code&forecast_days=7&timezone=auto`,
              );
              const w = await wRes.json();
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
          inputSchema: z.object({
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
              routeText = `\n\nRoute: ${g.track_name || 'Track'}\n  Distance: ${g.distance_km} km\n  Elevation gain: ${g.elevation_gain_m} m\n  Elevation loss: ${g.elevation_loss_m} m\n  Max elevation: ${g.max_elevation_m} m\n  Weather: ${g.weather || 'not available'}`;
            }
            return `Items (${lines.length}), total ${total}g:\n${lines.join('\n')}${routeText}`;
          },
        }),

        getMealPlanDetails: tool({
          description:
            "Read the FULL day-by-day contents of one of the user's meal plans — meals, foods, calories and weight per day. The context below only has plan summaries, NOT the entries, so you MUST call this before analyzing or editing a specific plan.",
          inputSchema: z.object({
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
          inputSchema: z.object({
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

            if (daysErr) return { error: 'Failed to create meal plan days' };

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
                  return {
                    success: true,
                    id: plan.id,
                    name: plan.name,
                    warning: 'Some entries could not be added',
                  };
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
          inputSchema: z.object({
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

            if (gearErr) return { error: 'Failed to add gear items' };

            const inserted = (data || []).map((d) => ({
              id: d.id,
              name: d.name,
              weightG: d.weight_g,
            }));
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
          inputSchema: z.object({
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

            if (error || !list) return { error: 'Failed to create list' };

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
          inputSchema: z.object({
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
            const added = [];
            const notFound = [];
            let totalWeight = 0;

            for (const itemName of itemNames) {
              const { data: gearItem } = await supabase
                .from('gear_items')
                .select('id, name, weight_g')
                .eq('user_id', userId)
                .ilike('name', `%${escapeLike(itemName)}%`)
                .limit(1)
                .single();

              if (gearItem) {
                const { error } = await supabase
                  .from('list_items')
                  .insert({
                    list_id: listId,
                    gear_item_id: gearItem.id,
                    quantity: 1,
                    is_packed: false,
                    worn: false,
                    consumable: false,
                  });

                if (!error) {
                  added.push({ name: gearItem.name, weightG: gearItem.weight_g });
                  totalWeight += gearItem.weight_g;
                }
              } else {
                notFound.push(itemName);
              }
            }

            return {
              success: true,
              added: added.length,
              totalWeightG: totalWeight,
              items: added,
              notFound: notFound.length > 0 ? notFound : undefined,
              link: `/lists/${listId}`,
            };
          },
        }),
      },
      stopWhen: isStepCount(4),
      maxOutputTokens: 4096,
      onFinish: async () => {
        if (!usingOwnKey) {
          try {
            await supabase.from('ai_usage').upsert(
              {
                user_id: session.user.id,
                date: new Date().toISOString().split('T')[0],
                message_count: todayCount + 1,
              },
              { onConflict: 'user_id,date' },
            );
          } catch {
            // Rate limit persistence failed — non-critical, user gets one extra message
          }
        }
      },
    });

    const response = result.toUIMessageStreamResponse({
      onError: (error: unknown) => {
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

    // Pages Router: pipe AI SDK Response stream to the Node.js response
    const reader = response.body?.getReader();
    if (!reader) {
      return res.status(500).end('Stream error');
    }

    // Copy headers from the AI SDK response (Content-Type, etc.)
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });
    res.writeHead(response.status, responseHeaders);

    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          res.write(value);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('[chat] stream pump error:', sanitizeLog(errMsg, secrets));
        if (!res.writableEnded) {
          res.end();
        }
      }
    };

    // Start pumping — don't await, let the stream flow
    pump();

    return;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[chat] route error:', sanitizeLog(msg, secrets));
    return res.status(500).json({ error: 'Internal server error' });
  }
}
