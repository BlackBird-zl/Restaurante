import { NextResponse, type NextRequest } from 'next/server';
import { staffClient } from '@/lib/supabase/server';

/** Ends the session on this device. Full navigation clears in-memory query caches and subscriptions. */
export async function POST(req: NextRequest) {
  const supabase = await staffClient();
  await supabase.auth.signOut({ scope: 'local' });
  const res = NextResponse.redirect(new URL('/entrar?saiu=1', req.url), 303);
  res.headers.set('Clear-Site-Data', '"cache", "storage"');
  return res;
}
