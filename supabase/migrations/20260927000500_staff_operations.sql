-- =====================================================================
-- restaurant-os · 0500 · Staff operational RPCs (salão, cozinha, bar, caixa)
-- Every function: auth.uid() → active membership → role check → tenant-scoped queries.
-- =====================================================================

-- Memberships of the current user (for /restaurantes) and pending invitations.
create or replace function public.staff_list_memberships()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_email text;
begin
  if v_uid is null then perform app_private.err('AUTH_REQUIRED'); end if;
  select lower(email) into v_email from auth.users where id = v_uid and email_confirmed_at is not null;
  return jsonb_build_object(
    'memberships', coalesce((select jsonb_agg(jsonb_build_object('slug', r.slug, 'name', r.name,
        'memberId', m.id, 'displayName', m.display_name, 'isOwner', r.owner_user_id = v_uid,
        'roles', coalesce((select jsonb_agg(mr.role order by mr.role) from app_private.member_roles mr
                  where mr.restaurant_id = m.restaurant_id and mr.member_id = m.id), '[]'::jsonb)) order by r.name)
      from app_private.restaurant_members m
      join app_private.restaurants r on r.id = m.restaurant_id and r.status = 'active'
     where m.user_id = v_uid and m.status = 'active'), '[]'::jsonb),
    'invitations', coalesce((select jsonb_agg(jsonb_build_object('memberId', m.id, 'restaurantName', r.name,
        'slug', r.slug, 'displayName', m.display_name))
      from app_private.restaurant_members m
      join app_private.restaurants r on r.id = m.restaurant_id and r.status = 'active'
     where v_email is not null and m.status = 'invited' and m.invite_email = v_email), '[]'::jsonb));
end $$;

-- Only the authenticated owner of the invited email (confirmed by Auth) can accept.
create or replace function public.staff_accept_invitation(p_member_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_email text; v_member app_private.restaurant_members; v_slug text;
begin
  if v_uid is null then perform app_private.err('AUTH_REQUIRED'); end if;
  select lower(email) into v_email from auth.users where id = v_uid and email_confirmed_at is not null;
  select * into v_member from app_private.restaurant_members where id = p_member_id for update;
  if v_member.id is null or v_email is null or v_member.status <> 'invited' or v_member.invite_email <> v_email then
    perform app_private.err('NOT_FOUND');
  end if;
  if exists (select 1 from app_private.restaurant_members where restaurant_id = v_member.restaurant_id and user_id = v_uid) then
    perform app_private.err('CONFLICT', jsonb_build_object('reason', 'already_member'));
  end if;
  update app_private.restaurant_members set status = 'active', user_id = v_uid, accepted_at = now(), version = version + 1
   where id = p_member_id;
  insert into app_private.profiles(id, display_name) values (v_uid, v_member.display_name) on conflict (id) do nothing;
  perform app_private.emit(v_member.restaurant_id, 'member', p_member_id, 'member.accepted', p_member_id, null, 'invited', 'active');
  perform app_private.invalidate(v_member.restaurant_id, array['membership'], array[]::text[]);
  select slug into v_slug from app_private.restaurants where id = v_member.restaurant_id;
  return jsonb_build_object('slug', v_slug);
end $$;

-- Current member context for navigation (UI only; every RPC re-checks).
create or replace function public.staff_get_me(p_restaurant_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
begin
  return jsonb_build_object('restaurantId', c.restaurant_id, 'memberId', c.member_id, 'displayName', c.display_name,
    'roles', to_jsonb(c.roles), 'isOwner', c.is_owner,
    'restaurant', (select jsonb_build_object('slug', r.slug, 'name', r.name, 'isDemo', r.is_demo,
        'preset', t.preset, 'accent', t.published_tokens->'color'->>'accent', 'primaryHost',
        (select d.hostname from app_private.restaurant_domains d where d.restaurant_id = r.id and d.is_primary and d.status = 'active'))
      from app_private.restaurants r join app_private.restaurant_themes t on t.restaurant_id = r.id where r.id = c.restaurant_id),
    'stations', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'code', s.code, 'name', s.name, 'kind', s.kind,
        'assigned', exists (select 1 from app_private.member_stations ms where ms.restaurant_id = s.restaurant_id
                           and ms.station_id = s.id and ms.member_id = c.member_id)) order by s.sort_order)
      from app_private.stations s where s.restaurant_id = c.restaurant_id and s.active
       and (app_private.is_admin(c) or app_private.can_work_station(c, s.id))), '[]'::jsonb),
    'orderingMode', (select ordering_mode from app_private.restaurant_settings where restaurant_id = c.restaurant_id),
    'serverTime', now());
end $$;

-- ---------------------------------------------------------------------
-- Visits and join codes
-- ---------------------------------------------------------------------
create or replace function app_private.visit_dto(p_rid uuid, p_visit_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', v.id, 'tableId', v.table_id, 'tableLabel', t.label, 'status', v.status,
    'openedAt', v.opened_at, 'revision', v.revision, 'guestCount', v.guest_count,
    'joinCodeExpiresAt', v.join_code_expires_at, 'joinCodeGeneration', v.join_code_generation,
    'closedAt', v.closed_at)
  from app_private.table_visits v join app_private.dining_tables t on t.restaurant_id = v.restaurant_id and t.id = v.table_id
  where v.restaurant_id = p_rid and v.id = p_visit_id
$$;

create or replace function public.staff_open_visit(p_restaurant_slug text, p_table_id uuid, p_guest_count integer,
  p_code_digest text, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('tableId', p_table_id, 'guestCount', p_guest_count);
  v_replay jsonb;
  v_table app_private.dining_tables;
  v_visit app_private.table_visits;
  v_body jsonb;
begin
  perform app_private.require_role(c, array['floor','cashier']);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'open_visit', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  if p_code_digest !~ '^[0-9a-f]{64}$' then perform app_private.err('INVALID_INPUT', '{"field":"code"}'); end if;
  if p_guest_count is not null and (p_guest_count < 1 or p_guest_count > 60) then
    perform app_private.err('INVALID_INPUT', '{"field":"guestCount"}');
  end if;

  select * into v_table from app_private.dining_tables where restaurant_id = c.restaurant_id and id = p_table_id for update;
  if v_table.id is null then perform app_private.err('NOT_FOUND'); end if;
  if not v_table.active or v_table.archived_at is not null then perform app_private.err('TABLE_INACTIVE'); end if;

  select * into v_visit from app_private.table_visits
   where restaurant_id = c.restaurant_id and table_id = p_table_id and status in ('open','billing');
  if v_visit.id is not null then
    return jsonb_build_object('visit', app_private.visit_dto(c.restaurant_id, v_visit.id),
      'existing', true, 'joinCodeUnavailable', true);
  end if;

  insert into app_private.table_visits(restaurant_id, table_id, status, opened_by_member_id, guest_count,
    join_code_digest, join_code_expires_at)
  values (c.restaurant_id, p_table_id, 'open', c.member_id, p_guest_count, p_code_digest, now() + interval '4 hours')
  returning * into v_visit;
  insert into app_private.bills(restaurant_id, visit_id) values (c.restaurant_id, v_visit.id);
  perform app_private.emit(c.restaurant_id, 'visit', v_visit.id, 'visit.opened', c.member_id, null, null, 'open',
    null, null, v_visit.id, jsonb_build_object('table', v_table.label));
  perform app_private.invalidate(c.restaurant_id, array['tables'], array['floor','cashier']);

  v_body := jsonb_build_object('visit', app_private.visit_dto(c.restaurant_id, v_visit.id), 'existing', false,
    'joinCodeUnavailable', true);
  perform app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'open_visit', p_idempotency_key,
    v_payload, v_visit.id, 201, v_body);
  -- The plaintext code is only returned by the app server on this first response.
  return v_body || jsonb_build_object('joinCodeUnavailable', false, 'joinCodeIssued', true);
end $$;

create or replace function public.staff_rotate_join_code(p_restaurant_slug text, p_visit_id uuid,
  p_expected_revision bigint, p_code_digest text, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('visitId', p_visit_id, 'expectedRevision', p_expected_revision);
  v_replay jsonb;
  v_visit app_private.table_visits;
  v_body jsonb;
begin
  perform app_private.require_role(c, array['floor','cashier']);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'rotate_join_code', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  if p_code_digest !~ '^[0-9a-f]{64}$' then perform app_private.err('INVALID_INPUT', '{"field":"code"}'); end if;
  select * into v_visit from app_private.table_visits where restaurant_id = c.restaurant_id and id = p_visit_id for update;
  if v_visit.id is null then perform app_private.err('NOT_FOUND'); end if;
  if v_visit.status <> 'open' then perform app_private.err('VISIT_NOT_OPEN'); end if;
  if p_expected_revision is not null and v_visit.revision <> p_expected_revision then
    perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentRevision', v_visit.revision));
  end if;
  update app_private.table_visits set join_code_digest = p_code_digest, join_code_generation = join_code_generation + 1,
         join_code_expires_at = now() + interval '4 hours', revision = revision + 1
   where restaurant_id = c.restaurant_id and id = p_visit_id;
  perform app_private.emit(c.restaurant_id, 'visit', p_visit_id, 'visit.join_code_rotated', c.member_id, null,
    null, null, null, null, p_visit_id);
  v_body := jsonb_build_object('visit', app_private.visit_dto(c.restaurant_id, p_visit_id), 'joinCodeUnavailable', true);
  perform app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'rotate_join_code', p_idempotency_key,
    v_payload, p_visit_id, 200, v_body);
  return v_body || jsonb_build_object('joinCodeUnavailable', false, 'joinCodeIssued', true);
end $$;

create or replace function public.staff_revoke_guest_sessions(p_restaurant_slug text, p_visit_id uuid, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_replay jsonb; v_count integer; v_body jsonb;
begin
  perform app_private.require_role(c, array['floor','cashier']);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'revoke_sessions', p_idempotency_key,
    jsonb_build_object('visitId', p_visit_id));
  if v_replay is not null then return v_replay; end if;
  perform 1 from app_private.table_visits where restaurant_id = c.restaurant_id and id = p_visit_id for update;
  if not found then perform app_private.err('NOT_FOUND'); end if;
  update app_private.guest_sessions set revoked_at = now()
   where restaurant_id = c.restaurant_id and visit_id = p_visit_id and revoked_at is null;
  get diagnostics v_count = row_count;
  perform app_private.bump_visit(c.restaurant_id, p_visit_id);
  perform app_private.emit(c.restaurant_id, 'visit', p_visit_id, 'visit.sessions_revoked', c.member_id, null,
    null, null, null, null, p_visit_id, jsonb_build_object('count', v_count));
  v_body := jsonb_build_object('revoked', v_count);
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'revoke_sessions', p_idempotency_key,
    jsonb_build_object('visitId', p_visit_id), p_visit_id, 200, v_body);
end $$;

-- ---------------------------------------------------------------------
-- Assisted order (same engine as guest)
-- ---------------------------------------------------------------------
create or replace function public.staff_create_order(p_restaurant_slug text, p_visit_id uuid, p_lines jsonb,
  p_assisted_reason text, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('visitId', p_visit_id, 'lines', p_lines, 'reason', p_assisted_reason);
  v_replay jsonb; v_result jsonb;
begin
  perform app_private.require_role(c, array['floor','cashier']);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'create_order', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  if not exists (select 1 from app_private.table_visits where restaurant_id = c.restaurant_id and id = p_visit_id) then
    perform app_private.err('NOT_FOUND');
  end if;
  v_result := app_private.create_order_core(c.restaurant_id, p_visit_id, null, c.member_id, p_lines, p_assisted_reason);
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'create_order', p_idempotency_key,
    v_payload, (v_result->'order'->>'id')::uuid, 201, v_result);
end $$;

-- ---------------------------------------------------------------------
-- Line transitions (KDS and delivery), batch atomic
-- ---------------------------------------------------------------------
create or replace function public.staff_transition_items(p_restaurant_slug text, p_items jsonb, p_target text,
  p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('items', p_items, 'target', p_target);
  v_replay jsonb;
  v_ids uuid[];
  v_expected jsonb := '{}'::jsonb;
  v_conflicts jsonb := '[]'::jsonb;
  v_from text;
  r record;
  v_now timestamptz := now();
  v_visits uuid[];
  v_result jsonb;
  v_holder text;
begin
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'transition_items', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  if p_target not in ('preparing','ready','delivering','delivered') then
    perform app_private.err('INVALID_INPUT', '{"field":"targetState"}');
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    perform app_private.err('INVALID_INPUT', '{"field":"items","reason":"1_to_50"}');
  end if;
  select array_agg((e->>'id')::uuid order by (e->>'id')::uuid), jsonb_object_agg(e->>'id', (e->>'version')::int)
    into v_ids, v_expected from jsonb_array_elements(p_items) e;
  if array_length(v_ids, 1) <> (select count(distinct x) from unnest(v_ids) x) then
    perform app_private.err('INVALID_INPUT', '{"field":"items","reason":"duplicates"}');
  end if;
  v_from := case p_target when 'preparing' then 'pending' when 'ready' then 'preparing'
                          when 'delivering' then 'ready' else 'delivering' end;

  -- Lock in id order; verify every line before touching any.
  for r in select oi.*, o.visit_id from app_private.order_items oi
             join app_private.orders o on o.restaurant_id = oi.restaurant_id and o.id = oi.order_id
            where oi.restaurant_id = c.restaurant_id and oi.id = any(v_ids) order by oi.id for update of oi loop
    if p_target in ('preparing','ready') then
      if not app_private.can_work_station(c, r.station_id_snapshot) then perform app_private.err('FORBIDDEN'); end if;
    else
      perform app_private.require_role(c, array['floor']);
      if p_target = 'delivered' and r.delivery_member_id is distinct from c.member_id and r.status = 'delivering' then
        select display_name into v_holder from app_private.restaurant_members
         where restaurant_id = c.restaurant_id and id = r.delivery_member_id;
        perform app_private.err('ALREADY_CLAIMED', jsonb_build_object('itemId', r.id, 'holder', v_holder));
      end if;
    end if;
    if r.status <> v_from or r.version <> (v_expected->>r.id::text)::int then
      v_conflicts := v_conflicts || jsonb_build_object('id', r.id, 'currentStatus', r.status, 'currentVersion', r.version);
    end if;
  end loop;
  if (select count(*) from app_private.order_items where restaurant_id = c.restaurant_id and id = any(v_ids)) <> array_length(v_ids, 1) then
    perform app_private.err('NOT_FOUND');
  end if;
  if jsonb_array_length(v_conflicts) > 0 then
    perform app_private.err('VERSION_CONFLICT', jsonb_build_object('items', v_conflicts));
  end if;

  update app_private.order_items oi set status = p_target, version = oi.version + 1,
    prepared_started_at = case when p_target = 'preparing' then v_now else oi.prepared_started_at end,
    ready_at = case when p_target = 'ready' then v_now else oi.ready_at end,
    picked_up_at = case when p_target = 'delivering' then v_now else oi.picked_up_at end,
    delivery_member_id = case when p_target = 'delivering' then c.member_id else oi.delivery_member_id end,
    delivered_at = case when p_target = 'delivered' then v_now else oi.delivered_at end
  where oi.restaurant_id = c.restaurant_id and oi.id = any(v_ids);

  insert into app_private.domain_events(restaurant_id, aggregate_type, aggregate_id, order_id, visit_id, event_type,
    actor_kind, actor_member_id, occurred_at, from_state, to_state)
  select c.restaurant_id, 'order_item', oi.id, oi.order_id, o.visit_id, 'item.' || p_target, 'member', c.member_id,
         v_now, v_from, p_target
    from app_private.order_items oi join app_private.orders o on o.restaurant_id = oi.restaurant_id and o.id = oi.order_id
   where oi.restaurant_id = c.restaurant_id and oi.id = any(v_ids);

  select array_agg(distinct o.visit_id) into v_visits from app_private.order_items oi
    join app_private.orders o on o.restaurant_id = oi.restaurant_id and o.id = oi.order_id
   where oi.restaurant_id = c.restaurant_id and oi.id = any(v_ids);
  update app_private.table_visits set revision = revision + 1 where restaurant_id = c.restaurant_id and id = any(v_visits);
  update app_private.bills set version = version + 1
   where restaurant_id = c.restaurant_id and visit_id = any(v_visits) and status in ('open','requested');
  perform app_private.invalidate(c.restaurant_id, array['orders','tables','bills'], array['floor','kitchen','bar','cashier']);

  select jsonb_build_object('items', jsonb_agg(jsonb_build_object('id', id, 'status', status, 'version', version) order by id))
    into v_result from app_private.order_items where restaurant_id = c.restaurant_id and id = any(v_ids);
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'transition_items', p_idempotency_key,
    v_payload, null, 200, v_result);
end $$;

create or replace function public.staff_reassign_delivery(p_restaurant_slug text, p_items jsonb, p_member_id uuid,
  p_reason text, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('items', p_items, 'memberId', p_member_id, 'reason', p_reason);
  v_replay jsonb; v_ids uuid[]; v_expected jsonb; r record; v_reason text; v_result jsonb;
begin
  perform app_private.require_role(c, array['floor']);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'reassign_delivery', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  v_reason := app_private.clean_text(p_reason, 200);
  if v_reason is null or char_length(v_reason) < 3 then perform app_private.err('INVALID_INPUT', '{"field":"reason"}'); end if;
  if not exists (select 1 from app_private.restaurant_members m
     where m.restaurant_id = c.restaurant_id and m.id = p_member_id and m.status = 'active'
       and (exists (select 1 from app_private.member_roles mr where mr.restaurant_id = m.restaurant_id
                    and mr.member_id = m.id and mr.role in ('floor','admin'))
            or m.user_id = (select owner_user_id from app_private.restaurants where id = c.restaurant_id))) then
    perform app_private.err('INVALID_ASSIGNEE');
  end if;
  select array_agg((e->>'id')::uuid order by (e->>'id')::uuid), jsonb_object_agg(e->>'id', (e->>'version')::int)
    into v_ids, v_expected from jsonb_array_elements(p_items) e;
  for r in select * from app_private.order_items where restaurant_id = c.restaurant_id and id = any(v_ids) order by id for update loop
    if r.status <> 'delivering' or r.version <> (v_expected->>r.id::text)::int then
      perform app_private.err('VERSION_CONFLICT', jsonb_build_object('id', r.id, 'currentStatus', r.status, 'currentVersion', r.version));
    end if;
  end loop;
  if (select count(*) from app_private.order_items where restaurant_id = c.restaurant_id and id = any(v_ids)) <> coalesce(array_length(v_ids, 1), 0)
     or v_ids is null then perform app_private.err('NOT_FOUND'); end if;
  insert into app_private.domain_events(restaurant_id, aggregate_type, aggregate_id, order_id, event_type, actor_kind,
    actor_member_id, reason, metadata)
  select c.restaurant_id, 'order_item', id, order_id, 'item.delivery_reassigned', 'member', c.member_id, v_reason,
         jsonb_build_object('fromMemberId', delivery_member_id, 'toMemberId', p_member_id)
    from app_private.order_items where restaurant_id = c.restaurant_id and id = any(v_ids);
  update app_private.order_items set delivery_member_id = p_member_id, version = version + 1
   where restaurant_id = c.restaurant_id and id = any(v_ids);
  perform app_private.invalidate(c.restaurant_id, array['orders'], array['floor']);
  select jsonb_build_object('items', jsonb_agg(jsonb_build_object('id', id, 'status', status, 'version', version)))
    into v_result from app_private.order_items where restaurant_id = c.restaurant_id and id = any(v_ids);
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'reassign_delivery', p_idempotency_key,
    v_payload, null, 200, v_result);
end $$;

create or replace function public.staff_cancel_item(p_restaurant_slug text, p_item_id uuid, p_version integer,
  p_reason text, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('itemId', p_item_id, 'version', p_version, 'reason', p_reason);
  v_replay jsonb; v_item app_private.order_items; v_visit_id uuid; v_reason text; v_bill app_private.bills;
  v_visit app_private.table_visits; v_result jsonb; v_from text;
begin
  perform app_private.require_role(c, array['floor','cashier']);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'cancel_item', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  v_reason := app_private.clean_text(p_reason, 200);
  if v_reason is null or char_length(v_reason) < 3 then perform app_private.err('INVALID_INPUT', '{"field":"reason"}'); end if;
  select o.visit_id into v_visit_id from app_private.order_items oi
    join app_private.orders o on o.restaurant_id = oi.restaurant_id and o.id = oi.order_id
   where oi.restaurant_id = c.restaurant_id and oi.id = p_item_id;
  if v_visit_id is null then perform app_private.err('NOT_FOUND'); end if;
  perform app_private.lock_visit_and_bill(c.restaurant_id, v_visit_id);
  select * into v_visit from app_private.table_visits where restaurant_id = c.restaurant_id and id = v_visit_id;
  select * into v_bill from app_private.bills where restaurant_id = c.restaurant_id and visit_id = v_visit_id;
  if v_bill.status not in ('open','requested') then perform app_private.err('BILL_CLOSED'); end if;
  select * into v_item from app_private.order_items where restaurant_id = c.restaurant_id and id = p_item_id for update;
  if v_item.version <> p_version then
    perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentVersion', v_item.version, 'currentStatus', v_item.status));
  end if;
  if v_item.status = 'cancelled' then perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentStatus', 'cancelled')); end if;
  if v_item.status <> 'pending' and not app_private.is_admin(c) then perform app_private.err('FORBIDDEN'); end if;
  v_from := v_item.status;
  update app_private.order_items set status = 'cancelled', cancelled_at = now(), cancelled_by_member_id = c.member_id,
         cancel_reason = v_reason, version = version + 1
   where restaurant_id = c.restaurant_id and id = p_item_id returning * into v_item;
  perform app_private.bump_visit(c.restaurant_id, v_visit_id);
  perform app_private.bump_bill(c.restaurant_id, v_visit_id);
  perform app_private.emit(c.restaurant_id, 'order_item', p_item_id, 'item.cancelled', c.member_id, null,
    v_from, 'cancelled', v_reason, v_item.order_id, v_visit_id);
  perform app_private.invalidate(c.restaurant_id, array['orders','bills','tables'], array['floor','kitchen','bar','cashier']);
  v_result := jsonb_build_object('item', jsonb_build_object('id', v_item.id, 'status', v_item.status, 'version', v_item.version),
    'bill', app_private.bill_dto(c.restaurant_id, v_bill.id));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'cancel_item', p_idempotency_key,
    v_payload, p_item_id, 200, v_result);
end $$;

-- ---------------------------------------------------------------------
-- Service calls (staff side)
-- ---------------------------------------------------------------------
create or replace function public.staff_create_call(p_restaurant_slug text, p_visit_id uuid, p_type text, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('visitId', p_visit_id, 'type', p_type); v_replay jsonb; v_result jsonb;
begin
  perform app_private.require_role(c, array['floor','cashier']);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'create_call', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  v_result := app_private.create_call_core(c.restaurant_id, p_visit_id, p_type, null, c.member_id);
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'create_call', p_idempotency_key,
    v_payload, (v_result->'call'->>'id')::uuid, 201, v_result);
end $$;

create or replace function public.staff_claim_call(p_restaurant_slug text, p_call_id uuid, p_expected_version integer,
  p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('callId', p_call_id, 'version', p_expected_version);
  v_replay jsonb; v_call app_private.service_calls; v_result jsonb;
begin
  perform app_private.require_role(c, array['floor','cashier']);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'claim_call', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  select * into v_call from app_private.service_calls where restaurant_id = c.restaurant_id and id = p_call_id for update;
  if v_call.id is null then perform app_private.err('NOT_FOUND'); end if;
  if v_call.type <> 'bill' and not app_private.has_role(c, array['floor']) then perform app_private.err('FORBIDDEN'); end if;
  if v_call.status = 'claimed' then
    perform app_private.err('ALREADY_CLAIMED', app_private.call_dto(v_call));
  end if;
  if v_call.status <> 'new' or v_call.version <> p_expected_version then
    perform app_private.err('VERSION_CONFLICT', app_private.call_dto(v_call));
  end if;
  update app_private.service_calls set status = 'claimed', claimed_by_member_id = c.member_id,
         claimed_at = coalesce(claimed_at, now()), version = version + 1
   where restaurant_id = c.restaurant_id and id = p_call_id returning * into v_call;
  perform app_private.bump_visit(c.restaurant_id, v_call.visit_id);
  perform app_private.emit(c.restaurant_id, 'service_call', p_call_id, 'call.claimed', c.member_id, null,
    'new', 'claimed', null, null, v_call.visit_id);
  perform app_private.invalidate(c.restaurant_id, array['calls','tables'], array['floor','cashier']);
  v_result := jsonb_build_object('call', app_private.call_dto(v_call));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'claim_call', p_idempotency_key,
    v_payload, p_call_id, 200, v_result);
end $$;

create or replace function public.staff_resolve_call(p_restaurant_slug text, p_call_id uuid, p_version integer,
  p_outcome text, p_note text, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('callId', p_call_id, 'version', p_version, 'outcome', p_outcome, 'note', p_note);
  v_replay jsonb; v_call app_private.service_calls; v_note text; v_from text; v_result jsonb;
begin
  perform app_private.require_role(c, array['floor','cashier']);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'resolve_call', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  if p_outcome not in ('completed','cancelled') then perform app_private.err('INVALID_INPUT', '{"field":"outcome"}'); end if;
  v_note := app_private.clean_text(p_note, 200);
  select * into v_call from app_private.service_calls where restaurant_id = c.restaurant_id and id = p_call_id for update;
  if v_call.id is null then perform app_private.err('NOT_FOUND'); end if;
  if v_call.type <> 'bill' and not app_private.has_role(c, array['floor']) then perform app_private.err('FORBIDDEN'); end if;
  if v_call.version <> p_version or v_call.status not in ('new','claimed') then
    perform app_private.err('VERSION_CONFLICT', app_private.call_dto(v_call));
  end if;
  if p_outcome = 'completed' then
    if v_call.status <> 'claimed' then perform app_private.err('INVALID_STATE', '{"reason":"claim_first"}'); end if;
    if v_call.claimed_by_member_id <> c.member_id and not app_private.is_admin(c) then
      perform app_private.err('ALREADY_CLAIMED', app_private.call_dto(v_call));
    end if;
  elsif v_note is null or char_length(v_note) < 3 then
    perform app_private.err('INVALID_INPUT', '{"field":"note","reason":"reason_required"}');
  end if;
  v_from := v_call.status;
  update app_private.service_calls set status = p_outcome,
         completed_at = case when p_outcome = 'completed' then now() end,
         cancelled_at = case when p_outcome = 'cancelled' then now() end,
         resolution_note = v_note, version = version + 1
   where restaurant_id = c.restaurant_id and id = p_call_id returning * into v_call;
  perform app_private.bump_visit(c.restaurant_id, v_call.visit_id);
  perform app_private.emit(c.restaurant_id, 'service_call', p_call_id, 'call.' || p_outcome, c.member_id, null,
    v_from, p_outcome, v_note, null, v_call.visit_id);
  perform app_private.invalidate(c.restaurant_id, array['calls','tables'], array['floor','cashier']);
  v_result := jsonb_build_object('call', app_private.call_dto(v_call));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'resolve_call', p_idempotency_key,
    v_payload, p_call_id, 200, v_result);
end $$;

create or replace function public.staff_reassign_call(p_restaurant_slug text, p_call_id uuid, p_version integer,
  p_member_id uuid, p_reason text, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('callId', p_call_id, 'version', p_version, 'memberId', p_member_id, 'reason', p_reason);
  v_replay jsonb; v_call app_private.service_calls; v_reason text; v_from uuid; v_result jsonb; v_roles text[];
begin
  perform app_private.require_role(c, array['floor','cashier']);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'reassign_call', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  v_reason := app_private.clean_text(p_reason, 200);
  if v_reason is null or char_length(v_reason) < 3 then perform app_private.err('INVALID_INPUT', '{"field":"reason"}'); end if;
  select * into v_call from app_private.service_calls where restaurant_id = c.restaurant_id and id = p_call_id for update;
  if v_call.id is null then perform app_private.err('NOT_FOUND'); end if;
  if v_call.type <> 'bill' and not app_private.has_role(c, array['floor']) then perform app_private.err('FORBIDDEN'); end if;
  if v_call.status <> 'claimed' or v_call.version <> p_version then
    perform app_private.err('VERSION_CONFLICT', app_private.call_dto(v_call));
  end if;
  v_roles := case when v_call.type = 'bill' then array['floor','admin','cashier'] else array['floor','admin'] end;
  if not exists (select 1 from app_private.restaurant_members m
     where m.restaurant_id = c.restaurant_id and m.id = p_member_id and m.status = 'active'
       and (exists (select 1 from app_private.member_roles mr where mr.restaurant_id = m.restaurant_id
                    and mr.member_id = m.id and mr.role = any(v_roles))
            or m.user_id = (select owner_user_id from app_private.restaurants where id = c.restaurant_id))) then
    perform app_private.err('INVALID_ASSIGNEE');
  end if;
  v_from := v_call.claimed_by_member_id;
  update app_private.service_calls set claimed_by_member_id = p_member_id, version = version + 1
   where restaurant_id = c.restaurant_id and id = p_call_id returning * into v_call;
  perform app_private.emit(c.restaurant_id, 'service_call', p_call_id, 'call.reassigned', c.member_id, null,
    'claimed', 'claimed', v_reason, null, v_call.visit_id, jsonb_build_object('fromMemberId', v_from, 'toMemberId', p_member_id));
  perform app_private.invalidate(c.restaurant_id, array['calls'], array['floor','cashier']);
  v_result := jsonb_build_object('call', app_private.call_dto(v_call));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'reassign_call', p_idempotency_key,
    v_payload, p_call_id, 200, v_result);
end $$;

-- ---------------------------------------------------------------------
-- Bills
-- ---------------------------------------------------------------------
create or replace function public.staff_request_bill(p_restaurant_slug text, p_bill_id uuid, p_expected_version integer,
  p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('billId', p_bill_id); v_replay jsonb; v_visit_id uuid; v_result jsonb;
begin
  perform app_private.require_role(c, array['floor','cashier']);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'request_bill', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  select visit_id into v_visit_id from app_private.bills where restaurant_id = c.restaurant_id and id = p_bill_id;
  if v_visit_id is null then perform app_private.err('NOT_FOUND'); end if;
  v_result := app_private.request_bill_core(c.restaurant_id, v_visit_id, null, c.member_id);
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'request_bill', p_idempotency_key,
    v_payload, p_bill_id, 200, v_result);
end $$;

create or replace function public.staff_reopen_bill(p_restaurant_slug text, p_bill_id uuid, p_version integer,
  p_reason text, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('billId', p_bill_id, 'version', p_version, 'reason', p_reason);
  v_replay jsonb; v_visit app_private.table_visits; v_bill app_private.bills; v_visit_id uuid; v_reason text; v_result jsonb;
begin
  perform app_private.require_role(c, array['cashier']);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'reopen_bill', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  v_reason := app_private.clean_text(p_reason, 200);
  if v_reason is null or char_length(v_reason) < 3 then perform app_private.err('INVALID_INPUT', '{"field":"reason"}'); end if;
  select visit_id into v_visit_id from app_private.bills where restaurant_id = c.restaurant_id and id = p_bill_id;
  if v_visit_id is null then perform app_private.err('NOT_FOUND'); end if;
  perform app_private.lock_visit_and_bill(c.restaurant_id, v_visit_id);
  select * into v_visit from app_private.table_visits where restaurant_id = c.restaurant_id and id = v_visit_id;
  select * into v_bill from app_private.bills where restaurant_id = c.restaurant_id and visit_id = v_visit_id;
  if v_bill.status <> 'requested' or v_bill.version <> p_version then
    perform app_private.err('VERSION_CONFLICT', app_private.bill_dto(c.restaurant_id, p_bill_id));
  end if;
  update app_private.bills set status = 'open', version = version + 1 where restaurant_id = c.restaurant_id and id = p_bill_id;
  update app_private.table_visits set status = 'open', revision = revision + 1 where restaurant_id = c.restaurant_id and id = v_visit_id;
  update app_private.service_calls set status = 'cancelled', cancelled_at = now(), resolution_note = 'Conta reaberta: ' || v_reason,
         version = version + 1
   where restaurant_id = c.restaurant_id and visit_id = v_visit_id and type = 'bill' and status in ('new','claimed');
  perform app_private.emit(c.restaurant_id, 'bill', p_bill_id, 'bill.reopened', c.member_id, null, 'requested', 'open',
    v_reason, null, v_visit_id);
  perform app_private.emit(c.restaurant_id, 'visit', v_visit_id, 'visit.reopened', c.member_id, null, 'billing', 'open',
    v_reason, null, v_visit_id);
  perform app_private.invalidate(c.restaurant_id, array['bills','calls','tables'], array['floor','cashier']);
  v_result := jsonb_build_object('bill', app_private.bill_dto(c.restaurant_id, p_bill_id));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'reopen_bill', p_idempotency_key,
    v_payload, p_bill_id, 200, v_result);
end $$;

create or replace function app_private.close_visit_tail(p_rid uuid, p_visit_id uuid, p_member_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  update app_private.table_visits set status = 'closed', closed_at = now(), closed_by_member_id = p_member_id,
         revision = revision + 1
   where restaurant_id = p_rid and id = p_visit_id;
  update app_private.guest_sessions set revoked_at = now()
   where restaurant_id = p_rid and visit_id = p_visit_id and revoked_at is null;
  update app_private.service_calls set status = 'completed', completed_at = now(), version = version + 1,
         resolution_note = coalesce(resolution_note, 'Conta encerrada')
   where restaurant_id = p_rid and visit_id = p_visit_id and type = 'bill' and status in ('new','claimed');
  update app_private.service_calls set status = 'cancelled', cancelled_at = now(), version = version + 1,
         resolution_note = 'Atendimento encerrado'
   where restaurant_id = p_rid and visit_id = p_visit_id and type <> 'bill' and status in ('new','claimed');
  perform app_private.emit(p_rid, 'visit', p_visit_id, 'visit.closed', p_member_id, null, null, 'closed', null, null, p_visit_id);
  perform app_private.invalidate(p_rid, array['bills','calls','tables','orders'], array['floor','cashier']);
end $$;

create or replace function public.staff_settle_bill(p_restaurant_slug text, p_bill_id uuid, p_version integer,
  p_expected_total_cents integer, p_method text, p_note text, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('billId', p_bill_id, 'version', p_version, 'expectedTotalCents', p_expected_total_cents,
    'method', p_method);
  v_replay jsonb; v_visit app_private.table_visits; v_bill app_private.bills; v_visit_id uuid;
  v_total integer; v_pending jsonb; v_result jsonb; v_payment app_private.payment_records;
begin
  perform app_private.require_role(c, array['cashier']);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'settle_bill', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  if p_method not in ('cash','external_card','external_mbway') then
    perform app_private.err('INVALID_INPUT', '{"field":"method"}');
  end if;
  select visit_id into v_visit_id from app_private.bills where restaurant_id = c.restaurant_id and id = p_bill_id;
  if v_visit_id is null then perform app_private.err('NOT_FOUND'); end if;
  perform app_private.lock_visit_and_bill(c.restaurant_id, v_visit_id);
  select * into v_visit from app_private.table_visits where restaurant_id = c.restaurant_id and id = v_visit_id;
  select * into v_bill from app_private.bills where restaurant_id = c.restaurant_id and visit_id = v_visit_id;
  if v_bill.status in ('settled','void') then
    perform app_private.err('BILL_CLOSED', app_private.bill_dto(c.restaurant_id, p_bill_id));
  end if;
  if v_bill.status <> 'requested' then
    perform app_private.err('INVALID_STATE', jsonb_build_object('reason', 'bill_not_requested'));
  end if;
  v_total := app_private.bill_open_total(c.restaurant_id, v_visit_id);
  if v_bill.version <> p_version or v_total <> p_expected_total_cents then
    perform app_private.err('VERSION_CONFLICT', app_private.bill_dto(c.restaurant_id, p_bill_id));
  end if;
  select jsonb_agg(jsonb_build_object('id', oi.id, 'name', oi.product_name_snapshot, 'status', oi.status))
    into v_pending
    from app_private.orders o join app_private.order_items oi on oi.restaurant_id = o.restaurant_id and oi.order_id = o.id
   where o.restaurant_id = c.restaurant_id and o.visit_id = v_visit_id and oi.status not in ('delivered','cancelled');
  if v_pending is not null then
    perform app_private.err('PENDING_ITEMS', jsonb_build_object('items', v_pending));
  end if;
  if v_total = 0 then perform app_private.err('INVALID_STATE', '{"reason":"zero_total_use_void"}'); end if;

  insert into app_private.bill_lines(restaurant_id, bill_id, order_item_id, product_name_snapshot, quantity,
    unit_price_cents, line_total_cents, cancelled_at_snapshot)
  select c.restaurant_id, p_bill_id, oi.id, oi.product_name_snapshot, oi.quantity, oi.unit_price_cents,
         case when oi.status = 'cancelled' then 0 else oi.quantity * oi.unit_price_cents end, oi.cancelled_at
    from app_private.orders o join app_private.order_items oi on oi.restaurant_id = o.restaurant_id and oi.order_id = o.id
   where o.restaurant_id = c.restaurant_id and o.visit_id = v_visit_id
   order by o.submitted_at, oi.created_at, oi.id;
  insert into app_private.payment_records(restaurant_id, bill_id, method, amount_cents, recorded_by_member_id,
    idempotency_key, note)
  values (c.restaurant_id, p_bill_id, p_method, v_total, c.member_id, p_idempotency_key, app_private.clean_text(p_note, 200))
  returning * into v_payment;
  update app_private.bills set status = 'settled', settled_at = v_payment.recorded_at, closed_by_member_id = c.member_id,
         total_cents_snapshot = v_total, version = version + 1
   where restaurant_id = c.restaurant_id and id = p_bill_id;
  perform app_private.emit(c.restaurant_id, 'bill', p_bill_id, 'bill.settled', c.member_id, null, 'requested', 'settled',
    null, null, v_visit_id, jsonb_build_object('totalCents', v_total, 'method', p_method));
  perform app_private.close_visit_tail(c.restaurant_id, v_visit_id, c.member_id);
  v_result := jsonb_build_object('bill', app_private.bill_dto(c.restaurant_id, p_bill_id),
    'payment', jsonb_build_object('id', v_payment.id, 'method', v_payment.method, 'amountCents', v_payment.amount_cents,
      'recordedAt', v_payment.recorded_at));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'settle_bill', p_idempotency_key,
    v_payload, p_bill_id, 200, v_result);
end $$;

create or replace function public.staff_void_bill(p_restaurant_slug text, p_bill_id uuid, p_version integer,
  p_reason text, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('billId', p_bill_id, 'version', p_version, 'reason', p_reason);
  v_replay jsonb; v_visit app_private.table_visits; v_bill app_private.bills; v_visit_id uuid; v_reason text; v_result jsonb;
begin
  perform app_private.require_role(c, array['cashier','floor']);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'void_bill', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  v_reason := app_private.clean_text(p_reason, 200);
  if v_reason is null or char_length(v_reason) < 3 then perform app_private.err('INVALID_INPUT', '{"field":"reason"}'); end if;
  select visit_id into v_visit_id from app_private.bills where restaurant_id = c.restaurant_id and id = p_bill_id;
  if v_visit_id is null then perform app_private.err('NOT_FOUND'); end if;
  perform app_private.lock_visit_and_bill(c.restaurant_id, v_visit_id);
  select * into v_visit from app_private.table_visits where restaurant_id = c.restaurant_id and id = v_visit_id;
  select * into v_bill from app_private.bills where restaurant_id = c.restaurant_id and visit_id = v_visit_id;
  if v_bill.status in ('settled','void') then perform app_private.err('BILL_CLOSED'); end if;
  if v_bill.version <> p_version then perform app_private.err('VERSION_CONFLICT', app_private.bill_dto(c.restaurant_id, p_bill_id)); end if;
  if exists (select 1 from app_private.orders o join app_private.order_items oi on oi.restaurant_id = o.restaurant_id and oi.order_id = o.id
              where o.restaurant_id = c.restaurant_id and o.visit_id = v_visit_id and oi.status <> 'cancelled') then
    perform app_private.err('INVALID_STATE', '{"reason":"bill_has_consumption"}');
  end if;
  update app_private.bills set status = 'void', void_reason = v_reason, total_cents_snapshot = 0,
         closed_by_member_id = c.member_id, version = version + 1
   where restaurant_id = c.restaurant_id and id = p_bill_id;
  perform app_private.emit(c.restaurant_id, 'bill', p_bill_id, 'bill.voided', c.member_id, null, v_bill.status, 'void',
    v_reason, null, v_visit_id);
  perform app_private.close_visit_tail(c.restaurant_id, v_visit_id, c.member_id);
  v_result := jsonb_build_object('bill', app_private.bill_dto(c.restaurant_id, p_bill_id));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'void_bill', p_idempotency_key,
    v_payload, p_bill_id, 200, v_result);
end $$;

-- ---------------------------------------------------------------------
-- Snapshots per workspace (minimal DTOs per role)
-- ---------------------------------------------------------------------
create or replace function public.staff_get_floor(p_restaurant_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
begin
  perform app_private.require_role(c, array['floor','cashier']);
  return jsonb_build_object(
    'serverTime', now(),
    'orderingMode', (select ordering_mode from app_private.restaurant_settings where restaurant_id = c.restaurant_id),
    'me', jsonb_build_object('memberId', c.member_id, 'displayName', c.display_name, 'roles', to_jsonb(c.roles)),
    'calls', coalesce((select jsonb_agg(app_private.call_dto(sc) || jsonb_build_object('tableLabel', t.label,
            'visitId', sc.visit_id, 'claimedByMe', sc.claimed_by_member_id = c.member_id) order by sc.created_at)
        from app_private.service_calls sc
        join app_private.table_visits v on v.restaurant_id = sc.restaurant_id and v.id = sc.visit_id
        join app_private.dining_tables t on t.restaurant_id = v.restaurant_id and t.id = v.table_id
       where sc.restaurant_id = c.restaurant_id and sc.status in ('new','claimed')
         and (app_private.has_role(c, array['floor']) or sc.type = 'bill')), '[]'::jsonb),
    'readyItems', case when app_private.has_role(c, array['floor']) then coalesce((select jsonb_agg(jsonb_build_object(
            'id', oi.id, 'version', oi.version, 'status', oi.status, 'name', oi.product_name_snapshot,
            'quantity', oi.quantity, 'note', oi.customer_note, 'tableLabel', t.label, 'visitId', o.visit_id,
            'orderNumber', o.order_number, 'stationCode', s.code, 'stationKind', s.kind, 'readyAt', oi.ready_at,
            'pickedUpAt', oi.picked_up_at, 'deliveryMemberId', oi.delivery_member_id,
            'deliveryMemberName', dm.display_name, 'mine', oi.delivery_member_id = c.member_id)
            order by oi.ready_at, t.sort_order, oi.id)
        from app_private.order_items oi
        join app_private.orders o on o.restaurant_id = oi.restaurant_id and o.id = oi.order_id
        join app_private.table_visits v on v.restaurant_id = o.restaurant_id and v.id = o.visit_id
        join app_private.dining_tables t on t.restaurant_id = v.restaurant_id and t.id = v.table_id
        join app_private.stations s on s.restaurant_id = oi.restaurant_id and s.id = oi.station_id_snapshot
        left join app_private.restaurant_members dm on dm.restaurant_id = oi.restaurant_id and dm.id = oi.delivery_member_id
       where oi.restaurant_id = c.restaurant_id and oi.status in ('ready','delivering') and v.status <> 'closed'), '[]'::jsonb)
      else '[]'::jsonb end,
    'tables', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'label', t.label, 'zone', t.zone, 'seats', t.seats,
            'state', coalesce(case v.status when 'open' then 'open' when 'billing' then 'billing' end, 'free'),
            'visit', case when v.id is null then null else jsonb_build_object('id', v.id, 'openedAt', v.opened_at,
               'revision', v.revision, 'joinCodeExpiresAt', v.join_code_expires_at,
               'billId', b.id, 'billStatus', b.status, 'billVersion', b.version,
               'totalCents', app_private.bill_open_total(t.restaurant_id, v.id),
               'activeCalls', (select count(*) from app_private.service_calls sc where sc.restaurant_id = v.restaurant_id
                                 and sc.visit_id = v.id and sc.status in ('new','claimed')),
               'pendingLines', (select count(*) from app_private.orders o join app_private.order_items oi
                                  on oi.restaurant_id = o.restaurant_id and oi.order_id = o.id
                                 where o.restaurant_id = v.restaurant_id and o.visit_id = v.id
                                   and oi.status not in ('delivered','cancelled')),
               'guestSessions', (select count(*) from app_private.guest_sessions gs where gs.restaurant_id = v.restaurant_id
                                   and gs.visit_id = v.id and gs.revoked_at is null and gs.expires_at > now())) end)
            order by t.sort_order, t.label)
        from app_private.dining_tables t
        left join app_private.table_visits v on v.restaurant_id = t.restaurant_id and v.table_id = t.id and v.status in ('open','billing')
        left join app_private.bills b on b.restaurant_id = v.restaurant_id and b.visit_id = v.id
       where t.restaurant_id = c.restaurant_id and t.active and t.archived_at is null), '[]'::jsonb),
    'reservationsToday', case when app_private.has_role(c, array['floor']) then coalesce((select jsonb_agg(jsonb_build_object(
            'id', r.id, 'reference', r.reference, 'name', r.name, 'partySize', r.party_size,
            'scheduledAt', r.scheduled_at, 'status', r.status) order by r.scheduled_at)
        from app_private.reservations r
       where r.restaurant_id = c.restaurant_id and r.status in ('pending','confirmed')
         and app_private.business_date(r.scheduled_at, c.timezone, c.business_day_start)
             = app_private.business_date(now(), c.timezone, c.business_day_start)), '[]'::jsonb)
      else '[]'::jsonb end,
    'pendingReservations', (select count(*) from app_private.reservations r where r.restaurant_id = c.restaurant_id
        and r.status = 'pending' and r.scheduled_at > now()),
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'displayName', m.display_name) order by m.display_name)
        from app_private.restaurant_members m where m.restaurant_id = c.restaurant_id and m.status = 'active'
         and (exists (select 1 from app_private.member_roles mr where mr.restaurant_id = m.restaurant_id and mr.member_id = m.id
                      and mr.role in ('floor','admin','cashier'))
              or m.user_id = (select owner_user_id from app_private.restaurants where id = c.restaurant_id))), '[]'::jsonb));
end $$;

-- Visit detail for salão/caixa (prices visible to these roles).
create or replace function public.staff_get_visit(p_restaurant_slug text, p_visit_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug); v jsonb;
begin
  perform app_private.require_role(c, array['floor','cashier']);
  select jsonb_build_object('serverTime', now(), 'visit', app_private.visit_dto(c.restaurant_id, tv.id),
    'bill', app_private.bill_dto(c.restaurant_id, b.id),
    'lines', coalesce((select jsonb_agg(jsonb_build_object('id', oi.id, 'version', oi.version, 'orderNumber', o.order_number,
         'submittedAt', o.submitted_at, 'source', o.source, 'name', oi.product_name_snapshot, 'quantity', oi.quantity,
         'unitPriceCents', oi.unit_price_cents, 'lineTotalCents', case when oi.status = 'cancelled' then 0 else oi.quantity * oi.unit_price_cents end,
         'status', oi.status, 'note', oi.customer_note, 'stationCode', s.code, 'cancelReason', oi.cancel_reason,
         'deliveryMemberName', dm.display_name) order by o.submitted_at, oi.created_at, oi.id)
       from app_private.orders o
       join app_private.order_items oi on oi.restaurant_id = o.restaurant_id and oi.order_id = o.id
       join app_private.stations s on s.restaurant_id = oi.restaurant_id and s.id = oi.station_id_snapshot
       left join app_private.restaurant_members dm on dm.restaurant_id = oi.restaurant_id and dm.id = oi.delivery_member_id
      where o.restaurant_id = c.restaurant_id and o.visit_id = tv.id), '[]'::jsonb),
    'calls', coalesce((select jsonb_agg(app_private.call_dto(sc) order by sc.created_at) from app_private.service_calls sc
       where sc.restaurant_id = c.restaurant_id and sc.visit_id = tv.id), '[]'::jsonb),
    'payment', (select jsonb_build_object('method', p.method, 'amountCents', p.amount_cents, 'recordedAt', p.recorded_at,
         'recordedBy', (select display_name from app_private.restaurant_members where restaurant_id = p.restaurant_id and id = p.recorded_by_member_id))
       from app_private.payment_records p where p.restaurant_id = c.restaurant_id and p.bill_id = b.id))
    into v
    from app_private.table_visits tv
    join app_private.bills b on b.restaurant_id = tv.restaurant_id and b.visit_id = tv.id
   where tv.restaurant_id = c.restaurant_id and tv.id = p_visit_id;
  if v is null then perform app_private.err('NOT_FOUND'); end if;
  -- Salão/caixa: only active visits and those closed in the current business day.
  if not app_private.is_admin(c) and (v->'visit'->>'status') = 'closed'
     and app_private.business_date((v->'visit'->>'closedAt')::timestamptz, c.timezone, c.business_day_start)
         <> app_private.business_date(now(), c.timezone, c.business_day_start) then
    perform app_private.err('NOT_FOUND');
  end if;
  return v;
end $$;

-- KDS projection: only the station's own lines; no prices, no guest data.
create or replace function public.staff_get_station(p_restaurant_slug text, p_station_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug); v_station app_private.stations;
begin
  select * into v_station from app_private.stations where restaurant_id = c.restaurant_id and code = upper(p_station_code);
  if v_station.id is null then perform app_private.err('NOT_FOUND'); end if;
  if not app_private.can_work_station(c, v_station.id) then perform app_private.err('FORBIDDEN'); end if;
  return jsonb_build_object(
    'serverTime', now(),
    'station', jsonb_build_object('id', v_station.id, 'code', v_station.code, 'name', v_station.name, 'kind', v_station.kind,
       'targetMinutes', v_station.target_minutes, 'active', v_station.active),
    'tickets', coalesce((select jsonb_agg(tk order by (tk->>'submittedAt'))
      from (select jsonb_build_object('id', st.id, 'orderNumber', o.order_number, 'tableLabel', t.label,
              'submittedAt', o.submitted_at,
              'lines', (select jsonb_agg(jsonb_build_object('id', oi.id, 'version', oi.version, 'name', oi.product_name_snapshot,
                  'quantity', oi.quantity, 'note', oi.customer_note, 'status', oi.status,
                  'preparedStartedAt', oi.prepared_started_at, 'readyAt', oi.ready_at) order by oi.created_at, oi.id)
                 from app_private.order_items oi where oi.restaurant_id = st.restaurant_id and oi.ticket_id = st.id
                  and oi.status in ('pending','preparing','ready'))) as tk
              from app_private.station_tickets st
              join app_private.orders o on o.restaurant_id = st.restaurant_id and o.id = st.order_id
              join app_private.table_visits v on v.restaurant_id = o.restaurant_id and v.id = o.visit_id
              join app_private.dining_tables t on t.restaurant_id = v.restaurant_id and t.id = v.table_id
             where st.restaurant_id = c.restaurant_id and st.station_id = v_station.id
               and exists (select 1 from app_private.order_items oi where oi.restaurant_id = st.restaurant_id
                            and oi.ticket_id = st.id and oi.status in ('pending','preparing','ready'))) x), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('orderNumber', o.order_number, 'tableLabel', t.label,
              'name', oi.product_name_snapshot, 'quantity', oi.quantity, 'status', oi.status, 'readyAt', oi.ready_at)
              order by oi.ready_at desc)
        from app_private.order_items oi
        join app_private.orders o on o.restaurant_id = oi.restaurant_id and o.id = oi.order_id
        join app_private.table_visits v on v.restaurant_id = o.restaurant_id and v.id = o.visit_id
        join app_private.dining_tables t on t.restaurant_id = v.restaurant_id and t.id = v.table_id
       where oi.restaurant_id = c.restaurant_id and oi.station_id_snapshot = v_station.id
         and oi.status in ('delivering','delivered') and oi.ready_at > now() - interval '2 hours'), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(jsonb_build_object('id', mi.id, 'name', mi.name, 'isAvailable', mi.is_available,
              'version', mi.version) order by c2.sort_order, mi.sort_order)
        from app_private.menu_items mi join app_private.categories c2 on c2.restaurant_id = mi.restaurant_id and c2.id = mi.category_id
       where mi.restaurant_id = c.restaurant_id and mi.station_id = v_station.id and mi.archived_at is null and mi.is_visible), '[]'::jsonb));
end $$;

create or replace function public.staff_get_cashier(p_restaurant_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_today date := app_private.business_date(now(), c.timezone, c.business_day_start);
  v_bounds record;
begin
  perform app_private.require_role(c, array['cashier']);
  select * into v_bounds from app_private.business_day_bounds(v_today, c.timezone, c.business_day_start);
  return jsonb_build_object('serverTime', now(),
    'bills', coalesce((select jsonb_agg(app_private.bill_dto(c.restaurant_id, b.id) || jsonb_build_object('tableLabel', t.label,
          'openedAt', v.opened_at) order by b.status desc, b.requested_at nulls last, t.sort_order)
       from app_private.bills b
       join app_private.table_visits v on v.restaurant_id = b.restaurant_id and v.id = b.visit_id
       join app_private.dining_tables t on t.restaurant_id = v.restaurant_id and t.id = v.table_id
      where b.restaurant_id = c.restaurant_id and b.status in ('open','requested')), '[]'::jsonb),
    'settledToday', coalesce((select jsonb_agg(jsonb_build_object('billId', b.id, 'visitId', b.visit_id, 'tableLabel', t.label,
          'totalCents', b.total_cents_snapshot, 'method', p.method, 'recordedAt', p.recorded_at,
          'recordedBy', m.display_name) order by p.recorded_at desc)
       from app_private.payment_records p
       join app_private.bills b on b.restaurant_id = p.restaurant_id and b.id = p.bill_id
       join app_private.table_visits v on v.restaurant_id = b.restaurant_id and v.id = b.visit_id
       join app_private.dining_tables t on t.restaurant_id = v.restaurant_id and t.id = v.table_id
       join app_private.restaurant_members m on m.restaurant_id = p.restaurant_id and m.id = p.recorded_by_member_id
      where p.restaurant_id = c.restaurant_id and p.recorded_at >= v_bounds.day_start and p.recorded_at < v_bounds.day_end), '[]'::jsonb),
    'receivedTodayCents', (select coalesce(sum(p.amount_cents), 0) from app_private.payment_records p
      where p.restaurant_id = c.restaurant_id and p.recorded_at >= v_bounds.day_start and p.recorded_at < v_bounds.day_end),
    'businessDate', v_today);
end $$;

-- Menu for assisted ordering (salão/caixa) — same DTO as the public menu.
create or replace function public.staff_get_menu(p_restaurant_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
begin
  perform app_private.require_role(c, array['floor','cashier']);
  return app_private.menu_dto(c.restaurant_id);
end $$;

-- Product availability: admin, or kitchen/bar for products of their own station.
create or replace function public.staff_set_availability(p_restaurant_slug text, p_item_id uuid, p_available boolean,
  p_version integer, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('itemId', p_item_id, 'available', p_available, 'version', p_version);
  v_replay jsonb; v_item app_private.menu_items; v_result jsonb;
begin
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'set_availability', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  select * into v_item from app_private.menu_items where restaurant_id = c.restaurant_id and id = p_item_id for update;
  if v_item.id is null then perform app_private.err('NOT_FOUND'); end if;
  if not app_private.is_admin(c) and not app_private.can_work_station(c, v_item.station_id) then
    perform app_private.err('FORBIDDEN');
  end if;
  if v_item.version <> p_version then
    perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentVersion', v_item.version, 'isAvailable', v_item.is_available));
  end if;
  update app_private.menu_items set is_available = p_available, version = version + 1
   where restaurant_id = c.restaurant_id and id = p_item_id returning * into v_item;
  perform app_private.emit(c.restaurant_id, 'menu_item', p_item_id, 'menu_item.availability', c.member_id, null,
    null, case when p_available then 'available' else 'unavailable' end);
  perform app_private.invalidate(c.restaurant_id, array['menu'], array['floor','kitchen','bar','cashier']);
  v_result := jsonb_build_object('item', jsonb_build_object('id', v_item.id, 'isAvailable', v_item.is_available, 'version', v_item.version));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'set_availability', p_idempotency_key,
    v_payload, p_item_id, 200, v_result);
end $$;
