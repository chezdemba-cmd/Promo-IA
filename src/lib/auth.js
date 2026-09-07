/** Signed expiring envelope; every API also verifies revocation in the database. */
export const COOKIE_NAME = 'djelis_session';
export const SESSION_SECONDS = 8 * 60 * 60;
export function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32 || new Set(secret).size < 12
    || /dev-secret|changez|chaine-aleatoire|example|placeholder/i.test(secret)) {
    throw new Error('SESSION_SECRET doit contenir un secret aléatoire robuste (32 caractères minimum).');
  }
  return secret;
}
export function adminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 16 || /changez-moi|example|placeholder/i.test(password)) throw new Error('ADMIN_PASSWORD doit contenir au moins 16 caractères et être unique.');
  return password;
}
async function signingKey() {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(`${sessionSecret()}\0${adminPassword()}`),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
function hex(bytes) { return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join(''); }
export async function createSessionToken(now = Date.now()) {
  const id = hex(crypto.getRandomValues(new Uint8Array(32)));
  const expires = Math.floor(now / 1000) + SESSION_SECONDS;
  const payload = `${id}.${expires}`;
  const signature = hex(await crypto.subtle.sign('HMAC', await signingKey(), new TextEncoder().encode(payload)));
  return { token: `${payload}.${signature}`, id, expires };
}
export function cookieToken(request) {
  const native = request.cookies?.get?.(COOKIE_NAME)?.value;
  if (native) return native;
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === COOKIE_NAME) { try { return decodeURIComponent(value.join('=')); } catch { return ''; } }
  }
  return '';
}
export async function verifySessionToken(token, now = Date.now()) {
  try {
    if (!/^[a-f0-9]{64}\.\d{10}\.[a-f0-9]{64}$/.test(token)) return null;
    const [id, expires, signature] = token.split('.');
    const seconds = Math.floor(now / 1000);
    if (+expires <= seconds || +expires > seconds + SESSION_SECONDS) return null;
    const bytes = Uint8Array.from(signature.match(/../g), s => parseInt(s, 16));
    if (!await crypto.subtle.verify('HMAC', await signingKey(), bytes, new TextEncoder().encode(`${id}.${expires}`))) return null;
    return { id, expires: +expires };
  } catch { return null; }
}
export async function isAuthenticated(request) { return Boolean(await verifySessionToken(cookieToken(request))); }
