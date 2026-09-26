import { FetchJsonError, fetchJson, fetchWithTimeout, type FetchTimeoutInit } from '@/lib/fetchJson';

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

export type SearchErrorKind = 'key' | 'unavailable';

// Typed so the chat API can tell "your key is bad" from "provider is down"
// and show a translated message instead of a fake empty result.
export class SearchError extends Error {
  readonly kind: SearchErrorKind;

  constructor(kind: SearchErrorKind) {
    super(kind === 'key' ? 'search key rejected' : 'search provider unavailable');
    this.name = 'SearchError';
    this.kind = kind;
  }
}

const SEARCH_TIMEOUT_MS = 10000;
const SEARCH_KEY_TIMEOUT_MS = 8000;

// Таймаут и мёртвая сеть дают тот же 'unavailable', что раньше давал голый fetch; HTTP-статус
// сохраняет деление key/unavailable, на которое опираются тексты ошибок в чате (SearchError).
async function searchRequest<T>(
  url: string,
  init: FetchTimeoutInit = {},
  keyStatuses: number[] = [401, 403],
): Promise<T> {
  try {
    return await fetchJson<T>(url, { ...init, timeoutMs: SEARCH_TIMEOUT_MS });
  } catch (error) {
    if (error instanceof FetchJsonError && error.code === 'HTTP_ERROR') {
      throw new SearchError(keyStatuses.includes(error.status ?? 0) ? 'key' : 'unavailable');
    }
    throw new SearchError('unavailable');
  }
}

function formatResults(results: SearchResult[]): string {
  if (results.length === 0) return 'No search results found';
  return results
    .map((r) => `- ${r.title}: ${r.snippet} (${r.url})`)
    .join('\n');
}

async function braveSearch(query: string, apiKey: string): Promise<string> {
  const data = await searchRequest<{
    web?: { results?: Array<{ title?: string; description?: string; url?: string }> };
  }>(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
    { headers: { 'X-Subscription-Token': apiKey } },
  );
  const raw = data.web?.results || [];
  return formatResults(
    raw.map((r) => ({
      title: r.title || r.url || '—',
      snippet: r.description || '',
      url: r.url || '',
    })),
  );
}

async function tavilySearch(query: string, apiKey: string): Promise<string> {
  const data = await searchRequest<{
    results?: Array<{ title?: string; content?: string; url?: string }>;
  }>('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, query, max_results: 5 }),
  });
  const raw = data.results || [];
  return formatResults(
    raw.map((r) => ({
      title: r.title || r.url || '—',
      snippet: r.content || '',
      url: r.url || '',
    })),
  );
}

async function serperSearch(query: string, apiKey: string): Promise<string> {
  const data = await searchRequest<{
    organic?: Array<{ title?: string; snippet?: string; link?: string }>;
  }>('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
    body: JSON.stringify({ q: query, num: 5 }),
  });
  const raw = data.organic || [];
  return formatResults(
    raw.map((r) => ({
      title: r.title || r.link || '—',
      snippet: r.snippet || '',
      url: r.link || '',
    })),
  );
}

async function exaSearch(query: string, apiKey: string): Promise<string> {
  const data = await searchRequest<{
    results?: Array<{ title?: string; highlights?: string[]; text?: string; url?: string }>;
  }>('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ query, type: 'auto', numResults: 5, contents: { highlights: true } }),
  });
  const raw = data.results || [];
  return formatResults(
    raw.map((r) => ({
      title: r.title || r.url || '—',
      snippet: (r.highlights && r.highlights.length > 0 ? r.highlights.join(' … ') : r.text) || '',
      url: r.url || '',
    })),
  );
}

async function firecrawlSearch(query: string, apiKey: string): Promise<string> {
  const data = await searchRequest<{
    data?: Array<{ title?: string; description?: string; url?: string }>;
  }>('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, limit: 5 }),
  });
  const raw = data.data || [];
  return formatResults(
    raw.map((r) => ({
      title: r.title || r.url || '—',
      snippet: r.description || '',
      url: r.url || '',
    })),
  );
}

async function perplexitySearch(query: string, apiKey: string): Promise<string> {
  const data = await searchRequest<{
    choices?: Array<{ message?: { content?: string } }>;
  }>('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: query }],
    }),
  });
  return data.choices?.[0]?.message?.content || 'No search results found';
}

async function googleCseSearch(query: string, apiKey: string, cx: string): Promise<string> {
  const data = await searchRequest<{
    items?: Array<{ title?: string; snippet?: string; link?: string }>;
  }>(
    `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=5`,
    undefined,
    // Google reports both an invalid key and an invalid cx as HTTP 400.
    [400, 403],
  );
  const raw = data.items || [];
  return formatResults(
    raw.map((r) => ({
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
        if (!search.cx) throw new SearchError('key');
        return await googleCseSearch(query, search.apiKey, search.cx);
    }
  } catch (error) {
    if (error instanceof SearchError) throw error;
    throw new SearchError('unavailable');
  }
}

export async function validateSearchKey(search: unknown): Promise<{ ok: boolean; error?: string }> {
  if (!isValidSearch(search)) return { ok: false, error: 'invalid config' };

  // Проверяется только статус, тело не читается: 2xx и раньше означал «ключ принят».
  const p = search.provider as SearchProvider;

  try {
    let response: Response;

    switch (p) {
      case 'exa':
        response = await fetchWithTimeout('https://api.exa.ai/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': search.apiKey },
          body: JSON.stringify({ query: 'test', numResults: 1 }),
          timeoutMs: SEARCH_KEY_TIMEOUT_MS,
        });
        break;
      case 'brave':
        response = await fetchWithTimeout(
          'https://api.search.brave.com/res/v1/web/search?q=test&count=1',
          { headers: { 'X-Subscription-Token': search.apiKey }, timeoutMs: SEARCH_KEY_TIMEOUT_MS },
        );
        break;
      case 'tavily':
        response = await fetchWithTimeout('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: search.apiKey, query: 'test', max_results: 1 }),
          timeoutMs: SEARCH_KEY_TIMEOUT_MS,
        });
        break;
      case 'serper':
        response = await fetchWithTimeout('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': search.apiKey },
          body: JSON.stringify({ q: 'test', num: 1 }),
          timeoutMs: SEARCH_KEY_TIMEOUT_MS,
        });
        break;
      case 'firecrawl':
        response = await fetchWithTimeout('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${search.apiKey}` },
          body: JSON.stringify({ query: 'test', limit: 1 }),
          timeoutMs: SEARCH_KEY_TIMEOUT_MS,
        });
        break;
      case 'perplexity':
        response = await fetchWithTimeout('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${search.apiKey}` },
          body: JSON.stringify({ model: 'sonar', messages: [{ role: 'user', content: 'test' }], max_tokens: 1 }),
          timeoutMs: SEARCH_KEY_TIMEOUT_MS,
        });
        break;
      case 'google_cse':
        if (!search.cx) return { ok: false, error: 'missing cx' };
        response = await fetchWithTimeout(
          `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(search.apiKey)}&cx=${encodeURIComponent(search.cx)}&q=test&num=1`,
          { timeoutMs: SEARCH_KEY_TIMEOUT_MS },
        );
        break;
      default:
        return { ok: false, error: 'invalid config' };
    }

    if (response.ok) return { ok: true };
    return { ok: false, error: `HTTP ${response.status}` };
  } catch {
    // Таймаут и сетевой сбой — прежний результат 'network'.
    return { ok: false, error: 'network' };
  }
}
