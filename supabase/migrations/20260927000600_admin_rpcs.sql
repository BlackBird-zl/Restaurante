-- =====================================================================
-- restaurant-os · 0600 · Administration RPCs (owner/admin), reservations and history
-- Allowlisted fields, optimistic concurrency (expected version), archive instead of delete.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Menu: categories and products
-- ---------------------------------------------------------------------
create or replace function public.staff_admin_menu(p_restaurant_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
begin
  perform app_private.require_role(c, array[]::text[]);
  return jsonb_build_object(
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', ct.id, 'slug', ct.slug, 'name', ct.name,
        'description', ct.description, 'sortOrder', ct.sort_order, 'isVisible', ct.is_visible,
        'archivedAt', ct.archived_at, 'version', ct.version,
        'itemCount', (select count(*) from app_private.menu_items mi where mi.restaurant_id = ct.restaurant_id
                        and mi.category_id = ct.id and mi.archived_at is null)) order by ct.sort_order, ct.name)
      from app_private.categories ct where ct.restaurant_id = c.restaurant_id), '[]'::jsonb),
    'stations', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'code', s.code, 'name', s.name, 'kind', s.kind,
        'active', s.active) order by s.sort_order) from app_private.stations s where s.restaurant_id = c.restaurant_id), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', mi.id, 'slug', mi.slug, 'categoryId', mi.category_id,
        'stationId', mi.station_id, 'name', mi.name, 'description', mi.description, 'ingredients', mi.ingredients_text,
        'allergens', to_jsonb(mi.allergen_codes), 'isVegetarian', mi.is_vegetarian, 'containsAlcohol', mi.contains_alcohol,
        'priceCents', mi.price_cents, 'isVisible', mi.is_visible, 'isAvailable', mi.is_available, 'sortOrder', mi.sort_order,
        'archivedAt', mi.archived_at, 'publishedAt', mi.published_at, 'version', mi.version, 'updatedAt', mi.updated_at,
        'cover', (select jsonb_build_object('id', a.id, 'key', a.storage_key, 'alt', a.alt_text, 'sourceType', a.source_type,
                   'approved', a.approved_at is not null, 'visibility', a.visibility)
                  from app_private.menu_item_media mim join app_private.media_assets a on a.restaurant_id = mim.restaurant_id and a.id = mim.media_id
                 where mim.restaurant_id = mi.restaurant_id and mim.menu_item_id = mi.id and mim.is_cover),
        'orderCount', (select count(*) from app_private.order_items oi where oi.restaurant_id = mi.restaurant_id and oi.menu_item_id = mi.id))
        order by ct.sort_order, mi.sort_order, mi.name)
      from app_private.menu_items mi join app_private.categories ct on ct.restaurant_id = mi.restaurant_id and ct.id = mi.category_id
     where mi.restaurant_id = c.restaurant_id), '[]'::jsonb),
    'featuredWarnings', coalesce((select jsonb_agg(x.id) from (
        select jsonb_array_elements_text(coalesce(p.published->'featuredItemIds', '[]'::jsonb) || coalesce(p.published->'bar'->'itemIds', '[]'::jsonb)) as id
          from app_private.site_pages p where p.restaurant_id = c.restaurant_id and p.page_key = 'home') x
       where not exists (select 1 from app_private.menu_items mi where mi.restaurant_id = c.restaurant_id
                           and mi.id::text = x.id and mi.is_visible and mi.archived_at is null)), '[]'::jsonb));
end $$;

create or replace function app_private.apply_item_fields(p_ctx app_private.staff_context, p_item app_private.menu_items,
  p_patch jsonb)
returns app_private.menu_items language plpgsql volatile security definer set search_path = '' as $$
declare v app_private.menu_items := p_item; v_codes text[];
begin
  perform app_private.assert_keys(p_patch, array['name','slug','description','ingredients','allergens','isVegetarian',
    'containsAlcohol','priceCents','isVisible','isAvailable','sortOrder','categoryId','stationId']);
  if p_patch ? 'name' then v.name := app_private.clean_text(p_patch->>'name', 80);
    if v.name is null then perform app_private.err('INVALID_INPUT', '{"field":"name"}'); end if; end if;
  if p_patch ? 'slug' then
    if p_item.published_at is not null and p_item.slug <> (p_patch->>'slug') then
      perform app_private.err('INVALID_INPUT', '{"field":"slug","reason":"immutable_after_publish"}');
    end if;
    v.slug := lower(p_patch->>'slug');
  end if;
  if p_patch ? 'description' then v.description := coalesce(app_private.clean_text(p_patch->>'description', 500), ''); end if;
  if p_patch ? 'ingredients' then v.ingredients_text := coalesce(app_private.clean_text(p_patch->>'ingredients', 500), ''); end if;
  if p_patch ? 'allergens' then
    select coalesce(array_agg(distinct x order by x), '{}') into v_codes from jsonb_array_elements_text(p_patch->'allergens') x;
    if not app_private.valid_allergens(v_codes) then perform app_private.err('INVALID_INPUT', '{"field":"allergens"}'); end if;
    v.allergen_codes := v_codes;
  end if;
  if p_patch ? 'isVegetarian' then v.is_vegetarian := (p_patch->>'isVegetarian')::boolean; end if;
  if p_patch ? 'containsAlcohol' then v.contains_alcohol := (p_patch->>'containsAlcohol')::boolean; end if;
  if p_patch ? 'priceCents' then
    if jsonb_typeof(p_patch->'priceCents') <> 'number' or (p_patch->>'priceCents')::numeric <> floor((p_patch->>'priceCents')::numeric)
       or (p_patch->>'priceCents')::integer not between 1 and 100000 then
      perform app_private.err('INVALID_INPUT', '{"field":"priceCents"}');
    end if;
    v.price_cents := (p_patch->>'priceCents')::integer;
  end if;
  if p_patch ? 'isVisible' then v.is_visible := (p_patch->>'isVisible')::boolean; end if;
  if p_patch ? 'isAvailable' then v.is_available := (p_patch->>'isAvailable')::boolean; end if;
  if p_patch ? 'sortOrder' then v.sort_order := (p_patch->>'sortOrder')::integer; end if;
  if p_patch ? 'categoryId' then
    v.category_id := (p_patch->>'categoryId')::uuid;
    if not exists (select 1 from app_private.categories where restaurant_id = p_ctx.restaurant_id and id = v.category_id and archived_at is null) then
      perform app_private.err('INVALID_INPUT', '{"field":"categoryId"}');
    end if;
  end if;
  if p_patch ? 'stationId' then
    v.station_id := (p_patch->>'stationId')::uuid;
    if not exists (select 1 from app_private.stations where restaurant_id = p_ctx.restaurant_id and id = v.station_id and active) then
      perform app_private.err('INVALID_INPUT', '{"field":"stationId","reason":"inactive_or_foreign"}');
    end if;
  end if;
  if v.is_visible and v.published_at is null then v.published_at := now(); end if;
  return v;
end $$;

create or replace function public.staff_update_item(p_restaurant_slug text, p_item_id uuid, p_expected_version integer,
  p_patch jsonb, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('itemId', p_item_id, 'version', p_expected_version, 'patch', p_patch);
  v_replay jsonb; v_old app_private.menu_items; v_new app_private.menu_items; v_result jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'update_item', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  select * into v_old from app_private.menu_items where restaurant_id = c.restaurant_id and id = p_item_id for update;
  if v_old.id is null then perform app_private.err('NOT_FOUND'); end if;
  if v_old.version <> p_expected_version then
    perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentVersion', v_old.version, 'updatedAt', v_old.updated_at));
  end if;
  v_new := app_private.apply_item_fields(c, v_old, p_patch);
  begin
    update app_private.menu_items set name = v_new.name, slug = v_new.slug, description = v_new.description,
      ingredients_text = v_new.ingredients_text, allergen_codes = v_new.allergen_codes, is_vegetarian = v_new.is_vegetarian,
      contains_alcohol = v_new.contains_alcohol, price_cents = v_new.price_cents, is_visible = v_new.is_visible,
      is_available = v_new.is_available, sort_order = v_new.sort_order, category_id = v_new.category_id,
      station_id = v_new.station_id, published_at = v_new.published_at, version = version + 1
    where restaurant_id = c.restaurant_id and id = p_item_id returning * into v_new;
  exception when unique_violation then
    perform app_private.err('FIELD_CONFLICT', '{"field":"slug"}');
  end;
  perform app_private.emit(c.restaurant_id, 'menu_item', p_item_id, 'menu_item.updated', c.member_id, null, null, null, null,
    null, null, jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(p_patch) k),
      'priceFrom', v_old.price_cents, 'priceTo', v_new.price_cents));
  perform app_private.invalidate(c.restaurant_id, array['menu'], array['floor','kitchen','bar','cashier']);
  v_result := jsonb_build_object('item', jsonb_build_object('id', v_new.id, 'version', v_new.version, 'priceCents', v_new.price_cents,
    'isAvailable', v_new.is_available, 'isVisible', v_new.is_visible, 'slug', v_new.slug, 'name', v_new.name));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'update_item', p_idempotency_key,
    v_payload, p_item_id, 200, v_result);
end $$;

create or replace function public.staff_create_item(p_restaurant_slug text, p_fields jsonb, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_replay jsonb; v_new app_private.menu_items; v_result jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'create_item', p_idempotency_key, p_fields);
  if v_replay is not null then return v_replay; end if;
  if not (p_fields ? 'name' and p_fields ? 'slug' and p_fields ? 'priceCents' and p_fields ? 'categoryId' and p_fields ? 'stationId') then
    perform app_private.err('INVALID_INPUT', '{"reason":"required_fields"}');
  end if;
  v_new.restaurant_id := c.restaurant_id; v_new.is_visible := false; v_new.is_available := true;
  v_new.description := ''; v_new.ingredients_text := ''; v_new.allergen_codes := '{}'; v_new.is_vegetarian := false;
  v_new.contains_alcohol := false; v_new.sort_order := 999;
  v_new := app_private.apply_item_fields(c, v_new, p_fields);
  begin
    insert into app_private.menu_items(restaurant_id, category_id, station_id, slug, name, description, ingredients_text,
      allergen_codes, is_vegetarian, contains_alcohol, price_cents, is_visible, is_available, sort_order, published_at)
    values (c.restaurant_id, v_new.category_id, v_new.station_id, v_new.slug, v_new.name, v_new.description, v_new.ingredients_text,
      v_new.allergen_codes, v_new.is_vegetarian, v_new.contains_alcohol, v_new.price_cents, v_new.is_visible, v_new.is_available,
      v_new.sort_order, v_new.published_at)
    returning * into v_new;
  exception when unique_violation then
    perform app_private.err('FIELD_CONFLICT', '{"field":"slug"}');
  end;
  perform app_private.emit(c.restaurant_id, 'menu_item', v_new.id, 'menu_item.created', c.member_id);
  perform app_private.invalidate(c.restaurant_id, array['menu'], array['floor','kitchen','bar','cashier']);
  v_result := jsonb_build_object('item', jsonb_build_object('id', v_new.id, 'version', v_new.version, 'slug', v_new.slug));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'create_item', p_idempotency_key,
    p_fields, v_new.id, 201, v_result);
end $$;

create or replace function public.staff_archive_item(p_restaurant_slug text, p_item_id uuid, p_expected_version integer,
  p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('itemId', p_item_id, 'version', p_expected_version);
  v_replay jsonb; v_item app_private.menu_items; v_result jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'archive_item', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  select * into v_item from app_private.menu_items where restaurant_id = c.restaurant_id and id = p_item_id for update;
  if v_item.id is null then perform app_private.err('NOT_FOUND'); end if;
  if v_item.version <> p_expected_version then perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentVersion', v_item.version)); end if;
  update app_private.menu_items set archived_at = coalesce(archived_at, now()), is_visible = false, version = version + 1
   where restaurant_id = c.restaurant_id and id = p_item_id returning * into v_item;
  perform app_private.emit(c.restaurant_id, 'menu_item', p_item_id, 'menu_item.archived', c.member_id);
  perform app_private.invalidate(c.restaurant_id, array['menu'], array['floor','kitchen','bar','cashier']);
  v_result := jsonb_build_object('item', jsonb_build_object('id', v_item.id, 'version', v_item.version, 'archivedAt', v_item.archived_at));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'archive_item', p_idempotency_key,
    v_payload, p_item_id, 200, v_result);
end $$;

create or replace function public.staff_set_item_cover(p_restaurant_slug text, p_item_id uuid, p_media_id uuid,
  p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('itemId', p_item_id, 'mediaId', p_media_id); v_replay jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'set_cover', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  perform 1 from app_private.menu_items where restaurant_id = c.restaurant_id and id = p_item_id for update;
  if not found then perform app_private.err('NOT_FOUND'); end if;
  if p_media_id is not null and not exists (select 1 from app_private.media_assets where restaurant_id = c.restaurant_id
       and id = p_media_id and archived_at is null) then
    perform app_private.err('NOT_FOUND', '{"field":"mediaId"}');
  end if;
  delete from app_private.menu_item_media where restaurant_id = c.restaurant_id and menu_item_id = p_item_id and is_cover;
  if p_media_id is not null then
    insert into app_private.menu_item_media(restaurant_id, menu_item_id, media_id, sort_order, is_cover)
    values (c.restaurant_id, p_item_id, p_media_id, 0, true)
    on conflict (restaurant_id, menu_item_id, media_id) do update set is_cover = true;
  end if;
  update app_private.menu_items set version = version + 1 where restaurant_id = c.restaurant_id and id = p_item_id;
  perform app_private.emit(c.restaurant_id, 'menu_item', p_item_id, 'menu_item.cover_set', c.member_id, null, null, null, null,
    null, null, jsonb_build_object('mediaId', p_media_id));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'set_cover', p_idempotency_key,
    v_payload, p_item_id, 200, jsonb_build_object('ok', true));
end $$;

create or replace function public.staff_save_category(p_restaurant_slug text, p_category_id uuid, p_expected_version integer,
  p_fields jsonb, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('id', p_category_id, 'version', p_expected_version, 'fields', p_fields);
  v_replay jsonb; v_cat app_private.categories; v_result jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'save_category', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  perform app_private.assert_keys(p_fields, array['slug','name','description','sortOrder','isVisible','archived']);
  begin
    if p_category_id is null then
      insert into app_private.categories(restaurant_id, slug, name, description, sort_order, is_visible)
      values (c.restaurant_id, lower(p_fields->>'slug'), app_private.clean_text(p_fields->>'name', 60),
        coalesce(app_private.clean_text(p_fields->>'description', 300), ''), coalesce((p_fields->>'sortOrder')::int, 99),
        coalesce((p_fields->>'isVisible')::boolean, false))
      returning * into v_cat;
    else
      select * into v_cat from app_private.categories where restaurant_id = c.restaurant_id and id = p_category_id for update;
      if v_cat.id is null then perform app_private.err('NOT_FOUND'); end if;
      if v_cat.version <> p_expected_version then perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentVersion', v_cat.version)); end if;
      if coalesce((p_fields->>'archived')::boolean, false) and exists (select 1 from app_private.menu_items
           where restaurant_id = c.restaurant_id and category_id = p_category_id and archived_at is null) then
        perform app_private.err('DEPENDENCY', jsonb_build_object('reason', 'category_has_items',
          'count', (select count(*) from app_private.menu_items where restaurant_id = c.restaurant_id and category_id = p_category_id and archived_at is null)));
      end if;
      update app_private.categories set
        name = coalesce(app_private.clean_text(p_fields->>'name', 60), name),
        description = case when p_fields ? 'description' then coalesce(app_private.clean_text(p_fields->>'description', 300), '') else description end,
        sort_order = coalesce((p_fields->>'sortOrder')::int, sort_order),
        is_visible = coalesce((p_fields->>'isVisible')::boolean, is_visible),
        archived_at = case when p_fields ? 'archived' then case when (p_fields->>'archived')::boolean then coalesce(archived_at, now()) end else archived_at end,
        version = version + 1
      where restaurant_id = c.restaurant_id and id = p_category_id returning * into v_cat;
    end if;
  exception when unique_violation then perform app_private.err('FIELD_CONFLICT', '{"field":"slug"}');
            when not_null_violation or check_violation then perform app_private.err('INVALID_INPUT', '{"field":"category"}');
  end;
  perform app_private.emit(c.restaurant_id, 'category', v_cat.id, 'category.saved', c.member_id);
  perform app_private.invalidate(c.restaurant_id, array['menu'], array['floor','cashier']);
  v_result := jsonb_build_object('category', jsonb_build_object('id', v_cat.id, 'version', v_cat.version));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'save_category', p_idempotency_key,
    v_payload, v_cat.id, 200, v_result);
end $$;

-- ---------------------------------------------------------------------
-- Stations
-- ---------------------------------------------------------------------
create or replace function public.staff_admin_stations(p_restaurant_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
begin
  perform app_private.require_role(c, array[]::text[]);
  return jsonb_build_object('stations', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'code', s.code, 'name', s.name,
      'kind', s.kind, 'active', s.active, 'targetMinutes', s.target_minutes, 'sortOrder', s.sort_order, 'version', s.version,
      'productCount', (select count(*) from app_private.menu_items mi where mi.restaurant_id = s.restaurant_id and mi.station_id = s.id and mi.archived_at is null),
      'activeLines', (select count(*) from app_private.order_items oi where oi.restaurant_id = s.restaurant_id and oi.station_id_snapshot = s.id
                        and oi.status in ('pending','preparing','ready','delivering')),
      'members', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'displayName', m.display_name) order by m.display_name)
          from app_private.member_stations ms join app_private.restaurant_members m on m.restaurant_id = ms.restaurant_id and m.id = ms.member_id
         where ms.restaurant_id = s.restaurant_id and ms.station_id = s.id), '[]'::jsonb)) order by s.sort_order)
    from app_private.stations s where s.restaurant_id = c.restaurant_id), '[]'::jsonb));
end $$;

create or replace function public.staff_save_station(p_restaurant_slug text, p_station_id uuid, p_expected_version integer,
  p_fields jsonb, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('id', p_station_id, 'version', p_expected_version, 'fields', p_fields);
  v_replay jsonb; v_st app_private.stations; v_lines integer; v_products integer; v_result jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'save_station', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  perform app_private.assert_keys(p_fields, array['code','name','kind','targetMinutes','sortOrder','active']);
  begin
    if p_station_id is null then
      insert into app_private.stations(restaurant_id, code, name, kind, target_minutes, sort_order)
      values (c.restaurant_id, upper(p_fields->>'code'), app_private.clean_text(p_fields->>'name', 40), p_fields->>'kind',
        coalesce((p_fields->>'targetMinutes')::int, 15), coalesce((p_fields->>'sortOrder')::int, 9))
      returning * into v_st;
    else
      select * into v_st from app_private.stations where restaurant_id = c.restaurant_id and id = p_station_id for update;
      if v_st.id is null then perform app_private.err('NOT_FOUND'); end if;
      if v_st.version <> p_expected_version then perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentVersion', v_st.version)); end if;
      if p_fields ? 'active' and not (p_fields->>'active')::boolean and v_st.active then
        select count(*) into v_lines from app_private.order_items where restaurant_id = c.restaurant_id and station_id_snapshot = p_station_id
          and status in ('pending','preparing','ready','delivering');
        select count(*) into v_products from app_private.menu_items where restaurant_id = c.restaurant_id and station_id = p_station_id
          and archived_at is null;
        if v_lines > 0 or v_products > 0 then
          perform app_private.err('DEPENDENCY', jsonb_build_object('activeLines', v_lines, 'products', v_products));
        end if;
      end if;
      update app_private.stations set name = coalesce(app_private.clean_text(p_fields->>'name', 40), name),
        target_minutes = coalesce((p_fields->>'targetMinutes')::int, target_minutes),
        sort_order = coalesce((p_fields->>'sortOrder')::int, sort_order),
        active = coalesce((p_fields->>'active')::boolean, active), version = version + 1
      where restaurant_id = c.restaurant_id and id = p_station_id returning * into v_st;
    end if;
  exception when unique_violation then perform app_private.err('FIELD_CONFLICT', '{"field":"code"}');
            when check_violation or not_null_violation then perform app_private.err('INVALID_INPUT', '{"field":"station"}');
  end;
  perform app_private.emit(c.restaurant_id, 'station', v_st.id, 'station.saved', c.member_id);
  perform app_private.invalidate(c.restaurant_id, array['menu'], array['kitchen','bar']);
  v_result := jsonb_build_object('station', jsonb_build_object('id', v_st.id, 'version', v_st.version));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'save_station', p_idempotency_key,
    v_payload, v_st.id, 200, v_result);
end $$;

-- ---------------------------------------------------------------------
-- Tables and QR
-- ---------------------------------------------------------------------
create or replace function public.staff_admin_tables(p_restaurant_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
begin
  perform app_private.require_role(c, array[]::text[]);
  return jsonb_build_object('tables', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'label', t.label,
      'publicSlug', t.public_slug, 'zone', t.zone, 'seats', t.seats, 'sortOrder', t.sort_order, 'active', t.active,
      'archivedAt', t.archived_at, 'version', t.version, 'firstQrIssuedAt', t.first_qr_issued_at,
      'qr', (select jsonb_build_object('id', q.id, 'issuedAt', q.issued_at, 'keyVersion', q.token_key_version,
               'activeSessions', (select count(*) from app_private.guest_sessions gs where gs.restaurant_id = q.restaurant_id
                  and gs.qr_code_id = q.id and gs.revoked_at is null and gs.expires_at > now()))
             from app_private.qr_codes q where q.restaurant_id = t.restaurant_id and q.table_id = t.id and q.status = 'active'),
      'visit', (select jsonb_build_object('id', v.id, 'status', v.status, 'openedAt', v.opened_at)
             from app_private.table_visits v where v.restaurant_id = t.restaurant_id and v.table_id = t.id and v.status in ('open','billing')))
      order by t.sort_order, t.label)
    from app_private.dining_tables t where t.restaurant_id = c.restaurant_id), '[]'::jsonb));
end $$;

create or replace function public.staff_save_table(p_restaurant_slug text, p_table_id uuid, p_expected_version integer,
  p_fields jsonb, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('id', p_table_id, 'version', p_expected_version, 'fields', p_fields);
  v_replay jsonb; v_t app_private.dining_tables; v_result jsonb; v_busy boolean;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'save_table', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  perform app_private.assert_keys(p_fields, array['label','zone','seats','sortOrder','active','archived']);
  begin
    if p_table_id is null then
      insert into app_private.dining_tables(restaurant_id, label, public_slug, zone, seats, sort_order)
      values (c.restaurant_id, p_fields->>'label', lower(p_fields->>'label'),
        coalesce(app_private.clean_text(p_fields->>'zone', 30), 'Sala'), (p_fields->>'seats')::int, coalesce((p_fields->>'sortOrder')::int, 99))
      returning * into v_t;
    else
      select * into v_t from app_private.dining_tables where restaurant_id = c.restaurant_id and id = p_table_id for update;
      if v_t.id is null then perform app_private.err('NOT_FOUND'); end if;
      if v_t.version <> p_expected_version then perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentVersion', v_t.version)); end if;
      if p_fields ? 'label' and p_fields->>'label' <> v_t.label and v_t.first_qr_issued_at is not null then
        perform app_private.err('INVALID_INPUT', '{"field":"label","reason":"immutable_after_qr"}');
      end if;
      v_busy := exists (select 1 from app_private.table_visits where restaurant_id = c.restaurant_id and table_id = p_table_id and status in ('open','billing'));
      if v_busy and ((p_fields ? 'active' and not (p_fields->>'active')::boolean) or coalesce((p_fields->>'archived')::boolean, false)) then
        perform app_private.err('DEPENDENCY', '{"reason":"table_has_active_visit"}');
      end if;
      update app_private.dining_tables set
        label = coalesce(p_fields->>'label', label), public_slug = lower(coalesce(p_fields->>'label', label)),
        zone = coalesce(app_private.clean_text(p_fields->>'zone', 30), zone),
        seats = coalesce((p_fields->>'seats')::int, seats), sort_order = coalesce((p_fields->>'sortOrder')::int, sort_order),
        active = case when coalesce((p_fields->>'archived')::boolean, false) then false else coalesce((p_fields->>'active')::boolean, active) end,
        archived_at = case when coalesce((p_fields->>'archived')::boolean, false) then coalesce(archived_at, now()) else archived_at end,
        version = version + 1
      where restaurant_id = c.restaurant_id and id = p_table_id returning * into v_t;
      if v_t.archived_at is not null then
        update app_private.qr_codes set status = 'revoked', revoked_at = now()
         where restaurant_id = c.restaurant_id and table_id = p_table_id and status = 'active';
      end if;
    end if;
  exception when unique_violation then perform app_private.err('FIELD_CONFLICT', '{"field":"label"}');
            when check_violation or not_null_violation then perform app_private.err('INVALID_INPUT', '{"field":"table"}');
  end;
  perform app_private.emit(c.restaurant_id, 'table', v_t.id, 'table.saved', c.member_id);
  perform app_private.invalidate(c.restaurant_id, array['tables'], array['floor','cashier']);
  v_result := jsonb_build_object('table', jsonb_build_object('id', v_t.id, 'version', v_t.version, 'label', v_t.label));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'save_table', p_idempotency_key,
    v_payload, v_t.id, 200, v_result);
end $$;

-- Issue first QR or rotate. Token generated/encrypted by the app server; DB stores hash + ciphertext.
create or replace function public.staff_rotate_qr(p_restaurant_slug text, p_table_id uuid, p_expected_version integer,
  p_token_hash text, p_token_ciphertext text, p_key_version integer, p_confirm_impact boolean, p_revoke_sessions boolean,
  p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('tableId', p_table_id, 'version', p_expected_version, 'confirm', p_confirm_impact,
    'revokeSessions', p_revoke_sessions);
  v_replay jsonb; v_t app_private.dining_tables; v_old app_private.qr_codes; v_new app_private.qr_codes; v_sessions integer := 0;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'rotate_qr', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  select * into v_t from app_private.dining_tables where restaurant_id = c.restaurant_id and id = p_table_id for update;
  if v_t.id is null then perform app_private.err('NOT_FOUND'); end if;
  if not v_t.active or v_t.archived_at is not null then perform app_private.err('TABLE_INACTIVE'); end if;
  if v_t.version <> p_expected_version then perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentVersion', v_t.version)); end if;
  select * into v_old from app_private.qr_codes where restaurant_id = c.restaurant_id and table_id = p_table_id and status = 'active' for update;
  if v_old.id is not null then
    select count(*) into v_sessions from app_private.guest_sessions where restaurant_id = c.restaurant_id and qr_code_id = v_old.id
      and revoked_at is null and expires_at > now();
    if not coalesce(p_confirm_impact, false) then
      perform app_private.err('CONFIRMATION_REQUIRED', jsonb_build_object('activeSessions', v_sessions));
    end if;
    update app_private.qr_codes set status = 'revoked', revoked_at = now() where restaurant_id = c.restaurant_id and id = v_old.id;
    if coalesce(p_revoke_sessions, true) then
      update app_private.guest_sessions set revoked_at = now()
       where restaurant_id = c.restaurant_id and qr_code_id = v_old.id and revoked_at is null;
    end if;
  end if;
  insert into app_private.qr_codes(restaurant_id, table_id, token_hash, token_ciphertext, token_key_version, rotated_from_id)
  values (c.restaurant_id, p_table_id, p_token_hash, p_token_ciphertext, p_key_version, v_old.id) returning * into v_new;
  update app_private.dining_tables set first_qr_issued_at = coalesce(first_qr_issued_at, now()), version = version + 1
   where restaurant_id = c.restaurant_id and id = p_table_id;
  perform app_private.emit(c.restaurant_id, 'qr', v_new.id, case when v_old.id is null then 'qr.issued' else 'qr.rotated' end,
    c.member_id, null, null, null, null, null, null,
    jsonb_build_object('tableId', p_table_id, 'revokedSessions', case when coalesce(p_revoke_sessions, true) then v_sessions else 0 end));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'rotate_qr', p_idempotency_key, v_payload, v_new.id, 200,
    jsonb_build_object('qr', jsonb_build_object('id', v_new.id, 'issuedAt', v_new.issued_at), 'revokedSessions',
      case when coalesce(p_revoke_sessions, true) then v_sessions else 0 end));
end $$;

-- Reprint: admin only, returns ciphertext for server-side decryption (never exposed to the browser).
create or replace function public.staff_get_qr_secret(p_restaurant_slug text, p_table_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug); v jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  select jsonb_build_object('qrId', q.id, 'ciphertext', q.token_ciphertext, 'keyVersion', q.token_key_version,
      'label', t.label, 'publicSlug', t.public_slug, 'issuedAt', q.issued_at)
    into v from app_private.qr_codes q join app_private.dining_tables t on t.restaurant_id = q.restaurant_id and t.id = q.table_id
   where q.restaurant_id = c.restaurant_id and q.table_id = p_table_id and q.status = 'active';
  if v is null then perform app_private.err('NOT_FOUND'); end if;
  return v;
end $$;

-- ---------------------------------------------------------------------
-- Team and roles
-- ---------------------------------------------------------------------
create or replace function public.staff_admin_members(p_restaurant_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
begin
  perform app_private.require_role(c, array[]::text[]);
  return jsonb_build_object('me', c.member_id, 'isOwner', c.is_owner,
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'displayName', m.display_name, 'status', m.status,
      'email', coalesce(u.email, m.invite_email), 'isOwner', m.user_id = r.owner_user_id, 'version', m.version,
      'acceptedAt', m.accepted_at, 'createdAt', m.created_at,
      'roles', coalesce((select jsonb_agg(mr.role order by mr.role) from app_private.member_roles mr
                          where mr.restaurant_id = m.restaurant_id and mr.member_id = m.id), '[]'::jsonb),
      'stationIds', coalesce((select jsonb_agg(ms.station_id) from app_private.member_stations ms
                          where ms.restaurant_id = m.restaurant_id and ms.member_id = m.id), '[]'::jsonb))
      order by (m.user_id = r.owner_user_id) desc nulls last, m.status, m.display_name)
    from app_private.restaurant_members m join app_private.restaurants r on r.id = m.restaurant_id
    left join auth.users u on u.id = m.user_id
    where m.restaurant_id = c.restaurant_id), '[]'::jsonb),
    'stations', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'code', s.code, 'name', s.name, 'kind', s.kind))
      from app_private.stations s where s.restaurant_id = c.restaurant_id and s.active), '[]'::jsonb));
end $$;

create or replace function app_private.set_member_roles(p_ctx app_private.staff_context, p_member_id uuid, p_roles text[],
  p_station_ids uuid[])
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_old text[]; v_bad uuid;
begin
  if exists (select 1 from unnest(p_roles) r where r not in ('admin','floor','kitchen','bar','cashier')) then
    perform app_private.err('INVALID_INPUT', '{"field":"roles"}');
  end if;
  select coalesce(array_agg(role), '{}') into v_old from app_private.member_roles where restaurant_id = p_ctx.restaurant_id and member_id = p_member_id;
  if (('admin' = any(p_roles)) <> ('admin' = any(v_old))) and not p_ctx.is_owner then
    perform app_private.err('FORBIDDEN', '{"reason":"only_owner_manages_admins"}');
  end if;
  select sid into v_bad from unnest(coalesce(p_station_ids, '{}')) sid
   where not exists (select 1 from app_private.stations s where s.restaurant_id = p_ctx.restaurant_id and s.id = sid and s.active
                       and ((s.kind = 'kitchen' and 'kitchen' = any(p_roles)) or (s.kind = 'bar' and 'bar' = any(p_roles))))
   limit 1;
  if v_bad is not null then perform app_private.err('INVALID_INPUT', jsonb_build_object('field', 'stationIds', 'stationId', v_bad)); end if;
  delete from app_private.member_roles where restaurant_id = p_ctx.restaurant_id and member_id = p_member_id;
  insert into app_private.member_roles(restaurant_id, member_id, role) select p_ctx.restaurant_id, p_member_id, r from unnest(p_roles) r;
  delete from app_private.member_stations where restaurant_id = p_ctx.restaurant_id and member_id = p_member_id;
  insert into app_private.member_stations(restaurant_id, member_id, station_id)
  select p_ctx.restaurant_id, p_member_id, s from unnest(coalesce(p_station_ids, '{}')) s;
end $$;

create or replace function public.staff_invite_member(p_restaurant_slug text, p_email text, p_display_name text,
  p_roles text[], p_station_ids uuid[], p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('email', lower(p_email), 'name', p_display_name, 'roles', p_roles, 'stations', p_station_ids);
  v_replay jsonb; v_id uuid; v_email text := lower(btrim(p_email)); v_result jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'invite_member', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform app_private.err('INVALID_INPUT', '{"field":"email"}'); end if;
  if coalesce(array_length(p_roles, 1), 0) = 0 then perform app_private.err('INVALID_INPUT', '{"field":"roles"}'); end if;
  if exists (select 1 from app_private.restaurant_members m left join auth.users u on u.id = m.user_id
              where m.restaurant_id = c.restaurant_id and (m.invite_email = v_email or lower(u.email) = v_email)) then
    perform app_private.err('FIELD_CONFLICT', '{"field":"email","reason":"already_member_or_invited"}');
  end if;
  insert into app_private.restaurant_members(restaurant_id, invite_email, display_name, status, invited_by_member_id)
  values (c.restaurant_id, v_email, app_private.clean_text(p_display_name, 80), 'invited', c.member_id) returning id into v_id;
  perform app_private.set_member_roles(c, v_id, p_roles, p_station_ids);
  perform app_private.emit(c.restaurant_id, 'member', v_id, 'member.invited', c.member_id, null, null, 'invited', null, null, null,
    jsonb_build_object('roles', to_jsonb(p_roles)));
  v_result := jsonb_build_object('member', jsonb_build_object('id', v_id, 'status', 'invited'));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'invite_member', p_idempotency_key, v_payload, v_id, 201, v_result);
end $$;

create or replace function public.staff_update_member(p_restaurant_slug text, p_member_id uuid, p_expected_version integer,
  p_fields jsonb, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('id', p_member_id, 'version', p_expected_version, 'fields', p_fields);
  v_replay jsonb; v_m app_private.restaurant_members; v_is_owner boolean; v_roles text[]; v_stations uuid[]; v_result jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'update_member', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  perform app_private.assert_keys(p_fields, array['displayName','roles','stationIds','status']);
  select * into v_m from app_private.restaurant_members where restaurant_id = c.restaurant_id and id = p_member_id for update;
  if v_m.id is null then perform app_private.err('NOT_FOUND'); end if;
  if v_m.version <> p_expected_version then perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentVersion', v_m.version)); end if;
  v_is_owner := v_m.user_id is not null and v_m.user_id = (select owner_user_id from app_private.restaurants where id = c.restaurant_id);
  if v_is_owner and not c.is_owner then perform app_private.err('FORBIDDEN', '{"reason":"owner_protected"}'); end if;
  if p_fields ? 'status' then
    if p_fields->>'status' not in ('active','suspended') then perform app_private.err('INVALID_INPUT', '{"field":"status"}'); end if;
    if p_member_id = c.member_id then perform app_private.err('FORBIDDEN', '{"reason":"cannot_change_own_status"}'); end if;
    if v_is_owner and p_fields->>'status' = 'suspended' then perform app_private.err('FORBIDDEN', '{"reason":"transfer_ownership_first"}'); end if;
    if v_m.status = 'invited' then perform app_private.err('INVALID_STATE', '{"reason":"invitation_pending"}'); end if;
    -- Admins can only be suspended by the owner.
    if exists (select 1 from app_private.member_roles where restaurant_id = c.restaurant_id and member_id = p_member_id and role = 'admin')
       and not c.is_owner then perform app_private.err('FORBIDDEN', '{"reason":"only_owner_manages_admins"}'); end if;
  end if;
  if p_fields ? 'roles' then
    select coalesce(array_agg(distinct x), '{}') into v_roles from jsonb_array_elements_text(p_fields->'roles') x;
    if p_member_id = c.member_id and 'admin' = any(c.roles) and not ('admin' = any(v_roles)) and not c.is_owner then
      perform app_private.err('FORBIDDEN', '{"reason":"cannot_remove_own_admin"}');
    end if;
    if v_is_owner and not ('admin' = any(v_roles)) then v_roles := v_roles || array['admin']; end if;
    select coalesce(array_agg((x)::uuid), '{}') into v_stations from jsonb_array_elements_text(coalesce(p_fields->'stationIds', '[]'::jsonb)) x;
    perform app_private.set_member_roles(c, p_member_id, v_roles, v_stations);
  end if;
  update app_private.restaurant_members set
    display_name = coalesce(app_private.clean_text(p_fields->>'displayName', 80), display_name),
    status = coalesce(p_fields->>'status', status), version = version + 1
  where restaurant_id = c.restaurant_id and id = p_member_id returning * into v_m;
  perform app_private.emit(c.restaurant_id, 'member', p_member_id, 'member.updated', c.member_id, null, null, v_m.status, null, null, null,
    jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(p_fields) k)));
  perform app_private.invalidate(c.restaurant_id, array['membership'], array['floor','kitchen','bar','cashier']);
  v_result := jsonb_build_object('member', jsonb_build_object('id', v_m.id, 'version', v_m.version, 'status', v_m.status));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'update_member', p_idempotency_key, v_payload, p_member_id, 200, v_result);
end $$;

create or replace function public.staff_transfer_ownership(p_restaurant_slug text, p_member_id uuid, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('memberId', p_member_id); v_replay jsonb; v_m app_private.restaurant_members;
begin
  if not c.is_owner then perform app_private.err('FORBIDDEN', '{"reason":"owner_only"}'); end if;
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'transfer_ownership', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  select * into v_m from app_private.restaurant_members where restaurant_id = c.restaurant_id and id = p_member_id and status = 'active' for update;
  if v_m.id is null or v_m.id = c.member_id then perform app_private.err('INVALID_ASSIGNEE'); end if;
  perform 1 from app_private.restaurants where id = c.restaurant_id for update;
  update app_private.restaurants set owner_user_id = v_m.user_id, version = version + 1 where id = c.restaurant_id;
  insert into app_private.member_roles(restaurant_id, member_id, role) values (c.restaurant_id, p_member_id, 'admin'), (c.restaurant_id, c.member_id, 'admin')
  on conflict do nothing;
  perform app_private.emit(c.restaurant_id, 'member', p_member_id, 'ownership.transferred', c.member_id, null, null, null, null, null, null,
    jsonb_build_object('fromMemberId', c.member_id));
  perform app_private.invalidate(c.restaurant_id, array['membership'], array[]::text[]);
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'transfer_ownership', p_idempotency_key, v_payload, p_member_id, 200,
    jsonb_build_object('ok', true));
end $$;

-- ---------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------
create or replace function public.staff_get_settings(p_restaurant_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
begin
  perform app_private.require_role(c, array[]::text[]);
  return (select jsonb_build_object('orderingMode', s.ordering_mode, 'maxItemsPerOrder', s.max_items_per_order,
      'maxUnitsPerOrder', s.max_units_per_order, 'maxOrderCents', s.max_order_cents, 'publicContacts', s.public_contacts,
      'weeklyHours', s.weekly_hours, 'reservationRules', s.reservation_rules, 'version', s.version,
      'restaurant', jsonb_build_object('name', r.name, 'slug', r.slug, 'timezone', r.timezone, 'isDemo', r.is_demo,
        'businessDayStart', to_char(r.business_day_start, 'HH24:MI'), 'version', r.version),
      'domains', coalesce((select jsonb_agg(jsonb_build_object('hostname', d.hostname, 'kind', d.kind, 'status', d.status,
          'isPrimary', d.is_primary) order by d.is_primary desc) from app_private.restaurant_domains d where d.restaurant_id = r.id), '[]'::jsonb),
      'isOwner', c.is_owner)
    from app_private.restaurant_settings s join app_private.restaurants r on r.id = s.restaurant_id where s.restaurant_id = c.restaurant_id);
end $$;

create or replace function app_private.valid_hours(p jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare d text; w jsonb;
begin
  if jsonb_typeof(p) <> 'object' then return false; end if;
  for d in select jsonb_object_keys(p) loop
    if d not in ('mon','tue','wed','thu','fri','sat','sun') or jsonb_typeof(p->d) <> 'array' or jsonb_array_length(p->d) > 3 then return false; end if;
    for w in select * from jsonb_array_elements(p->d) loop
      if jsonb_typeof(w) <> 'array' or jsonb_array_length(w) <> 2 or (w->>0) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
         or (w->>1) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or (w->>0)::time >= (w->>1)::time then return false; end if;
    end loop;
  end loop;
  return true;
end $$;

create or replace function public.staff_update_settings(p_restaurant_slug text, p_expected_version integer, p_patch jsonb,
  p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('version', p_expected_version, 'patch', p_patch);
  v_replay jsonb; v_s app_private.restaurant_settings; k text;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'update_settings', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  perform app_private.assert_keys(p_patch, array['orderingMode','publicContacts','weeklyHours','restaurantName']);
  select * into v_s from app_private.restaurant_settings where restaurant_id = c.restaurant_id for update;
  if v_s.version <> p_expected_version then perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentVersion', v_s.version)); end if;
  if p_patch ? 'orderingMode' and p_patch->>'orderingMode' not in ('open','paused','closed') then
    perform app_private.err('INVALID_INPUT', '{"field":"orderingMode"}');
  end if;
  if p_patch ? 'weeklyHours' and not app_private.valid_hours(p_patch->'weeklyHours') then
    perform app_private.err('INVALID_INPUT', '{"field":"weeklyHours"}');
  end if;
  if p_patch ? 'publicContacts' then
    perform app_private.assert_keys(p_patch->'publicContacts', array['phone','email','addressLine','city','mapUrl','instagram']);
    for k in select jsonb_object_keys(p_patch->'publicContacts') loop
      if jsonb_typeof(p_patch->'publicContacts'->k) not in ('string','null') then perform app_private.err('INVALID_INPUT', jsonb_build_object('field', k)); end if;
      perform app_private.clean_text(p_patch->'publicContacts'->>k, 200);
    end loop;
    if coalesce(p_patch->'publicContacts'->>'mapUrl', '') <> '' and (p_patch->'publicContacts'->>'mapUrl') !~ '^https://' then
      perform app_private.err('INVALID_INPUT', '{"field":"mapUrl"}');
    end if;
  end if;
  update app_private.restaurant_settings set
    ordering_mode = coalesce(p_patch->>'orderingMode', ordering_mode),
    public_contacts = coalesce(p_patch->'publicContacts', public_contacts),
    weekly_hours = coalesce(p_patch->'weeklyHours', weekly_hours),
    version = version + 1
  where restaurant_id = c.restaurant_id returning * into v_s;
  if p_patch ? 'restaurantName' then
    update app_private.restaurants set name = app_private.clean_text(p_patch->>'restaurantName', 80), version = version + 1
     where id = c.restaurant_id;
  end if;
  perform app_private.emit(c.restaurant_id, 'settings', c.restaurant_id, 'settings.updated', c.member_id, null, null, v_s.ordering_mode);
  perform app_private.invalidate(c.restaurant_id, array['menu','tables'], array['floor','kitchen','bar','cashier']);
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'update_settings', p_idempotency_key, v_payload, null, 200,
    jsonb_build_object('version', v_s.version, 'orderingMode', v_s.ordering_mode));
end $$;

-- Ordering mode switch for the service (floor may pause/resume during service as operational action).
create or replace function public.staff_set_ordering_mode(p_restaurant_slug text, p_mode text, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug); v_replay jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'ordering_mode', p_idempotency_key, jsonb_build_object('mode', p_mode));
  if v_replay is not null then return v_replay; end if;
  if p_mode not in ('open','paused','closed') then perform app_private.err('INVALID_INPUT', '{"field":"mode"}'); end if;
  update app_private.restaurant_settings set ordering_mode = p_mode, version = version + 1 where restaurant_id = c.restaurant_id;
  perform app_private.emit(c.restaurant_id, 'settings', c.restaurant_id, 'settings.ordering_mode', c.member_id, null, null, p_mode);
  perform app_private.invalidate(c.restaurant_id, array['tables'], array['floor','cashier']);
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'ordering_mode', p_idempotency_key,
    jsonb_build_object('mode', p_mode), null, 200, jsonb_build_object('orderingMode', p_mode));
end $$;

-- ---------------------------------------------------------------------
-- Site content and theme (draft → publish)
-- ---------------------------------------------------------------------
create or replace function app_private.hex_luminance(p_hex text) returns numeric
language plpgsql immutable set search_path = '' as $$
declare r numeric; g numeric; b numeric;
  function_c numeric;
begin
  r := ('x' || substr(p_hex, 2, 2))::bit(8)::int / 255.0;
  g := ('x' || substr(p_hex, 4, 2))::bit(8)::int / 255.0;
  b := ('x' || substr(p_hex, 6, 2))::bit(8)::int / 255.0;
  r := case when r <= 0.03928 then r / 12.92 else power((r + 0.055) / 1.055, 2.4) end;
  g := case when g <= 0.03928 then g / 12.92 else power((g + 0.055) / 1.055, 2.4) end;
  b := case when b <= 0.03928 then b / 12.92 else power((b + 0.055) / 1.055, 2.4) end;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
end $$;

create or replace function app_private.contrast(p_a text, p_b text) returns numeric
language sql immutable set search_path = '' as $$
  select (greatest(app_private.hex_luminance(p_a), app_private.hex_luminance(p_b)) + 0.05)
       / (least(app_private.hex_luminance(p_a), app_private.hex_luminance(p_b)) + 0.05)
$$;

-- Returns list of problems (empty array = valid).
create or replace function app_private.validate_theme(p_preset text, p_tokens jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare v_problems jsonb := '[]'::jsonb; k text; col jsonb := p_tokens->'color';
begin
  if p_preset not in ('casa-editorial','balcao-claro','noite-grafica') then
    return jsonb_build_array(jsonb_build_object('field', 'preset'));
  end if;
  if jsonb_typeof(p_tokens) <> 'object' or jsonb_typeof(col) <> 'object' then
    return jsonb_build_array(jsonb_build_object('field', 'color'));
  end if;
  for k in select unnest(array['background','surface','text','muted','accent','border']) loop
    if coalesce(col->>k, '') !~ '^#[0-9A-Fa-f]{6}$' then
      v_problems := v_problems || jsonb_build_object('field', 'color.' || k, 'reason', 'hex');
    end if;
  end loop;
  if jsonb_array_length(v_problems) > 0 then return v_problems; end if;
  if (select count(*) from jsonb_object_keys(p_tokens) x where x not in ('color','fontPair','radius','density')) > 0 then
    v_problems := v_problems || jsonb_build_object('field', 'tokens', 'reason', 'unknown_key');
  end if;
  if coalesce(p_tokens->>'fontPair', '') not in ('newsreader-plex','plex-only') then
    v_problems := v_problems || jsonb_build_object('field', 'fontPair');
  end if;
  if coalesce(p_tokens->>'radius', '') not in ('0','4','8') then v_problems := v_problems || jsonb_build_object('field', 'radius'); end if;
  if coalesce(p_tokens->>'density', '') not in ('comfortable','compact') then v_problems := v_problems || jsonb_build_object('field', 'density'); end if;
  if app_private.contrast(col->>'text', col->>'background') < 4.5 then
    v_problems := v_problems || jsonb_build_object('field', 'color.text', 'pair', 'text/background', 'ratio', round(app_private.contrast(col->>'text', col->>'background'), 2), 'min', 4.5);
  end if;
  if app_private.contrast(col->>'text', col->>'surface') < 4.5 then
    v_problems := v_problems || jsonb_build_object('field', 'color.surface', 'pair', 'text/surface', 'ratio', round(app_private.contrast(col->>'text', col->>'surface'), 2), 'min', 4.5);
  end if;
  if app_private.contrast(col->>'muted', col->>'background') < 4.5 then
    v_problems := v_problems || jsonb_build_object('field', 'color.muted', 'pair', 'muted/background', 'ratio', round(app_private.contrast(col->>'muted', col->>'background'), 2), 'min', 4.5);
  end if;
  if app_private.contrast(col->>'accent', col->>'background') < 3 then
    v_problems := v_problems || jsonb_build_object('field', 'color.accent', 'pair', 'accent/background', 'ratio', round(app_private.contrast(col->>'accent', col->>'background'), 2), 'min', 3);
  end if;
  if app_private.contrast(col->>'accent', col->>'background') < 4.5 and app_private.contrast('#FFFFFF', col->>'accent') < 4.5 then
    v_problems := v_problems || jsonb_build_object('field', 'color.accent', 'pair', 'button text/accent', 'min', 4.5);
  end if;
  return v_problems;
end $$;

create or replace function app_private.validate_page(p_rid uuid, p_key text, p jsonb, p_for_publish boolean) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_problems jsonb := '[]'::jsonb;
  v_text text;
  v_media uuid[];
  v_items uuid[];
  v_bad text;
begin
  if jsonb_typeof(p) <> 'object' then return jsonb_build_array(jsonb_build_object('field', 'page')); end if;
  -- No markup anywhere; every string ≤ 600.
  for v_text in select value from jsonb_path_query(p, 'strict $.**') j(value_j), lateral (select j.value_j #>> '{}' as value) x
                 where jsonb_typeof(j.value_j) = 'string' loop
    if v_text ~ '<[^>]*>' then v_problems := v_problems || jsonb_build_object('field', 'text', 'reason', 'html_not_allowed'); exit; end if;
    if char_length(v_text) > 600 then v_problems := v_problems || jsonb_build_object('field', 'text', 'reason', 'too_long'); exit; end if;
  end loop;
  if p_key = 'home' then
    if char_length(coalesce(p->'hero'->>'title', '')) > 60 then v_problems := v_problems || '{"field":"hero.title","max":60}'::jsonb; end if;
    if char_length(coalesce(p->'hero'->>'body', '')) > 140 then v_problems := v_problems || '{"field":"hero.body","max":140}'::jsonb; end if;
    if coalesce(p->'hero'->>'primaryLink', 'carta') not in ('carta','reservas','ambiente','sobre','contactos')
       or coalesce(p->'hero'->>'secondaryLink', 'reservas') not in ('carta','reservas','ambiente','sobre','contactos') then
      v_problems := v_problems || '{"field":"hero.links"}'::jsonb;
    end if;
    if p_for_publish and (coalesce(p->'hero'->>'title', '') = '' or jsonb_array_length(coalesce(p->'featuredItemIds', '[]'::jsonb)) <> 3) then
      v_problems := v_problems || '{"field":"required","reason":"hero.title and three featured items"}'::jsonb;
    end if;
  end if;
  -- Referenced ids must belong to this tenant (and media must be approved to publish).
  select coalesce(array_agg(x::uuid), '{}') into v_media from (
    select jsonb_path_query(p, 'strict $.**.mediaId') #>> '{}' as x
    union all select jsonb_array_elements_text(jsonb_path_query(p, 'strict $.**.mediaIds')) ) m where x ~ '^[0-9a-f-]{36}$';
  select coalesce(array_agg(x::uuid), '{}') into v_items from (
    select jsonb_array_elements_text(coalesce(p->'featuredItemIds', '[]'::jsonb)) x
    union all select jsonb_array_elements_text(coalesce(p->'bar'->'itemIds', '[]'::jsonb))) i where x ~ '^[0-9a-f-]{36}$';
  select m::text into v_bad from unnest(v_media) m where not exists (select 1 from app_private.media_assets a
     where a.restaurant_id = p_rid and a.id = m and a.archived_at is null
       and (not p_for_publish or (a.approved_at is not null and a.visibility = 'public'))) limit 1;
  if v_bad is not null then v_problems := v_problems || jsonb_build_object('field', 'mediaId', 'id', v_bad); end if;
  select i::text into v_bad from unnest(v_items) i where not exists (select 1 from app_private.menu_items mi
     where mi.restaurant_id = p_rid and mi.id = i) limit 1;
  if v_bad is not null then v_problems := v_problems || jsonb_build_object('field', 'itemId', 'id', v_bad); end if;
  return v_problems;
end $$;

create or replace function public.staff_get_site_admin(p_restaurant_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
begin
  perform app_private.require_role(c, array[]::text[]);
  return jsonb_build_object(
    'pages', coalesce((select jsonb_object_agg(p.page_key, jsonb_build_object('draft', p.draft, 'published', p.published,
        'publishedAt', p.published_at, 'version', p.version, 'dirty', p.published is distinct from p.draft))
      from app_private.site_pages p where p.restaurant_id = c.restaurant_id), '{}'::jsonb),
    'theme', (select jsonb_build_object('preset', t.preset, 'draft', t.draft_tokens, 'published', t.published_tokens,
        'version', t.version, 'publishedAt', t.published_at, 'problems', app_private.validate_theme(t.preset, t.draft_tokens))
      from app_private.restaurant_themes t where t.restaurant_id = c.restaurant_id),
    'media', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'key', a.storage_key, 'alt', a.alt_text, 'purpose', a.purpose,
        'width', a.width, 'height', a.height, 'sourceType', a.source_type, 'approved', a.approved_at is not null,
        'visibility', a.visibility, 'archived', a.archived_at is not null, 'createdAt', a.created_at,
        'variants', (select jsonb_agg(jsonb_build_object('role', v.role, 'key', v.storage_key, 'mime', v.mime_type, 'width', v.width))
                       from app_private.media_variants v where v.restaurant_id = a.restaurant_id and v.media_id = a.id))
        order by a.purpose, a.created_at)
      from app_private.media_assets a where a.restaurant_id = c.restaurant_id and a.archived_at is null), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', mi.id, 'name', mi.name, 'visible', mi.is_visible and mi.archived_at is null)
        order by mi.name) from app_private.menu_items mi where mi.restaurant_id = c.restaurant_id), '[]'::jsonb),
    'preview', app_private.site_dto(c.restaurant_id, true));
end $$;

create or replace function public.staff_save_page_draft(p_restaurant_slug text, p_page_key text, p_expected_version integer,
  p_draft jsonb, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('page', p_page_key, 'version', p_expected_version, 'draft', p_draft);
  v_replay jsonb; v_p app_private.site_pages; v_problems jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'save_page', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  select * into v_p from app_private.site_pages where restaurant_id = c.restaurant_id and page_key = p_page_key for update;
  if v_p.id is null then perform app_private.err('NOT_FOUND'); end if;
  if v_p.version <> p_expected_version then perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentVersion', v_p.version)); end if;
  v_problems := app_private.validate_page(c.restaurant_id, p_page_key, p_draft, false);
  if jsonb_array_length(v_problems) > 0 then perform app_private.err('INVALID_INPUT', jsonb_build_object('problems', v_problems)); end if;
  update app_private.site_pages set draft = p_draft, version = version + 1, updated_at = now()
   where id = v_p.id returning * into v_p;
  perform app_private.emit(c.restaurant_id, 'site', v_p.id, 'site.draft_saved', c.member_id, null, null, null, null, null, null,
    jsonb_build_object('page', p_page_key));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'save_page', p_idempotency_key, v_payload, v_p.id, 200,
    jsonb_build_object('version', v_p.version));
end $$;

create or replace function public.staff_publish_page(p_restaurant_slug text, p_page_key text, p_expected_version integer,
  p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('page', p_page_key, 'version', p_expected_version);
  v_replay jsonb; v_p app_private.site_pages; v_problems jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'publish_page', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  select * into v_p from app_private.site_pages where restaurant_id = c.restaurant_id and page_key = p_page_key for update;
  if v_p.id is null then perform app_private.err('NOT_FOUND'); end if;
  if v_p.version <> p_expected_version then perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentVersion', v_p.version)); end if;
  v_problems := app_private.validate_page(c.restaurant_id, p_page_key, v_p.draft, true);
  if jsonb_array_length(v_problems) > 0 then perform app_private.err('INVALID_INPUT', jsonb_build_object('problems', v_problems)); end if;
  update app_private.site_pages set published = draft, published_at = now(), published_by_member_id = c.member_id,
         version = version + 1, updated_at = now()
   where id = v_p.id returning * into v_p;
  perform app_private.emit(c.restaurant_id, 'site', v_p.id, 'site.published', c.member_id, null, null, null, null, null, null,
    jsonb_build_object('page', p_page_key));
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'publish_page', p_idempotency_key, v_payload, v_p.id, 200,
    jsonb_build_object('version', v_p.version, 'publishedAt', v_p.published_at));
end $$;

create or replace function public.staff_save_theme(p_restaurant_slug text, p_expected_version integer, p_preset text,
  p_tokens jsonb, p_publish boolean, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('version', p_expected_version, 'preset', p_preset, 'tokens', p_tokens, 'publish', p_publish);
  v_replay jsonb; v_t app_private.restaurant_themes; v_problems jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'save_theme', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  select * into v_t from app_private.restaurant_themes where restaurant_id = c.restaurant_id for update;
  if v_t.version <> p_expected_version then perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentVersion', v_t.version)); end if;
  v_problems := app_private.validate_theme(p_preset, p_tokens);
  if jsonb_array_length(v_problems) > 0 then perform app_private.err('INVALID_INPUT', jsonb_build_object('problems', v_problems)); end if;
  update app_private.restaurant_themes set preset = p_preset, draft_tokens = p_tokens,
    published_tokens = case when p_publish then p_tokens else published_tokens end,
    published_at = case when p_publish then now() else published_at end,
    version = version + 1, updated_at = now()
  where restaurant_id = c.restaurant_id returning * into v_t;
  perform app_private.emit(c.restaurant_id, 'theme', c.restaurant_id, case when p_publish then 'theme.published' else 'theme.draft_saved' end,
    c.member_id, null, null, p_preset);
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'save_theme', p_idempotency_key, v_payload, null, 200,
    jsonb_build_object('version', v_t.version));
end $$;

-- ---------------------------------------------------------------------
-- Media: authorization for upload (the app server stores the file) and metadata edits
-- ---------------------------------------------------------------------
create or replace function public.staff_authorize_media_upload(p_restaurant_slug text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  return jsonb_build_object('restaurantId', c.restaurant_id, 'memberId', c.member_id);
end $$;

create or replace function public.staff_update_media(p_restaurant_slug text, p_media_id uuid, p_fields jsonb, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('id', p_media_id, 'fields', p_fields); v_replay jsonb; v_a app_private.media_assets;
begin
  perform app_private.require_role(c, array[]::text[]);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'update_media', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  perform app_private.assert_keys(p_fields, array['alt','focalX','focalY','approved','archived']);
  select * into v_a from app_private.media_assets where restaurant_id = c.restaurant_id and id = p_media_id for update;
  if v_a.id is null then perform app_private.err('NOT_FOUND'); end if;
  if coalesce((p_fields->>'archived')::boolean, false) and exists (select 1 from app_private.menu_item_media
       where restaurant_id = c.restaurant_id and media_id = p_media_id) then
    perform app_private.err('DEPENDENCY', '{"reason":"media_used_by_product"}');
  end if;
  update app_private.media_assets set
    alt_text = coalesce(app_private.clean_text(p_fields->>'alt', 160), alt_text),
    focal_x = coalesce((p_fields->>'focalX')::numeric, focal_x), focal_y = coalesce((p_fields->>'focalY')::numeric, focal_y),
    approved_at = case when p_fields ? 'approved' then case when (p_fields->>'approved')::boolean then coalesce(approved_at, now()) end else approved_at end,
    approved_by_member_id = case when p_fields ? 'approved' then case when (p_fields->>'approved')::boolean then c.member_id end else approved_by_member_id end,
    archived_at = case when coalesce((p_fields->>'archived')::boolean, false) then now() else archived_at end
  where restaurant_id = c.restaurant_id and id = p_media_id;
  perform app_private.emit(c.restaurant_id, 'media', p_media_id, 'media.updated', c.member_id);
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'update_media', p_idempotency_key, v_payload, p_media_id, 200,
    jsonb_build_object('ok', true));
end $$;

-- service_role only: register an uploaded (validated, re-encoded) asset.
create or replace function public.system_register_media(p_restaurant_id uuid, p_member_id uuid, p_asset jsonb, p_variants jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid; v jsonb;
begin
  if not exists (select 1 from app_private.restaurant_members where restaurant_id = p_restaurant_id and id = p_member_id and status = 'active') then
    perform app_private.err('FORBIDDEN');
  end if;
  if (p_asset->>'storageKey') not like p_restaurant_id::text || '/%' then perform app_private.err('INVALID_INPUT', '{"field":"storageKey"}'); end if;
  insert into app_private.media_assets(restaurant_id, storage_key, visibility, purpose, mime_type, bytes, width, height, alt_text,
    source_type, source_note)
  values (p_restaurant_id, p_asset->>'storageKey', 'public', coalesce(p_asset->>'purpose', 'other'), p_asset->>'mime',
    (p_asset->>'bytes')::int, (p_asset->>'width')::int, (p_asset->>'height')::int,
    coalesce(app_private.clean_text(p_asset->>'alt', 160), ''), 'uploaded', coalesce(p_asset->>'sourceNote', ''))
  returning id into v_id;
  for v in select * from jsonb_array_elements(coalesce(p_variants, '[]'::jsonb)) loop
    if (v->>'storageKey') not like p_restaurant_id::text || '/%' then perform app_private.err('INVALID_INPUT', '{"field":"variant"}'); end if;
    insert into app_private.media_variants(restaurant_id, media_id, role, storage_key, mime_type, width, height, bytes)
    values (p_restaurant_id, v_id, v->>'role', v->>'storageKey', v->>'mime', (v->>'width')::int, (v->>'height')::int, (v->>'bytes')::int);
  end loop;
  perform app_private.emit(p_restaurant_id, 'media', v_id, 'media.uploaded', p_member_id);
  return jsonb_build_object('media', jsonb_build_object('id', v_id));
end $$;

-- ---------------------------------------------------------------------
-- Reservations (salão/admin)
-- ---------------------------------------------------------------------
create or replace function public.staff_list_reservations(p_restaurant_slug text, p_status text, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_today date := (now() at time zone c.timezone)::date; v_from date := p_from; v_to date := p_to;
begin
  perform app_private.require_role(c, array['floor']);
  if not app_private.is_admin(c) then
    v_from := greatest(coalesce(p_from, v_today), v_today);
    v_to := least(coalesce(p_to, v_today + 90), v_today + 90);
  end if;
  return jsonb_build_object('reservations', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'reference', r.reference,
      'name', r.name, 'email', r.email, 'phone', r.phone, 'partySize', r.party_size,
      'localDate', to_char(r.requested_at_local, 'YYYY-MM-DD'), 'localTime', to_char(r.requested_at_local, 'HH24:MI'),
      'scheduledAt', r.scheduled_at, 'status', r.status, 'note', r.note, 'internalNote', r.internal_note,
      'contactedAt', r.contacted_at, 'version', r.version, 'createdAt', r.created_at, 'anonymized', r.anonymized_at is not null,
      'handledBy', (select display_name from app_private.restaurant_members m where m.restaurant_id = r.restaurant_id and m.id = r.handled_by_member_id))
      order by r.scheduled_at)
    from app_private.reservations r where r.restaurant_id = c.restaurant_id
     and (p_status is null or r.status = p_status)
     and (v_from is null or r.requested_at_local::date >= v_from) and (v_to is null or r.requested_at_local::date <= v_to)
    limit 200), '[]'::jsonb));
end $$;

create or replace function public.staff_transition_reservation(p_restaurant_slug text, p_reservation_id uuid, p_target text,
  p_version integer, p_contact_confirmed boolean, p_internal_note text, p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug);
  v_payload jsonb := jsonb_build_object('id', p_reservation_id, 'target', p_target, 'version', p_version,
    'contact', p_contact_confirmed, 'note', p_internal_note);
  v_replay jsonb; v_r app_private.reservations; v_from text;
begin
  perform app_private.require_role(c, array['floor']);
  perform app_private.staff_mutation_guard(c);
  v_replay := app_private.idem_lookup(c.restaurant_id, 'member:' || c.member_id, 'transition_reservation', p_idempotency_key, v_payload);
  if v_replay is not null then return v_replay; end if;
  select * into v_r from app_private.reservations where restaurant_id = c.restaurant_id and id = p_reservation_id for update;
  if v_r.id is null then perform app_private.err('NOT_FOUND'); end if;
  if v_r.version <> p_version then perform app_private.err('VERSION_CONFLICT', jsonb_build_object('currentVersion', v_r.version, 'status', v_r.status)); end if;
  if not ((v_r.status = 'pending' and p_target in ('confirmed','declined','cancelled'))
       or (v_r.status = 'confirmed' and p_target in ('completed','cancelled','no_show'))) then
    perform app_private.err('INVALID_STATE', jsonb_build_object('from', v_r.status, 'to', p_target));
  end if;
  if p_target = 'confirmed' and not coalesce(p_contact_confirmed, false) then
    perform app_private.err('INVALID_INPUT', '{"field":"contactConfirmed","reason":"confirm_contact_first"}');
  end if;
  v_from := v_r.status;
  update app_private.reservations set status = p_target,
    contacted_at = case when p_target = 'confirmed' then coalesce(contacted_at, now()) else contacted_at end,
    internal_note = coalesce(app_private.clean_text(p_internal_note, 300), internal_note),
    handled_by_member_id = c.member_id, version = version + 1
  where restaurant_id = c.restaurant_id and id = p_reservation_id returning * into v_r;
  perform app_private.emit(c.restaurant_id, 'reservation', p_reservation_id, 'reservation.' || p_target, c.member_id, null, v_from, p_target);
  perform app_private.invalidate(c.restaurant_id, array['reservations'], array['floor']);
  return app_private.idem_store(c.restaurant_id, 'member:' || c.member_id, 'transition_reservation', p_idempotency_key, v_payload,
    p_reservation_id, 200, jsonb_build_object('reservation', jsonb_build_object('id', v_r.id, 'status', v_r.status, 'version', v_r.version)));
end $$;

-- ---------------------------------------------------------------------
-- History lists (cursor pagination by (created_at, id), limit ≤ 100)
-- ---------------------------------------------------------------------
create or replace function public.staff_list_orders(p_restaurant_slug text, p_cursor_at timestamptz, p_cursor_id uuid,
  p_limit integer, p_business_date date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug); v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_rows jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  select coalesce(jsonb_agg(x order by (x->>'submittedAt') desc, x->>'id' desc), '[]'::jsonb) into v_rows from (
    select jsonb_build_object('id', o.id, 'number', o.order_number, 'submittedAt', o.submitted_at, 'source', o.source,
      'tableLabel', t.label, 'visitId', o.visit_id, 'businessDate', o.business_date,
      'status', app_private.order_status(array(select oi.status from app_private.order_items oi where oi.restaurant_id = o.restaurant_id and oi.order_id = o.id)),
      'totalCents', (select coalesce(sum(oi.quantity * oi.unit_price_cents) filter (where oi.status <> 'cancelled'), 0)
                       from app_private.order_items oi where oi.restaurant_id = o.restaurant_id and oi.order_id = o.id),
      'units', (select coalesce(sum(oi.quantity), 0) from app_private.order_items oi where oi.restaurant_id = o.restaurant_id and oi.order_id = o.id)) x
      from app_private.orders o
      join app_private.table_visits v on v.restaurant_id = o.restaurant_id and v.id = o.visit_id
      join app_private.dining_tables t on t.restaurant_id = v.restaurant_id and t.id = v.table_id
     where o.restaurant_id = c.restaurant_id
       and (p_business_date is null or o.business_date = p_business_date)
       and (p_cursor_at is null or (o.submitted_at, o.id) < (p_cursor_at, p_cursor_id))
     order by o.submitted_at desc, o.id desc limit v_limit) q;
  return jsonb_build_object('orders', v_rows, 'nextCursor', case when jsonb_array_length(v_rows) = v_limit then
    jsonb_build_object('at', v_rows->(v_limit - 1)->>'submittedAt', 'id', v_rows->(v_limit - 1)->>'id') end);
end $$;

create or replace function public.staff_get_order(p_restaurant_slug text, p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug); v jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  select jsonb_build_object('id', o.id, 'number', o.order_number, 'submittedAt', o.submitted_at, 'source', o.source,
    'assistedReason', o.assisted_reason, 'tableLabel', t.label, 'visitId', o.visit_id, 'visitStatus', v.status,
    'createdBy', (select display_name from app_private.restaurant_members m where m.restaurant_id = o.restaurant_id and m.id = o.created_by_member_id),
    'lines', (select jsonb_agg(jsonb_build_object('id', oi.id, 'name', oi.product_name_snapshot, 'quantity', oi.quantity,
        'unitPriceCents', oi.unit_price_cents, 'status', oi.status, 'note', oi.customer_note, 'stationCode', s.code,
        'preparedStartedAt', oi.prepared_started_at, 'readyAt', oi.ready_at, 'pickedUpAt', oi.picked_up_at,
        'deliveredAt', oi.delivered_at, 'cancelledAt', oi.cancelled_at, 'cancelReason', oi.cancel_reason, 'version', oi.version,
        'currentPriceCents', mi.price_cents, 'currentName', mi.name) order by oi.created_at, oi.id)
      from app_private.order_items oi join app_private.stations s on s.restaurant_id = oi.restaurant_id and s.id = oi.station_id_snapshot
      join app_private.menu_items mi on mi.restaurant_id = oi.restaurant_id and mi.id = oi.menu_item_id
      where oi.restaurant_id = o.restaurant_id and oi.order_id = o.id),
    'events', (select jsonb_agg(jsonb_build_object('at', e.occurred_at, 'type', e.event_type, 'from', e.from_state, 'to', e.to_state,
        'reason', e.reason, 'actorKind', e.actor_kind,
        'actor', (select display_name from app_private.restaurant_members m where m.restaurant_id = e.restaurant_id and m.id = e.actor_member_id))
        order by e.occurred_at, e.id)
      from app_private.domain_events e where e.restaurant_id = o.restaurant_id and e.order_id = o.id))
    into v
    from app_private.orders o
    join app_private.table_visits v on v.restaurant_id = o.restaurant_id and v.id = o.visit_id
    join app_private.dining_tables t on t.restaurant_id = v.restaurant_id and t.id = v.table_id
   where o.restaurant_id = c.restaurant_id and o.id = p_order_id;
  if v is null then perform app_private.err('NOT_FOUND'); end if;
  return v;
end $$;

create or replace function public.staff_list_calls(p_restaurant_slug text, p_cursor_at timestamptz, p_cursor_id uuid, p_limit integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug); v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_rows jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  select coalesce(jsonb_agg(x order by (x->>'createdAt') desc, x->>'id' desc), '[]'::jsonb) into v_rows from (
    select app_private.call_dto(sc) || jsonb_build_object('tableLabel', t.label, 'resolutionNote', sc.resolution_note,
      'cancelledAt', sc.cancelled_at, 'waitSeconds', extract(epoch from sc.claimed_at - sc.created_at)::int) x
      from app_private.service_calls sc
      join app_private.table_visits v on v.restaurant_id = sc.restaurant_id and v.id = sc.visit_id
      join app_private.dining_tables t on t.restaurant_id = v.restaurant_id and t.id = v.table_id
     where sc.restaurant_id = c.restaurant_id and (p_cursor_at is null or (sc.created_at, sc.id) < (p_cursor_at, p_cursor_id))
     order by sc.created_at desc, sc.id desc limit v_limit) q;
  return jsonb_build_object('calls', v_rows, 'nextCursor', case when jsonb_array_length(v_rows) = v_limit then
    jsonb_build_object('at', v_rows->(v_limit - 1)->>'createdAt', 'id', v_rows->(v_limit - 1)->>'id') end);
end $$;

create or replace function public.staff_list_bills(p_restaurant_slug text, p_cursor_at timestamptz, p_cursor_id uuid, p_limit integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug); v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_rows jsonb;
begin
  perform app_private.require_role(c, array[]::text[]);
  select coalesce(jsonb_agg(x order by (x->>'createdAt') desc, x->>'id' desc), '[]'::jsonb) into v_rows from (
    select app_private.bill_dto(c.restaurant_id, b.id) || jsonb_build_object('tableLabel', t.label, 'createdAt', b.created_at,
      'voidReason', b.void_reason,
      'payment', (select jsonb_build_object('method', p.method, 'amountCents', p.amount_cents, 'recordedAt', p.recorded_at)
                    from app_private.payment_records p where p.restaurant_id = b.restaurant_id and p.bill_id = b.id)) x
      from app_private.bills b
      join app_private.table_visits v on v.restaurant_id = b.restaurant_id and v.id = b.visit_id
      join app_private.dining_tables t on t.restaurant_id = v.restaurant_id and t.id = v.table_id
     where b.restaurant_id = c.restaurant_id and (p_cursor_at is null or (b.created_at, b.id) < (p_cursor_at, p_cursor_id))
     order by b.created_at desc, b.id desc limit v_limit) q;
  return jsonb_build_object('bills', v_rows, 'nextCursor', case when jsonb_array_length(v_rows) = v_limit then
    jsonb_build_object('at', v_rows->(v_limit - 1)->>'createdAt', 'id', v_rows->(v_limit - 1)->>'id') end);
end $$;

create or replace function public.staff_get_bill(p_restaurant_slug text, p_bill_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c app_private.staff_context := app_private.staff_ctx(p_restaurant_slug); v_visit uuid;
begin
  perform app_private.require_role(c, array['cashier']);
  select visit_id into v_visit from app_private.bills where restaurant_id = c.restaurant_id and id = p_bill_id;
  if v_visit is null then perform app_private.err('NOT_FOUND'); end if;
  return public.staff_get_visit(p_restaurant_slug, v_visit) || jsonb_build_object(
    'snapshotLines', coalesce((select jsonb_agg(jsonb_build_object('name', bl.product_name_snapshot, 'quantity', bl.quantity,
        'unitPriceCents', bl.unit_price_cents, 'lineTotalCents', bl.line_total_cents, 'cancelled', bl.cancelled_at_snapshot is not null))
      from app_private.bill_lines bl where bl.restaurant_id = c.restaurant_id and bl.bill_id = p_bill_id), '[]'::jsonb));
end $$;
