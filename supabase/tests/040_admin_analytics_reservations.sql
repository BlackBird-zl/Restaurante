-- QA-N01..N05, QA-M03..M06, QA-J (tables/QR) · Admin rules, analytics, reservations, retention
-- Requires a fresh demo seed (pnpm reset:demo). Fixed clock recommended: --t0=2026-09-27T13:00:00Z (14:00 Lisbon).
begin;
\ir _helpers.psql
select plan(40);

select tests.set('rid', tests.rid('patio-do-ferro')::text);
-- T0 of the seed = recorded_at of the two settled fixture bills (Plano §4.1). Tests use that clock.
select tests.set('t0', tests.scalar($$ select min(recorded_at)::text from app_private.payment_records p
  join app_private.restaurants r on r.id = p.restaurant_id where r.slug = 'patio-do-ferro' $$));
create or replace function tests.an() returns jsonb language sql stable security definer set search_path = '' as $$
  select app_private.analytics(tests.get('rid')::uuid, b.day_start, b.day_end, tests.get('t0')::timestamptz)
    from app_private.business_day_bounds(app_private.business_date(tests.get('t0')::timestamptz, 'Europe/Lisbon', '05:00'), 'Europe/Lisbon', '05:00') b $$;

-- ---- Seed assertions (Plano §4.4) ---------------------------------------------------------------
select is((tests.an()->'orders'->>'submitted')::int, 6, 'N01 orders = 6');
select is((tests.an()->'orders'->>'lines')::int, 13, 'lines = 13');
select is((tests.an()->'orders'->>'unitsOrdered')::int, 18, 'units = 18');
select is((tests.an()->'now'->>'activeVisits')::int, 4, 'active visits = 4');
select is((tests.an()->'now'->>'freeTables')::int, 10, 'free tables = 10');
select is((tests.an()->'now'->>'requestedBills')::int, 1, 'requested bills = 1');
select is((tests.an()->'received'->>'totalCents')::int, 5600, 'N01 received today = 5600');
select is((tests.an()->'received'->'byMethod'->>'external_card')::int, 3600, 'external_card = 3600');
select is((tests.an()->'received'->'byMethod'->>'cash')::int, 2000, 'cash = 2000');
select is((tests.an()->'now'->>'openConsumptionCents')::int, 12800, 'open consumption = 12800 (paid bills not added)');
select is(tests.an()->'now'->'activeCalls', '{"new": 2, "total": 3, "claimed": 1}'::jsonb, 'active calls 3 (2 new, 1 claimed)');
select is(tests.an()->'calls'->'claimWait', '{"n": 1, "avgSeconds": 60}'::jsonb, 'first claim wait n=1, 60 s');
select is((select p from jsonb_array_elements(tests.an()->'preparation') p where p->>'stationCode' = 'COZ')->>'avgPrepSeconds', '756', 'COZ prep 756 s');
select is((select p from jsonb_array_elements(tests.an()->'preparation') p where p->>'stationCode' = 'COZ')->>'n', '5', 'COZ n = 5 lines');
select is((select p from jsonb_array_elements(tests.an()->'preparation') p where p->>'stationCode' = 'BAR')->>'avgPrepSeconds', '90', 'BAR prep 90 s');
select is((select p from jsonb_array_elements(tests.an()->'preparation') p where p->>'stationCode' = 'BAR')->>'n', '6', 'BAR n = 6 lines');
select is(tests.an()->'now'->'lateLines', '{"lines": 2, "tables": ["08"]}'::jsonb, 'late lines 2, both Mesa 08');
select is(tests.an()->'now'->'readyAwaiting', '{"lines": 1, "units": 2}'::jsonb, 'ready awaiting pickup: 1 line, 2 units');

-- ---- Empty sample → null average, not zero (QA-N02) --------------------------------------------
select is(app_private.analytics(tests.get('rid')::uuid, '2020-01-01', '2020-01-02', now())->'calls'->'claimWait'->>'avgSeconds', null,
  'N02 no sample: average is null ("Sem dados"), not 0');

-- ---- Business day and DST (QA-N03) ----------------------------------------------------------------
select is(app_private.business_date('2026-09-27T03:59:59Z', 'Europe/Lisbon', '05:00'), '2026-09-26'::date, 'N03 04:59:59 local belongs to previous day');
select is(app_private.business_date('2026-09-27T04:00:00Z', 'Europe/Lisbon', '05:00'), '2026-09-27'::date, 'N03 05:00 local starts the day');
select is((select day_end - day_start from app_private.business_day_bounds('2026-10-24', 'Europe/Lisbon', '05:00')), interval '25 hours',
  'N03 business day spanning DST end lasts 25 h (no fixed 24 h)');
select throws_ok($$ select app_private.local_ts_to_utc('2026-03-29 01:30', 'Europe/Lisbon') $$, 'P0001', 'INVALID_INPUT', 'N03 nonexistent local time rejected');
select throws_ok($$ select app_private.local_ts_to_utc('2026-10-25 01:30', 'Europe/Lisbon') $$, 'P0001', 'INVALID_INPUT', 'N03 ambiguous local time rejected');

-- ---- Reservations (QA-N04, N05) ---------------------------------------------------------------------
select tests.as_service();
select tests.set('d_mon', (select to_char(d, 'YYYY-MM-DD') from generate_series(current_date + 3, current_date + 10, '1 day') d where extract(dow from d) = 1 limit 1));
select tests.set('d_tue', (select to_char(d, 'YYYY-MM-DD') from generate_series(current_date + 3, current_date + 10, '1 day') d where extract(dow from d) = 2 limit 1));
select throws_ok(format($$ select public.guest_create_reservation(%L, jsonb_build_object('name','Ana Teste','email','ana@exemplo.example','date',%L,'time','20:00','partySize',2), gen_random_uuid(), 'ipr') $$,
  tests.get('rid'), tests.get('d_mon')), 'P0001', 'INVALID_INPUT', 'N04 Monday (closed) rejected');
select throws_ok(format($$ select public.guest_create_reservation(%L, jsonb_build_object('name','Ana Teste','date',%L,'time','20:00','partySize',2), gen_random_uuid(), 'ipr') $$,
  tests.get('rid'), tests.get('d_tue')), 'P0001', 'INVALID_INPUT', 'N04 no contact rejected');
select throws_ok(format($$ select public.guest_create_reservation(%L, jsonb_build_object('name','Ana Teste','email','ana@exemplo.example','date','2020-01-07','time','20:00','partySize',2), gen_random_uuid(), 'ipr') $$,
  tests.get('rid')), 'P0001', 'INVALID_INPUT', 'N04 past date rejected');
select tests.set('k_res', gen_random_uuid()::text);
select tests.set('res', public.guest_create_reservation(tests.get('rid')::uuid, jsonb_build_object('name','Ana Teste','email','ana@exemplo.example','date',tests.get('d_tue'),'time','20:00','partySize',2), tests.get('k_res')::uuid, 'ipr')::text);
select is(public.guest_create_reservation(tests.get('rid')::uuid, jsonb_build_object('name','Ana Teste','email','ana@exemplo.example','date',tests.get('d_tue'),'time','20:00','partySize',2), tests.get('k_res')::uuid, 'ipr')->'reservation'->>'reference',
  tests.get('res')::jsonb->'reservation'->>'reference', 'N04 duplicate submission (same key) returns the same reference');
select ok(tests.get('res')::text !~ 'ana@', 'response contains no personal data');
select tests.reset();
select tests.set('res_id', tests.scalar(format($$ select id::text from app_private.reservations where reference = %L $$, tests.get('res')::jsonb->'reservation'->>'reference')));
select tests.login('sara@patio.example');
select throws_ok(format($$ select public.staff_transition_reservation('patio-do-ferro', %L, 'confirmed', 1, false, null, gen_random_uuid()) $$, tests.get('res_id')),
  'P0001', 'INVALID_INPUT', 'N05 confirming requires contact confirmation');
select is(public.staff_transition_reservation('patio-do-ferro', tests.get('res_id')::uuid, 'confirmed', 1, true, 'Ligámos às 16h', gen_random_uuid())->'reservation'->>'status',
  'confirmed', 'N05 confirmed after human contact');
select tests.reset();
select tests.as_service();
select ok((public.system_run_retention(now() + interval '200 days')->>'reservationsAnonymized')::int >= 1, 'N05 retention anonymizes old reservations');
select tests.reset();
select is(tests.scalar(format($$ select coalesce(name, '∅') || '|' || status from app_private.reservations where id = %L $$, tests.get('res_id'))), '∅|confirmed',
  'N05 anonymized: no name, status/count preserved');
select is(tests.scalar($$ select count(*) from app_private.payment_records $$), '2', 'N05 retention never deletes payments');

-- ---- Admin dependencies and content (QA-M04..M06, J) --------------------------------------------
select tests.login('diogo@patio.example');
select throws_ok(format($$ select public.staff_save_station('patio-do-ferro', %L, 1, '{"active":false}', gen_random_uuid()) $$,
  (public.staff_admin_stations('patio-do-ferro')->'stations'->0->>'id')), 'P0001', 'DEPENDENCY', 'M04 station with active lines cannot be deactivated');
select throws_ok(format($$ select public.staff_save_table('patio-do-ferro', %L, 1, '{"active":false}', gen_random_uuid()) $$,
  tests.tbl('patio-do-ferro', '08')), 'P0001', 'DEPENDENCY', 'M04 occupied table cannot be deactivated');
select throws_ok($$ select public.staff_save_table('patio-do-ferro', null, null, '{"label":"14","seats":4}', gen_random_uuid()) $$,
  'P0001', 'FIELD_CONFLICT', 'J duplicate table label rejected on the field');
select throws_ok(format($$ select public.staff_rotate_qr('patio-do-ferro', %L, 1, repeat('a',64), 'v1.x.y.z', 1, false, true, gen_random_uuid()) $$,
  tests.tbl('patio-do-ferro', '14')), 'P0001', 'CONFIRMATION_REQUIRED', 'J QR rotation demands explicit confirmation of impact');
select throws_ok($$ select public.staff_save_theme('patio-do-ferro', 1, 'casa-editorial',
  '{"color":{"background":"#F4F0E7","surface":"#FBF8F1","text":"#E8E4DA","muted":"#555E4A","accent":"#6F3038","border":"#D4CFC2"},"fontPair":"newsreader-plex","radius":"0","density":"comfortable"}',
  true, gen_random_uuid()) $$, 'P0001', 'INVALID_INPUT', 'M05 theme with invisible text (low contrast) is rejected');
select tests.reset();
insert into app_private.media_assets(id, restaurant_id, storage_key, visibility, purpose, mime_type, bytes, width, height, source_type, approved_at)
values ('00000000-0000-4000-8000-00000000b001', tests.rid('balcao-do-largo'), tests.rid('balcao-do-largo')::text || '/x.webp', 'public', 'hero',
  'image/webp', 10, 10, 10, 'uploaded', now());
select tests.set('home_draft', tests.scalar($$ select draft::text from app_private.site_pages p join app_private.restaurants r on r.id = p.restaurant_id
  where r.slug = 'patio-do-ferro' and p.page_key = 'home' $$));
select tests.login('diogo@patio.example');
select throws_ok($$ select public.staff_save_page_draft('patio-do-ferro', 'home', 1,
  jsonb_set(tests.get('home_draft')::jsonb, '{hero,mediaId}', '"00000000-0000-4000-8000-00000000b001"'), gen_random_uuid()) $$,
  'P0001', 'INVALID_INPUT', 'M06 page cannot reference media of another tenant');
select tests.reset();

select * from finish();
rollback;
