import { NextResponse } from 'next/server';
import { createSessionToken, COOKIE_NAME, SESSION_SECONDS, adminPassword, sessionSecret } from '@/lib/auth';
import { api, jsonBody, constantEqual, hash, checked, rateLimit, loginBucket, HttpError } from '@/lib/api';
import { loginSchema } from '@/lib/contracts';
import { db } from '@/lib/supabase';
export const POST = api(async request => {
  try { sessionSecret(); adminPassword(); } catch { throw new HttpError(503, 'Authentification non configurée.'); }
  const { password } = await jsonBody(request, loginSchema, 2048);
  await rateLimit(loginBucket(request), 10, 300);
  if (!constantEqual(password, adminPassword())) throw new HttpError(401, 'Mot de passe incorrect.');
  const session = await createSessionToken();
  checked(await db().from('admin_sessions').insert({ id_hash: hash(session.id), expires_at: new Date(session.expires * 1000).toISOString() }));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, session.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: SESSION_SECONDS, path: '/' });
  return response;
}, { auth: false });
