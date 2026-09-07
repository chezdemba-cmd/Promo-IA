/**
 * Client Supabase côté serveur (clé service_role).
 * ⚠ Ne jamais importer ce fichier dans un composant client :
 * la clé service_role donne un accès total à la base.
 */
import 'server-only';
import { createClient } from '@supabase/supabase-js';

let _db = null;

export function db() {
  if (!_db) {
    _db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: (url, options = {}) => fetch(url, {
          ...options, signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
        }) } }
    );
  }
  return _db;
}
