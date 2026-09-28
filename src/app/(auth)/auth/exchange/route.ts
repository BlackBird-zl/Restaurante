import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { EmailOtpType } from '@supabase/supabase-js';
import { staffClient } from '@/lib/supabase/server';
import { assertSameOrigin, handleError, readJson } from '@/lib/http/server';

const Body = z.union([
  z.strictObject({ code: z.string().min(10).max(200) }),
  z.strictObject({ tokenHash: z.string().min(10).max(200), type: z.enum(['recovery', 'invite', 'email', 'signup', 'magiclink']) }),
]);

/** Completes PKCE (code) or token-hash verification server-side and sets the session cookie. */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = await readJson(req, Body);
    const supabase = await staffClient();
    const { error } = 'code' in body
      ? await supabase.auth.exchangeCodeForSession(body.code)
      : await supabase.auth.verifyOtp({ token_hash: body.tokenHash, type: body.type as EmailOtpType });
    if (error) return NextResponse.json({ error: { code: 'AUTH_REQUIRED', message: 'Link inválido ou expirado.' } }, { status: 401 });
    return NextResponse.json({ data: { ok: true } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return handleError(e);
  }
}
