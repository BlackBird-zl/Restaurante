import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { messageFor, statusFor, type ApiErrorBody } from './errors';
import { serverEnv } from '@/lib/config/server-env';

export class ApiError extends Error {
  constructor(public code: string, public details?: unknown, public status = statusFor(code)) {
    super(code);
  }
}

const NO_STORE = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };

export function ok<T>(data: T, init?: { status?: number; revision?: number; headers?: Record<string, string> }) {
  return NextResponse.json(
    { data, meta: { requestId: randomUUID(), serverTime: new Date().toISOString(), revision: init?.revision } },
    { status: init?.status ?? 200, headers: { ...NO_STORE, ...(init?.headers ?? {}) } },
  );
}

export function fail(code: string, details?: unknown, status = statusFor(code)) {
  const d = (details && typeof details === 'object' ? details : {}) as Record<string, unknown>;
  const body: ApiErrorBody = {
    error: {
      code, message: messageFor(code), details: details ?? undefined,
      retryAfterSeconds: typeof d.retryAfterSeconds === 'number' ? d.retryAfterSeconds : undefined,
      currentVersion: typeof d.currentVersion === 'number' ? d.currentVersion : undefined,
    },
    meta: { requestId: randomUUID() },
  };
  const headers: Record<string, string> = { ...NO_STORE };
  if (body.error.retryAfterSeconds) headers['Retry-After'] = String(body.error.retryAfterSeconds);
  return NextResponse.json(body, { status, headers });
}

/** Maps a PostgREST/RPC error (P0001 with CODE message and JSON detail) to an ApiError. */
export function fromRpcError(err: { code?: string; message?: string; details?: string | null; hint?: string | null }): ApiError {
  if (err.code === 'P0001' && err.message && /^[A-Z_]+$/.test(err.message)) {
    let details: unknown;
    try { details = err.details ? JSON.parse(err.details) : undefined; } catch { details = undefined; }
    return new ApiError(err.message, details);
  }
  if (err.code === '42501' || err.code === 'PGRST301' || err.code === '42883') return new ApiError('FORBIDDEN');
  if (err.code === 'PGRST202') return new ApiError('NOT_FOUND');
  if (err.code === '22P02' || err.code === '23514' || err.code === '22023') return new ApiError('INVALID_INPUT');
  if (err.code === '40001' || err.code === '40P01') return new ApiError('SERVICE_UNAVAILABLE');
  // Unknown: log without payload (no secrets) and return a neutral error.
  console.error('[rpc] unexpected error', { code: err.code, message: err.message?.slice(0, 200) });
  return new ApiError('INTERNAL');
}

export function handleError(e: unknown) {
  if (e instanceof ApiError) return fail(e.code, e.details, e.status);
  if (e instanceof z.ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const i of e.issues) fieldErrors[i.path.join('.') || 'body'] = i.message;
    return fail('INVALID_INPUT', { fieldErrors });
  }
  if (e instanceof TypeError && /fetch failed/i.test(e.message)) return fail('SERVICE_UNAVAILABLE');
  console.error('[api] unhandled', e instanceof Error ? e.message : 'unknown');
  return fail('INTERNAL');
}

export async function readJson<T extends z.ZodType>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  const text = await req.text();
  if (text.length > 64 * 1024) throw new ApiError('INVALID_INPUT', { reason: 'body_too_large' });
  let json: unknown;
  try { json = text ? JSON.parse(text) : {}; } catch { throw new ApiError('INVALID_INPUT', { reason: 'invalid_json' }); }
  return schema.parse(json);
}

const uuid = z.uuid();
export function idempotencyKey(req: NextRequest): string {
  const key = req.headers.get('idempotency-key');
  if (!key || !uuid.safeParse(key).success) throw new ApiError('INVALID_INPUT', { field: 'Idempotency-Key' });
  return key;
}

/**
 * CSRF defence for mutations: same-origin Fetch Metadata and Origin must match the host
 * that served the request (tenant host or staff host). CORS stays closed (no ACAO headers).
 */
export function assertSameOrigin(req: NextRequest) {
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') throw new ApiError('FORBIDDEN', { reason: 'cross_site' });
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-ros-host') ?? req.headers.get('host');
  if (origin) {
    let originHost: string;
    try { originHost = new URL(origin).host.toLowerCase(); } catch { throw new ApiError('FORBIDDEN', { reason: 'bad_origin' }); }
    if (!host || originHost !== host.toLowerCase()) throw new ApiError('FORBIDDEN', { reason: 'origin_mismatch' });
  } else if (serverEnv().APP_ENV === 'production' && !site) {
    throw new ApiError('FORBIDDEN', { reason: 'origin_required' });
  }
}

export function clientIp(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()) || req.headers.get('x-real-ip') || '0.0.0.0';
}
