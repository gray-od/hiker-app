// Внешние запросы без предела ожидания висят в «чёрной дыре» (TCP открыт, ответа нет) до
// системного таймаута ОС — пользователь всё это время видит спиннер. Таймер здесь покрывает
// и чтение тела: очистка после получения заголовков оставила бы res.json() без предела,
// если сервер замолчал на середине ответа.

const DEFAULT_TIMEOUT_MS = 10000;

export type FetchJsonErrorCode = 'TIMEOUT' | 'NETWORK' | 'HTTP_ERROR' | 'INVALID_BODY';

// Разделяет «ответа не было» (TIMEOUT/NETWORK), «сервис ответил отказом» (HTTP_ERROR
// хранит статус) и битое тело (INVALID_BODY), чтобы вызывающие показывали разные
// сообщения, а поисковые провайдеры сохранили деление key/unavailable.
export class FetchJsonError extends Error {
  readonly code: FetchJsonErrorCode;
  readonly status?: number;

  constructor(code: FetchJsonErrorCode, status?: number, cause?: unknown) {
    super(
      code === 'HTTP_ERROR'
        ? `HTTP ${status}`
        : code === 'TIMEOUT'
          ? 'request timed out'
          : code === 'NETWORK'
            ? 'network request failed'
            : 'invalid JSON body',
    );
    this.name = 'FetchJsonError';
    this.code = code;
    this.status = status;
    if (cause !== undefined) this.cause = cause;
  }
}

export interface FetchTimeoutInit extends Omit<RequestInit, 'signal'> {
  timeoutMs?: number;
}

async function withTimeout<T>(
  url: string,
  init: FetchTimeoutInit,
  consume: (response: Response) => Promise<T>,
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...requestInit } = init;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(url, { ...requestInit, signal: controller.signal });
    } catch (error) {
      throw new FetchJsonError(timedOut ? 'TIMEOUT' : 'NETWORK', undefined, error);
    }

    try {
      return await consume(response);
    } catch (error) {
      if (error instanceof FetchJsonError) throw error;
      // Сюда попадает только чтение тела: обрыв по таймауту или невалидный JSON.
      throw new FetchJsonError(timedOut ? 'TIMEOUT' : 'INVALID_BODY', response.status, error);
    }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch с ограничением ожидания; статус не проверяется и тело не читается — нужен там,
 * где важен только сам ответ (prewarm-документы, проверка ключа).
 */
export async function fetchWithTimeout(url: string, init: FetchTimeoutInit = {}): Promise<Response> {
  return withTimeout(url, init, async (response) => response);
}

/**
 * Fetch с ограничением ожидания, проверкой `res.ok` и разбором JSON. Ответ вне 2xx,
 * таймаут, сетевой сбой и невалидное тело приходят как FetchJsonError с кодом.
 */
export async function fetchJson<T>(url: string, init: FetchTimeoutInit = {}): Promise<T> {
  return withTimeout(url, init, async (response) => {
    if (!response.ok) throw new FetchJsonError('HTTP_ERROR', response.status);
    return (await response.json()) as T;
  });
}
