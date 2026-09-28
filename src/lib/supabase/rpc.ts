import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fromRpcError } from '@/lib/http/server';

/** Calls an RPC and returns its JSON result, throwing an ApiError with the domain code on failure. */
export async function rpc<T = unknown>(client: SupabaseClient, fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw fromRpcError(error);
  return data as T;
}
