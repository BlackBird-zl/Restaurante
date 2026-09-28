import 'server-only';
import type { NextRequest } from 'next/server';
import { serverEnv } from '@/lib/config/server-env';
import { privilegedClient } from '@/lib/supabase/privileged';

/**
 * Sends the Auth invitation email (system operation with the Admin API, after the member row
 * was authorized and created by the RPC). If the account already exists, no email is sent:
 * the person signs in and accepts the pending invitation (email verified by Auth).
 * The result is reported truthfully — never "email sent" when it was not.
 */
export async function sendInvitation(email: string, _req: NextRequest): Promise<'invited' | 'existing_account' | 'email_failed'> {
  const env = serverEnv();
  const redirectTo = `${env.APP_URL_SCHEME}://${env.APP_STAFF_HOST}/auth/callback?next=/definir-palavra-passe`;
  const { error } = await privilegedClient().auth.admin.inviteUserByEmail(email, { redirectTo });
  if (!error) return 'invited';
  if (/already|registered|exists/i.test(error.message)) return 'existing_account';
  console.error('[invite] auth error', error.status);
  return 'email_failed';
}
