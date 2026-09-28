import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/config/server-env';

/**
 * Privileged (service_role) client. SERVER ONLY. Used exclusively for guest_* / system_* RPCs
 * (after the server verified the guest secret) and Auth Admin operations (invitations).
 * Never used as a shortcut for staff actions: those use the member's JWT.
 */
let client: SupabaseClient | null = null;
export function privilegedClient(): SupabaseClient {
  if (client) return client;
  const env = serverEnv();
  client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'x-client-info': 'restaurant-os-server' } },
  });
  return client;
}
