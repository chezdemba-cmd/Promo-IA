import 'server-only';
import { NextResponse } from 'next/server';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/supabase';
import { cookieToken, verifySessionToken, sessionSecret } from '@/lib/auth';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const hash = value => createHash('sha256').update(value).digest('hex');
export function constantEqual(a, b) {
  return typeof a === 'string' && typeof b === 'string'
    && timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
}
export function checked(result) {
  if (result.error) {
    if (result.error.code === '23505') throw new HttpError(409, 'Cette donnée existe déjà.');
    if (result.error.code === '23503') throw new HttpError(409, 'Une relation empêche cette opération.');
    if (['P0001', '23514'].includes(result.error.code)) throw new HttpError(409, 'Opération incompatible avec l’état actuel des données.');
    throw new HttpError(503, 'Le service de données est indisponible. Réessayez ultérieurement.');
  }
  return result.data;
}
export async function requireAdmin(request) {
  const envelope = await verifySessionToken(cookieToken(request));
  if (!envelope) throw new HttpError(401, 'Veuillez vous reconnecter.');
  const session = checked(await db().from('admin_sessions').select('id_hash, expires_at')
    .eq('id_hash', hash(envelope.id)).gt('expires_at', new Date().toISOString()).maybeSingle());
  if (!session) throw new HttpError(401, 'Session expirée ou révoquée.');
  return { ...envelope, idHash: session.id_hash };
}
export function checkOrigin(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const expected = process.env.APP_URL || (process.env.NODE_ENV !== 'production' ? new URL(request.url).origin : null);
  if (!expected) throw new HttpError(503, 'Configuration du service incomplète.');
  if (request.headers.get('origin') !== new URL(expected).origin) throw new HttpError(403, 'Origine de la requête refusée.');
}
export async function readText(request, limit = 65536) {
  if (Number(request.headers.get('content-length')) > limit) throw new HttpError(413, 'Contenu trop volumineux.');
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new HttpError(413, 'Contenu trop volumineux.'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}
export async function jsonBody(request, schema, limit = 65536) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'Format JSON requis.');
  let body;
  try { body = JSON.parse(await readText(request, limit)); }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'JSON invalide.'); }
  const result = schema.safeParse(body);
  if (!result.success) throw new HttpError(400, result.error.issues.map(i => `${i.path.join('.') || 'Données'} : ${i.message}`).slice(0, 3).join(' ; '));
  return request.method === 'PUT' || request.method === 'PATCH'
    ? Object.fromEntries(Object.entries(result.data).filter(([key]) => Object.hasOwn(body, key)))
    : result.data;
}
export async function rateLimit(key, limit, seconds = 60) {
  if (!checked(await db().rpc('consume_rate_limit', { p_key: key, p_limit: limit, p_seconds: seconds }))) {
    throw new HttpError(429, 'Trop de requêtes. Réessayez dans quelques instants.');
  }
}
export function loginBucket(request) {
  // Trust only Vercel's overwritten header, never arbitrary X-Forwarded-For.
  const ip = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for') || 'unknown' : 'shared';
  return 'login:' + createHmac('sha256', sessionSecret()).update(ip).digest('hex');
}
export function api(handler, { auth = true, origin = true, limit = 120 } = {}) {
  return async (request, context = {}) => {
    const requestId = crypto.randomUUID();
    try {
      if (origin) checkOrigin(request);
      const session = auth ? await requireAdmin(request) : null;
      if (session) await rateLimit(`api:${session.idHash}`, limit);
      const params = await context.params;
      const response = await handler(request, { ...context, params, session });
      response.headers.set('Cache-Control', 'no-store');
      response.headers.set('X-Request-ID', requestId);
      return response;
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      console.error(JSON.stringify({ event: 'request_failed', requestId, status, path: new URL(request.url).pathname }));
      return NextResponse.json({ error: error instanceof HttpError ? error.message : 'Une erreur interne est survenue.', requestId },
        { status, headers: { 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '60' } : {}) } });
    }
  };
}
