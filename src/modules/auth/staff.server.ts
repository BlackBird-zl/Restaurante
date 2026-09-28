import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getStaffClaims, staffClient } from '@/lib/supabase/server';
import { rpc } from '@/lib/supabase/rpc';
import { ApiError } from '@/lib/http/server';
import type { StaffMe } from '@/components/staff/StaffShell';

/** Verified identity + current membership (re-read on every request; claims are never trusted for roles). */
export const requireStaff = cache(async (slug: string): Promise<StaffMe> => {
  const client = await staffClient();
  const claims = await getStaffClaims(client);
  if (!claims) {
    const path = (await headers()).get('x-ros-path') ?? `/r/${slug}`;
    redirect(`/entrar?next=${encodeURIComponent(path)}`);
  }
  try {
    return await rpc<StaffMe>(client, 'staff_get_me', { p_restaurant_slug: slug });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'AUTH_REQUIRED') redirect('/entrar?erro=sessao');
    notFound();
  }
});

/** Returns the member when it has one of the roles (admin always), otherwise null → render <Forbidden/>. */
export async function requireRole(slug: string, roles: string[]): Promise<StaffMe | null> {
  const me = await requireStaff(slug);
  return me.roles.some((r) => r === 'admin' || roles.includes(r)) ? me : null;
}

export async function staffRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  return rpc<T>(await staffClient(), fn, args);
}
