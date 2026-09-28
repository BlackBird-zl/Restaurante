'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Browser client used only for Realtime subscriptions of staff (publishable key + user session). */
let client: SupabaseClient | null = null;
export function browserClient(): SupabaseClient {
  if (client) return client;
  client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  return client;
}

export function resetBrowserClient() {
  client = null;
}
