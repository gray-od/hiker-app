import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { buildSystemPrompt } from '@/lib/chat-system-prompt';
import { FOOD_CATALOG, calculateNutrition } from '@/lib/food-catalog';
import { getMealTemplate } from '@/lib/meal-templates';

const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: 'https://api.deepseek.com',
});

export async function POST(req: Request) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return new Response('DEEPSEEK_API_KEY not configured', { status: 500 });
  }

  try {
    const { messages } = await req.json();

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const FREE_DAILY_LIMIT = 15;

  const { data: usage } = await supabase
    .from('ai_usage')
    .select('message_count')
    .eq('user_id', session.user.id)
    .eq('date', new Date().toISOString().split('T')[0])
    .single();

  const todayCount = usage?.message_count || 0;

  if (todayCount >= FREE_DAILY_LIMIT) {
    return new Response('RATE_LIMIT', { status: 429 });
  }

  await supabase.from('ai_usage').upsert(
    { user_id: session.user.id, date: new Date().toISOString().split('T')[0], message_count: todayCount + 1 },
    { onConflict: 'user_id,date' }
  );

  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'uk';

  const [{ data: gear }, { data: lists }, { data: meals }] = await Promise.all([
    supabase
      .from('gear_items')
      .select('id, name, category, weight_g, season')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50),
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
    gear.forEach((g: { id: string; name: string; category: string; weight_g: number; season: string }) => {
      userContext += `- [${g.id}] ${g.name} | ${g.category} | ${g.weight_g}g | ${g.season}\n`;
    });
  } else {
    userContext += '\n### Gear Items: none yet\n';
  }

  if (lists && lists.length > 0) {
    userContext += `\n### Packing Lists (${lists.length}):\n`;
    lists.forEach((l: { id: string; name: string; season: string; list_items: { id: string }[] }) => {
      userContext += `- [${l.id}] ${l.name} | ${l.season} | ${l.list_items?.length || 0} items\n`;
    });
  } else {
    userContext += '\n### Packing Lists: none yet\n';
  }

  if (meals && meals.length > 0) {
    userContext += `\n### Meal Plans (${meals.length}):\n`;
    meals.forEach((m: { id: string; name: string; plan_type: string; days_count: number; people_count: number; target_calories: number; target_weight_g: number }) => {
      userContext += `- [${m.id}] ${m.name} | ${m.plan_type || 'standard'} | ${m.days_count} days | ${m.people_count || 1} people | ${m.target_calories || '—'} kcal target\n`;
    });
  } else {
    userContext += '\n### Meal Plans: none yet\n';
  }

  const systemPrompt = buildSystemPrompt(locale, userContext);

  const userId = session.user.id;
  const dataLocale = (locale === 'uk' || locale === 'ru') ? locale as 'uk' | 'ru' : 'en' as const;

  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: systemPrompt,
    messages,
    tools: {
      ...(process.env.TAVILY_API_KEY ? {
        searchWeb: tool({
          description: 'Search the internet for current information: weather, emergency contacts, route conditions, transport. Use when user asks about specific locations or you need up-to-date data.',
          parameters: z.object({
            query: z.string().describe('Search query in the language most likely to return good results'),
          }),
          execute: async ({ query }) => {
            const response = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: process.env.TAVILY_API_KEY,
                query,
                max_results: 5,
                include_answer: true,
              }),
            });
            const data = await response.json();
            if (data.answer) {
              return `Answer: ${data.answer}\n\nSources:\n${data.results?.map((r: { title: string; url: string; content: string }) => `- ${r.title}: ${r.content} (${r.url})`).join('\n') || ''}`;
            }
            return data.results?.map((r: { title: string; url: string; content: string }) => `- ${r.title}: ${r.content} (${r.url})`).join('\n') || 'No results found';
          },
        }),
      } : {}),

      createMealPlan: tool({
        description: 'Create a new meal plan in the app. Can optionally apply a template to auto-fill days with food entries. Available templates: standard_3day, comfort_winter, ultralight_3day.',
        parameters: z.object({
          name: z.string().describe('Name of the meal plan'),
          planType: z.enum(['comfort', 'standard', 'ultralight']).describe('Plan type'),
          daysCount: z.number().min(1).max(30).describe('Number of days'),
          peopleCount: z.number().min(1).max(20).describe('Number of people'),
          targetCalories: z.number().optional().describe('Target calories per day (optional)'),
          targetWeightG: z.number().optional().describe('Target weight per day in grams (optional)'),
          templateId: z.string().optional().describe('Template ID to auto-fill entries: standard_3day, comfort_winter, or ultralight_3day'),
        }),
        execute: async ({ name, planType, daysCount, peopleCount, targetCalories, targetWeightG, templateId }) => {
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

          if (planError || !plan) return { error: planError?.message || 'Failed to create plan' };

          let totalEntries = 0;
          let totalWeight = 0;

          const template = templateId ? getMealTemplate(templateId) : null;

          const daysToInsert: { plan_id: string; day_number: number; total_calories: number; total_weight_g: number }[] = [];
          const entriesByDay: { meal_type: string; name: string; weight_g: number; calories: number; protein_g: number; fat_g: number; carbs_g: number }[][] = [];

          for (let i = 0; i < daysCount; i++) {
            let dayCalories = 0;
            let dayWeight = 0;
            const dayEntries: typeof entriesByDay[0] = [];

            if (template) {
              const pattern = template.dayPatterns[i % template.dayPatterns.length];
              for (const entry of pattern.entries) {
                const foodItem = FOOD_CATALOG.find(f => f.id === entry.catalogId);
                if (!foodItem) continue;
                const portionG = Math.round(foodItem.defaultPortion[planType] * (entry.portionMultiplier || 1) * peopleCount);
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

            daysToInsert.push({ plan_id: plan.id, day_number: i + 1, total_calories: dayCalories, total_weight_g: dayWeight });
            entriesByDay.push(dayEntries);
            totalEntries += dayEntries.length;
            totalWeight += dayWeight;
          }

          const { data: insertedDays } = await supabase
            .from('meal_days')
            .insert(daysToInsert)
            .select('id');

          if (insertedDays && template) {
            const allEntries = insertedDays.flatMap((day, i) =>
              entriesByDay[i].map(entry => ({ ...entry, day_id: day.id }))
            );
            if (allEntries.length > 0) {
              await supabase.from('meal_entries').insert(allEntries);
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
        description: 'Add one or more gear items to the user\'s gear library. Use real product names and accurate weights. Check existing gear first to avoid duplicates.',
        parameters: z.object({
          items: z.array(z.object({
            name: z.string().describe('Gear item name (in app locale language)'),
            category: z.enum(['backpack', 'shelter', 'sleep_system', 'cooking', 'water', 'clothing', 'footwear', 'lighting', 'navigation', 'safety', 'hygiene', 'electronics', 'tools', 'documents', 'technical', 'other']).describe('Gear category'),
            weightG: z.number().min(0).describe('Weight in grams'),
            season: z.enum(['summer', 'winter', 'demi']).describe('Season'),
            notes: z.string().optional().describe('Optional notes'),
          })).describe('Array of gear items to add'),
        }),
        execute: async ({ items }) => {
          const itemsToInsert = items.map(item => ({
            user_id: userId,
            name: item.name,
            category: item.category,
            weight_g: item.weightG,
            season: item.season,
            notes: item.notes || null,
          }));

          const { data } = await supabase
            .from('gear_items')
            .insert(itemsToInsert)
            .select('id, name, weight_g');

          const inserted = (data || []).map(d => ({ id: d.id, name: d.name, weightG: d.weight_g }));
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
          tripDate: z.string().optional().describe('Trip date in YYYY-MM-DD format (optional)'),
        }),
        execute: async ({ name, season, tripDate }) => {
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

          if (error || !list) return { error: error?.message || 'Failed to create list' };

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
        description: 'Add gear items to an existing packing list. Items are matched by name from the user\'s gear library.',
        parameters: z.object({
          listId: z.string().describe('ID of the packing list'),
          itemNames: z.array(z.string()).describe('Array of gear item names to add (matched against user\'s gear library)'),
        }),
        execute: async ({ listId, itemNames }) => {
          const added = [];
          const notFound = [];
          let totalWeight = 0;

          for (const itemName of itemNames) {
            const { data: gearItem } = await supabase
              .from('gear_items')
              .select('id, name, weight_g')
              .eq('user_id', userId)
              .ilike('name', `%${itemName}%`)
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
    maxSteps: 6,
  });

  return result.toDataStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(message, { status: 500 });
  }
}
