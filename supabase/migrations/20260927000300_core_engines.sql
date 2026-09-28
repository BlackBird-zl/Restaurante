-- =====================================================================
-- restaurant-os · 0300 · Transactional engines shared by guest and staff
-- (order creation §9.3, calls §5.4, bill request §5.5). Single implementation.
-- =====================================================================

create or replace function app_private.clean_text(p text, p_max integer)
returns text language plpgsql immutable set search_path = '' as $$
declare v text;
begin
  if p is null then return null; end if;
  v := btrim(regexp_replace(p, '[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]', '', 'g'));
  v := regexp_replace(v, '\s+', ' ', 'g');
  if v = '' then return null; end if;
  if v ~ '<[^>]*>' then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('reason', 'html_not_allowed'));
  end if;
  if char_length(v) > p_max then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('reason', 'too_long', 'max', p_max));
  end if;
  return v;
end $$;

create or replace function app_private.assert_keys(p jsonb, p_allowed text[])
returns void language plpgsql immutable set search_path = '' as $$
declare k text;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('reason', 'object_expected'));
  end if;
  for k in select jsonb_object_keys(p) loop
    if not (k = any(p_allowed)) then
      perform app_private.err('INVALID_INPUT', jsonb_build_object('reason', 'unknown_field', 'field', k));
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Order creation core (guest and staff-assisted share it)
-- ---------------------------------------------------------------------
create or replace function app_private.create_order_core(
  p_rid uuid, p_visit_id uuid, p_guest_id uuid, p_member_id uuid, p_lines jsonb, p_assisted_reason text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_rest app_private.restaurants;
  v_settings app_private.restaurant_settings;
  v_visit app_private.table_visits;
  v_bill app_private.bills;
  v_line jsonb;
  v_ids uuid[] := '{}';
  v_unavailable jsonb := '[]'::jsonb;
  v_changed jsonb := '[]'::jsonb;
  v_units integer := 0;
  v_total integer := 0;
  v_order_id uuid;
  v_number bigint;
  v_now timestamptz := now();
  v_item record;
  v_qty integer;
  v_note text;
  v_ticket_id uuid;
  v_station record;
  v_result_lines jsonb;
  v_revision bigint;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'lines', 'reason', 'empty'));
  end if;

  select * into v_rest from app_private.restaurants where id = p_rid and status = 'active';
  if v_rest.id is null then perform app_private.err('NOT_FOUND'); end if;

  -- Common lock order: member → settings → table → visit → bill → products (by id).
  if p_member_id is not null then
    perform 1 from app_private.restaurant_members where restaurant_id = p_rid and id = p_member_id and status = 'active' for share;
    if not found then perform app_private.err('FORBIDDEN'); end if;
  end if;
  select * into v_settings from app_private.restaurant_settings where restaurant_id = p_rid for share;
  perform app_private.lock_visit_and_bill(p_rid, p_visit_id);
  select * into v_visit from app_private.table_visits where restaurant_id = p_rid and id = p_visit_id;
  select * into v_bill from app_private.bills where restaurant_id = p_rid and visit_id = p_visit_id;

  if v_visit.status <> 'open' or v_bill.status <> 'open' then
    perform app_private.err('VISIT_NOT_OPEN', jsonb_build_object('visitStatus', v_visit.status, 'billStatus', v_bill.status));
  end if;
  if v_settings.ordering_mode <> 'open' then
    perform app_private.err('ORDERING_PAUSED', jsonb_build_object('orderingMode', v_settings.ordering_mode));
  end if;
  if jsonb_array_length(p_lines) > v_settings.max_items_per_order then
    perform app_private.err('LIMIT_EXCEEDED', jsonb_build_object('limit', 'lines', 'max', v_settings.max_items_per_order));
  end if;

  -- Strict line schema.
  for v_line in select * from jsonb_array_elements(p_lines) loop
    perform app_private.assert_keys(v_line, array['itemId','quantity','note','expectedItemVersion','expectedPriceCents']);
    if jsonb_typeof(v_line->'itemId') <> 'string' or jsonb_typeof(v_line->'quantity') <> 'number'
       or jsonb_typeof(v_line->'expectedItemVersion') <> 'number' or jsonb_typeof(v_line->'expectedPriceCents') <> 'number' then
      perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'lines', 'reason', 'types'));
    end if;
    v_qty := (v_line->>'quantity')::numeric;
    if (v_line->>'quantity')::numeric <> v_qty or v_qty < 1 or v_qty > 10 then
      perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'quantity', 'reason', 'range_1_10'));
    end if;
    perform app_private.clean_text(v_line->>'note', 160);
    v_ids := v_ids || (v_line->>'itemId')::uuid;
    v_units := v_units + v_qty;
  end loop;
  if v_units > v_settings.max_units_per_order then
    perform app_private.err('LIMIT_EXCEEDED', jsonb_build_object('limit', 'units', 'max', v_settings.max_units_per_order));
  end if;

  -- Lock products in UUID order (FOR SHARE blocks concurrent price/availability edits).
  perform 1 from app_private.menu_items where restaurant_id = p_rid and id = any(v_ids) order by id for share;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    select mi.id, mi.name, mi.price_cents, mi.version, mi.is_available, mi.is_visible, mi.archived_at,
           c.is_visible as cat_visible, c.archived_at as cat_archived, s.active as station_active
      into v_item
      from app_private.menu_items mi
      join app_private.categories c on c.restaurant_id = mi.restaurant_id and c.id = mi.category_id
      join app_private.stations s on s.restaurant_id = mi.restaurant_id and s.id = mi.station_id
     where mi.restaurant_id = p_rid and mi.id = (v_line->>'itemId')::uuid;
    if v_item.id is null then
      v_unavailable := v_unavailable || jsonb_build_object('itemId', v_line->>'itemId', 'reason', 'not_found');
    elsif not v_item.is_available or not v_item.is_visible or v_item.archived_at is not null
       or not v_item.cat_visible or v_item.cat_archived is not null or not v_item.station_active then
      v_unavailable := v_unavailable || jsonb_build_object('itemId', v_item.id, 'name', v_item.name, 'reason', 'unavailable');
    elsif v_item.price_cents <> (v_line->>'expectedPriceCents')::integer
       or v_item.version <> (v_line->>'expectedItemVersion')::integer then
      v_changed := v_changed || jsonb_build_object('itemId', v_item.id, 'name', v_item.name,
        'expectedPriceCents', (v_line->>'expectedPriceCents')::integer, 'currentPriceCents', v_item.price_cents,
        'currentVersion', v_item.version);
    else
      v_total := v_total + v_item.price_cents * (v_line->>'quantity')::integer;
    end if;
  end loop;
  if jsonb_array_length(v_unavailable) > 0 then
    perform app_private.err('ITEM_UNAVAILABLE', jsonb_build_object('lines', v_unavailable, 'changed', v_changed));
  end if;
  if jsonb_array_length(v_changed) > 0 then
    perform app_private.err('PRICE_CHANGED', jsonb_build_object('lines', v_changed));
  end if;
  if v_total > v_settings.max_order_cents then
    perform app_private.err('LIMIT_EXCEEDED', jsonb_build_object('limit', 'amount', 'max', v_settings.max_order_cents));
  end if;
  if app_private.bill_open_total(p_rid, p_visit_id) + v_total > 10000000 then
    perform app_private.err('LIMIT_EXCEEDED', jsonb_build_object('limit', 'bill'));
  end if;

  insert into app_private.tenant_counters(restaurant_id, counter_key, value) values (p_rid, 'order_number', 1)
  on conflict (restaurant_id, counter_key) do update set value = app_private.tenant_counters.value + 1
  returning value into v_number;

  insert into app_private.orders(restaurant_id, visit_id, guest_session_id, created_by_member_id, source,
    order_number, submitted_at, business_date, assisted_reason)
  values (p_rid, p_visit_id, p_guest_id, p_member_id,
    case when p_guest_id is not null then 'guest' else 'staff' end,
    v_number, v_now, app_private.business_date(v_now, v_rest.timezone, v_rest.business_day_start),
    app_private.clean_text(p_assisted_reason, 160))
  returning id into v_order_id;

  for v_station in
    select distinct s.id, s.sort_order
      from jsonb_array_elements(p_lines) l
      join app_private.menu_items mi on mi.restaurant_id = p_rid and mi.id = (l->>'itemId')::uuid
      join app_private.stations s on s.restaurant_id = p_rid and s.id = mi.station_id
     order by s.sort_order, s.id
  loop
    insert into app_private.station_tickets(restaurant_id, order_id, station_id, created_at)
    values (p_rid, v_order_id, v_station.id, v_now) returning id into v_ticket_id;

    insert into app_private.order_items(restaurant_id, order_id, ticket_id, menu_item_id, station_id_snapshot,
      product_name_snapshot, unit_price_cents, quantity, customer_note, allergen_codes_snapshot, status, created_at)
    select p_rid, v_order_id, v_ticket_id, mi.id, mi.station_id, mi.name, mi.price_cents,
           (l.value->>'quantity')::integer, app_private.clean_text(l.value->>'note', 160), mi.allergen_codes, 'pending', v_now
      from jsonb_array_elements(p_lines) with ordinality as l(value, ord)
      join app_private.menu_items mi on mi.restaurant_id = p_rid and mi.id = (l.value->>'itemId')::uuid
     where mi.station_id = v_station.id
     order by l.ord;
  end loop;

  v_revision := app_private.bump_visit(p_rid, p_visit_id);
  perform app_private.bump_bill(p_rid, p_visit_id);
  perform app_private.emit(p_rid, 'order', v_order_id, 'order.submitted', p_member_id, p_guest_id,
    null, 'new', null, v_order_id, p_visit_id,
    jsonb_build_object('lines', jsonb_array_length(p_lines), 'units', v_units, 'totalCents', v_total,
      'source', case when p_guest_id is not null then 'guest' else 'staff' end), v_now);
  perform app_private.invalidate(p_rid, array['orders','tables','bills'], array['floor','kitchen','bar','cashier']);

  select jsonb_agg(jsonb_build_object('id', oi.id, 'name', oi.product_name_snapshot, 'quantity', oi.quantity,
           'unitPriceCents', oi.unit_price_cents, 'lineTotalCents', oi.quantity * oi.unit_price_cents,
           'status', oi.status, 'note', oi.customer_note) order by oi.created_at, oi.id)
    into v_result_lines
    from app_private.order_items oi where oi.restaurant_id = p_rid and oi.order_id = v_order_id;

  return jsonb_build_object(
    'order', jsonb_build_object('id', v_order_id, 'number', v_number, 'submittedAt', v_now,
      'totalCents', v_total, 'status', 'new', 'lines', v_result_lines),
    'visitRevision', v_revision,
    'billTotalCents', app_private.bill_open_total(p_rid, p_visit_id));
end $$;

-- ---------------------------------------------------------------------
-- Service calls
-- ---------------------------------------------------------------------
create or replace function app_private.call_dto(c app_private.service_calls)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'type', c.type, 'status', c.status, 'createdAt', c.created_at,
    'claimedAt', c.claimed_at, 'completedAt', c.completed_at, 'version', c.version,
    'claimedBy', (select m.display_name from app_private.restaurant_members m
                   where m.restaurant_id = c.restaurant_id and m.id = c.claimed_by_member_id))
$$;

create or replace function app_private.create_call_core(p_rid uuid, p_visit_id uuid, p_type text,
  p_guest_id uuid, p_member_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_visit app_private.table_visits;
  v_call app_private.service_calls;
begin
  if p_type not in ('service','cutlery','help') then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'type'));
  end if;
  select * into v_visit from app_private.table_visits where restaurant_id = p_rid and id = p_visit_id for update;
  if v_visit.id is null then perform app_private.err('NOT_FOUND'); end if;
  if v_visit.status not in ('open','billing') then perform app_private.err('VISIT_CLOSED'); end if;

  select * into v_call from app_private.service_calls
   where restaurant_id = p_rid and visit_id = p_visit_id and type = p_type and status in ('new','claimed');
  if v_call.id is not null then
    return jsonb_build_object('call', app_private.call_dto(v_call), 'existing', true);
  end if;

  if p_guest_id is not null then
    -- 1 per 20 s per session; 6/min per visit (only for genuinely new calls).
    perform app_private.rate_limit_or_raise('call:s:' || p_guest_id, 20, 1);
    perform app_private.rate_limit_or_raise('call:v:' || p_visit_id, 60, 6);
  end if;

  insert into app_private.service_calls(restaurant_id, visit_id, type, status, created_by_guest_id, created_by_member_id)
  values (p_rid, p_visit_id, p_type, 'new', p_guest_id, p_member_id)
  returning * into v_call;
  perform app_private.bump_visit(p_rid, p_visit_id);
  perform app_private.emit(p_rid, 'service_call', v_call.id, 'call.created', p_member_id, p_guest_id,
    null, 'new', null, null, p_visit_id, jsonb_build_object('type', p_type));
  perform app_private.invalidate(p_rid, array['calls','tables'], array['floor']);
  return jsonb_build_object('call', app_private.call_dto(v_call), 'existing', false);
end $$;

-- ---------------------------------------------------------------------
-- Bill request (guest and staff share it). Idempotent per cycle.
-- ---------------------------------------------------------------------
create or replace function app_private.bill_dto(p_rid uuid, p_bill_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', b.id, 'visitId', b.visit_id, 'status', b.status, 'version', b.version,
    'requestCycle', b.request_cycle, 'requestedAt', b.requested_at, 'settledAt', b.settled_at,
    'totalCents', case when b.status in ('settled','void') then coalesce(b.total_cents_snapshot, 0)
                       else app_private.bill_open_total(b.restaurant_id, b.visit_id) end,
    'pendingLines', (select count(*) from app_private.orders o
                       join app_private.order_items oi on oi.restaurant_id = o.restaurant_id and oi.order_id = o.id
                      where o.restaurant_id = b.restaurant_id and o.visit_id = b.visit_id
                        and oi.status not in ('delivered','cancelled')))
  from app_private.bills b where b.restaurant_id = p_rid and b.id = p_bill_id
$$;

create or replace function app_private.request_bill_core(p_rid uuid, p_visit_id uuid, p_guest_id uuid, p_member_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_visit app_private.table_visits;
  v_bill app_private.bills;
  v_call app_private.service_calls;
begin
  perform app_private.lock_visit_and_bill(p_rid, p_visit_id);
  select * into v_visit from app_private.table_visits where restaurant_id = p_rid and id = p_visit_id;
  select * into v_bill from app_private.bills where restaurant_id = p_rid and visit_id = p_visit_id;
  if v_visit.status = 'closed' or v_bill.status in ('settled','void') then
    perform app_private.err('VISIT_CLOSED');
  end if;
  if v_bill.status = 'requested' then
    select * into v_call from app_private.service_calls
     where restaurant_id = p_rid and visit_id = p_visit_id and type = 'bill' and bill_request_cycle = v_bill.request_cycle;
    return jsonb_build_object('bill', app_private.bill_dto(p_rid, v_bill.id),
      'call', case when v_call.id is null then null else app_private.call_dto(v_call) end, 'existing', true);
  end if;

  update app_private.bills set status = 'requested', request_cycle = request_cycle + 1,
         requested_at = now(), version = version + 1
   where restaurant_id = p_rid and id = v_bill.id returning * into v_bill;
  update app_private.table_visits set status = 'billing', revision = revision + 1
   where restaurant_id = p_rid and id = p_visit_id;
  insert into app_private.service_calls(restaurant_id, visit_id, type, status, created_by_guest_id,
    created_by_member_id, bill_request_cycle)
  values (p_rid, p_visit_id, 'bill', 'new', p_guest_id, p_member_id, v_bill.request_cycle)
  returning * into v_call;

  perform app_private.emit(p_rid, 'bill', v_bill.id, 'bill.requested', p_member_id, p_guest_id,
    'open', 'requested', null, null, p_visit_id, jsonb_build_object('cycle', v_bill.request_cycle));
  perform app_private.emit(p_rid, 'visit', p_visit_id, 'visit.billing', p_member_id, p_guest_id,
    'open', 'billing', null, null, p_visit_id);
  perform app_private.emit(p_rid, 'service_call', v_call.id, 'call.created', p_member_id, p_guest_id,
    null, 'new', null, null, p_visit_id, jsonb_build_object('type', 'bill'));
  perform app_private.invalidate(p_rid, array['bills','calls','tables'], array['floor','cashier']);
  return jsonb_build_object('bill', app_private.bill_dto(p_rid, v_bill.id), 'call', app_private.call_dto(v_call), 'existing', false);
end $$;
