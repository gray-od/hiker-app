import { isAuthRetryableFetchError, type User, type UserResponse } from '@supabase/supabase-js';
import { createClient } from './client';

// Дефолтный storageKey supabase-js: sb-<project-ref>-auth-token (src/SupabaseClient.ts:324).
// Значение пишет @supabase/ssr 0.12: JSON сессии -> base64url с префиксом "base64-";
// длинные сессии режутся на <key>.0, <key>.1, ... (cookies.js:185-242, chunker.js:23-64).
function authCookieName(): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  try {
    const ref = new URL(supabaseUrl).hostname.split('.')[0];
    return ref ? `sb-${ref}-auth-token` : null;
  } catch {
    return null;
  }
}

function cookieValue(name: string): string | null {
  const prefix = `${name}=`;
  const pair = document.cookie.split('; ').find((p) => p.startsWith(prefix));
  if (!pair) return null;
  const value = pair.slice(prefix.length);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function base64UrlToUtf8(value: string): string {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
}

/** Пользователь из сохранённой cookie-сессии. Сеть не трогает; нет/битая cookie -> null. */
function userFromCookie(): User | null {
  if (typeof document === 'undefined') return null;
  try {
    const name = authCookieName();
    if (!name) return null;
    let raw = cookieValue(name);
    if (!raw) {
      const chunks: string[] = [];
      for (let i = 0; i < 20; i += 1) {
        const chunk = cookieValue(`${name}.${i}`);
        if (!chunk) break;
        chunks.push(chunk);
      }
      raw = chunks.join('') || null;
    }
    if (!raw) return null;
    const json = raw.startsWith('base64-') ? base64UrlToUtf8(raw.slice(7)) : raw;
    return (JSON.parse(json)?.user as User | undefined) ?? null;
  } catch {
    return null;
  }
}

const GET_USER_TIMEOUT_MS = 3500;

/**
 * getUser() с ограничением ожидания: navigator.onLine живой, но сеть может быть «чёрной дырой»
 * (Wi-Fi без выхода) — тогда getUser() не резолвится вовсе, и guard'ы страниц навсегда остаются
 * со спиннером. null — таймаут или сбой создания клиента; опоздавший ответ уже не нужен, а его
 * reject не должен всплыть как unhandled.
 */
async function getUserWithTimeout(): Promise<UserResponse | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), GET_USER_TIMEOUT_MS);
  });

  try {
    const getUser = createClient().auth.getUser().catch(() => null);
    return await Promise.race([getUser, timeout]);
  } catch {
    // createClient бросает при отсутствии env — считаем проверку недоступной.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Фоновая liveness-проверка cookie-сессии: никогда не reject'ит и не влияет на то, что вернул
 * resolveUser(). Таймаут и retryable-ошибка означают лишь недоступность сети. Не-retryable
 * ошибка без пользователя — сессия отозвана: снимаем её, чтобы guard'ы не держались за мёртвую
 * cookie, и уходим на /login полной навигацией (middleware решает по cookie).
 */
async function revalidateCookieSession(): Promise<void> {
  try {
    const response = await getUserWithTimeout();
    if (!response || response.data.user) return;
    if (!response.error || isAuthRetryableFetchError(response.error)) return;

    try {
      await createClient().auth.signOut();
    } catch {
      // signOut может не дойти по сети — сессию всё равно считаем недействительной.
    }
    if (typeof window !== 'undefined') window.location.replace('/login');
  } catch {
    // Фоновая проверка не должна ронять страницу: её сбои остаются здесь.
  }
}

/**
 * Офлайн — сессия из cookie без refresh: чтение сохранённой сессии офлайн ждёт initialize и
 * вызывает обречённый _callRefreshToken (GoTrueClient.js:2334, 2458-2486). Cookie-сессия онлайн
 * отдаётся сразу, а getUser() проверяет её живость фоном: иначе «онлайн»-телефон без реальной
 * сети ждал таймаут, guard'ы висели со спиннером, и тап уходил в полную навигацию. Онлайн без
 * cookie — источник истины getUser(); retryable-ошибка (сеть/5xx) — тот же cookie-фолбэк.
 */
export async function resolveUser(): Promise<User | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return userFromCookie();

  const cookieUser = userFromCookie();
  if (cookieUser) {
    void revalidateCookieSession();
    return cookieUser;
  }

  const response = await getUserWithTimeout();
  if (!response) return userFromCookie();
  if (response.data.user) return response.data.user;
  if (response.error && isAuthRetryableFetchError(response.error)) return userFromCookie();
  return null;
}
