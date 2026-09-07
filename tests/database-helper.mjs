import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { readFileSync, readdirSync } from 'node:fs';
export async function database({ migrations = false } = {}) {
  const pg = new PGlite({ extensions: { pg_trgm } });
  await pg.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    create schema storage; create table storage.buckets(id text primary key, name text, public boolean);`);
  // PGlite has gen_random_uuid built in; Supabase storage service is not emulated.
  await pg.exec(readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
    .replace('create extension if not exists "pgcrypto";', ''));
  if (migrations) {
    const directory = new URL('../supabase/migrations/', import.meta.url);
    for (const name of readdirSync(directory).filter(n => n.endsWith('.sql')).sort()) {
      await pg.exec(readFileSync(new URL(name, directory), 'utf8'));
    }
  }
  return pg;
}
