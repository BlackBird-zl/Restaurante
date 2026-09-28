import { NextResponse, type NextRequest } from 'next/server';
import { staffClient } from '@/lib/supabase/server';
import { assertSameOrigin } from '@/lib/http/server';

/** Accepts a pending membership; the RPC checks that the verified Auth email matches the invitation. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  try { assertSameOrigin(req); } catch { return NextResponse.redirect(new URL('/restaurantes', req.url), 303); }
  const supabase = await staffClient();
  const { data, error } = await supabase.rpc('staff_accept_invitation', { p_member_id: String(form.get('memberId') ?? '') });
  if (error) return NextResponse.redirect(new URL('/restaurantes?erro=convite', req.url), 303);
  return NextResponse.redirect(new URL(`/r/${(data as { slug: string }).slug}`, req.url), 303);
}
