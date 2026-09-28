// Prints local-only anon/service_role JWTs signed with the local JWT secret.
// These keys are for the disposable local stack only; never reuse them remotely.
import crypto from 'node:crypto';

const secret = process.env.LOCAL_JWT_SECRET ?? 'super-secret-jwt-token-with-at-least-32-characters-long';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function sign(role) {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ iss: 'supabase-demo', role, exp: 1983812996 });
  const sig = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}
const which = process.argv[2];
if (which === 'anon') console.log(sign('anon'));
else if (which === 'service') console.log(sign('service_role'));
else console.log(JSON.stringify({ anon: sign('anon'), service_role: sign('service_role') }, null, 2));
