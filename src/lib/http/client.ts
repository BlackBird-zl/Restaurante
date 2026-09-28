'use client';
import { messageFor, type ApiErrorBody, type ApiSuccess } from './errors';

export class ApiClientError extends Error {
  constructor(public code: string, public status: number, public details?: unknown, public retryAfterSeconds?: number) {
    super(messageFor(code));
  }
  /** True when the request may or may not have been committed (timeout / network loss). */
  get outcomeUnknown() { return this.code === 'NETWORK' || this.code === 'TIMEOUT'; }
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

type Opts = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; idempotencyKey?: string; retries?: number; timeoutMs?: number; signal?: AbortSignal };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * JSON request with the API envelope. Mutations carry an Idempotency-Key and are retried
 * at most 3 times with the SAME key on network errors/503 (never on 4xx).
 */
export async function api<T>(url: string, opts: Opts = {}): Promise<{ data: T; serverTime: string }> {
  const method = opts.method ?? (opts.body !== undefined ? 'POST' : 'GET');
  const retries = opts.retries ?? (method === 'GET' ? 1 : 3);
  let attempt = 0;
  let lastErr: ApiClientError | null = null;
  while (attempt <= retries) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 12_000);
    opts.signal?.addEventListener('abort', () => ctrl.abort(), { once: true });
    try {
      const res = await fetch(url, {
        method, credentials: 'same-origin', cache: 'no-store', signal: ctrl.signal,
        headers: {
          Accept: 'application/json',
          ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
      clearTimeout(timer);
      const text = await res.text();
      let json: unknown = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      if (res.ok) {
        const ok = json as ApiSuccess<T>;
        return { data: ok.data, serverTime: ok.meta?.serverTime ?? new Date().toISOString() };
      }
      const err = (json as ApiErrorBody | null)?.error;
      lastErr = new ApiClientError(err?.code ?? (res.status >= 500 ? 'SERVICE_UNAVAILABLE' : 'INTERNAL'), res.status, err?.details, err?.retryAfterSeconds);
      if (res.status !== 503 && res.status !== 502 && res.status !== 504) throw lastErr;
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof ApiClientError && e.status !== 503 && e.status !== 502 && e.status !== 504) throw e;
      if (opts.signal?.aborted) throw new ApiClientError('ABORTED', 0);
      if (!(e instanceof ApiClientError)) {
        lastErr = new ApiClientError((e as Error)?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK', 0);
      }
    }
    attempt++;
    if (attempt <= retries) await sleep([400, 1200, 2500][attempt - 1] ?? 2500);
  }
  throw lastErr ?? new ApiClientError('NETWORK', 0);
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiClientError) {
    if (e.code === 'NETWORK') return 'Sem ligação. Nada foi confirmado; verifique a rede e tente de novo.';
    if (e.code === 'TIMEOUT') return 'Não conseguimos confirmar. A verificar o envio…';
    return e.message;
  }
  return 'Ocorreu um erro inesperado.';
}
