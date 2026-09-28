-- QA-K01..K04, QA-S01..S06, QA-B01..B08 · Station work, delivery, calls and bill closing
begin;
\ir _helpers.psql
select plan(44);

select tests.set('rid', tests.rid('patio-do-ferro')::text);
select tests.set('t14', tests.tbl('patio-do-ferro', '14')::text);
select tests.set('qr14', tests.scalar(format($$ select id::text from app_private.qr_codes where table_id = %L and status = 'active' $$, tests.get('t14'))));
create or replace function tests.line(p_name text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', oi.id, 'version', oi.version) from app_private.order_items oi
   where oi.order_id = tests.get('order')::uuid and oi.product_name_snapshot = p_name $$;

-- Setup: Rui opens Mesa 14, guest joins, guest orders P10x2, P11x1, P19x2.
select tests.login('rui@patio.example');
select tests.set('visit', public.staff_open_visit('patio-do-ferro', tests.get('t14')::uuid, 2, tests.digest('271828'), gen_random_uuid())->'visit'->>'id');
select tests.reset();
select tests.as_service();
select public.guest_join_visit(tests.get('rid')::uuid, tests.get('qr14')::uuid, 'n1', tests.digest('271828'), encode(extensions.digest('g1', 'sha256'), 'hex'), 'ip');
select public.guest_join_visit(tests.get('rid')::uuid, tests.get('qr14')::uuid, 'n2', tests.digest('271828'), encode(extensions.digest('g2', 'sha256'), 'hex'), 'ip');
select tests.set('g1', encode(extensions.digest('g1', 'sha256'), 'hex'));
select tests.set('g2', encode(extensions.digest('g2', 'sha256'), 'hex'));
select tests.set('order', public.guest_create_order(tests.get('rid')::uuid, tests.get('g1'), jsonb_build_array(
  jsonb_build_object('itemId', tests.item('patio-do-ferro', 'hamburguer-do-patio'), 'quantity', 2, 'expectedItemVersion', tests.item_version(tests.item('patio-do-ferro', 'hamburguer-do-patio')), 'expectedPriceCents', 1500),
  jsonb_build_object('itemId', tests.item('patio-do-ferro', 'batata-frita'), 'quantity', 1, 'expectedItemVersion', tests.item_version(tests.item('patio-do-ferro', 'batata-frita')), 'expectedPriceCents', 450),
  jsonb_build_object('itemId', tests.item('patio-do-ferro', 'cola'), 'quantity', 2, 'expectedItemVersion', tests.item_version(tests.item('patio-do-ferro', 'cola')), 'expectedPriceCents', 300)),
  gen_random_uuid())->'order'->>'id');
select tests.reset();
grant execute on function tests.line(text) to authenticated, service_role;

-- ---- KDS (QA-K01, K03, K04) ------------------------------------------------------------------
select tests.login('ines@patio.example');
select is(jsonb_array_length(public.staff_get_station('patio-do-ferro', 'COZ')->'tickets'->-1->'lines'), 2, 'kitchen ticket shows 2 kitchen lines');
select throws_ok(format($$ select public.staff_transition_items('patio-do-ferro', jsonb_build_array(%L::jsonb), 'ready', gen_random_uuid()) $$,
  tests.line('Hambúrguer do Pátio')), 'P0001', 'VERSION_CONFLICT', 'QA-K01 cannot skip pending -> ready');
select lives_ok(format($$ select public.staff_transition_items('patio-do-ferro', jsonb_build_array(%L::jsonb, %L::jsonb), 'preparing', gen_random_uuid()) $$,
  tests.line('Hambúrguer do Pátio'), tests.line('Batata frita')), 'kitchen starts both lines in one batch');
select tests.set('stale_batata', tests.line('Batata frita')::text);
select lives_ok(format($$ select public.staff_transition_items('patio-do-ferro', jsonb_build_array(%L::jsonb), 'ready', gen_random_uuid()) $$,
  tests.line('Batata frita')), 'QA-K03 one line ready while the other keeps preparing');
select throws_ok(format($$ select public.staff_transition_items('patio-do-ferro', jsonb_build_array(%L::jsonb, %L::jsonb), 'ready', gen_random_uuid()) $$,
  tests.line('Hambúrguer do Pátio'), tests.get('stale_batata')), 'P0001', 'VERSION_CONFLICT', 'QA-K04 batch with one stale version aborts');
select tests.reset();
select is(tests.scalar(format($$ select status from app_private.order_items where order_id = %L and product_name_snapshot = 'Hambúrguer do Pátio' $$, tests.get('order'))),
  'preparing', 'QA-K04 no partial success: burger still preparing');
select is(tests.scalar(format($$ select count(*) from app_private.domain_events where order_id = %L and event_type = 'item.ready' $$, tests.get('order'))),
  '1', 'aborted batch wrote no events');

-- ---- Bar and early delivery (QA-S05) ------------------------------------------------------------
select tests.login('tomas@patio.example');
select lives_ok(format($$ select public.staff_transition_items('patio-do-ferro', jsonb_build_array(%L::jsonb), 'preparing', gen_random_uuid()) $$, tests.line('Cola')), 'bar starts colas');
select lives_ok(format($$ select public.staff_transition_items('patio-do-ferro', jsonb_build_array(%L::jsonb), 'ready', gen_random_uuid()) $$, tests.line('Cola')), 'bar marks colas ready');
select tests.login('rui@patio.example');
select ok(exists (select 1 from jsonb_array_elements(public.staff_get_floor('patio-do-ferro')->'readyItems') r where r->>'name' = 'Cola' and r->>'tableLabel' = '14'),
  'floor ReadyQueue shows the ready colas of Mesa 14');
select tests.set('cola_ready', tests.line('Cola')::text);
select lives_ok(format($$ select public.staff_transition_items('patio-do-ferro', jsonb_build_array(%L::jsonb), 'delivering', gen_random_uuid()) $$, tests.get('cola_ready')),
  'Rui takes the colas ("Vou levar")');
select tests.login('sara@patio.example');
select throws_ok(format($$ select public.staff_transition_items('patio-do-ferro', jsonb_build_array(%L::jsonb), 'delivering', gen_random_uuid()) $$, tests.get('cola_ready')),
  'P0001', 'VERSION_CONFLICT', 'QA-S04 second runner cannot pick up the same line');
select throws_ok(format($$ select public.staff_transition_items('patio-do-ferro', jsonb_build_array(%L::jsonb), 'delivered', gen_random_uuid()) $$, tests.line('Cola')),
  'P0001', 'ALREADY_CLAIMED', 'Sara cannot silently deliver what Rui picked up');
select tests.login('rui@patio.example');
select lives_ok(format($$ select public.staff_transition_items('patio-do-ferro', jsonb_build_array(%L::jsonb), 'delivered', gen_random_uuid()) $$, tests.line('Cola')),
  'Rui delivers the colas');
select tests.reset();
select tests.as_service();
select is((select o->>'status' from jsonb_array_elements(public.guest_get_snapshot(tests.get('rid')::uuid, tests.get('g2'))->'data'->'orders') o limit 1),
  'partially_served', 'QA-S05 guest sees order partially served (drinks first)');
select tests.reset();

select tests.set('ines_member', tests.scalar($$ select m.id::text from app_private.restaurant_members m join auth.users u on u.id = m.user_id
  join app_private.restaurants r on r.id = m.restaurant_id where r.slug = 'patio-do-ferro' and u.email = 'ines@patio.example' $$));
-- ---- Calls (QA-S01, S02, S03, S06) --------------------------------------------------------------
select tests.as_service();
select tests.set('call1', public.guest_create_call(tests.get('rid')::uuid, tests.get('g1'), 'cutlery', gen_random_uuid())->'call'->>'id');
select is(public.guest_create_call(tests.get('rid')::uuid, tests.get('g2'), 'cutlery', gen_random_uuid())->'call'->>'id', tests.get('call1'),
  'QA-S02 second guest asking cutlery gets the same active call');
select tests.reset();
select tests.login('rui@patio.example');
select lives_ok(format($$ select public.staff_claim_call('patio-do-ferro', %L, 1, gen_random_uuid()) $$, tests.get('call1')), 'Rui claims the call');
select tests.login('sara@patio.example');
select throws_ok(format($$ select public.staff_claim_call('patio-do-ferro', %L, 1, gen_random_uuid()) $$, tests.get('call1')),
  'P0001', 'ALREADY_CLAIMED', 'QA-S01 Sara gets conflict with the current owner');
select tests.login('rui@patio.example');
select throws_ok(format($$ select public.staff_reassign_call('patio-do-ferro', %L, 2, %L, 'troca de zona', gen_random_uuid()) $$, tests.get('call1'),
  tests.get('ines_member')),
  'P0001', 'INVALID_ASSIGNEE', 'QA-S06 cannot reassign to a kitchen member');
select lives_ok(format($$ select public.staff_resolve_call('patio-do-ferro', %L, 2, 'completed', null, gen_random_uuid()) $$, tests.get('call1')), 'Rui completes');
select tests.reset();
select tests.as_service();
select isnt(public.guest_create_call(tests.get('rid')::uuid, tests.get('g2'), 'cutlery', gen_random_uuid())->'call'->>'id', tests.get('call1'),
  'QA-S03 a new request after completion creates a new call (old one not reopened)');
select tests.reset();

-- ---- Bill (QA-B01, B02, B03, B05, B06, B04, B08) --------------------------------------------------
select tests.as_service();
select tests.set('bill1', public.guest_request_bill(tests.get('rid')::uuid, tests.get('g1'), gen_random_uuid())::text);
select is(tests.get('bill1')::jsonb->'bill'->>'status', 'requested', 'QA-B01 guest requests the bill');
select is(public.guest_request_bill(tests.get('rid')::uuid, tests.get('g2'), gen_random_uuid())->>'existing', 'true', 'QA-B01 second device gets the same request');
select throws_ok(format($$ select public.guest_create_order(%L, %L, jsonb_build_array(jsonb_build_object('itemId', %L, 'quantity', 1,
  'expectedItemVersion', tests.item_version(%L), 'expectedPriceCents', 300)), gen_random_uuid()) $$, tests.get('rid'), tests.get('g1'),
  tests.item('patio-do-ferro', 'cola'), tests.item('patio-do-ferro', 'cola')), 'P0001', 'VISIT_NOT_OPEN', 'QA-B03 new order after bill request is refused');
select tests.reset();
select is(tests.scalar(format($$ select count(*) from app_private.service_calls where visit_id = %L and type = 'bill' $$, tests.get('visit'))), '1',
  'QA-B01 exactly one bill call');
select tests.set('bill', tests.get('bill1')::jsonb->'bill'->>'id');

select tests.login('rui@patio.example');
select throws_ok(format($$ select public.staff_settle_bill('patio-do-ferro', %L, 1, 4050, 'cash', null, gen_random_uuid()) $$, tests.get('bill')),
  'P0001', 'FORBIDDEN', 'QA-B06 floor cannot register payment');
select tests.login('leonor@patio.example');
select tests.set('bv', (public.staff_get_bill('patio-do-ferro', tests.get('bill')::uuid)->'bill'->>'version'));
select throws_ok(format($$ select public.staff_settle_bill('patio-do-ferro', %L, %s, 4050, 'cash', null, gen_random_uuid()) $$, tests.get('bill'), tests.get('bv')),
  'P0001', 'PENDING_ITEMS', 'QA-B02 settle blocked while items are not delivered');
select tests.login('ines@patio.example');
select public.staff_transition_items('patio-do-ferro', jsonb_build_array(tests.line('Hambúrguer do Pátio')), 'ready', gen_random_uuid());
select tests.login('rui@patio.example');
select public.staff_transition_items('patio-do-ferro', jsonb_build_array(tests.line('Hambúrguer do Pátio'), tests.line('Batata frita')), 'delivering', gen_random_uuid());
select public.staff_transition_items('patio-do-ferro', jsonb_build_array(tests.line('Hambúrguer do Pátio'), tests.line('Batata frita')), 'delivered', gen_random_uuid());
select tests.login('leonor@patio.example');
select tests.set('bv', (public.staff_get_bill('patio-do-ferro', tests.get('bill')::uuid)->'bill'->>'version'));
select throws_ok(format($$ select public.staff_settle_bill('patio-do-ferro', %L, %s, 4000, 'cash', null, gen_random_uuid()) $$, tests.get('bill'), tests.get('bv')),
  'P0001', 'VERSION_CONFLICT', 'QA-B06 adulterated total refused');
select throws_ok(format($$ select public.staff_settle_bill('patio-do-ferro', %L, %s, 4050, 'crypto', null, gen_random_uuid()) $$, tests.get('bill'), tests.get('bv')),
  'P0001', 'INVALID_INPUT', 'QA-B06 invalid method refused');
select throws_ok(format($$ select public.staff_settle_bill('patio-do-ferro', %L, %s, 4050, 'external_card', null, gen_random_uuid()) $$, tests.get('bill'), (tests.get('bv')::int - 1)),
  'P0001', 'VERSION_CONFLICT', 'QA-B05 stale bill version refused');
select tests.set('k_settle', gen_random_uuid()::text);
select tests.set('settle', public.staff_settle_bill('patio-do-ferro', tests.get('bill')::uuid, tests.get('bv')::int, 4050, 'external_card', null, tests.get('k_settle')::uuid)::text);
select is((tests.get('settle')::jsonb->'payment'->>'amountCents')::int, 4050, 'Leonor registers 40,50 € via external terminal');
select is(public.staff_settle_bill('patio-do-ferro', tests.get('bill')::uuid, tests.get('bv')::int, 4050, 'external_card', null, tests.get('k_settle')::uuid)->'payment'->>'id',
  tests.get('settle')::jsonb->'payment'->>'id', 'QA-B04 same key replays the same payment');
select throws_ok(format($$ select public.staff_settle_bill('patio-do-ferro', %L, %s, 4050, 'cash', null, gen_random_uuid()) $$, tests.get('bill'), tests.get('bv')),
  'P0001', 'BILL_CLOSED', 'QA-B04 another key cannot record a second payment');
select tests.reset();
select is(tests.scalar(format($$ select count(*) from app_private.payment_records where bill_id = %L $$, tests.get('bill'))), '1', 'exactly one payment record');
select is(tests.scalar(format($$ select status from app_private.table_visits where id = %L $$, tests.get('visit'))), 'closed', 'visit closed atomically');
select is(tests.scalar(format($$ select count(*) from app_private.guest_sessions where visit_id = %L and revoked_at is null $$, tests.get('visit'))), '0',
  'all guest sessions revoked on close');
select is(tests.scalar(format($$ select count(*) from app_private.service_calls where visit_id = %L and status in ('new','claimed') $$, tests.get('visit'))), '0',
  'no active calls remain after close');
select is(tests.scalar(format($$ select sum(line_total_cents) from app_private.bill_lines where bill_id = %L $$, tests.get('bill'))), '4050', 'bill lines snapshot = 4050');
select throws_ok(format($$ update app_private.payment_records set amount_cents = 1 where bill_id = %L $$, tests.get('bill')), 'P0001', 'IMMUTABLE',
  'QA-B08 payment record is immutable');
select tests.login('marta@patio.example');
select throws_ok(format($$ select public.staff_cancel_item('patio-do-ferro', %L, %s, 'erro de cozinha', gen_random_uuid()) $$,
  tests.line('Cola')->>'id', tests.line('Cola')->>'version'), 'P0001', 'BILL_CLOSED', 'QA-B08 cannot cancel a line of a settled bill');
select tests.reset();
select tests.as_service();
select is(public.guest_get_snapshot(tests.get('rid')::uuid, tests.get('g1'))->>'error', 'VISIT_CLOSED', 'old guest cookie no longer works');
select tests.reset();

-- ---- Empty table: void (QA-B07) -----------------------------------------------------------------
select tests.login('rui@patio.example');
select tests.set('v2', public.staff_open_visit('patio-do-ferro', tests.get('t14')::uuid, 2, tests.digest('161803'), gen_random_uuid())->'visit'->>'id');
select tests.set('b2', tests.scalar(format($$ select id::text from app_private.bills where visit_id = %L $$, tests.get('v2'))));
select lives_ok(format($$ select public.staff_void_bill('patio-do-ferro', %L, 1, 'Clientes saíram sem consumir', gen_random_uuid()) $$, tests.get('b2')),
  'QA-B07 empty visit closed as void with reason');
select tests.reset();
select is(tests.scalar(format($$ select count(*) from app_private.payment_records where bill_id = %L $$, tests.get('b2'))), '0', 'void has zero payment records');
select is(tests.scalar(format($$ select count(*) from app_private.table_visits where table_id = %L and status <> 'closed' $$, tests.get('t14'))), '0', 'Mesa 14 is free again');

select * from finish();
rollback;
