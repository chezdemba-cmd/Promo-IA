/**
 * Middleware Next.js : protège toutes les pages et routes API
 * sauf : login, webhook WhatsApp (appelé par Meta) et cron (protégé par CRON_SECRET).
 */
import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/webhook/whatsapp', '/api/cron/scheduler', '/api/health'];

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  if (await isAuthenticated(request)) return NextResponse.next();

  // API non authentifiée → 401 JSON ; page → redirection login
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  // Tout sauf les assets statiques
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
