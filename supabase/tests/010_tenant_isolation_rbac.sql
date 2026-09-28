-- QA-T01, T02, T04, T05, A02, A03, A04, M07 · Isolation between tenants and role limits
begin;
\ir _helpers.psql
select plan(31);

select tests.set('a_order', tests.scalar($$ select o.id::text from app_private.orders o join app_private.restaurants r on r.id = o.restaurant_id
  where r.slug = 'patio-do-ferro' and o.order_number = 6 $$));
select tests.set('a_line_coz', tests.scalar($$ select oi.id::text from app_private.order_items oi join app_private.restaurants r on r.id = oi.restaurant_id
  where r.slug = 'patio-do-ferro' and oi.product_name_snapshot = 'Hambúrguer do Pátio' and oi.status = 'preparing' $$));
select tests.set('a_bill', tests.scalar($$ select b.id::text from app_private.bills b join app_private.restaurants r on r.id = b.restaurant_id
  where r.slug = 'patio-do-ferro' and b.status = 'requested' $$));
select tests.set('a_member_marta', tests.scalar($$ select m.id::text from app_private.restaurant_members m join auth.users u on u.id = m.user_id
  join app_private.restaurants r on r.id = m.restaurant_id where r.slug = 'patio-do-ferro' and u.email = 'marta@patio.example' $$));
select tests.set('a_member_rui', tests.scalar($$ select m.id::text from app_private.restaurant_members m join auth.users u on u.id = m.user_id
  join app_private.restaurants r on r.id = m.restaurant_id where r.slug = 'patio-do-ferro' and u.email = 'rui@patio.example' $$));
select tests.set('a_member_diogo', tests.scalar($$ select m.id::text from app_private.restaurant_members m join auth.users u on u.id = m.user_id
  join app_private.restaurants r on r.id = m.restaurant_id where r.slug = 'patio-do-ferro' and u.email = 'diogo@patio.example' $$));
select tests.set('b_visit', tests.scalar($$ select v.id::text from app_private.table_visits v join app_private.restaurants r on r.id = v.restaurant_id
  where r.slug = 'balcao-do-largo' and v.status = 'open' $$));

-- ---- Tenant B owner against tenant A --------------------------------------------------
select tests.login('joana@balcao.example');
select throws_ok($$ select public.staff_get_floor('patio-do-ferro') $$, 'P0001', 'NOT_FOUND', 'QA-T01 B owner cannot open A floor (NOT_FOUND)');
select throws_ok($$ select public.staff_get_order('balcao-do-largo', tests.get('a_order')::uuid) $$, 'P0001', 'NOT_FOUND',
  'QA-T01 B owner reading A order by UUID via own slug -> NOT_FOUND');
select throws_ok(format($$ select public.staff_update_item('balcao-do-largo', %L, 1, '{"priceCents":1}', gen_random_uuid()) $$,
  tests.item('patio-do-ferro', 'espresso')), 'P0001', 'NOT_FOUND', 'QA-T01 B owner cannot edit A product by UUID');
select throws_ok(format($$ select public.staff_settle_bill('balcao-do-largo', %L, 1, 3450, 'cash', null, gen_random_uuid()) $$,
  tests.get('a_bill')), 'P0001', 'NOT_FOUND', 'QA-T01 B owner cannot settle A bill');
select throws_ok(format($$ select public.staff_create_order('balcao-do-largo', %L, jsonb_build_array(jsonb_build_object(
    'itemId', %L, 'quantity', 1, 'expectedItemVersion', 1, 'expectedPriceCents', 180)), null, gen_random_uuid()) $$,
  tests.get('b_visit'), tests.item('patio-do-ferro', 'espresso')), 'P0001', 'ITEM_UNAVAILABLE',
  'QA-T02 item of A inside order of B is rejected by the RPC');
select lives_ok($$ select public.staff_get_floor('balcao-do-largo') $$, 'B owner opens own floor');
select is((public.staff_admin_menu('balcao-do-largo')->'items'->0->>'slug') is not null, true, 'B admin menu readable');
select is((select count(*)::int from jsonb_array_elements(public.staff_admin_menu('balcao-do-largo')->'items') i
            where i->>'id' = tests.item('patio-do-ferro', 'espresso')::text), 0, 'B menu does not contain A products (same slug, different id)');
select tests.reset();

-- ---- Composite FK blocks cross-tenant links even for privileged writers ------------------
select throws_ok(format($$ insert into app_private.menu_item_media(restaurant_id, menu_item_id, media_id)
    values (%L, %L, (select id from app_private.media_assets where restaurant_id = %L limit 1)) $$,
  tests.rid('balcao-do-largo'), tests.item('balcao-do-largo', 'espresso'), tests.rid('patio-do-ferro')),
  '23503', null, 'QA-T02 composite FK rejects media of A linked to product of B');
select throws_ok(format($$ insert into app_private.order_items(restaurant_id, order_id, ticket_id, menu_item_id, station_id_snapshot,
    product_name_snapshot, unit_price_cents, quantity)
    select %L, st.order_id, st.id, %L, st.station_id, 'x', 100, 1 from app_private.station_tickets st where st.restaurant_id = %L limit 1 $$,
  tests.rid('balcao-do-largo'), tests.item('patio-do-ferro', 'cola'), tests.rid('balcao-do-largo')),
  '23503', null, 'QA-T02 composite FK rejects product of A in order line of B');

-- ---- Kitchen escalation attempts (QA-A02) -------------------------------------------------
select tests.login('ines@patio.example');
select throws_ok(format($$ select public.staff_update_item('patio-do-ferro', %L, %s, '{"priceCents":100}', gen_random_uuid()) $$,
  tests.item('patio-do-ferro', 'vazia-na-brasa'), tests.item_version(tests.item('patio-do-ferro', 'vazia-na-brasa'))),
  'P0001', 'FORBIDDEN', 'QA-A02 kitchen cannot edit prices');
select throws_ok($$ select public.staff_list_bills('patio-do-ferro', null, null, 10) $$, 'P0001', 'FORBIDDEN', 'QA-A02 kitchen cannot list payments/bills');
select throws_ok($$ select public.staff_get_cashier('patio-do-ferro') $$, 'P0001', 'FORBIDDEN', 'kitchen cannot open cashier');
select throws_ok($$ select public.staff_get_floor('patio-do-ferro') $$, 'P0001', 'FORBIDDEN', 'kitchen cannot open floor (prices, tables)');
select throws_ok(format($$ select public.staff_update_member('patio-do-ferro', %L, 1, '{"roles":["admin"]}', gen_random_uuid()) $$,
  tests.get('a_member_rui')), 'P0001', 'FORBIDDEN', 'QA-A02 kitchen cannot change roles');
select throws_ok($$ select public.staff_get_station('patio-do-ferro', 'BAR') $$, 'P0001', 'FORBIDDEN', 'kitchen cannot read the bar KDS');
select ok(public.staff_get_station('patio-do-ferro', 'COZ')::text !~ 'priceCents|Cola', 'kitchen KDS has no prices and no bar products');
select tests.reset();

select tests.login('tomas@patio.example');
select throws_ok(format($$ select public.staff_transition_items('patio-do-ferro', jsonb_build_array(jsonb_build_object('id', %L, 'version', 2)),
  'ready', gen_random_uuid()) $$, tests.get('a_line_coz')), 'P0001', 'FORBIDDEN', 'QA-K02 bar cannot advance a kitchen line');
select tests.reset();

-- ---- Admin vs owner limits (QA-A04, M07) ------------------------------------------------
select tests.login('diogo@patio.example');
select throws_ok(format($$ select public.staff_update_member('patio-do-ferro', %L, 1, '{"status":"suspended"}', gen_random_uuid()) $$,
  tests.get('a_member_marta')), 'P0001', 'FORBIDDEN', 'QA-A04 admin cannot suspend the owner');
select throws_ok(format($$ select public.staff_update_member('patio-do-ferro', %L, 1, '{"roles":["floor","admin"]}', gen_random_uuid()) $$,
  tests.get('a_member_rui')), 'P0001', 'FORBIDDEN', 'QA-A04 admin cannot promote to admin (owner only)');
select throws_ok(format($$ select public.staff_update_member('patio-do-ferro', %L, 1, '{"roles":["floor"]}', gen_random_uuid()) $$,
  tests.get('a_member_diogo')), 'P0001', 'FORBIDDEN', 'admin cannot remove own admin role');
select throws_ok(format($$ select public.staff_transfer_ownership('patio-do-ferro', %L, gen_random_uuid()) $$,
  tests.get('a_member_diogo')), 'P0001', 'FORBIDDEN', 'only owner transfers ownership');
select throws_ok(format($$ select public.staff_accept_invitation(%L) $$, tests.get('a_member_rui')), 'P0001', 'NOT_FOUND',
  'QA-A04 cannot accept an invitation that is not for the authenticated email');
select tests.reset();

-- ---- Suspension takes effect on the next request (QA-A03) ------------------------------
select tests.login('marta@patio.example');
select lives_ok(format($$ select public.staff_update_member('patio-do-ferro', %L, 1, '{"status":"suspended"}', gen_random_uuid()) $$,
  tests.get('a_member_rui')), 'owner suspends Rui');
select tests.login('rui@patio.example');
select throws_ok($$ select public.staff_get_floor('patio-do-ferro') $$, 'P0001', 'NOT_FOUND', 'QA-A03 suspended member loses access immediately');
select tests.reset();

-- ---- Realtime rows only for the recipient (QA-T04) -------------------------------------
delete from public.staff_invalidations;
insert into public.staff_invalidations(restaurant_id, recipient_member_id, scope)
select m.restaurant_id, m.id, 'orders' from app_private.restaurant_members m
 where m.restaurant_id in (tests.rid('patio-do-ferro'), tests.rid('balcao-do-largo'));
select tests.login('sara@patio.example');
select is((select count(*)::int from public.staff_invalidations), 1, 'QA-T04 member sees only own invalidation rows');
select is((select count(*)::int from public.staff_invalidations where restaurant_id = tests.rid('balcao-do-largo')), 0,
  'QA-T04 no invalidations of another tenant even when filtering for them');
select tests.reset();

-- ---- Same user, different roles per tenant (QA-T05) -------------------------------------
select tests.login('multi@teste.example');
select lives_ok($$ select public.staff_admin_menu('patio-do-ferro') $$, 'QA-T05 multi user is admin in A');
select throws_ok($$ select public.staff_admin_menu('balcao-do-largo') $$, 'P0001', 'FORBIDDEN', 'QA-T05 admin role of A does not travel to B');
select lives_ok($$ select public.staff_get_station('balcao-do-largo', 'BAR') $$, 'QA-T05 multi user works B bar');
select throws_ok($$ select public.staff_get_station('balcao-do-largo', 'COZ') $$, 'P0001', 'FORBIDDEN', 'QA-T05 bar in B cannot open B kitchen');
select tests.reset();

select * from finish();
rollback;
