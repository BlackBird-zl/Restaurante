/**
 * Applies supabase/migrations/*.sql in order, recording them in
 * supabase_migrations.schema_migrations (same table the Supabase CLI uses).
 * Intended for the no-Docker local stack and CI. With the Supabase CLI prefer
 * `supabase db reset` / `supabase db push`.
 *
 * Usage: SUPABASE_DB_URL=postgresql://... pnpm db:migrate [--reset]
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const dbUrl = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres@127.0.0.1:54322/postgres';
const reset = process.argv.includes('--reset');

async function main() {
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    if (reset) {
      if ((process.env.APP_ENV ?? 'local') === 'production') throw new Error('Refusing --reset in production');
      await client.query(`
        drop schema if exists app_private cascade;
        drop table if exists public.staff_invalidations cascade;
        do $$ declare f record; begin
          for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and (p.proname like 'site\\_%' or p.proname like 'staff\\_%'
                      or p.proname like 'guest\\_%' or p.proname like 'system\\_%') loop
            execute 'drop function ' || f.sig || ' cascade';
          end loop;
        end $$;
        drop schema if exists supabase_migrations cascade;`);
      console.log('reset: dropped application schema');
    }
    await client.query(`create schema if not exists supabase_migrations;
      create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);`);
    const dir = path.join(process.cwd(), 'supabase', 'migrations');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    const { rows } = await client.query('select version from supabase_migrations.schema_migrations');
    const applied = new Set(rows.map((r) => r.version as string));
    for (const file of files) {
      const version = file.split('_')[0]!;
      if (applied.has(version)) continue;
      const sql = readFileSync(path.join(dir, file), 'utf8');
      process.stdout.write(`applying ${file} ... `);
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into supabase_migrations.schema_migrations(version, name, statements) values ($1, $2, $3)',
          [version, file.replace(/^\d+_/, '').replace(/\.sql$/, ''), [sql]]);
        await client.query('commit');
        console.log('ok');
      } catch (e) {
        await client.query('rollback');
        const err = e as { message: string; position?: string; where?: string };
        let context = '';
        if (err.position) {
          const pos = Number(err.position);
          const line = sql.slice(0, pos).split('\n').length;
          context = ` (line ${line}: ${sql.split('\n')[line - 1]?.trim()})`;
        }
        console.log('FAILED');
        throw new Error(`${file}: ${err.message}${context}${err.where ? `\n  where: ${err.where}` : ''}`);
      }
    }
    await client.query(`notify pgrst, 'reload schema'`);
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
