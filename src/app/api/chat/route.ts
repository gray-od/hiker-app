import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { buildSystemPrompt } from '@/lib/chat-system-prompt';

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
      .select('name, category, weight_g, season')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('gear_lists')
      .select('name, season, created_at, list_items(id)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('meal_plans')
      .select('name, plan_type, days_count, people_count, target_calories, target_weight_g')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  let userContext = `Language: ${locale}\n`;

  if (gear && gear.length > 0) {
    userContext += `\n### Gear Items (${gear.length}):\n`;
    gear.forEach((g: { name: string; category: string; weight_g: number; season: string }) => {
      userContext += `- ${g.name} | ${g.category} | ${g.weight_g}g | ${g.season}\n`;
    });
  } else {
    userContext += '\n### Gear Items: none yet\n';
  }

  if (lists && lists.length > 0) {
    userContext += `\n### Packing Lists (${lists.length}):\n`;
    lists.forEach((l: { name: string; season: string; list_items: { id: string }[] }) => {
      userContext += `- ${l.name} | ${l.season} | ${l.list_items?.length || 0} items\n`;
    });
  } else {
    userContext += '\n### Packing Lists: none yet\n';
  }

  if (meals && meals.length > 0) {
    userContext += `\n### Meal Plans (${meals.length}):\n`;
    meals.forEach((m: { name: string; plan_type: string; days_count: number; people_count: number; target_calories: number; target_weight_g: number }) => {
      userContext += `- ${m.name} | ${m.plan_type || 'standard'} | ${m.days_count} days | ${m.people_count || 1} people | ${m.target_calories || '—'} kcal target\n`;
    });
  } else {
    userContext += '\n### Meal Plans: none yet\n';
  }

  const systemPrompt = buildSystemPrompt(locale, userContext);

  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: systemPrompt,
    messages,
    tools: process.env.TAVILY_API_KEY ? {
      searchWeb: tool({
        description: 'Search the internet for current information: weather forecasts, emergency service contacts, route conditions, transport schedules, regional info. Use this when user asks about specific locations, weather, or you need up-to-date data.',
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
    } : undefined,
    maxSteps: 3,
  });

  return result.toDataStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(message, { status: 500 });
  }
}
