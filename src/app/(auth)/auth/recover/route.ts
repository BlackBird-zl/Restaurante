import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/lib/config/server-env';
import { staffClient } from '@/lib/supabase/server';

/** Always answers the same (no account enumeration). Delivery depends on configured SMTP. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase().slice(0, 160);
  if (email) {
    const env = serverEnv();
    const supabase = await staffClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.APP_URL_SCHEME}://${env.APP_STAFF_HOST}/auth/callback?next=/definir-palavra-passe`,
    });
  }
  return NextResponse.redirect(new URL('/recuperar?enviado=1', req.url), 303);
}
