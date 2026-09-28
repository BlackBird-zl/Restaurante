-- =====================================================================
-- restaurant-os · 0400 · Public site RPCs (site_*) and table guest RPCs (guest_*)
-- site_*  : anon + authenticated, published data only.
-- guest_* : service_role only (called by the app server with verified secrets).
-- =====================================================================

create or replace function app_private.media_dto(p_rid uuid, p_media_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when a.id is null then null else jsonb_build_object(
    'id', a.id, 'key', a.storage_key, 'alt', a.alt_text, 'width', a.width, 'height', a.height,
    'focalX', a.focal_x, 'focalY', a.focal_y, 'sourceType', a.source_type, 'visibility', a.visibility,
    'mime', a.mime_type,
    'variants', coalesce((select jsonb_agg(jsonb_build_object('role', v.role, 'key', v.storage_key, 'mime', v.mime_type,
                  'width', v.width, 'height', v.height, 'bytes', v.bytes) order by v.role, v.width desc)
                from app_private.media_variants v where v.restaurant_id = a.restaurant_id and v.media_id = a.id), '[]'::jsonb))
  end
  from (select 1) x
  left join app_private.media_assets a on a.restaurant_id = p_rid and a.id = p_media_id
       and a.archived_at is null and a.visibility = 'public' and a.approved_at is not null
$$;

create or replace function app_private.item_cover(p_rid uuid, p_item_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select app_private.media_dto(p_rid, (select mim.media_id from app_private.menu_item_media mim
     where mim.restaurant_id = p_rid and mim.menu_item_id = p_item_id and mim.is_cover limit 1))
$$;

create or replace function app_private.menu_dto(p_rid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name,
        'description', c.description, 'sortOrder', c.sort_order) order by c.sort_order, c.name)
      from app_private.categories c
     where c.restaurant_id = p_rid and c.is_visible and c.archived_at is null), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', mi.id, 'slug', mi.slug, 'categoryId', mi.category_id, 'categorySlug', c.slug, 'name', mi.name,
        'description', mi.description, 'ingredients', mi.ingredients_text, 'allergens', to_jsonb(mi.allergen_codes),
        'isVegetarian', mi.is_vegetarian, 'containsAlcohol', mi.contains_alcohol, 'priceCents', mi.price_cents,
        'isAvailable', (mi.is_available and s.active), 'version', mi.version, 'sortOrder', mi.sort_order,
        'cover', app_private.item_cover(p_rid, mi.id)) order by c.sort_order, mi.sort_order, mi.name)
      from app_private.menu_items mi
      join app_private.categories c on c.restaurant_id = mi.restaurant_id and c.id = mi.category_id
      join app_private.stations s on s.restaurant_id = mi.restaurant_id and s.id = mi.station_id
     where mi.restaurant_id = p_rid and mi.is_visible and mi.archived_at is null
       and c.is_visible and c.archived_at is null), '[]'::jsonb))
$$;

create or replace function app_private.site_dto(p_rid uuid, p_draft boolean)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'restaurant', jsonb_build_object('id', r.id, 'slug', r.slug, 'name', r.name, 'isDemo', r.is_demo,
       'timezone', r.timezone, 'businessDayStart', to_char(r.business_day_start, 'HH24:MI'),
       'primaryHost', (select d.hostname from app_private.restaurant_domains d
                        where d.restaurant_id = r.id and d.is_primary and d.status = 'active')),
    'theme', jsonb_build_object('preset', t.preset,
       'tokens', case when p_draft then t.draft_tokens else t.published_tokens end, 'version', t.version),
    'pages', coalesce((select jsonb_object_agg(p.page_key, case when p_draft then p.draft else p.published end)
        from app_private.site_pages p where p.restaurant_id = r.id
         and (p_draft or p.published is not null)), '{}'::jsonb),
    'settings', jsonb_build_object('orderingMode', s.ordering_mode, 'publicContacts', s.public_contacts,
       'weeklyHours', s.weekly_hours, 'reservationRules', s.reservation_rules),
    'media', coalesce((select jsonb_object_agg(a.id, app_private.media_dto(r.id, a.id))
        from app_private.media_assets a where a.restaurant_id = r.id and a.archived_at is null
         and a.visibility = 'public' and a.approved_at is not null and a.purpose <> 'product'), '{}'::jsonb))
  from app_private.restaurants r
  join app_private.restaurant_themes t on t.restaurant_id = r.id
  join app_private.restaurant_settings s on s.restaurant_id = r.id
  where r.id = p_rid and r.status = 'active'
$$;

-- ---------------------------------------------------------------------
-- site_* RPCs
-- ---------------------------------------------------------------------
create or replace function public.site_resolve_host(p_hostname text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('restaurantId', r.id, 'slug', r.slug, 'name', r.name, 'isDemo', r.is_demo,
      'isPrimary', d.is_primary,
      'primaryHost', (select p.hostname from app_private.restaurant_domains p
                       where p.restaurant_id = r.id and p.is_primary and p.status = 'active'))
    from app_private.restaurant_domains d
    join app_private.restaurants r on r.id = d.restaurant_id and r.status = 'active'
   where d.hostname = lower(p_hostname) and d.status = 'active'
$$;

-- Preview/local mode (/d/{slug}); only active tenants. Public information only.
create or replace function public.site_resolve_slug(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('restaurantId', r.id, 'slug', r.slug, 'name', r.name, 'isDemo', r.is_demo,
      'primaryHost', (select p.hostname from app_private.restaurant_domains p
                       where p.restaurant_id = r.id and p.is_primary and p.status = 'active'))
    from app_private.restaurants r where r.slug = lower(p_slug) and r.status = 'active'
$$;

create or replace function public.site_get_site(p_restaurant_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select app_private.site_dto(p_restaurant_id, false)
$$;

create or replace function public.site_get_menu(p_restaurant_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from app_private.restaurants where id = p_restaurant_id and status = 'active')
    then app_private.menu_dto(p_restaurant_id) else null end
$$;

-- Whether a table label exists (for "Leia o QR da mesa para pedir"). Never reveals occupancy.
create or replace function public.site_get_table(p_restaurant_id uuid, p_public_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('label', t.label, 'publicSlug', t.public_slug)
    from app_private.dining_tables t
    join app_private.restaurants r on r.id = t.restaurant_id and r.status = 'active'
   where t.restaurant_id = p_restaurant_id and t.public_slug = lower(p_public_slug)
     and t.active and t.archived_at is null
$$;

-- ---------------------------------------------------------------------
-- Guest context
-- ---------------------------------------------------------------------
create type app_private.guest_context as (
  restaurant_id uuid, session_id uuid, public_id uuid, visit_id uuid, visit_status text,
  table_id uuid, table_label text, qr_code_id uuid, expires_at timestamptz);

create or replace function app_private.guest_ctx(p_rid uuid, p_session_hash text)
returns app_private.guest_context language plpgsql volatile security definer set search_path = '' as $$
declare c app_private.guest_context; v_revoked timestamptz;
begin
  select gs.restaurant_id, gs.id, gs.public_id, v.id, v.status, t.id, t.label, gs.qr_code_id, gs.expires_at, gs.revoked_at
    into c.restaurant_id, c.session_id, c.public_id, c.visit_id, c.visit_status, c.table_id, c.table_label,
         c.qr_code_id, c.expires_at, v_revoked
    from app_private.guest_sessions gs
    join app_private.table_visits v on v.restaurant_id = gs.restaurant_id and v.id = gs.visit_id
    join app_private.dining_tables t on t.restaurant_id = v.restaurant_id and t.id = v.table_id
    join app_private.restaurants r on r.id = gs.restaurant_id and r.status = 'active'
   where gs.restaurant_id = p_rid and gs.token_hash = p_session_hash;
  if c.session_id is null then perform app_private.err('GUEST_SESSION_EXPIRED'); end if;
  if c.visit_status = 'closed' then perform app_private.err('VISIT_CLOSED'); end if;
  if v_revoked is not null or c.expires_at <= now() then perform app_private.err('GUEST_SESSION_EXPIRED'); end if;
  return c;
end $$;

-- Resolve QR token hash (bootstrap). Failures count against the IP bucket.
create or replace function public.guest_resolve_qr(p_restaurant_id uuid, p_token_hash text, p_ip_hash text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare r record;
begin
  if app_private.rate_hit('qr:' || p_restaurant_id || ':' || coalesce(p_ip_hash, '-'), 60) > 30 then
    return jsonb_build_object('ok', false, 'error', 'RATE_LIMITED', 'retryAfterSeconds', app_private.retry_after(60));
  end if;
  select q.id, q.status, t.label, t.public_slug, t.active and t.archived_at is null as table_active
    into r
    from app_private.qr_codes q
    join app_private.dining_tables t on t.restaurant_id = q.restaurant_id and t.id = q.table_id
    join app_private.restaurants rr on rr.id = q.restaurant_id and rr.status = 'active'
   where q.restaurant_id = p_restaurant_id and q.token_hash = p_token_hash;
  if r.id is null then return jsonb_build_object('ok', false, 'error', 'QR_INVALID'); end if;
  if r.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'QR_REVOKED'); end if;
  if not r.table_active then return jsonb_build_object('ok', false, 'error', 'TABLE_INACTIVE'); end if;
  return jsonb_build_object('ok', true, 'qrId', r.id, 'tableLabel', r.label, 'tablePublicSlug', r.public_slug);
end $$;

-- Table status for a verified QR context (only whether this table can be joined now).
create or replace function public.guest_qr_context(p_restaurant_id uuid, p_qr_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('ok', true, 'qrActive', q.status = 'active' and t.active and t.archived_at is null,
      'tableLabel', t.label, 'tablePublicSlug', t.public_slug,
      'visitState', coalesce((select v.status from app_private.table_visits v
          where v.restaurant_id = q.restaurant_id and v.table_id = q.table_id and v.status in ('open','billing')), 'none'))
    from app_private.qr_codes q
    join app_private.dining_tables t on t.restaurant_id = q.restaurant_id and t.id = q.table_id
   where q.restaurant_id = p_restaurant_id and q.id = p_qr_id
$$;

create or replace function public.guest_join_visit(p_restaurant_id uuid, p_qr_id uuid, p_context_nonce text,
  p_code_digest text, p_session_hash text, p_ip_hash text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_qr record;
  v_visit app_private.table_visits;
  v_ctx_key text := 'join:ctx:' || p_restaurant_id || ':' || p_qr_id || ':' || coalesce(p_context_nonce, '-');
  v_ip_key text := 'join:ip:' || p_restaurant_id || ':' || coalesce(p_ip_hash, '-');
  v_session app_private.guest_sessions;
begin
  if app_private.rate_peek(v_ctx_key, 600) >= 5 or app_private.rate_peek(v_ip_key, 600) >= 30 then
    return jsonb_build_object('ok', false, 'error', 'RATE_LIMITED', 'retryAfterSeconds', app_private.retry_after(600));
  end if;
  select q.id, q.table_id, q.status, t.label, t.active and t.archived_at is null as table_active into v_qr
    from app_private.qr_codes q
    join app_private.dining_tables t on t.restaurant_id = q.restaurant_id and t.id = q.table_id
    join app_private.restaurants r on r.id = q.restaurant_id and r.status = 'active'
   where q.restaurant_id = p_restaurant_id and q.id = p_qr_id;
  if v_qr.id is null or v_qr.status <> 'active' or not v_qr.table_active then
    return jsonb_build_object('ok', false, 'error', 'QR_REVOKED');
  end if;
  select * into v_visit from app_private.table_visits
   where restaurant_id = p_restaurant_id and table_id = v_qr.table_id and status in ('open','billing') for update;
  if v_visit.id is null then
    return jsonb_build_object('ok', false, 'error', 'NO_OPEN_VISIT');
  end if;
  if v_visit.join_code_digest <> p_code_digest or v_visit.join_code_expires_at <= now() then
    perform app_private.rate_hit(v_ctx_key, 600);
    perform app_private.rate_hit(v_ip_key, 600);
    return jsonb_build_object('ok', false, 'error',
      case when v_visit.join_code_digest = p_code_digest then 'CODE_EXPIRED' else 'INVALID_CODE' end,
      'attemptsLeft', greatest(0, 5 - app_private.rate_peek(v_ctx_key, 600)));
  end if;
  if v_visit.status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'VISIT_NOT_OPEN');
  end if;
  if (select count(*) from app_private.guest_sessions where restaurant_id = p_restaurant_id and visit_id = v_visit.id
        and created_at > now() - interval '1 hour') >= 20 then
    return jsonb_build_object('ok', false, 'error', 'RATE_LIMITED', 'retryAfterSeconds', 600);
  end if;
  insert into app_private.guest_sessions(restaurant_id, visit_id, qr_code_id, token_hash, expires_at)
  values (p_restaurant_id, v_visit.id, v_qr.id, p_session_hash, now() + interval '12 hours')
  returning * into v_session;
  perform app_private.emit(p_restaurant_id, 'visit', v_visit.id, 'visit.guest_joined', null, v_session.id,
    null, null, null, null, v_visit.id);
  perform app_private.invalidate(p_restaurant_id, array['tables'], array['floor']);
  return jsonb_build_object('ok', true, 'sessionPublicId', v_session.public_id, 'visitId', v_visit.id,
    'tableLabel', v_qr.label, 'expiresAt', v_session.expires_at);
end $$;

create or replace function public.guest_get_snapshot(p_restaurant_id uuid, p_session_hash text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.guest_context;
  v_visit app_private.table_visits;
  v_bill app_private.bills;
begin
  begin
    c := app_private.guest_ctx(p_restaurant_id, p_session_hash);
  exception when sqlstate 'P0001' then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
  end;
  if app_private.rate_hit('poll:' || c.session_id, 60) > 40 then
    return jsonb_build_object('ok', false, 'error', 'RATE_LIMITED', 'retryAfterSeconds', app_private.retry_after(60));
  end if;
  update app_private.guest_sessions set last_seen_at = now()
   where restaurant_id = p_restaurant_id and id = c.session_id
     and (last_seen_at is null or last_seen_at < now() - interval '30 seconds');
  select * into v_visit from app_private.table_visits where restaurant_id = p_restaurant_id and id = c.visit_id;
  select * into v_bill from app_private.bills where restaurant_id = p_restaurant_id and visit_id = c.visit_id;
  return jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'table', jsonb_build_object('label', c.table_label),
    'session', jsonb_build_object('publicId', c.public_id, 'expiresAt', c.expires_at),
    'visit', jsonb_build_object('id', v_visit.id, 'status', v_visit.status, 'revision', v_visit.revision),
    'orderingMode', (select ordering_mode from app_private.restaurant_settings where restaurant_id = p_restaurant_id),
    'bill', jsonb_build_object('status', v_bill.status, 'requestCycle', v_bill.request_cycle,
       'totalCents', app_private.bill_open_total(p_restaurant_id, c.visit_id)),
    'orders', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'number', o.order_number,
         'submittedAt', o.submitted_at, 'mine', o.guest_session_id = c.session_id,
         'status', app_private.order_status(array(select oi.status from app_private.order_items oi
                     where oi.restaurant_id = o.restaurant_id and oi.order_id = o.id)),
         'lines', (select jsonb_agg(jsonb_build_object('id', oi.id, 'name', oi.product_name_snapshot,
                     'quantity', oi.quantity, 'unitPriceCents', oi.unit_price_cents, 'status', oi.status,
                     'note', case when o.guest_session_id = c.session_id then oi.customer_note else null end)
                     order by oi.created_at, oi.id)
                   from app_private.order_items oi where oi.restaurant_id = o.restaurant_id and oi.order_id = o.id))
         order by o.submitted_at, o.order_number)
       from app_private.orders o where o.restaurant_id = p_restaurant_id and o.visit_id = c.visit_id), '[]'::jsonb),
    'calls', coalesce((select jsonb_agg(jsonb_build_object('id', sc.id, 'type', sc.type, 'status', sc.status,
         'createdAt', sc.created_at, 'claimedAt', sc.claimed_at) order by sc.created_at)
       from app_private.service_calls sc where sc.restaurant_id = p_restaurant_id and sc.visit_id = c.visit_id
        and (sc.status in ('new','claimed') or sc.completed_at > now() - interval '10 minutes')), '[]'::jsonb),
    'serverTime', now()));
end $$;

create or replace function public.guest_create_order(p_restaurant_id uuid, p_session_hash text, p_lines jsonb,
  p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.guest_context;
  v_replay jsonb;
  v_result jsonb;
  v_payload jsonb := jsonb_build_object('lines', p_lines);
begin
  c := app_private.guest_ctx(p_restaurant_id, p_session_hash);
  v_replay := app_private.idem_lookup(p_restaurant_id, 'guest:' || c.session_id, 'create_order', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  perform app_private.rate_limit_or_raise('order:s:' || c.session_id, 60, 3);
  perform app_private.rate_limit_or_raise('order:v:' || c.visit_id, 60, 30);
  v_result := app_private.create_order_core(p_restaurant_id, c.visit_id, c.session_id, null, p_lines, null);
  return app_private.idem_store(p_restaurant_id, 'guest:' || c.session_id, 'create_order', p_idempotency_key,
    v_payload, (v_result->'order'->>'id')::uuid, 201, v_result);
end $$;

create or replace function public.guest_create_call(p_restaurant_id uuid, p_session_hash text, p_type text,
  p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.guest_context;
  v_replay jsonb;
  v_result jsonb;
  v_payload jsonb := jsonb_build_object('type', p_type);
begin
  c := app_private.guest_ctx(p_restaurant_id, p_session_hash);
  v_replay := app_private.idem_lookup(p_restaurant_id, 'guest:' || c.session_id, 'create_call', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  v_result := app_private.create_call_core(p_restaurant_id, c.visit_id, p_type, c.session_id, null);
  return app_private.idem_store(p_restaurant_id, 'guest:' || c.session_id, 'create_call', p_idempotency_key,
    v_payload, (v_result->'call'->>'id')::uuid, 201, v_result);
end $$;

create or replace function public.guest_request_bill(p_restaurant_id uuid, p_session_hash text, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.guest_context;
  v_result jsonb;
  v_replay jsonb;
begin
  c := app_private.guest_ctx(p_restaurant_id, p_session_hash);
  v_replay := app_private.idem_lookup(p_restaurant_id, 'guest:' || c.session_id, 'request_bill', p_idempotency_key, '{}'::jsonb);
  if v_replay is not null then return v_replay; end if;
  v_result := app_private.request_bill_core(p_restaurant_id, c.visit_id, c.session_id, null);
  return app_private.idem_store(p_restaurant_id, 'guest:' || c.session_id, 'request_bill', p_idempotency_key,
    '{}'::jsonb, (v_result->'bill'->>'id')::uuid, 200, v_result);
end $$;

-- ---------------------------------------------------------------------
-- Public reservation request (human confirmation; no automatic seat)
-- ---------------------------------------------------------------------
create or replace function app_private.local_ts_to_utc(p_local timestamp, p_tz text)
returns timestamptz language plpgsql stable set search_path = '' as $$
declare v timestamptz := p_local at time zone p_tz;
begin
  -- Nonexistent local time (spring forward gap): round-trip differs.
  if (v at time zone p_tz) <> p_local then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'time', 'reason', 'nonexistent_local_time'));
  end if;
  -- Ambiguous local time (fall back overlap): another instant maps to the same wall time.
  if ((v + interval '1 hour') at time zone p_tz) = p_local or ((v - interval '1 hour') at time zone p_tz) = p_local then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'time', 'reason', 'ambiguous_local_time'));
  end if;
  return v;
end $$;

create or replace function app_private.reservation_slot_ok(p_rid uuid, p_local timestamp)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_hours jsonb;
  v_day text := (array['sun','mon','tue','wed','thu','fri','sat'])[extract(dow from p_local)::int + 1];
  v_win jsonb;
  v_t time := p_local::time;
begin
  select weekly_hours into v_hours from app_private.restaurant_settings where restaurant_id = p_rid;
  if extract(minute from p_local)::int not in (0, 30) or extract(second from p_local) <> 0 then return false; end if;
  for v_win in select * from jsonb_array_elements(coalesce(v_hours->v_day, '[]'::jsonb)) loop
    if v_t >= (v_win->>0)::time and v_t <= (v_win->>1)::time - interval '60 minutes' then
      return true;
    end if;
  end loop;
  return false;
end $$;

create or replace function public.guest_create_reservation(p_restaurant_id uuid, p_payload jsonb,
  p_idempotency_key uuid, p_ip_hash text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_rest app_private.restaurants;
  v_replay jsonb;
  v_local timestamp;
  v_utc timestamptz;
  v_name text; v_email text; v_phone text; v_note text; v_size integer;
  v_ref text;
  v_id uuid;
  v_result jsonb;
begin
  select * into v_rest from app_private.restaurants where id = p_restaurant_id and status = 'active';
  if v_rest.id is null then perform app_private.err('NOT_FOUND'); end if;
  perform app_private.assert_keys(p_payload, array['name','email','phone','date','time','partySize','note']);
  v_replay := app_private.idem_lookup(p_restaurant_id, 'public-reservation', 'create_reservation', p_idempotency_key, p_payload);
  if v_replay is not null then return v_replay; end if;
  perform app_private.rate_limit_or_raise('resv:' || p_restaurant_id || ':' || coalesce(p_ip_hash, '-'), 3600, 3);

  v_name := app_private.clean_text(p_payload->>'name', 80);
  if v_name is null or char_length(v_name) < 2 then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'name'));
  end if;
  v_email := lower(app_private.clean_text(p_payload->>'email', 160));
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'email'));
  end if;
  v_phone := regexp_replace(coalesce(p_payload->>'phone', ''), '[\s().-]', '', 'g');
  if v_phone = '' then v_phone := null; end if;
  if v_phone is not null and v_phone !~ '^\+?[0-9]{6,15}$' then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'phone'));
  end if;
  if v_email is null and v_phone is null then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'contact', 'reason', 'required'));
  end if;
  begin
    v_size := (p_payload->>'partySize')::integer;
    v_local := ((p_payload->>'date') || ' ' || (p_payload->>'time'))::timestamp;
  exception when others then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'date'));
  end;
  if v_size is null or v_size < 1 or v_size > 12 then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'partySize'));
  end if;
  v_note := app_private.clean_text(p_payload->>'note', 300);
  v_utc := app_private.local_ts_to_utc(v_local, v_rest.timezone);
  if v_utc < now() + interval '2 hours' then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'date', 'reason', 'min_lead_2h'));
  end if;
  if v_local::date > (now() at time zone v_rest.timezone)::date + 90 then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'date', 'reason', 'max_90_days'));
  end if;
  if not app_private.reservation_slot_ok(p_restaurant_id, v_local) then
    perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'time', 'reason', 'outside_hours'));
  end if;

  loop
    v_ref := app_private.random_reference();
    exit when not exists (select 1 from app_private.reservations where restaurant_id = p_restaurant_id and reference = v_ref);
  end loop;
  insert into app_private.reservations(restaurant_id, reference, name, email, phone, party_size,
    requested_at_local, scheduled_at, note)
  values (p_restaurant_id, v_ref, v_name, v_email, v_phone, v_size, v_local, v_utc, v_note)
  returning id into v_id;
  perform app_private.emit(p_restaurant_id, 'reservation', v_id, 'reservation.requested', null, null,
    null, 'pending', null, null, null, jsonb_build_object('partySize', v_size));
  perform app_private.invalidate(p_restaurant_id, array['reservations'], array['floor']);
  v_result := jsonb_build_object('reservation', jsonb_build_object('reference', v_ref, 'status', 'pending'));
  return app_private.idem_store(p_restaurant_id, 'public-reservation', 'create_reservation', p_idempotency_key,
    p_payload, v_id, 201, v_result);
end $$;
