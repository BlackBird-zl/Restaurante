/**
 * pnpm reset:demo --confirm=reset-demo [--t0=ISO] [--slug=patio-do-ferro]
 * Deletes ALL data of demo tenants (is_demo = true) and seeds them again.
 * Guards: APP_ENV != production, explicit confirmation, only tenants with is_demo=true.
 * Non-demo tenants are never touched. New QR tokens/codes are generated, so old cookies and
 * printed QR codes of the demo stop working even though entity UUIDs are deterministic.
 */
import { writeFileSync } from 'node:fs';
import pg from 'pg';
import { assertNotProduction, loadEnv, requireEnv } from './lib/env';
import { runSeed } from './lib/seed';

loadEnv();

export async function purgeDemoTenants(slugs: string[] | null) {
  const client = new pg.Client({ connectionString: requireEnv('SUPABASE_DB_URL') });
  await client.connect();
  try {
    await client.query('begin');
    const { rows } = await client.query(
      `select id, slug, is_demo from app_private.restaurants where ($1::text[] is null or slug = any($1)) for update`, [slugs]);
    const notDemo = rows.filter((r) => !r.is_demo);
    if (slugs && notDemo.length) throw new Error(`reset refused: not demo tenants: ${notDemo.map((r) => r.slug).join(', ')}`);
    const ids = rows.filter((r) => r.is_demo).map((r) => r.id);
    if (!ids.length) { await client.query('rollback'); return []; }
    await client.query(`set local app.maintenance = 'on'`);
    // Disable guards BEFORE any delete so no deferred events are queued on these tables.
    for (const [t, trg] of [['bills', 'bills_terminal'], ['order_items', 'order_items_guard'],
      ['restaurants', 'restaurants_owner_member'], ['restaurant_members', 'members_owner_member']]) {
      await client.query(`alter table app_private.${t} disable trigger ${trg}`);
    }
    const tables = ['domain_events', 'payment_records', 'bill_lines', 'service_calls', 'order_items', 'station_tickets', 'orders',
      'bills', 'guest_sessions', 'table_visits', 'qr_codes', 'dining_tables', 'menu_item_media', 'media_variants', 'reservations',
      'idempotency_requests', 'tenant_counters', 'site_pages', 'menu_items', 'categories', 'member_stations', 'member_roles',
      'media_assets', 'stations', 'restaurant_themes', 'restaurant_settings', 'restaurant_domains'];
    for (const t of tables) await client.query(`delete from app_private.${t} where restaurant_id = any($1)`, [ids]);
    await client.query(`delete from public.staff_invalidations where restaurant_id = any($1)`, [ids]);
    // Rate-limit buckets are keyed by hashes (no tenant column); a demo reset runs only outside production,
    // so all counters are cleared to make the reset scenario reproducible.
    await client.query(`delete from app_private.rate_limit_buckets`);
    await client.query(`update app_private.restaurant_members set invited_by_member_id = null where restaurant_id = any($1)`, [ids]);
    await client.query(`delete from app_private.restaurant_members where restaurant_id = any($1)`, [ids]);
    await client.query(`delete from app_private.restaurants where id = any($1)`, [ids]);
    await client.query(`alter table app_private.restaurants enable trigger restaurants_owner_member`);
    await client.query(`alter table app_private.restaurant_members enable trigger members_owner_member`);
    await client.query(`alter table app_private.bills enable trigger bills_terminal`);
    await client.query(`alter table app_private.order_items enable trigger order_items_guard`);
    await client.query('commit');
    return rows.filter((r) => r.is_demo).map((r) => r.slug as string);
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    await client.end();
  }
}

async function main() {
  assertNotProduction('reset:demo');
  if (!process.argv.includes('--confirm=reset-demo')) {
    throw new Error('reset:demo requires explicit confirmation: pnpm reset:demo --confirm=reset-demo');
  }
  const slugArg = process.argv.find((a) => a.startsWith('--slug='));
  const purged = await purgeDemoTenants(slugArg ? [slugArg.slice(7)] : null);
  console.log(`reset: purged demo tenants ${purged.join(', ') || '(none)'}`);
  const arg = process.argv.find((a) => a.startsWith('--t0='));
  const r = await runSeed({ t0: arg ? new Date(arg.slice(5)) : new Date() });
  writeFileSync('.demo-credentials.local.json', JSON.stringify({ t0: r.t0, users: r.users }, null, 2) + '\n');
}

if (process.argv[1]?.endsWith('reset-demo.ts')) {
  main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
