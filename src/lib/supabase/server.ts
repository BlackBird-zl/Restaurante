import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/config/server-env';

/** Staff client bound to the member's session cookies (JWT of the user, RLS/RPC checks apply). */
export async function staffClient(): Promise<SupabaseClient> {
  const env = serverEnv();
  const store = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** Returns verified claims (signature checked by Auth) or null. */
export async function getStaffClaims(client?: SupabaseClient): Promise<{ sub: string; email?: string } | null> {
  const c = client ?? (await staffClient());
  const { data, error } = await c.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { sub: data.claims.sub as string, email: data.claims.email as string | undefined };
}

let anon: SupabaseClient | null = null;
/** Anonymous client for public site_* RPCs (no cookies, no session). */
export function publicClient(): SupabaseClient {
  if (anon) return anon;
  const env = serverEnv();
  anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return anon;
}
