import { NextResponse, type NextRequest } from 'next/server';
import { staffClient, getStaffClaims } from '@/lib/supabase/server';
import { assertSameOrigin } from '@/lib/http/server';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const back = (e: string) => NextResponse.redirect(new URL(`/definir-palavra-passe?erro=${e}`, req.url), 303);
  try { assertSameOrigin(req); } catch { return back('sessao'); }
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  if (password.length < 10 || password.length > 200) return back('curta');
  if (password !== confirm) return back('diferente');
  const supabase = await staffClient();
  if (!(await getStaffClaims(supabase))) return NextResponse.redirect(new URL('/entrar?erro=link', req.url), 303);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return back('fraca');
  return NextResponse.redirect(new URL('/restaurantes?ok=palavra-passe', req.url), 303);
}
