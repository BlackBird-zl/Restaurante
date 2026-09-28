-- =====================================================================
-- restaurant-os · 0200 · Private helpers (authorization, events, idempotency, limits)
-- All helpers live in app_private and are not executable by API roles.
-- =====================================================================

-- Raise a domain error. PostgREST returns {code:'P0001', message:<CODE>, details:<json>}.
create or replace function app_private.err(p_code text, p_detail jsonb default null)
returns void language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P0001', message = p_code,
    detail = coalesce(p_detail::text, '{}');
end $$;

create or replace function app_private.business_date(p_ts timestamptz, p_tz text, p_start time)
returns date language sql stable set search_path = '' as $$
  select ((p_ts at time zone p_tz) - (p_start - time '00:00'))::date
$$;

-- UTC bounds [start, end) of a business date in the tenant timezone (DST safe).
create or replace function app_private.business_day_bounds(p_date date, p_tz text, p_start time,
  out day_start timestamptz, out day_end timestamptz)
language sql stable set search_path = '' as $$
  select ((p_date + p_start)::timestamp at time zone p_tz),
         (((p_date + 1) + p_start)::timestamp at time zone p_tz)
$$;

create or replace function app_private.sha256_hex(p text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(convert_to(p, 'UTF8'), 'sha256'), 'hex')
$$;

create or replace function app_private.random_reference() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea := extensions.gen_random_bytes(8);
  r text := '';
begin
  for i in 0..7 loop
    r := r || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return r;
end $$;

-- ---------------------------------------------------------------------
-- Staff context: resolves slug + auth.uid() into an active membership.
-- Unknown tenant, suspended tenant or missing membership are indistinguishable (NOT_FOUND).
-- ---------------------------------------------------------------------
create type app_private.staff_context as (
  restaurant_id uuid,
  member_id uuid,
  roles text[],
  is_owner boolean,
  display_name text,
  timezone text,
  business_day_start time
);

create or replace function app_private.staff_ctx(p_slug text)
returns app_private.staff_context
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  c app_private.staff_context;
begin
  if v_uid is null then
    perform app_private.err('AUTH_REQUIRED');
  end if;
  select r.id, m.id,
         coalesce((select array_agg(mr.role order by mr.role) from app_private.member_roles mr
                   where mr.restaurant_id = r.id and mr.member_id = m.id), '{}'::text[]),
         r.owner_user_id = v_uid, m.display_name, r.timezone, r.business_day_start
    into c
    from app_private.restaurants r
    join app_private.restaurant_members m on m.restaurant_id = r.id and m.user_id = v_uid and m.status = 'active'
   where r.slug = lower(p_slug) and r.status = 'active';
  if c.restaurant_id is null then
    perform app_private.err('NOT_FOUND');
  end if;
  if c.is_owner then
    c.roles := array(select distinct unnest(c.roles || array['owner','admin']::text[]) order by 1);
  end if;
  return c;
end $$;

create or replace function app_private.has_role(p_ctx app_private.staff_context, p_roles text[])
returns boolean language sql immutable set search_path = '' as $$
  select p_ctx.roles && (p_roles || array['admin']::text[])
$$;

create or replace function app_private.require_role(p_ctx app_private.staff_context, p_roles text[])
returns void language plpgsql immutable set search_path = '' as $$
begin
  if not (p_ctx.roles && (p_roles || array['admin']::text[])) then
    perform app_private.err('FORBIDDEN');
  end if;
end $$;

create or replace function app_private.is_admin(p_ctx app_private.staff_context)
returns boolean language sql immutable set search_path = '' as $$
  select 'admin' = any(p_ctx.roles)
$$;

-- Station permission: admin anywhere; kitchen/bar only on assigned stations of their kind.
create or replace function app_private.can_work_station(p_ctx app_private.staff_context, p_station_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app_private.is_admin(p_ctx) or exists (
    select 1 from app_private.member_stations ms
      join app_private.stations s on s.restaurant_id = ms.restaurant_id and s.id = ms.station_id
     where ms.restaurant_id = p_ctx.restaurant_id and ms.member_id = p_ctx.member_id
       and ms.station_id = p_station_id and s.active
       and ((s.kind = 'kitchen' and 'kitchen' = any(p_ctx.roles)) or (s.kind = 'bar' and 'bar' = any(p_ctx.roles))))
$$;

-- ---------------------------------------------------------------------
-- Rate limiting (fixed windows, hashed keys, no raw IPs).
-- Returns the count after increment. Callers decide whether to raise or return.
-- ---------------------------------------------------------------------
create or replace function app_private.rate_hit(p_key text, p_window_seconds integer)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare
  v_hash text := app_private.sha256_hex('rl:' || p_key);
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into app_private.rate_limit_buckets(bucket_key_hash, window_start, count, expires_at)
  values (v_hash, v_start, 1, v_start + make_interval(secs => p_window_seconds) + interval '24 hours')
  on conflict (bucket_key_hash, window_start) do update set count = app_private.rate_limit_buckets.count + 1
  returning count into v_count;
  return v_count;
end $$;

create or replace function app_private.rate_peek(p_key text, p_window_seconds integer)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce((select count from app_private.rate_limit_buckets
     where bucket_key_hash = app_private.sha256_hex('rl:' || p_key)
       and window_start = to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds)), 0)
$$;

create or replace function app_private.retry_after(p_window_seconds integer)
returns integer language sql stable set search_path = '' as $$
  select greatest(1, ceil(p_window_seconds - (extract(epoch from now())::numeric % p_window_seconds))::integer)
$$;

create or replace function app_private.rate_limit_or_raise(p_key text, p_window_seconds integer, p_max integer)
returns void language plpgsql volatile set search_path = '' as $$
begin
  if app_private.rate_hit(p_key, p_window_seconds) > p_max then
    perform app_private.err('RATE_LIMITED', jsonb_build_object('retryAfterSeconds', app_private.retry_after(p_window_seconds)));
  end if;
end $$;

create or replace function app_private.staff_mutation_guard(p_ctx app_private.staff_context)
returns void language plpgsql volatile set search_path = '' as $$
begin
  perform app_private.rate_limit_or_raise('staff:' || p_ctx.member_id::text, 60, 120);
end $$;

-- ---------------------------------------------------------------------
-- Idempotency. Lookup takes a transaction advisory lock on the key scope so that
-- concurrent requests with the same key serialize; the second sees the stored result.
-- ---------------------------------------------------------------------
create or replace function app_private.idem_lookup(p_restaurant_id uuid, p_scope text, p_operation text,
  p_key uuid, p_payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_hash text := app_private.sha256_hex(coalesce(p_payload, '{}'::jsonb)::text);
  r record;
begin
  if p_key is null then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'idempotencyKey'));
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_restaurant_id::text || '|' || p_scope || '|' || p_operation || '|' || p_key::text, 7));
  select request_hash, response_body into r from app_private.idempotency_requests
   where restaurant_id = p_restaurant_id and actor_scope = p_scope and operation = p_operation
     and idempotency_key = p_key and expires_at > now();
  if not found then
    return null;
  end if;
  if r.request_hash <> v_hash then
    perform app_private.err('IDEMPOTENCY_CONFLICT');
  end if;
  return r.response_body || jsonb_build_object('replayed', true);
end $$;

create or replace function app_private.idem_store(p_restaurant_id uuid, p_scope text, p_operation text,
  p_key uuid, p_payload jsonb, p_resource_id uuid, p_code integer, p_body jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  insert into app_private.idempotency_requests(restaurant_id, actor_scope, operation, idempotency_key,
    request_hash, resource_id, response_code, response_body)
  values (p_restaurant_id, p_scope, p_operation, p_key,
    app_private.sha256_hex(coalesce(p_payload, '{}'::jsonb)::text), p_resource_id, p_code, p_body)
  on conflict (restaurant_id, actor_scope, operation, idempotency_key) do update
    set request_hash = excluded.request_hash, resource_id = excluded.resource_id,
        response_code = excluded.response_code, response_body = excluded.response_body,
        created_at = now(), expires_at = now() + interval '48 hours';
  return p_body;
end $$;

-- ---------------------------------------------------------------------
-- Events and invalidations (written in the same transaction as the mutation)
-- ---------------------------------------------------------------------
create or replace function app_private.emit(
  p_restaurant_id uuid, p_aggregate_type text, p_aggregate_id uuid, p_event_type text,
  p_actor_member_id uuid default null, p_actor_guest_id uuid default null,
  p_from text default null, p_to text default null, p_reason text default null,
  p_order_id uuid default null, p_visit_id uuid default null, p_metadata jsonb default '{}'::jsonb,
  p_at timestamptz default now())
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  insert into app_private.domain_events(restaurant_id, aggregate_type, aggregate_id, order_id, visit_id,
    event_type, actor_kind, actor_member_id, actor_guest_id, occurred_at, from_state, to_state, reason, metadata)
  values (p_restaurant_id, p_aggregate_type, p_aggregate_id, p_order_id, p_visit_id, p_event_type,
    case when p_actor_member_id is not null then 'member' when p_actor_guest_id is not null then 'guest' else 'system' end,
    p_actor_member_id, p_actor_guest_id, p_at, p_from, p_to, p_reason, coalesce(p_metadata, '{}'::jsonb));
end $$;

-- One row per active recipient member whose roles are relevant; admins/owner always.
create or replace function app_private.invalidate(p_restaurant_id uuid, p_scopes text[], p_roles text[])
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  insert into public.staff_invalidations(restaurant_id, recipient_member_id, scope)
  select distinct m.restaurant_id, m.id, s.scope
    from app_private.restaurant_members m
    join app_private.restaurants r on r.id = m.restaurant_id
    cross join unnest(p_scopes) as s(scope)
   where m.restaurant_id = p_restaurant_id and m.status = 'active'
     and (m.user_id = r.owner_user_id or exists (
       select 1 from app_private.member_roles mr
        where mr.restaurant_id = m.restaurant_id and mr.member_id = m.id
          and (mr.role = 'admin' or mr.role = any(p_roles))));
end $$;

-- Realtime policy helper (the only private helper executable by `authenticated`).
create or replace function app_private.can_read_invalidation(p_restaurant_id uuid, p_member_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from app_private.restaurant_members m
      join app_private.restaurants r on r.id = m.restaurant_id and r.status = 'active'
     where m.id = p_member_id and m.restaurant_id = p_restaurant_id
       and m.user_id = auth.uid() and m.status = 'active')
$$;

-- ---------------------------------------------------------------------
-- Owner invariant: owner must always be an active member (deferred check).
-- ---------------------------------------------------------------------
create or replace function app_private.check_owner_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_rid uuid;
begin
  if tg_table_name = 'restaurants' then
    v_rid := new.id;
  elsif tg_op = 'DELETE' then
    v_rid := old.restaurant_id;
  else
    v_rid := new.restaurant_id;
  end if;
  if not exists (
    select 1 from app_private.restaurants r
      join app_private.restaurant_members m on m.restaurant_id = r.id and m.user_id = r.owner_user_id and m.status = 'active'
     where r.id = v_rid) and exists (select 1 from app_private.restaurants where id = v_rid) then
    raise exception using errcode = 'P0001', message = 'OWNER_REQUIRED',
      detail = '{"reason":"owner must remain an active member"}';
  end if;
  return null;
end $$;

create constraint trigger restaurants_owner_member after insert or update on app_private.restaurants
  deferrable initially deferred for each row execute function app_private.check_owner_membership();
create constraint trigger members_owner_member after update or delete on app_private.restaurant_members
  deferrable initially deferred for each row execute function app_private.check_owner_membership();

-- Kitchen/bar station links must match the station kind of a role the member has (validated in RPC too).
create or replace function app_private.check_bill_line_visit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from app_private.bills b
      join app_private.orders o on o.restaurant_id = b.restaurant_id and o.visit_id = b.visit_id
      join app_private.order_items oi on oi.restaurant_id = o.restaurant_id and oi.order_id = o.id
     where b.restaurant_id = new.restaurant_id and b.id = new.bill_id and oi.id = new.order_item_id) then
    raise exception using errcode = 'P0001', message = 'INTEGRITY', detail = '{"reason":"bill line item outside visit"}';
  end if;
  return new;
end $$;
create trigger bill_lines_same_visit before insert on app_private.bill_lines
  for each row execute function app_private.check_bill_line_visit();

-- Settled/void bills are terminal; settled bills and payments are immutable.
create or replace function app_private.guard_bill_terminal() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status in ('settled','void') then
    raise exception using errcode = 'P0001', message = 'BILL_CLOSED', detail = '{}';
  end if;
  return new;
end $$;
create trigger bills_terminal before update on app_private.bills
  for each row execute function app_private.guard_bill_terminal();

-- Order items of a settled/void bill are frozen.
create or replace function app_private.guard_item_after_close() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('app.maintenance', true) = 'on' then return new; end if;
  if exists (select 1 from app_private.orders o
               join app_private.bills b on b.restaurant_id = o.restaurant_id and b.visit_id = o.visit_id
              where o.restaurant_id = old.restaurant_id and o.id = old.order_id and b.status in ('settled','void')) then
    raise exception using errcode = 'P0001', message = 'BILL_CLOSED', detail = '{}';
  end if;
  if new.product_name_snapshot is distinct from old.product_name_snapshot
     or new.unit_price_cents is distinct from old.unit_price_cents
     or new.quantity is distinct from old.quantity
     or new.station_id_snapshot is distinct from old.station_id_snapshot
     or new.menu_item_id is distinct from old.menu_item_id
     or new.order_id is distinct from old.order_id then
    raise exception using errcode = 'P0001', message = 'IMMUTABLE', detail = '{"reason":"snapshots are immutable"}';
  end if;
  return new;
end $$;
create trigger order_items_guard before update on app_private.order_items
  for each row execute function app_private.guard_item_after_close();

-- Lock order helper for visit/bill (common lock path for create_order and billing).
create or replace function app_private.lock_visit_and_bill(p_restaurant_id uuid, p_visit_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare visit_row app_private.table_visits; bill_row app_private.bills;
begin
  perform 1 from app_private.restaurant_settings where restaurant_id = p_restaurant_id for share;
  perform 1 from app_private.dining_tables t
    join app_private.table_visits v on v.restaurant_id = t.restaurant_id and v.table_id = t.id
   where v.restaurant_id = p_restaurant_id and v.id = p_visit_id for share of t;
  select * into visit_row from app_private.table_visits
   where restaurant_id = p_restaurant_id and id = p_visit_id for update;
  if visit_row.id is null then perform app_private.err('NOT_FOUND'); end if;
  select * into bill_row from app_private.bills
   where restaurant_id = p_restaurant_id and visit_id = p_visit_id for update;
end $$;

create or replace function app_private.bill_open_total(p_restaurant_id uuid, p_visit_id uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(oi.quantity * oi.unit_price_cents) filter (where oi.status <> 'cancelled'), 0)::integer
    from app_private.orders o
    join app_private.order_items oi on oi.restaurant_id = o.restaurant_id and oi.order_id = o.id
   where o.restaurant_id = p_restaurant_id and o.visit_id = p_visit_id
$$;

create or replace function app_private.bump_visit(p_restaurant_id uuid, p_visit_id uuid)
returns bigint language sql volatile security definer set search_path = '' as $$
  update app_private.table_visits set revision = revision + 1
   where restaurant_id = p_restaurant_id and id = p_visit_id returning revision
$$;

create or replace function app_private.bump_bill(p_restaurant_id uuid, p_visit_id uuid)
returns integer language sql volatile security definer set search_path = '' as $$
  update app_private.bills set version = version + 1
   where restaurant_id = p_restaurant_id and visit_id = p_visit_id and status in ('open','requested') returning version
$$;

create or replace function app_private.order_status(p_statuses text[])
returns text language plpgsql immutable set search_path = '' as $$
declare
  active text[] := array(select s from unnest(p_statuses) s where s <> 'cancelled');
begin
  if coalesce(array_length(active, 1), 0) = 0 then return 'cancelled'; end if;
  if active <@ array['delivered'] then return 'delivered'; end if;
  if active && array['delivered','delivering'] then return 'partially_served'; end if;
  if active <@ array['ready'] then return 'ready'; end if;
  if active && array['ready'] then return 'partially_ready'; end if;
  if active && array['preparing'] then return 'preparing'; end if;
  return 'new';
end $$;
