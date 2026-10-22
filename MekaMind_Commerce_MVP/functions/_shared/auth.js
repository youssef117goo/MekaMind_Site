import { json } from './http.js';
const COOKIE_NAME = 'mm_admin_session';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function b64url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function fromB64url(text) {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}
export function constantTimeEqual(a, b) {
  a = String(a ?? ''); b = String(b ?? '');
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i=0;i<length;i++) diff |= (a.charCodeAt(i % (a.length || 1)) || 0) ^ (b.charCodeAt(i % (b.length || 1)) || 0);
  return diff === 0;
}
export async function issueSession(username, env) {
  const payload = b64url(encoder.encode(JSON.stringify({ sub: username, exp: Math.floor(Date.now()/1000) + 8*60*60 })));
  const signature = await sign(payload, env.ADMIN_SESSION_SECRET);
  return `${payload}.${signature}`;
}
export async function readSession(request, env) {
  if (!env.ADMIN_SESSION_SECRET) return null;
  const cookieHeader = request.headers.get('Cookie') || '';
  const token = cookieHeader.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE_NAME+'='))?.slice(COOKIE_NAME.length+1);
  if (!token) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = await sign(payload, env.ADMIN_SESSION_SECRET);
  if (!constantTimeEqual(signature, expected)) return null;
  try {
    const data = JSON.parse(decoder.decode(fromB64url(payload)));
    if (!data.sub || data.sub !== env.ADMIN_USERNAME || !Number.isFinite(data.exp) || data.exp < Math.floor(Date.now()/1000)) return null;
    return { username: data.sub, expiresAt: data.exp };
  } catch { return null; }
}
export function sessionCookie(request, token, clear = false) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE_NAME}=${clear ? '' : token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 28800}${secure}`;
}
export async function requireAdmin(context) {
  const session = await readSession(context.request, context.env);
  if (!session) return { error: json({ message: 'انتهت الجلسة أو يلزم تسجيل الدخول.' }, 401) };
  return { session };
}
export async function hashText(text) {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text))));
}
