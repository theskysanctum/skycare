import CFG from './dropbox.json';
import { lockText, unlockText } from './lockcore.js';

const MK = 'skycare_dbx_v1';
const PATH = '/skycare.sync';
const API = 'https://api.dropboxapi.com';
const CONTENT = 'https://content.dropboxapi.com';

export const DBX_KEY = CFG.key || '';

export function meta() { try { return JSON.parse(localStorage.getItem(MK) || '{}') || {}; } catch (e) { return {}; } }
function setMeta(patch) { const m = Object.assign(meta(), patch); try { localStorage.setItem(MK, JSON.stringify(m)); } catch (e) { } return m; }
export function connected() { const m = meta(); return !!(m.rt && m.pw); }
export function hasAuth() { return !!meta().rt; }
export function setPassword(pw) { setMeta({ pw }); }
export function disconnect() { try { localStorage.removeItem(MK); } catch (e) { } }

const b64u = (u8) => btoa(String.fromCharCode.apply(null, u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const rnd = (n) => b64u(crypto.getRandomValues(new Uint8Array(n)));
async function sha(text) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return Array.from(d, (x) => x.toString(16).padStart(2, '0')).join('');
}
export const hashOf = sha;

export async function authUrl(redirect, pw) {
  const verifier = rnd(48), state = rnd(16);
  const challenge = b64u(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  setMeta({ verifier, state, pw, redirect });
  const q = new URLSearchParams({ client_id: DBX_KEY, response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256', token_access_type: 'offline', redirect_uri: redirect, state });
  return 'https://www.dropbox.com/oauth2/authorize?' + q.toString();
}

async function tokenCall(params) {
  const r = await fetch(API + '/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params).toString() });
  if (!r.ok) throw new Error('auth');
  return r.json();
}

export async function finishAuth(url) {
  let u;
  try { u = new URL(url); } catch (e) { return false; }
  const m = meta();
  const code = u.searchParams.get('code'), state = u.searchParams.get('state');
  if (!code || !m.verifier || !state || state !== m.state) return false;
  const t = await tokenCall({ grant_type: 'authorization_code', code, client_id: DBX_KEY, code_verifier: m.verifier, redirect_uri: m.redirect });
  setMeta({ rt: t.refresh_token, at: t.access_token, exp: Date.now() + (t.expires_in || 14400) * 1000 - 60000, verifier: '', state: '', baseRev: '', baseHash: '' });
  return true;
}

async function access() {
  const m = meta();
  if (!m.rt) throw new Error('auth');
  if (m.at && m.exp > Date.now()) return m.at;
  const t = await tokenCall({ grant_type: 'refresh_token', refresh_token: m.rt, client_id: DBX_KEY });
  setMeta({ at: t.access_token, exp: Date.now() + (t.expires_in || 14400) * 1000 - 60000 });
  return t.access_token;
}

async function remoteMeta() {
  const r = await fetch(API + '/2/files/get_metadata', { method: 'POST', headers: { Authorization: 'Bearer ' + await access(), 'Content-Type': 'application/json' }, body: JSON.stringify({ path: PATH }) });
  if (r.status === 409) return null;
  if (r.status === 401) { setMeta({ at: '', exp: 0 }); throw new Error('auth'); }
  if (!r.ok) throw new Error('net');
  const j = await r.json();
  return { rev: j.rev };
}

async function download() {
  const r = await fetch(CONTENT + '/2/files/download', { method: 'POST', headers: { Authorization: 'Bearer ' + await access(), 'Dropbox-API-Arg': JSON.stringify({ path: PATH }) } });
  if (!r.ok) throw new Error('net');
  let rev = '';
  try { rev = JSON.parse(r.headers.get('dropbox-api-result') || '{}').rev || ''; } catch (e) { }
  return { text: await r.text(), rev };
}

async function upload(text, rev) {
  const mode = rev ? { '.tag': 'update', update: rev } : { '.tag': 'add' };
  const r = await fetch(CONTENT + '/2/files/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + await access(), 'Dropbox-API-Arg': JSON.stringify({ path: PATH, mode, mute: true }), 'Content-Type': 'application/octet-stream' }, body: text });
  if (r.status === 409) throw new Error('conflict');
  if (!r.ok) throw new Error('net');
  return (await r.json()).rev;
}

async function pullRemote(rev) {
  const d = await download();
  let plain;
  try { plain = await unlockText(d.text, meta().pw); } catch (e) { throw new Error(e && e.message === 'wrong' ? 'badpw' : 'net'); }
  return { plain, rev: d.rev || rev };
}

let busy = false;

export async function syncNow(o) {
  if (!connected()) return { s: 'off' };
  if (busy) return { s: 'busy' };
  busy = true;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const m = meta();
      const local = o.state();
      const lh = await sha(local);
      const rm = await remoteMeta();
      if (!rm) {
        const rev = await upload(await lockText(local, m.pw), '');
        setMeta({ baseRev: rev, baseHash: lh, last: Date.now() });
        return { s: 'uploaded' };
      }
      const remoteChanged = rm.rev !== m.baseRev;
      const localChanged = lh !== m.baseHash;
      if (!remoteChanged && !localChanged) { setMeta({ last: Date.now() }); return { s: 'same' }; }
      try {
        if (!remoteChanged) {
          const rev = await upload(await lockText(local, m.pw), rm.rev);
          setMeta({ baseRev: rev, baseHash: lh, last: Date.now() });
          return { s: 'uploaded' };
        }
        const rem = await pullRemote(rm.rev);
        if (!localChanged || lh === o.blankHash) {
          await o.apply(rem.plain);
          setMeta({ baseRev: rem.rev, baseHash: await sha(o.state()), last: Date.now() });
          return { s: 'downloaded' };
        }
        if (await sha(rem.plain) === lh) { setMeta({ baseRev: rem.rev, baseHash: lh, last: Date.now() }); return { s: 'same' }; }
        const pick = await o.choose();
        if (pick === 'remote') {
          await o.apply(rem.plain);
          setMeta({ baseRev: rem.rev, baseHash: await sha(o.state()), last: Date.now() });
          return { s: 'downloaded' };
        }
        if (pick === 'local') {
          const rev = await upload(await lockText(local, m.pw), rm.rev);
          setMeta({ baseRev: rev, baseHash: lh, last: Date.now() });
          return { s: 'uploaded' };
        }
        return { s: 'later' };
      } catch (e) {
        if (e && e.message === 'conflict' && attempt === 0) continue;
        throw e;
      }
    }
    return { s: 'error', e: 'net' };
  } catch (e) {
    return { s: 'error', e: (e && e.message) || 'net' };
  } finally {
    busy = false;
  }
}
