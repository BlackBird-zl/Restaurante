import { NextResponse, type NextRequest } from 'next/server';
import { staffClient } from '@/lib/supabase/server';
import { safeNext } from '@/modules/auth/redirects';
import { assertSameOrigin } from '@/lib/http/server';

/** Form POST login. Neutral error; the session cookie is set by @supabase/ssr. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const next = safeNext(String(form.get('next') ?? ''));
  const base = new URL(req.url);
  const back = (erro: string) => NextResponse.redirect(new URL(`/entrar?erro=${erro}&next=${encodeURIComponent(next)}`, base), 303);
  try { assertSameOrigin(req); } catch { return back('credenciais'); }
  const email = String(form.get('email') ?? '').trim().toLowerCase().slice(0, 160);
  const password = String(form.get('password') ?? '').slice(0, 200);
  if (!email || !password) return back('credenciais');
  const supabase = await staffClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return back(error.status === 429 ? 'limite' : 'credenciais');
  return NextResponse.redirect(new URL(next, base), 303);
}
