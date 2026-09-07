import { NextResponse } from 'next/server';
import { COOKIE_NAME, cookieToken, verifySessionToken } from '@/lib/auth';
import { api, checked, hash } from '@/lib/api';
import { db } from '@/lib/supabase';
export const POST = api(async request => {
  const session = await verifySessionToken(cookieToken(request));
  if (session) checked(await db().from('admin_sessions').delete().eq('id_hash', hash(session.id)));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
  return response;
}, { auth: false });
