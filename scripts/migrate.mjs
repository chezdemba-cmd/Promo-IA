/**
 * Applique le schéma puis les migrations Supabase dans l'ordre numérique.
 *
 * Utiliser DIRECT_URL (pooler en mode session, port 5432) : le pooler en mode
 * transaction (port 6543, pgbouncer=true) ne supporte pas le DDL multi-instruction.
 *
 *   DIRECT_URL="postgresql://…:5432/postgres" node scripts/migrate.mjs
 *   DIRECT_URL="…" node scripts/migrate.mjs --dry-run   # liste sans appliquer
 *
 * Idempotent : le schéma n'est (ré)exécuté que si la table `clients` est absente,
 * et chaque migration déjà enregistrée dans `schema_migrations` est ignorée.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const dir = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.join(dir, '..', 'supabase');
const migrationsDir = path.join(sqlDir, 'migrations');
const dryRun = process.argv.includes('--dry-run');

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('DIRECT_URL manquant (ou DATABASE_URL). Voir .env.example.');
  process.exit(1);
}
if (/:6543\b/.test(url) || /pgbouncer=true/.test(url)) {
  console.error('Refus : cette URL vise le pooler en mode transaction. Utiliser DIRECT_URL (port 5432).');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false }, statement_timeout: 120000 });

async function main() {
  await client.connect();
  console.log('→ connecté :', url.replace(/:[^:@/]+@/, ':****@'));

  await client.query(`create table if not exists public.schema_migrations (
    version text primary key, applied_at timestamptz not null default now())`);

  const hasCore = await client.query("select to_regclass('public.clients') as t");
  if (!hasCore.rows[0].t) {
    console.log(dryRun ? '· [dry-run] appliquerait supabase/schema.sql' : '→ application de schema.sql');
    if (!dryRun) await client.query(readFileSync(path.join(sqlDir, 'schema.sql'), 'utf8'));
  } else {
    console.log('· schema.sql : table clients déjà présente, ignoré');
  }

  const applied = new Set(
    (await client.query('select version from public.schema_migrations')).rows.map(r => r.version));
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) { console.log(`· ${file} : déjà appliquée`); continue; }
    if (dryRun) { console.log(`· [dry-run] appliquerait ${file}`); count++; continue; }
    console.log(`→ ${file}`);
    await client.query(readFileSync(path.join(migrationsDir, file), 'utf8'));
    await client.query('insert into public.schema_migrations(version) values ($1)', [file]);
    count++;
  }

  console.log(dryRun
    ? `\n${count} migration(s) en attente.`
    : `\n✓ terminé — ${count} migration(s) appliquée(s).`);
}

main()
  .catch(err => { console.error('\n✗ échec :', err.message); process.exitCode = 1; })
  .finally(() => client.end());
