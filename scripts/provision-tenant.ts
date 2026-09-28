/**
 * Operator script — provision a new (non-demo) restaurant.
 *
 *   pnpm provision:tenant --slug=tasca-azul --name="Tasca Azul" --owner-email=dona@tasca.pt \
 *     [--owner-name="Ana Dona"] [--preset=casa-editorial|balcao-claro|noite-grafica] [--tables=10] [--invite]
 *
 * Creates, in ONE transaction: restaurant, owner membership (admin), platform domain `{slug}.{APP_BASE_DOMAIN}`,
 * settings (ordering paused until the menu exists), theme preset, stations COZ + BAR, N tables with QR tokens,
 * and empty page drafts (nothing published). No menu, no demo data.
 *
 * Owner account: an existing Supabase Auth user is reused. Otherwise:
 *   --invite  sends Supabase's invitation email (requires SMTP configured in Supabase Auth);
 *   default   creates the user without a password — the owner uses "Recuperar palavra-passe" on the staff host.
 * Custom domains are attached later by the operator (docs/OPERATIONS.md), never by this script.
 */
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { encryptQrToken, randomToken, sha256Hex } from '../src/lib/security/secrets-core';
import { PRESETS } from '../src/modules/themes/theme';
import { loadEnv, requireEnv } from './lib/env';

loadEnv();

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : 'true';
}

async function main() {
  const slug = arg('slug'); const name = arg('name'); const email = arg('owner-email')?.toLowerCase();
  if (!slug || !name || !email) throw new Error('usage: --slug=… --name=… --owner-email=… (see header of scripts/provision-tenant.ts)');
  if (!/^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$/.test(slug)) throw new Error('slug: lowercase letters, digits and hyphens (2–48)');
  const ownerName = arg('owner-name') ?? email.split('@')[0]!;
  const presetId = (arg('preset') ?? 'casa-editorial') as (typeof PRESETS)[number]['id'];
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`preset must be one of ${PRESETS.map((p) => p.id).join(', ')}`);
  const tables = Number(arg('tables') ?? '10');
  if (!Number.isInteger(tables) || tables < 1 || tables > 99) throw new Error('--tables must be 1..99');
  const baseDomain = requireEnv('APP_BASE_DOMAIN');
  const qrKey = requireEnv('QR_ENCRYPTION_KEY');
  const qrVer = Number(process.env.QR_ENCRYPTION_KEY_VERSION ?? '1');

  const admin = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let userId: string | undefined;
  for (let page = 1; page < 50 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Auth admin: ${error.message}`);
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (data.users.length < 200) break;
  }
  let ownerNote = 'existing account reused';
  if (!userId) {
    if (arg('invite')) {
      const staffUrl = `${process.env.APP_URL_SCHEME ?? 'https'}://${requireEnv('APP_STAFF_HOST')}`;
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${staffUrl}/auth/callback?next=/definir-palavra-passe`, data: { display_name: ownerName } });
      if (error || !data.user) throw new Error(`invite failed (SMTP configured?): ${error?.message}`);
      userId = data.user.id; ownerNote = 'invitation email sent by Supabase Auth';
    } else {
      const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { display_name: ownerName } });
      if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
      userId = data.user.id; ownerNote = 'account created without password — owner must use "Recuperar palavra-passe"';
    }
  }

  const db = new pg.Client({ connectionString: requireEnv('SUPABASE_DB_URL') });
  await db.connect();
  try {
    await db.query('begin');
    const exists = await db.query('select 1 from app_private.restaurants where slug = $1', [slug]);
    if (exists.rowCount) throw new Error(`slug "${slug}" already exists — nothing changed`);
    const { rows: [r] } = await db.query(
      `insert into app_private.restaurants(slug, name, owner_user_id, is_demo) values ($1, $2, $3, false) returning id`, [slug, name, userId]);
    const rid = r.id as string;
    const { rows: [m] } = await db.query(
      `insert into app_private.restaurant_members(restaurant_id, user_id, display_name, status, accepted_at)
       values ($1, $2, $3, 'active', now()) returning id`, [rid, userId, ownerName]);
    await db.query(`insert into app_private.member_roles(restaurant_id, member_id, role) values ($1, $2, 'admin')`, [rid, m.id]);
    await db.query(`insert into app_private.profiles(id, display_name) values ($1, $2) on conflict (id) do nothing`, [userId, ownerName]);
    await db.query(`insert into app_private.restaurant_domains(restaurant_id, hostname, kind, status, verified_at, is_primary)
      values ($1, $2, 'platform', 'active', now(), true)`, [rid, `${slug}.${baseDomain}`]);
    await db.query(`insert into app_private.restaurant_settings(restaurant_id, ordering_mode, public_contacts, weekly_hours, reservation_rules)
      values ($1, 'paused', '{}'::jsonb, '{}'::jsonb, $2)`, [rid, { minLeadHours: 2, maxDaysAhead: 90, maxPartySize: 12, slotMinutes: 30 }]);
    await db.query(`insert into app_private.restaurant_themes(restaurant_id, preset, draft_tokens, published_tokens, published_at)
      values ($1, $2, $3, $3, now())`, [rid, preset.id, preset.defaults]);
    await db.query(`insert into app_private.stations(restaurant_id, code, name, kind, target_minutes, sort_order)
      values ($1, 'COZ', 'Cozinha', 'kitchen', 15, 10), ($1, 'BAR', 'Bar', 'bar', 5, 20)`, [rid]);
    for (let i = 1; i <= tables; i++) {
      const label = String(i).padStart(2, '0');
      const { rows: [t] } = await db.query(`insert into app_private.dining_tables(restaurant_id, label, public_slug, zone, seats, sort_order, first_qr_issued_at)
        values ($1, $2, $2, 'Sala', 4, $3, now()) returning id`, [rid, label, i * 10]);
      const token = randomToken(32);
      await db.query(`insert into app_private.qr_codes(restaurant_id, table_id, token_hash, token_ciphertext, token_key_version, issued_at)
        values ($1, $2, $3, $4, $5, now())`, [rid, t.id, sha256Hex(token), encryptQrToken(token, qrKey, qrVer), qrVer]);
    }
    for (const key of ['home', 'about', 'ambience', 'contact', 'privacy', 'reservations']) {
      await db.query(`insert into app_private.site_pages(restaurant_id, page_key, draft) values ($1, $2, '{}'::jsonb)`, [rid, key]);
    }
    await db.query('commit');
    console.log(JSON.stringify({ restaurantId: rid, slug, host: `${slug}.${baseDomain}`, owner: email, ownerNote, tables,
      next: 'Sign in on the staff host → Administração: create categories/products, write and publish pages, open ordering.' }, null, 2));
  } catch (e) {
    await db.query('rollback');
    throw e;
  } finally {
    await db.end();
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
