import 'server-only';
import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import { ApiError, assertSameOrigin, handleError, idempotencyKey, ok, readJson } from '@/lib/http/server';
import { getStaffClaims, staffClient } from '@/lib/supabase/server';
import { rpc } from '@/lib/supabase/rpc';

type Ctx = { client: SupabaseClient; slug: string; key: string; params: Record<string, string>; req: NextRequest };

/**
 * Thin staff Route Handler: verified identity (getClaims), same-origin + Idempotency-Key for
 * mutations, strict body schema, then ONE authorized RPC with the member's own JWT.
 * No service_role here: the RPC authorizes membership/role/tenant on every call.
 */
export function staffHandler<S extends z.ZodType | undefined>(opts: {
  mutation?: boolean; body?: S; status?: number;
  run: (c: Ctx, body: S extends z.ZodType ? z.infer<S> : undefined) => Promise<unknown>;
}) {
  return async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    try {
      const p = await params;
      const client = await staffClient();
      if (!(await getStaffClaims(client))) throw new ApiError('AUTH_REQUIRED');
      let key = '';
      if (opts.mutation) {
        assertSameOrigin(req);
        key = idempotencyKey(req);
      }
      const body = (opts.body ? await readJson(req, opts.body) : undefined) as S extends z.ZodType ? z.infer<S> : undefined;
      const data = await opts.run({ client, slug: p.restaurantSlug ?? '', key, params: p, req }, body);
      return ok(data, { status: opts.status });
    } catch (e) {
      return handleError(e);
    }
  };
}

export const call = rpc;
