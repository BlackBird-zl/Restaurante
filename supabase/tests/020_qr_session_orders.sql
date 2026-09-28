-- QA-Q01..Q06, QA-O01..O08, QA-M01 · QR/session and transactional order creation
begin;
\ir _helpers.psql
select plan(37);

select tests.set('rid', tests.rid('patio-do-ferro')::text);
select tests.set('t14', tests.tbl('patio-do-ferro', '14')::text);
select tests.set('qr14', tests.scalar(format($$ select id::text from app_private.qr_codes where table_id = %L and status = 'active' $$, tests.get('t14'))));
select tests.set('p10', tests.item('patio-do-ferro', 'hamburguer-do-patio')::text);
select tests.set('p11', tests.item('patio-do-ferro', 'batata-frita')::text);
select tests.set('p19', tests.item('patio-do-ferro', 'cola')::text);
select tests.set('p07', tests.item('patio-do-ferro', 'polvo-na-brasa')::text);
select tests.set('k_open', gen_random_uuid()::text);

create or replace function tests.lines(p_note text default null) returns jsonb language sql stable as $$
  select jsonb_build_array(
    jsonb_build_object('itemId', tests.get('p10'), 'quantity', 2, 'expectedItemVersion', tests.item_version(tests.get('p10')::uuid), 'expectedPriceCents', tests.item_price(tests.get('p10')::uuid)),
    jsonb_build_object('itemId', tests.get('p11'), 'quantity', 1, 'note', p_note, 'expectedItemVersion', tests.item_version(tests.get('p11')::uuid), 'expectedPriceCents', 450),
    jsonb_build_object('itemId', tests.get('p19'), 'quantity', 2, 'expectedItemVersion', tests.item_version(tests.get('p19')::uuid), 'expectedPriceCents', 300)) $$;
grant execute on function tests.lines(text) to anon, authenticated, service_role;

-- ---- Open visit (salão) -----------------------------------------------------------------
select tests.login('rui@patio.example');
select tests.set('open1', public.staff_open_visit('patio-do-ferro', tests.get('t14')::uuid, 3, tests.digest('314159'), tests.get('k_open')::uuid)::text);
select is(tests.get('open1')::jsonb->>'joinCodeIssued', 'true', 'visit opened and code issued once');
select tests.set('visit', tests.get('open1')::jsonb->'visit'->>'id');
select is(public.staff_open_visit('patio-do-ferro', tests.get('t14')::uuid, 3, tests.digest('999999'), tests.get('k_open')::uuid)->>'joinCodeUnavailable', 'true',
  'replay of open returns joinCodeUnavailable (code never cached)');
select is(public.staff_open_visit('patio-do-ferro', tests.get('t14')::uuid, 3, tests.digest('888888'), gen_random_uuid())->'visit'->>'id', tests.get('visit'),
  'QA-Q06 second open with another key returns the same active visit');
select tests.reset();
select is(tests.scalar(format($$ select count(*) from app_private.table_visits where table_id = %L and status in ('open','billing') $$, tests.get('t14'))), '1',
  'QA-Q06 exactly one active visit for Mesa 14');
select is(tests.scalar(format($$ select join_code_digest from app_private.table_visits where id = %L $$, tests.get('visit'))), tests.digest('314159'),
  'original join code still valid after replays');

-- ---- QR bootstrap and join (guest via service role) ---------------------------------------
select tests.as_service();
select is(public.guest_resolve_qr(tests.get('rid')::uuid, repeat('0', 64), 'ip1')->>'error', 'QR_INVALID', 'QA-Q01 unknown QR token rejected');
select is(public.guest_join_visit(tests.get('rid')::uuid, tests.get('qr14')::uuid, 'nonce-a', tests.digest('000000'), encode(extensions.digest('s-x', 'sha256'), 'hex'), 'ip1')->>'error',
  'INVALID_CODE', 'QA-Q03 wrong code rejected');
select is(public.guest_join_visit(tests.get('rid')::uuid, tests.get('qr14')::uuid, 'nonce-a', tests.digest('314159'), encode(extensions.digest('s-1', 'sha256'), 'hex'), 'ip1')->>'ok',
  'true', 'QA-Q04 device 1 joins with QR context + code');
select is(public.guest_join_visit(tests.get('rid')::uuid, tests.get('qr14')::uuid, 'nonce-b', tests.digest('314159'), encode(extensions.digest('s-2', 'sha256'), 'hex'), 'ip2')->>'ok',
  'true', 'QA-Q04 device 2 joins the same visit');
select tests.set('s1', encode(extensions.digest('s-1', 'sha256'), 'hex'));
select tests.set('s2', encode(extensions.digest('s-2', 'sha256'), 'hex'));
select tests.set('k1', gen_random_uuid()::text);

-- ---- Mixed order routing (QA-O01) ---------------------------------------------------------
select tests.set('o1', public.guest_create_order(tests.get('rid')::uuid, tests.get('s1'), tests.lines('sem sal'), tests.get('k1')::uuid)::text);
select is((tests.get('o1')::jsonb->'order'->>'totalCents')::int, 4050, 'QA-O01 total computed in the database = 4050');
select tests.reset();
select is(tests.scalar(format($$ select string_agg(oi.product_name_snapshot || 'x' || oi.quantity, ',' order by oi.product_name_snapshot)
    from app_private.order_items oi join app_private.station_tickets st on st.id = oi.ticket_id join app_private.stations s on s.id = st.station_id
   where oi.order_id = %L and s.code = 'COZ' $$, tests.get('o1')::jsonb->'order'->>'id')), 'Batata fritax1,Hambúrguer do Pátiox2',
  'QA-O01 kitchen ticket has P10/P11 only');
select is(tests.scalar(format($$ select string_agg(oi.product_name_snapshot || 'x' || oi.quantity, ',')
    from app_private.order_items oi join app_private.stations s on s.id = oi.station_id_snapshot where oi.order_id = %L and s.code = 'BAR' $$,
    tests.get('o1')::jsonb->'order'->>'id')), 'Colax2', 'QA-O01 bar ticket has P19 only');
select is(tests.scalar(format($$ select count(*) from app_private.station_tickets where order_id = %L $$, tests.get('o1')::jsonb->'order'->>'id')), '2',
  'one ticket per station');
select is(tests.scalar(format($$ select sum(unit_price_cents * quantity) from app_private.order_items where order_id = %L $$, tests.get('o1')::jsonb->'order'->>'id')),
  '4050', 'snapshots carry unit prices');

-- ---- Idempotency (QA-O03, O04, O05) --------------------------------------------------------
select tests.as_service();
select is(public.guest_create_order(tests.get('rid')::uuid, tests.get('s1'), tests.lines('sem sal'), tests.get('k1')::uuid)->'order'->>'id',
  tests.get('o1')::jsonb->'order'->>'id', 'QA-O03/O05 same key+payload returns the original order');
select throws_ok(format($$ select public.guest_create_order(%L, %L, tests.lines('outra nota'), %L) $$, tests.get('rid'), tests.get('s1'), tests.get('k1')),
  'P0001', 'IDEMPOTENCY_CONFLICT', 'QA-O04 same key with different payload -> 409');
select tests.reset();
select is(tests.scalar(format($$ select count(*) from app_private.orders where visit_id = %L $$, tests.get('visit'))), '1',
  'no duplicate order after replays');
select tests.as_service();

-- ---- Tampering and validation (QA-O02, O07) -------------------------------------------------
select throws_ok(format($$ select public.guest_create_order(%L, %L, jsonb_build_array(jsonb_build_object('itemId', %L, 'quantity', 1,
    'expectedItemVersion', 1, 'expectedPriceCents', 300, 'priceCents', 1)), gen_random_uuid()) $$, tests.get('rid'), tests.get('s1'), tests.get('p19')),
  'P0001', 'INVALID_INPUT', 'QA-O02 extra field priceCents rejected by strict schema');
select throws_ok(format($$ select public.guest_create_order(%L, %L, jsonb_build_array(jsonb_build_object('itemId', %L, 'quantity', 1,
    'expectedItemVersion', tests.item_version(%L), 'expectedPriceCents', 1)), gen_random_uuid()) $$, tests.get('rid'), tests.get('s1'), tests.get('p19'), tests.get('p19')),
  'P0001', 'PRICE_CHANGED', 'QA-O02 tampered expected price never charged: PRICE_CHANGED');
select throws_ok(format($$ select public.guest_create_order(%L, %L, jsonb_build_array(jsonb_build_object('itemId', %L, 'quantity', 11,
    'expectedItemVersion', 1, 'expectedPriceCents', 300)), gen_random_uuid()) $$, tests.get('rid'), tests.get('s1'), tests.get('p19')),
  'P0001', 'INVALID_INPUT', 'quantity above 10 rejected');
select throws_ok(format($$ select public.guest_create_order(%L, %L, jsonb_build_array(
    jsonb_build_object('itemId', %L, 'quantity', 1, 'expectedItemVersion', tests.item_version(%L), 'expectedPriceCents', 300),
    jsonb_build_object('itemId', %L, 'quantity', 1, 'expectedItemVersion', tests.item_version(%L), 'expectedPriceCents', 2350)), gen_random_uuid()) $$,
    tests.get('rid'), tests.get('s1'), tests.get('p19'), tests.get('p19'), tests.get('p07'), tests.get('p07')),
  'P0001', 'ITEM_UNAVAILABLE', 'QA-O07 unavailable P07 aborts the whole order');
select throws_ok(format($$ select public.guest_create_order(%L, %L, jsonb_build_array(jsonb_build_object('itemId', %L, 'quantity', 1,
    'note', '<b>x</b>', 'expectedItemVersion', tests.item_version(%L), 'expectedPriceCents', 300)), gen_random_uuid()) $$,
    tests.get('rid'), tests.get('s1'), tests.get('p19'), tests.get('p19')),
  'P0001', 'INVALID_INPUT', 'HTML in notes rejected');
select tests.reset();
select is(tests.scalar(format($$ select count(*) from app_private.orders where visit_id = %L $$, tests.get('visit'))), '1',
  'failed attempts left no partial order');

-- ---- Second guest, same bill (QA-O06) and sanitized shared view ------------------------------
select tests.as_service();
select tests.set('o2', public.guest_create_order(tests.get('rid')::uuid, tests.get('s2'), tests.lines(), gen_random_uuid())::text);
select is((tests.get('o2')::jsonb->>'billTotalCents')::int, 8100, 'QA-O06 two legitimate orders share one bill (8100)');
select tests.set('snap2', public.guest_get_snapshot(tests.get('rid')::uuid, tests.get('s2'))::text);
select is(jsonb_array_length(tests.get('snap2')::jsonb->'data'->'orders'), 2, 'guest sees both orders of the table');
select is((select count(*)::int from jsonb_array_elements(tests.get('snap2')::jsonb->'data'->'orders') o,
            jsonb_array_elements(o->'lines') l where l->>'note' = 'sem sal'), 0, 'notes of another device are hidden');
select ok(tests.get('snap2')::text !~ 'guestSessionId|token|memberId', 'snapshot has no actor ids or secrets');

-- ---- Rate limits (orders 3/min per session; code 5 failures per context) ---------------------
select lives_ok(format($$ select public.guest_create_order(%L, %L, tests.lines(), gen_random_uuid()) $$, tests.get('rid'), tests.get('s1')), 'order 2 of session 1');
select lives_ok(format($$ select public.guest_create_order(%L, %L, tests.lines(), gen_random_uuid()) $$, tests.get('rid'), tests.get('s1')), 'order 3 of session 1');
select throws_ok(format($$ select public.guest_create_order(%L, %L, tests.lines(), gen_random_uuid()) $$, tests.get('rid'), tests.get('s1')),
  'P0001', 'RATE_LIMITED', '4th order in the same minute is rate limited');
select public.guest_join_visit(tests.get('rid')::uuid, tests.get('qr14')::uuid, 'nonce-z', tests.digest('000001'), encode(extensions.digest('z', 'sha256'), 'hex'), 'ip9')
  from generate_series(1, 5);
select is(public.guest_join_visit(tests.get('rid')::uuid, tests.get('qr14')::uuid, 'nonce-z', tests.digest('314159'), encode(extensions.digest('z', 'sha256'), 'hex'), 'ip9')->>'error',
  'RATE_LIMITED', 'QA-Q03 after 5 wrong codes the context is locked even with the right code');
select tests.reset();

-- ---- Price/station edit after an order (QA-M01, O08) -----------------------------------------
select tests.login('diogo@patio.example');
select lives_ok(format($$ select public.staff_update_item('patio-do-ferro', %L, tests.item_version(%L), '{"priceCents":1600}', gen_random_uuid()) $$,
  tests.get('p10'), tests.get('p10')), 'admin changes P10 price to 16,00 €');
select tests.reset();
select is(tests.scalar(format($$ select unit_price_cents from app_private.order_items where order_id = %L and menu_item_id = %L $$,
  tests.get('o1')::jsonb->'order'->>'id', tests.get('p10'))), '1500', 'QA-M01 historic order keeps 15,00 € snapshot');
select is((public.site_get_menu(tests.get('rid')::uuid)->'items') @> jsonb_build_array(jsonb_build_object('slug', 'hamburguer-do-patio', 'priceCents', 1600)), true,
  'public menu shows the new price immediately');
select tests.login('diogo@patio.example');
select throws_ok(format($$ select public.staff_update_item('patio-do-ferro', %L, 1, '{"priceCents":1700}', gen_random_uuid()) $$, tests.get('p10')),
  'P0001', 'VERSION_CONFLICT', 'QA-M02 stale version cannot overwrite');
select tests.reset();

-- ---- Session revocation after visit close (QA-Q05) -------------------------------------------
update app_private.table_visits set status = 'closed', closed_at = now() where id = tests.get('visit')::uuid;
select tests.as_service();
select is(public.guest_get_snapshot(tests.get('rid')::uuid, tests.get('s1'))->>'error', 'VISIT_CLOSED', 'QA-Q05 closed visit: old cookie gets VISIT_CLOSED');
select throws_ok(format($$ select public.guest_create_call(%L, %L, 'help', gen_random_uuid()) $$, tests.get('rid'), tests.get('s1')),
  'P0001', 'VISIT_CLOSED', 'QA-Q05 closed visit: old session cannot act');
select tests.reset();

select * from finish();
rollback;
