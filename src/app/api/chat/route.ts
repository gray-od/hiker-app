import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
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
  });

  return result.toDataStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(message, { status: 500 });
  }
}
