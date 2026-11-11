const BEGIN = '-----BEGIN SKYCARE-----';
const END = '-----END SKYCARE-----';
const OLD_BEGIN = '-----BEGIN TAKING CARE-----';
const OLD_END = '-----END TAKING CARE-----';
function marks(t) { return t.indexOf(BEGIN) >= 0 ? [BEGIN, END] : [OLD_BEGIN, OLD_END]; }
const ITER = 600000;
const AAD = new TextEncoder().encode('taking-care-v1');

function b64e(u8) { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); }
function b64d(t) { const s = atob(t), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }

export function canLock() { return !!(typeof crypto !== 'undefined' && crypto.subtle && crypto.getRandomValues); }
export function isLocked(text) { if (typeof text !== 'string') return false; const [b, e] = marks(text); return text.indexOf(b) >= 0 && text.indexOf(e) > text.indexOf(b); }

async function deriveKey(pw, salt, iter, usage) {
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, [usage]);
}

export async function lockText(plain, pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pw, salt, ITER, 'encrypt');
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, key, new TextEncoder().encode(plain)));
  const body = btoa(JSON.stringify({ v: 1, kdf: 'PBKDF2-SHA256', i: ITER, s: b64e(salt), n: b64e(iv), c: b64e(ct) })).replace(/(.{64})/g, '$1\n');
  return 'SKYCARE LOCKED FILE\n' +
    'This file is locked with a password. To open it, use the SkyCare app and type the password.\n' +
    'Without the password no one can read it, and it cannot be recovered.\n\n' +
    BEGIN + '\n' + body + '\n' + END + '\n';
}

export async function unlockText(text, pw) {
  const [mb, me] = marks(text);
  const a = text.indexOf(mb) + mb.length, b = text.indexOf(me);
  let o;
  try { o = JSON.parse(atob(text.slice(a, b).replace(/\s+/g, ''))); } catch (e) { throw new Error('damaged'); }
  if (!o || o.v !== 1 || !o.s || !o.n || !o.c) throw new Error('damaged');
  const key = await deriveKey(pw, b64d(o.s), Math.min(Math.max(Number(o.i) || ITER, 100000), 5000000), 'decrypt');
  let pt;
  try { pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(o.n), additionalData: AAD }, key, b64d(o.c)); } catch (e) { throw new Error('wrong'); }
  return new TextDecoder().decode(pt);
}
