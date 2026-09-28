-- QA-T03 · Grants, RLS, EXECUTE and function hardening
begin;
\ir _helpers.psql
select plan(16);

select is((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'app_private' and c.relkind = 'r'
              and (has_table_privilege('anon', c.oid, 'select,insert,update,delete')
                or has_table_privilege('authenticated', c.oid, 'select,insert,update,delete'))),
  0, 'anon/authenticated have no privilege on any private table');

select is((select count(*)::int from pg_tables where schemaname = 'app_private' and not rowsecurity), 0,
  'RLS enabled on every private table');
select is((select count(*)::int from pg_policies where schemaname = 'app_private'), 0,
  'no policies on private tables (default deny)');

select ok(not has_schema_privilege('anon', 'app_private', 'usage'), 'anon has no USAGE on app_private');

select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname ~ '^(staff|guest|system)_'
              and has_function_privilege('anon', p.oid, 'execute')), 0,
  'anon cannot execute staff_/guest_/system_ RPCs');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname ~ '^(guest|system)_'
              and has_function_privilege('authenticated', p.oid, 'execute')), 0,
  'authenticated cannot execute guest_/system_ RPCs');
select ok((select bool_and(has_function_privilege('service_role', p.oid, 'execute')) from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname ~ '^guest_'),
  'service_role executes guest_ RPCs');
select ok((select bool_and(has_function_privilege('anon', p.oid, 'execute')) from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname ~ '^site_'),
  'anon executes site_ RPCs');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'app_private' and p.prokind = 'f'
              and (has_function_privilege('anon', p.oid, 'execute')
                   or (has_function_privilege('authenticated', p.oid, 'execute') and p.proname <> 'can_read_invalidation'))), 0,
  'private helpers not executable by API roles (except can_read_invalidation for authenticated)');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname ~ '^(site|staff|guest|system)_'
              and (not p.prosecdef or not coalesce(p.proconfig, '{}') @> array['search_path=""'])), 0,
  'every RPC is SECURITY DEFINER with empty search_path');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prokind = 'f' and p.proname !~ '^(site|staff|guest|system)_'
              and has_function_privilege('anon', p.oid, 'execute')
              and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')), 0,
  'no other public function is executable by anon');

select ok(has_table_privilege('authenticated', 'public.staff_invalidations', 'select')
      and not has_table_privilege('authenticated', 'public.staff_invalidations', 'insert,update,delete'),
  'authenticated may only SELECT staff_invalidations');
select ok(not has_table_privilege('anon', 'public.staff_invalidations', 'select'), 'anon cannot read invalidations');
select is((select string_agg(schemaname || '.' || tablename, ',') from pg_publication_tables where pubname = 'supabase_realtime'),
  'public.staff_invalidations', 'only staff_invalidations is published to realtime');

select tests.as_anon();
select throws_ok($$ select * from app_private.orders $$, '42501', null, 'anon reading app_private.orders is denied');
select tests.login('rui@patio.example');
select throws_ok($$ select public.guest_get_snapshot(tests.rid('patio-do-ferro'), repeat('a', 64)) $$, '42501', null,
  'authenticated staff cannot call guest RPCs directly');
select tests.reset();

select * from finish();
rollback;
