const SEARCH_PROVIDERS = ['exa', 'brave', 'tavily', 'serper', 'firecrawl', 'perplexity', 'google_cse'] as const;
type SearchProvider = (typeof SEARCH_PROVIDERS)[number];

interface UserSearchConfig {
  provider: string;
  apiKey: string;
  cx?: string;
}

export function isValidSearch(search: unknown): search is UserSearchConfig {
  if (!search || typeof search !== 'object') return false;
  const s = search as Record<string, unknown>;
  if (typeof s.provider !== 'string' || !SEARCH_PROVIDERS.includes(s.provider as SearchProvider)) return false;
  if (typeof s.apiKey !== 'string' || s.apiKey.trim().length === 0) return false;
  if (s.cx !== undefined && typeof s.cx !== 'string') return false;
  return true;
}

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

function formatResults(results: SearchResult[]): string {
  if (results.length === 0) return 'No search results found';
  return results
    .map((r) => `- ${r.title}: ${r.snippet} (${r.url})`)
    .join('\n');
}

async function braveSearch(query: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
    { headers: { 'X-Subscription-Token': apiKey } },
  );
  const data = await res.json();
  const raw = data.web?.results || [];
  return formatResults(
    raw.map((r: { title?: string; description?: string; url?: string }) => ({
      title: r.title || r.url || '—',
      snippet: r.description || '',
      url: r.url || '',
    })),
  );
}

async function tavilySearch(query: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, query, max_results: 5 }),
  });
  const data = await res.json();
  const raw = data.results || [];
  return formatResults(
    raw.map((r: { title?: string; content?: string; url?: string }) => ({
      title: r.title || r.url || '—',
      snippet: r.content || '',
      url: r.url || '',
    })),
  );
}

async function serperSearch(query: string, apiKey: string): Promise<string> {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
    body: JSON.stringify({ q: query, num: 5 }),
  });
  const data = await res.json();
  const raw = data.organic || [];
  return formatResults(
    raw.map((r: { title?: string; snippet?: string; link?: string }) => ({
      title: r.title || r.link || '—',
      snippet: r.snippet || '',
      url: r.link || '',
    })),
  );
}

async function exaSearch(query: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ query, type: 'auto', numResults: 5, contents: { highlights: true } }),
  });
  const data = await res.json();
  const raw = data.results || [];
  return formatResults(
    raw.map((r: { title?: string; highlights?: string[]; text?: string; url?: string }) => ({
      title: r.title || r.url || '—',
      snippet: (r.highlights && r.highlights.length > 0 ? r.highlights.join(' … ') : r.text) || '',
      url: r.url || '',
    })),
  );
}

async function firecrawlSearch(query: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, limit: 5 }),
  });
  const data = await res.json();
  const raw = data.data || [];
  return formatResults(
    raw.map((r: { title?: string; description?: string; url?: string }) => ({
      title: r.title || r.url || '—',
      snippet: r.description || '',
      url: r.url || '',
    })),
  );
}

async function perplexitySearch(query: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: query }],
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No search results found';
}

async function googleCseSearch(query: string, apiKey: string, cx: string): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=5`,
  );
  const data = await res.json();
  const raw = data.items || [];
  return formatResults(
    raw.map((r: { title?: string; snippet?: string; link?: string }) => ({
      title: r.title || r.link || '—',
      snippet: r.snippet || '',
      url: r.link || '',
    })),
  );
}

export async function runUserSearch(
  search: UserSearchConfig,
  query: string,
): Promise<string> {
  const p = search.provider as SearchProvider;

  try {
    switch (p) {
      case 'brave':
        return await braveSearch(query, search.apiKey);
      case 'tavily':
        return await tavilySearch(query, search.apiKey);
      case 'serper':
        return await serperSearch(query, search.apiKey);
      case 'exa':
        return await exaSearch(query, search.apiKey);
      case 'firecrawl':
        return await firecrawlSearch(query, search.apiKey);
      case 'perplexity':
        return await perplexitySearch(query, search.apiKey);
      case 'google_cse':
        if (!search.cx) return 'Search misconfigured';
        return await googleCseSearch(query, search.apiKey, search.cx);
    }
  } catch {
    return 'Search temporarily unavailable';
  }
}
