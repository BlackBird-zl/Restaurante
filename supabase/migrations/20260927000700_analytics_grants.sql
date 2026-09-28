-- =====================================================================
-- restaurant-os · 0700 · Analytics (§12), retention (§15.2), grants, realtime
-- =====================================================================

-- Pure analytics over real timestamps/snapshots. [p_start, p_end) are UTC bounds.
create or replace function app_private.analytics(p_rid uuid, p_start timestamptz, p_end timestamptz, p_now timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
  with r as (select * from app_private.restaurants where id = p_rid),
  ord as (
    select o.* from app_private.orders o where o.restaurant_id = p_rid and o.submitted_at >= p_start and o.submitted_at < p_end),
  items as (
    select oi.*, o.submitted_at, o.visit_id from app_private.order_items oi
      join ord o on o.restaurant_id = oi.restaurant_id and o.id = oi.order_id),
  calls as (
    select * from app_private.service_calls where restaurant_id = p_rid and created_at >= p_start and created_at < p_end),
  pays as (
    select * from app_private.payment_records where restaurant_id = p_rid and recorded_at >= p_start and recorded_at < p_end),
  active_visits as (
    select v.* from app_private.table_visits v where v.restaurant_id = p_rid and v.status in ('open','billing'))
  select jsonb_build_object(
    'range', jsonb_build_object('start', p_start, 'end', p_end, 'now', p_now),
    'orders', jsonb_build_object(
      'submitted', (select count(*) from ord),
      'fullyCancelled', (select count(*) from ord o where not exists (select 1 from app_private.order_items oi
          where oi.restaurant_id = o.restaurant_id and oi.order_id = o.id and oi.status <> 'cancelled')),
      'lines', (select count(*) from items),
      'unitsOrdered', (select coalesce(sum(quantity), 0) from items where status <> 'cancelled'),
      'orderedValueCents', (select coalesce(sum(quantity * unit_price_cents), 0) from items where status <> 'cancelled')),
    'received', jsonb_build_object(
      'totalCents', (select coalesce(sum(amount_cents), 0) from pays),
      'count', (select count(*) from pays),
      'byMethod', coalesce((select jsonb_object_agg(method, cents) from (select method, sum(amount_cents) cents from pays group by method) m), '{}'::jsonb)),
    'calls', jsonb_build_object(
      'total', (select count(*) from calls),
      'byType', coalesce((select jsonb_object_agg(type, n) from (select type, count(*) n from calls group by type) t), '{}'::jsonb),
      'claimWait', (select jsonb_build_object('n', count(*), 'avgSeconds', round(avg(extract(epoch from claimed_at - created_at)))::int)
                      from calls where claimed_at is not null)),
    'preparation', coalesce((select jsonb_agg(jsonb_build_object('stationCode', s.code, 'stationName', s.name, 'targetMinutes', s.target_minutes,
        'n', x.n, 'avgPrepSeconds', x.avg_prep, 'waitN', x.wait_n, 'avgWaitSeconds', x.avg_wait) order by s.sort_order)
      from app_private.stations s
      left join lateral (
        select count(*) filter (where i.ready_at is not null and i.prepared_started_at is not null) n,
               round(avg(extract(epoch from i.ready_at - i.prepared_started_at)) filter (where i.ready_at is not null and i.prepared_started_at is not null))::int avg_prep,
               count(*) filter (where i.prepared_started_at is not null) wait_n,
               round(avg(extract(epoch from i.prepared_started_at - i.submitted_at)) filter (where i.prepared_started_at is not null))::int avg_wait
          from items i where i.station_id_snapshot = s.id and i.status <> 'cancelled') x on true
     where s.restaurant_id = p_rid), '[]'::jsonb),
    'topProducts', coalesce((select jsonb_agg(t order by (t->>'units')::int desc, t->>'name') from (
        select jsonb_build_object('menuItemId', i.menu_item_id, 'name', max(i.product_name_snapshot), 'units', sum(i.quantity),
               'orderedValueCents', sum(i.quantity * i.unit_price_cents)) t
          from items i where i.status <> 'cancelled' group by i.menu_item_id order by sum(i.quantity) desc, max(i.product_name_snapshot) limit 10) q), '[]'::jsonb),
    'hours', (select jsonb_agg(jsonb_build_object('hour', h, 'orders',
        (select count(*) from ord o where extract(hour from (o.submitted_at at time zone (select timezone from r)))::int = h)) order by h)
      from generate_series(0, 23) h),
    'tables', coalesce((select jsonb_agg(jsonb_build_object('label', t.label,
        'orders', (select count(*) from ord o join app_private.table_visits v on v.restaurant_id = o.restaurant_id and v.id = o.visit_id where v.table_id = t.id),
        'calls', (select count(*) from calls sc join app_private.table_visits v on v.restaurant_id = sc.restaurant_id and v.id = sc.visit_id where v.table_id = t.id),
        'settledBills', (select count(*) from pays p join app_private.bills b on b.restaurant_id = p.restaurant_id and b.id = p.bill_id
                          join app_private.table_visits v on v.restaurant_id = b.restaurant_id and v.id = b.visit_id where v.table_id = t.id))
        order by t.sort_order) from app_private.dining_tables t where t.restaurant_id = p_rid and t.archived_at is null), '[]'::jsonb),
    'now', jsonb_build_object(
      'activeVisits', (select count(*) from active_visits),
      'freeTables', (select count(*) from app_private.dining_tables t where t.restaurant_id = p_rid and t.active and t.archived_at is null
                        and not exists (select 1 from active_visits v where v.table_id = t.id)),
      'requestedBills', (select count(*) from app_private.bills where restaurant_id = p_rid and status = 'requested'),
      'openConsumptionCents', (select coalesce(sum(oi.quantity * oi.unit_price_cents), 0) from active_visits v
          join app_private.orders o on o.restaurant_id = v.restaurant_id and o.visit_id = v.id
          join app_private.order_items oi on oi.restaurant_id = o.restaurant_id and oi.order_id = o.id where oi.status <> 'cancelled'),
      'activeCalls', (select jsonb_build_object('total', count(*), 'new', count(*) filter (where status = 'new'),
          'claimed', count(*) filter (where status = 'claimed'))
          from app_private.service_calls where restaurant_id = p_rid and status in ('new','claimed')),
      'lateLines', (select jsonb_build_object('lines', count(*), 'tables', coalesce(jsonb_agg(distinct t.label), '[]'::jsonb))
          from app_private.order_items oi
          join app_private.orders o on o.restaurant_id = oi.restaurant_id and o.id = oi.order_id
          join app_private.stations s on s.restaurant_id = oi.restaurant_id and s.id = oi.station_id_snapshot
          join app_private.table_visits v on v.restaurant_id = o.restaurant_id and v.id = o.visit_id
          join app_private.dining_tables t on t.restaurant_id = v.restaurant_id and t.id = v.table_id
         where oi.restaurant_id = p_rid and oi.status in ('pending','preparing')
           and p_now - o.submitted_at > make_interval(mins => s.target_minutes)),
      'readyAwaiting', (select jsonb_build_object('lines', count(*), 'units', coalesce(sum(quantity), 0))
          from app_private.order_items where restaurant_id = p_rid and status = 'ready'),
      'pendingReservations', (select count(*) from app_private.reservations where restaurant_id = p_rid and status = 'pending'
          and scheduled_at > p_now)))
$$;

create or replace function public.staff_get_analytics(p_restaurant_slug text, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_today date := app_private.business_date(now(), c.timezone, c.business_day_start);
  v_from date := coalesce(p_from, v_today);
  v_to date := coalesce(p_to, v_today);
  v_start timestamptz; v_end timestamptz;
begin
  perform app_private.require_role(c, array[]::text[]);
  if v_to < v_from or v_to - v_from > 89 then perform app_private.err('INVALID_INPUT', '{"field":"range","reason":"max_90_days"}'); end if;
  select day_start into v_start from app_private.business_day_bounds(v_from, c.timezone, c.business_day_start);
  select day_end into v_end from app_private.business_day_bounds(v_to, c.timezone, c.business_day_start);
  return app_private.analytics(c.restaurant_id, v_start, v_end, now())
    || jsonb_build_object('businessDates', jsonb_build_object('from', v_from, 'to', v_to, 'today', v_today),
       'businessDayStart', to_char(c.business_day_start, 'HH24:MI'));
end $$;

create or replace function public.staff_admin_overview(p_restaurant_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_today date := app_private.business_date(now(), c.timezone, c.business_day_start);
  b record; a jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  select * into b from app_private.business_day_bounds(v_today, c.timezone, c.business_day_start);
  a := app_private.analytics(c.restaurant_id, b.day_start, b.day_end, now());
  return jsonb_build_object('businessDate', v_today, 'serverTime', now(),
    'orders', a->'orders'->'submitted', 'receivedCents', a->'received'->'totalCents',
    'newCalls', a->'now'->'activeCalls'->'new', 'lateLines', a->'now'->'lateLines'->'lines',
    'now', a->'now',
    'pending', jsonb_build_object(
      'requestedBills', a->'now'->'requestedBills',
      'reservations', a->'now'->'pendingReservations',
      'invitations', (select count(*) from app_private.restaurant_members where restaurant_id = c.restaurant_id and status = 'invited'),
      'unavailableItems', (select coalesce(jsonb_agg(name order by name), '[]'::jsonb) from app_private.menu_items
          where restaurant_id = c.restaurant_id and not is_available and is_visible and archived_at is null),
      'draftPages', (select coalesce(jsonb_agg(page_key), '[]'::jsonb) from app_private.site_pages
          where restaurant_id = c.restaurant_id and published is distinct from draft),
      'featuredMissing', (select count(*) from (
          select jsonb_array_elements_text(coalesce(p.published->'featuredItemIds', '[]'::jsonb)) id
            from app_private.site_pages p where p.restaurant_id = c.restaurant_id and p.page_key = 'home') f
          where not exists (select 1 from app_private.menu_items mi where mi.restaurant_id = c.restaurant_id and mi.id::text = f.id
                              and mi.is_visible and mi.archived_at is null)),
      'orderingMode', (select ordering_mode from app_private.restaurant_settings where restaurant_id = c.restaurant_id)));
end $$;

-- ---------------------------------------------------------------------
-- Retention job (service_role; scheduled daily). Never deletes orders/bills/payments.
-- ---------------------------------------------------------------------
create or replace function public.system_run_retention(p_now timestamptz default now())
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_idem integer; v_rl integer; v_inv integer; v_tokens integer; v_resv integer;
begin
  delete from app_private.idempotency_requests where expires_at < p_now; get diagnostics v_idem = row_count;
  delete from app_private.rate_limit_buckets where expires_at < p_now; get diagnostics v_rl = row_count;
  delete from public.staff_invalidations where created_at < p_now - interval '24 hours'; get diagnostics v_inv = row_count;
  -- Purge guest secrets 7 days after the visit closed or the session expired (hash replaced by random, unusable).
  update app_private.guest_sessions gs set token_hash = encode(extensions.gen_random_bytes(32), 'hex'),
         revoked_at = coalesce(gs.revoked_at, p_now)
   where gs.expires_at < p_now - interval '7 days'
     and gs.token_hash not like '0000%';
  get diagnostics v_tokens = row_count;
  update app_private.reservations set name = null, email = null, phone = null, note = null, internal_note = null,
         anonymized_at = p_now
   where anonymized_at is null and scheduled_at < p_now - interval '90 days';
  get diagnostics v_resv = row_count;
  return jsonb_build_object('idempotency', v_idem, 'rateLimits', v_rl, 'invalidations', v_inv,
    'guestTokensPurged', v_tokens, 'reservationsAnonymized', v_resv, 'ranAt', p_now);
end $$;

-- ---------------------------------------------------------------------
-- Realtime: only staff_invalidations is published; RLS limits rows to the recipient.
-- ---------------------------------------------------------------------
create policy staff_invalidations_recipient on public.staff_invalidations
  for select to authenticated
  using (app_private.can_read_invalidation(restaurant_id, recipient_member_id));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
                   and schemaname = 'public' and tablename = 'staff_invalidations') then
      alter publication supabase_realtime add table public.staff_invalidations;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Grants: revoke everything, then allowlist by prefix.
-- ---------------------------------------------------------------------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname, n.nspname from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
            where n.nspname in ('public','app_private') and p.prokind = 'f' loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f.sig);
    if f.nspname = 'public' then
      if f.proname like 'site\_%' then
        execute format('grant execute on function %s to anon, authenticated, service_role', f.sig);
      elsif f.proname like 'staff\_%' then
        execute format('grant execute on function %s to authenticated', f.sig);
      elsif f.proname like 'guest\_%' or f.proname like 'system\_%' then
        execute format('grant execute on function %s to service_role', f.sig);
      end if;
    end if;
  end loop;
end $$;

-- Realtime policy needs USAGE on app_private + EXECUTE on this single helper (no table grants).
grant usage on schema app_private to authenticated;
grant execute on function app_private.can_read_invalidation(uuid, uuid) to authenticated;
-- Types used in function signatures need no grants for callers of public RPCs (definer context).

notify pgrst, 'reload schema';
