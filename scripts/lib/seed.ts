/**
 * Deterministic, transactional, idempotent demo seed (Plano §4).
 * Fixed UUIDs (v5, one namespace per tenant) + `on conflict do nothing`: running it twice
 * keeps the same entities and totals and never "repairs" prices/status changed during a demo.
 */
import { statSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { patio } from '../../fixtures/patio-do-ferro/data';
import { balcao, multiTenantUser } from '../../fixtures/balcao-do-largo/data';
import { visualAssets } from '../../fixtures/patio-do-ferro/visual-assets';
import {
  encryptQrToken, generateJoinCode, joinCodeDigest, randomToken, sha256Hex, uuidV5,
} from '../../src/lib/security/secrets-core';
import { buildPlaceholders } from './placeholders';
import { requireEnv } from './env';

type Fixture = typeof patio | typeof balcao;
type Users = Map<string, string>; // email -> auth user id

export type SeedOptions = { t0: Date; log?: (s: string) => void };

const DIMS = { '16:9': [1600, 900], '4:5': [1200, 1500], '1:1': [1200, 1200] } as const;

export function demoPassword(base: string, email: string) {
  return `${base}.${email.split('@')[0]}`;
}

export async function ensureUsers(emails: { email: string; name: string }[], base: string): Promise<Users> {
  const admin = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const existing = new Map<string, string>();
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Auth admin listUsers failed: ${error.message}`);
    for (const u of data.users) if (u.email) existing.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 200) break;
  }
  const out: Users = new Map();
  for (const { email, name } of emails) {
    const password = demoPassword(base, email);
    let id = existing.get(email);
    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { display_name: name },
      });
      if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
      id = data.user.id;
    } else {
      const { error } = await admin.auth.admin.updateUserById(id, { password, email_confirm: true });
      if (error) throw new Error(`updateUser ${email}: ${error.message}`);
    }
    out.set(email, id);
  }
  return out;
}

function refCode(id: string) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const hex = id.replace(/-/g, '');
  let r = '';
  for (let i = 0; i < 8; i++) r += alphabet[parseInt(hex.slice(i * 2, i * 2 + 2), 16) % 32];
  return r;
}

class Tx {
  constructor(public c: pg.PoolClient | pg.Client) {}
  async ins(table: string, row: Record<string, unknown>) {
    const cols = Object.keys(row);
    const vals = Object.values(row).map((v) => (v !== null && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v) ? JSON.stringify(v) : v));
    const sql = `insert into ${table} (${cols.join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')}) on conflict do nothing`;
    await this.c.query(sql, vals);
  }
}

function resolveRefs(value: unknown, map: (ref: string) => string | null): unknown {
  if (typeof value === 'string' && value.startsWith('@')) return map(value);
  if (Array.isArray(value)) return value.map((v) => resolveRefs(v, map));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveRefs(v, map)]));
  }
  return value;
}

async function seedTenantConfig(tx: Tx, f: Fixture, users: Users, t0: Date, env: { baseDomain: string; qrKey: string; qrVer: number }) {
  const id = (n: string) => uuidV5(n, f.namespace);
  const rid = id('restaurant');
  const owner = f.staff.find((s) => s.owner)!;
  const ownerUid = users.get(owner.email)!;
  await tx.ins('app_private.restaurants', { id: rid, slug: f.slug, name: f.name, owner_user_id: ownerUid, is_demo: true });
  await tx.ins('app_private.restaurant_domains', {
    id: id('domain:platform'), restaurant_id: rid, hostname: `${f.slug}.${env.baseDomain}`, kind: 'platform',
    status: 'active', verified_at: t0, is_primary: true,
  });
  await tx.ins('app_private.restaurant_settings', {
    restaurant_id: rid, ordering_mode: 'open', public_contacts: f.publicContacts, weekly_hours: f.weeklyHours,
    reservation_rules: { minLeadHours: 2, maxDaysAhead: 90, maxPartySize: 12, slotMinutes: 30 },
  });
  await tx.ins('app_private.restaurant_themes', {
    restaurant_id: rid, preset: f.preset, draft_tokens: f.tokens, published_tokens: f.tokens, published_at: t0,
  });
  for (const s of f.staff) {
    const mid = id(`member:${s.key}`);
    await tx.ins('app_private.restaurant_members', {
      id: mid, restaurant_id: rid, user_id: users.get(s.email), display_name: s.name, status: 'active', accepted_at: t0,
    });
    await tx.ins('app_private.profiles', { id: users.get(s.email), display_name: s.name });
    for (const r of s.roles) await tx.ins('app_private.member_roles', { restaurant_id: rid, member_id: mid, role: r });
  }
  for (const st of f.stations) {
    await tx.ins('app_private.stations', {
      id: id(`station:${st.key}`), restaurant_id: rid, code: st.code, name: st.name, kind: st.kind, target_minutes: st.target, sort_order: st.sort,
    });
  }
  for (const s of f.staff) for (const st of s.stations) {
    await tx.ins('app_private.member_stations', { restaurant_id: rid, member_id: id(`member:${s.key}`), station_id: id(`station:${st}`) });
  }
  let ci = 0;
  for (const c of f.categories) {
    await tx.ins('app_private.categories', {
      id: id(`category:${c.slug}`), restaurant_id: rid, slug: c.slug, name: c.name, description: c.description, sort_order: ++ci * 10,
    });
  }
  const sortInCat = new Map<string, number>();
  for (const [pid, slug, cat, name, desc, ingr, price, station, allergens, veg, alcohol] of f.items) {
    const n = (sortInCat.get(cat) ?? 0) + 10;
    sortInCat.set(cat, n);
    await tx.ins('app_private.menu_items', {
      id: id(`item:${pid}`), restaurant_id: rid, category_id: id(`category:${cat}`), station_id: id(`station:${station}`),
      slug, name, description: desc, ingredients_text: ingr, allergen_codes: [...allergens], is_vegetarian: veg,
      contains_alcohol: alcohol, price_cents: price, is_visible: true,
      is_available: !('unavailable' in f && (f.unavailable as readonly string[]).includes(pid)),
      sort_order: n, published_at: t0,
    });
  }
  for (const t of f.tables) {
    await tx.ins('app_private.dining_tables', {
      id: id(`table:${t.label}`), restaurant_id: rid, label: t.label, public_slug: t.label.toLowerCase(), zone: t.zone,
      seats: t.seats, sort_order: t.sort, first_qr_issued_at: t0,
    });
    // QR: random token each fresh seed (hash + AES-GCM ciphertext for reprint).
    const token = randomToken(32);
    await tx.ins('app_private.qr_codes', {
      id: id(`qr:${t.label}`), restaurant_id: rid, table_id: id(`table:${t.label}`), token_hash: sha256Hex(token),
      token_ciphertext: encryptQrToken(token, env.qrKey, env.qrVer), token_key_version: env.qrVer, issued_at: t0,
    });
  }
  return { rid, id };
}

async function seedMedia(tx: Tx, rid: string, id: (n: string) => string, t0: Date, root: string) {
  const mediaIds = new Map<string, string>();
  for (const a of visualAssets) {
    const mid = id(`media:${a.id}`);
    mediaIds.set(a.id, mid);
    const file = `${a.id}-${a.slug}.placeholder.svg`;
    const bytes = statSync(path.join(root, 'public', 'demo-assets', 'patio-do-ferro', file)).size;
    const [w, h] = DIMS[a.ratio];
    await tx.ins('app_private.media_assets', {
      id: mid, restaurant_id: rid, storage_key: `static/demo-assets/patio-do-ferro/${a.id}-${a.slug}`, visibility: 'public',
      purpose: a.purpose, mime_type: 'image/svg+xml', bytes, width: w, height: h, alt_text: a.alt, source_type: 'placeholder',
      source_note: `PLACEHOLDER INTERNO — fotografia ${a.id} pendente (ver assets/visual-manifest.json)`, approved_at: t0,
    });
    await tx.ins('app_private.media_variants', {
      id: id(`media:${a.id}:original`), restaurant_id: rid, media_id: mid, role: 'original',
      storage_key: `static/demo-assets/patio-do-ferro/${file}`, mime_type: 'image/svg+xml', width: w, height: h, bytes,
    });
    if (a.productId) {
      await tx.ins('app_private.menu_item_media', {
        restaurant_id: rid, menu_item_id: id(`item:${a.productId}`), media_id: mid, sort_order: 0, is_cover: true,
      });
    }
  }
  return mediaIds;
}

async function seedPages(tx: Tx, f: Fixture, rid: string, id: (n: string) => string, t0: Date, ownerMember: string) {
  for (const [key, content] of Object.entries(f.pages)) {
    const resolved = resolveRefs(content, (ref) => {
      const [kind, val] = ref.slice(1).split(':');
      if (kind === 'media') return id(`media:${val}`);
      if (kind === 'item') return id(`item:${val}`);
      return null;
    });
    await tx.ins('app_private.site_pages', {
      id: id(`page:${key}`), restaurant_id: rid, page_key: key, draft: resolved, published: resolved,
      published_at: t0, published_by_member_id: ownerMember,
    });
  }
}

type LineSpec = { p: string; q: number; start: number; ready?: number; deliver?: boolean };
type OrderSpec = { key: string; table: string; sub: number; lines: LineSpec[]; state: 'open' | 'billing' | 'closed';
  runner: string; billReq?: number; method?: 'cash' | 'external_card' };

async function seedPatioOperations(tx: Tx, rid: string, id: (n: string) => string, t0: Date, pepper: string) {
  const at = (min: number, sec = 0) => new Date(t0.getTime() + min * 60_000 + sec * 1000);
  const member = (k: string) => id(`member:${k}`);
  const itemRow = new Map<string, (typeof patio.items)[number]>(patio.items.map((i) => [i[0], i]));
  const businessDate = (d: Date) => {
    const local = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
    local.setHours(local.getHours() - 5);
    return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
  };
  const ev = (row: Record<string, unknown>) => tx.c.query(
    `insert into app_private.domain_events(restaurant_id, aggregate_type, aggregate_id, order_id, visit_id, event_type, actor_kind,
       actor_member_id, actor_guest_id, occurred_at, from_state, to_state, reason, metadata)
     select $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
      where not exists (select 1 from app_private.domain_events where restaurant_id = $1 and aggregate_id = $3 and event_type = $6 and occurred_at = $10)`,
    [rid, row.type, row.agg, row.order ?? null, row.visit ?? null, row.event, row.actorMember ? 'member' : row.actorGuest ? 'guest' : 'system',
      row.actorMember ?? null, row.actorGuest ?? null, row.at, row.from ?? null, row.to ?? null, row.reason ?? null, JSON.stringify(row.meta ?? {})]);

  const orders: OrderSpec[] = [
    { key: 'O005', table: '02', sub: -45, state: 'closed', runner: 'sara', method: 'external_card', billReq: -6,
      lines: [{ p: 'P10', q: 2, start: -43, ready: -30, deliver: true }, { p: 'P19', q: 2, start: -43, ready: -41, deliver: true }] },
    { key: 'O006', table: '03', sub: -40, state: 'closed', runner: 'sara', method: 'cash', billReq: -5,
      lines: [{ p: 'P08', q: 1, start: -38, ready: -26, deliver: true }, { p: 'P18', q: 1, start: -38, ready: -37, deliver: true }] },
    { key: 'O002', table: '04', sub: -35, state: 'open', runner: 'rui',
      lines: [{ p: 'P06', q: 1, start: -33, ready: -20, deliver: true }, { p: 'P18', q: 1, start: -33, ready: -31, deliver: true }] },
    { key: 'O003', table: '12', sub: -30, state: 'billing', runner: 'rui', billReq: -1,
      lines: [{ p: 'P08', q: 2, start: -28, ready: -16, deliver: true }, { p: 'P17', q: 1, start: -28, ready: -27, deliver: true }] },
    { key: 'O004', table: '07', sub: -28, state: 'open', runner: 'sara',
      lines: [{ p: 'P06', q: 1, start: -26, ready: -13, deliver: true }, { p: 'P21', q: 1, start: -26, ready: -25, deliver: true }] },
    { key: 'O001', table: '08', sub: -18, state: 'open', runner: 'rui',
      lines: [{ p: 'P10', q: 2, start: -10 }, { p: 'P11', q: 1, start: -10 }, { p: 'P19', q: 2, start: -17, ready: -15 }] },
  ];

  let number = 0;
  for (const o of orders) {
    number++;
    const vid = id(`visit:${o.key}`);
    const tid = id(`table:${o.table}`);
    const opened = at(o.sub - 4);
    await tx.ins('app_private.table_visits', {
      id: vid, restaurant_id: rid, table_id: tid, status: o.state, opened_at: opened, opened_by_member_id: member('rui'),
      closed_at: o.state === 'closed' ? t0 : null, closed_by_member_id: o.state === 'closed' ? member('leonor') : null,
      join_code_digest: joinCodeDigest(pepper, rid, generateJoinCode()), join_code_generation: 1,
      join_code_expires_at: at(o.sub - 4 + 240), revision: 10,
    });
    await ev({ type: 'visit', agg: vid, visit: vid, event: 'visit.opened', actorMember: member('rui'), at: opened, to: 'open', meta: { table: o.table } });
    const gid = id(`guest:${o.key}`);
    await tx.ins('app_private.guest_sessions', {
      id: gid, restaurant_id: rid, visit_id: vid, qr_code_id: id(`qr:${o.table}`), token_hash: sha256Hex(randomToken(32)),
      created_at: at(o.sub - 2), expires_at: at(o.sub - 2 + 720), revoked_at: o.state === 'closed' ? t0 : null, last_seen_at: at(-1),
    });
    await ev({ type: 'visit', agg: vid, visit: vid, event: 'visit.guest_joined', actorGuest: gid, at: at(o.sub - 2) });
    const oid = id(`order:${o.key}`);
    const submitted = at(o.sub);
    await tx.ins('app_private.orders', {
      id: oid, restaurant_id: rid, visit_id: vid, guest_session_id: gid, source: 'guest', order_number: number,
      submitted_at: submitted, business_date: businessDate(submitted),
    });
    const units = o.lines.reduce((s, l) => s + l.q, 0);
    const total = o.lines.reduce((s, l) => s + l.q * (itemRow.get(l.p)![6] as number), 0);
    await ev({ type: 'order', agg: oid, order: oid, visit: vid, event: 'order.submitted', actorGuest: gid, at: submitted, to: 'new',
      meta: { lines: o.lines.length, units, totalCents: total, source: 'guest' } });
    const stations = [...new Set(o.lines.map((l) => itemRow.get(l.p)![7] as string))].sort((a, b) => (a === 'COZ' ? -1 : b === 'COZ' ? 1 : 0));
    for (const st of stations) {
      await tx.ins('app_private.station_tickets', { id: id(`ticket:${o.key}:${st}`), restaurant_id: rid, order_id: oid, station_id: id(`station:${st}`), created_at: submitted });
    }
    let li = 0;
    for (const l of o.lines) {
      li++;
      const row = itemRow.get(l.p)!;
      const st = row[7] as string;
      const lid = id(`line:${o.key}:${li}`);
      const started = at(l.start);
      const ready = l.ready !== undefined ? at(l.ready) : null;
      const picked = ready && l.deliver ? new Date(ready.getTime() + 30_000) : null;
      const delivered = picked ? new Date(picked.getTime() + 60_000) : null;
      const status = delivered ? 'delivered' : ready ? 'ready' : 'preparing';
      const cook = st === 'COZ' ? member('ines') : member('tomas');
      await tx.ins('app_private.order_items', {
        id: lid, restaurant_id: rid, order_id: oid, ticket_id: id(`ticket:${o.key}:${st}`), menu_item_id: id(`item:${l.p}`),
        station_id_snapshot: id(`station:${st}`), product_name_snapshot: row[3], unit_price_cents: row[6], quantity: l.q,
        allergen_codes_snapshot: [...(row[8] as readonly string[])], status, created_at: submitted, prepared_started_at: started,
        ready_at: ready, picked_up_at: picked, delivered_at: delivered, delivery_member_id: picked ? member(o.runner) : null,
        version: 1 + 1 + (ready ? 1 : 0) + (picked ? 1 : 0) + (delivered ? 1 : 0),
      });
      await ev({ type: 'order_item', agg: lid, order: oid, visit: vid, event: 'item.preparing', actorMember: cook, at: started, from: 'pending', to: 'preparing' });
      if (ready) await ev({ type: 'order_item', agg: lid, order: oid, visit: vid, event: 'item.ready', actorMember: cook, at: ready, from: 'preparing', to: 'ready' });
      if (picked) await ev({ type: 'order_item', agg: lid, order: oid, visit: vid, event: 'item.delivering', actorMember: member(o.runner), at: picked, from: 'ready', to: 'delivering' });
      if (delivered) await ev({ type: 'order_item', agg: lid, order: oid, visit: vid, event: 'item.delivered', actorMember: member(o.runner), at: delivered, from: 'delivering', to: 'delivered' });
    }
    const bid = id(`bill:${o.key}`);
    const requested = o.billReq !== undefined ? at(o.billReq) : null;
    await tx.ins('app_private.bills', {
      id: bid, restaurant_id: rid, visit_id: vid, status: o.state === 'closed' ? 'requested' : o.state === 'billing' ? 'requested' : 'open',
      request_cycle: requested ? 1 : 0, requested_at: requested, version: 1 + li + (requested ? 1 : 0), created_at: opened,
    });
    if (requested) {
      await ev({ type: 'bill', agg: bid, visit: vid, event: 'bill.requested', actorMember: o.state === 'closed' ? member('leonor') : undefined,
        actorGuest: o.state === 'closed' ? undefined : gid, at: requested, from: 'open', to: 'requested', meta: { cycle: 1 } });
    }
    if (o.state === 'billing') {
      await tx.ins('app_private.service_calls', {
        id: id(`call:bill:${o.key}`), restaurant_id: rid, visit_id: vid, type: 'bill', status: 'new', created_by_guest_id: gid,
        created_at: requested, bill_request_cycle: 1,
      });
      await ev({ type: 'service_call', agg: id(`call:bill:${o.key}`), visit: vid, event: 'call.created', actorGuest: gid, at: requested, to: 'new', meta: { type: 'bill' } });
    }
    if (o.state === 'closed') {
      li = 0;
      for (const l of o.lines) {
        li++;
        const row = itemRow.get(l.p)!;
        await tx.ins('app_private.bill_lines', {
          id: id(`billline:${o.key}:${li}`), restaurant_id: rid, bill_id: bid, order_item_id: id(`line:${o.key}:${li}`),
          product_name_snapshot: row[3], quantity: l.q, unit_price_cents: row[6], line_total_cents: l.q * (row[6] as number),
        });
      }
      await tx.ins('app_private.payment_records', {
        id: id(`payment:${o.key}`), restaurant_id: rid, bill_id: bid, method: o.method, amount_cents: total,
        recorded_by_member_id: member('leonor'), recorded_at: t0, idempotency_key: id(`payment-key:${o.key}`),
      });
      // Final transition last (terminal-state guard allows requested → settled).
      await tx.c.query(`update app_private.bills set status = 'settled', settled_at = $3, closed_by_member_id = $4,
          total_cents_snapshot = $5, version = version + 1 where restaurant_id = $1 and id = $2 and status = 'requested'`,
        [rid, bid, t0, member('leonor'), total]);
      await ev({ type: 'bill', agg: bid, visit: vid, event: 'bill.settled', actorMember: member('leonor'), at: t0, from: 'requested', to: 'settled',
        meta: { totalCents: total, method: o.method } });
      await ev({ type: 'visit', agg: vid, visit: vid, event: 'visit.closed', actorMember: member('leonor'), at: t0, to: 'closed' });
    }
  }
  await tx.c.query(`insert into app_private.tenant_counters(restaurant_id, counter_key, value) values ($1, 'order_number', $2)
    on conflict do nothing`, [rid, number]);

  // Calls: cutlery on 04 (new, −2), help on 07 (claimed by Rui, −4/−3).
  const v04 = id('visit:O002');
  const v07 = id('visit:O004');
  await tx.ins('app_private.service_calls', { id: id('call:cutlery:04'), restaurant_id: rid, visit_id: v04, type: 'cutlery', status: 'new',
    created_by_guest_id: id('guest:O002'), created_at: at(-2) });
  await ev({ type: 'service_call', agg: id('call:cutlery:04'), visit: v04, event: 'call.created', actorGuest: id('guest:O002'), at: at(-2), to: 'new', meta: { type: 'cutlery' } });
  await tx.ins('app_private.service_calls', { id: id('call:help:07'), restaurant_id: rid, visit_id: v07, type: 'help', status: 'claimed',
    created_by_guest_id: id('guest:O004'), claimed_by_member_id: member('rui'), created_at: at(-4), claimed_at: at(-3), version: 2 });
  await ev({ type: 'service_call', agg: id('call:help:07'), visit: v07, event: 'call.created', actorGuest: id('guest:O004'), at: at(-4), to: 'new', meta: { type: 'help' } });
  await ev({ type: 'service_call', agg: id('call:help:07'), visit: v07, event: 'call.claimed', actorMember: member('rui'), at: at(-3), from: 'new', to: 'claimed' });

  // Reservations: next open day strictly after today (Monday closed), 13:00 pending and 13:30 confirmed.
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
  const localToday = new Date(t0.toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
  let d = new Date(localToday);
  for (let i = 0; i < 8; i++) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    if ((patio.weeklyHours[days[d.getDay()]!] as unknown as string[][]).length > 0) break;
  }
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  for (const [key, time, status, name, email] of [
    ['A', '13:00', 'pending', 'Cliente Demo A', 'cliente.a@demo.example'],
    ['B', '13:30', 'confirmed', 'Cliente Demo B', 'cliente.b@demo.example'],
  ] as const) {
    const resId = id(`reservation:${key}`);
    const { rows } = await tx.c.query(`select ($1::timestamp at time zone 'Europe/Lisbon') as utc`, [`${ymd} ${time}`]);
    await tx.ins('app_private.reservations', {
      id: resId, restaurant_id: rid, reference: refCode(resId), name, email, party_size: key === 'A' ? 2 : 4,
      requested_at_local: `${ymd} ${time}`, scheduled_at: rows[0].utc, status,
      contacted_at: status === 'confirmed' ? at(-30) : null, handled_by_member_id: status === 'confirmed' ? member('rui') : null,
      note: key === 'A' ? 'Mesa junto à janela, se possível.' : null, created_at: at(-120),
    });
    await ev({ type: 'reservation', agg: resId, event: 'reservation.requested', at: at(-120), to: 'pending', meta: { partySize: key === 'A' ? 2 : 4 } });
    if (status === 'confirmed') await ev({ type: 'reservation', agg: resId, event: 'reservation.confirmed', actorMember: member('rui'), at: at(-30), from: 'pending', to: 'confirmed' });
  }
}

async function seedBalcaoOperations(tx: Tx, rid: string, id: (n: string) => string, t0: Date, pepper: string) {
  const at = (min: number) => new Date(t0.getTime() + min * 60_000);
  const vid = id('visit:B001');
  const joana = id('member:joana');
  await tx.ins('app_private.table_visits', {
    id: vid, restaurant_id: rid, table_id: id('table:01'), status: 'open', opened_at: at(-12), opened_by_member_id: joana,
    join_code_digest: joinCodeDigest(pepper, rid, generateJoinCode()), join_code_expires_at: at(228),
  });
  await tx.ins('app_private.bills', { id: id('bill:B001'), restaurant_id: rid, visit_id: vid, status: 'open', version: 2, created_at: at(-12) });
  const oid = id('order:B001');
  await tx.ins('app_private.orders', {
    id: oid, restaurant_id: rid, visit_id: vid, created_by_member_id: joana, source: 'staff', order_number: 1,
    submitted_at: at(-10), business_date: t0.toISOString().slice(0, 10), assisted_reason: 'Pedido ao balcão',
  });
  await tx.ins('app_private.station_tickets', { id: id('ticket:B001:BAR'), restaurant_id: rid, order_id: oid, station_id: id('station:BAR'), created_at: at(-10) });
  await tx.ins('app_private.station_tickets', { id: id('ticket:B001:COZ'), restaurant_id: rid, order_id: oid, station_id: id('station:COZ'), created_at: at(-10) });
  await tx.ins('app_private.order_items', {
    id: id('line:B001:1'), restaurant_id: rid, order_id: oid, ticket_id: id('ticket:B001:BAR'), menu_item_id: id('item:B01'),
    station_id_snapshot: id('station:BAR'), product_name_snapshot: 'Espresso', unit_price_cents: 90, quantity: 1, status: 'pending', created_at: at(-10),
  });
  await tx.ins('app_private.order_items', {
    id: id('line:B001:2'), restaurant_id: rid, order_id: oid, ticket_id: id('ticket:B001:COZ'), menu_item_id: id('item:B03'),
    station_id_snapshot: id('station:COZ'), product_name_snapshot: 'Pastel de nata', unit_price_cents: 130, quantity: 1,
    allergen_codes_snapshot: ['gluten', 'ovos', 'leite'], status: 'pending', created_at: at(-10),
  });
  await tx.c.query(`insert into app_private.tenant_counters(restaurant_id, counter_key, value) values ($1, 'order_number', 1) on conflict do nothing`, [rid]);
}

export async function runSeed(opts: SeedOptions) {
  const log = opts.log ?? console.log;
  const t0 = new Date(Math.floor(opts.t0.getTime() / 1000) * 1000);
  const root = process.cwd();
  buildPlaceholders(root);
  const base = requireEnv('DEMO_SEED_PASSWORD');
  const pepper = requireEnv('GUEST_PIN_PEPPER');
  const qrKey = requireEnv('QR_ENCRYPTION_KEY');
  const qrVer = Number(process.env.QR_ENCRYPTION_KEY_VERSION ?? '1');
  const baseDomain = requireEnv('APP_BASE_DOMAIN');

  const all = [...patio.staff, ...balcao.staff, multiTenantUser].map((s) => ({ email: s.email, name: s.name }));
  const users = await ensureUsers(all, base);
  log(`auth: ${users.size} demo users ready`);

  const client = new pg.Client({ connectionString: requireEnv('SUPABASE_DB_URL') });
  await client.connect();
  const tx = new Tx(client);
  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(4242)');
    const existing = await client.query(`select slug from app_private.restaurants where slug = any($1)`, [[patio.slug, balcao.slug]]);
    const fresh = new Set([patio.slug, balcao.slug].filter((s) => !existing.rows.some((r) => r.slug === s)));

    const A = await seedTenantConfig(tx, patio, users, t0, { baseDomain, qrKey, qrVer });
    await seedMedia(tx, A.rid, A.id, t0, root);
    await seedPages(tx, patio, A.rid, A.id, t0, A.id('member:marta'));
    if (fresh.has(patio.slug)) await seedPatioOperations(tx, A.rid, A.id, t0, pepper);

    const B = await seedTenantConfig(tx, balcao, users, t0, { baseDomain, qrKey, qrVer });
    await seedPages(tx, balcao, B.rid, B.id, t0, B.id('member:joana'));
    if (fresh.has(balcao.slug)) await seedBalcaoOperations(tx, B.rid, B.id, t0, pepper);

    // Multi-tenant test user: admin in A, bar (station BAR) in B.
    const multiUid = users.get(multiTenantUser.email)!;
    await tx.ins('app_private.restaurant_members', { id: A.id('member:multi'), restaurant_id: A.rid, user_id: multiUid, display_name: multiTenantUser.name, status: 'active', accepted_at: t0 });
    await tx.ins('app_private.member_roles', { restaurant_id: A.rid, member_id: A.id('member:multi'), role: 'admin' });
    await tx.ins('app_private.restaurant_members', { id: B.id('member:multi'), restaurant_id: B.rid, user_id: multiUid, display_name: multiTenantUser.name, status: 'active', accepted_at: t0 });
    await tx.ins('app_private.member_roles', { restaurant_id: B.rid, member_id: B.id('member:multi'), role: 'bar' });
    await tx.ins('app_private.member_stations', { restaurant_id: B.rid, member_id: B.id('member:multi'), station_id: B.id('station:BAR') });
    await tx.ins('app_private.profiles', { id: multiUid, display_name: multiTenantUser.name });
    await client.query('commit');
    log(`seed: ${fresh.size ? `created ${[...fresh].join(', ')}` : 'already present — nothing changed (idempotent)'} · T0=${t0.toISOString()}`);
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    await client.end();
  }
  return {
    t0,
    users: all.map((u) => ({ email: u.email, password: demoPassword(base, u.email) })),
    patioId: uuidV5('restaurant', patio.namespace),
    balcaoId: uuidV5('restaurant', balcao.namespace),
  };
}
