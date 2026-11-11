import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';
import BOOK from './book.json';
import SITE from './site.json';
import { jsPDF } from 'jspdf';
import { VERSION } from './version.js';
import { canLock, isLocked, lockText, unlockText } from './lockcore.js';

const KEY = 'taking_care_v1';
const KIND = { P: 'I want to learn it', H: 'I need help', D: 'I know it' };
const FEELS = [
  ['happy', '\u{1F604}', 'Happy'], ['calm', '\u{1F60C}', 'Calm'], ['okay', '\u{1F642}', 'Okay'], ['tired', '\u{1F634}', 'Tired'],
  ['worried', '\u{1F61F}', 'Worried'], ['sad', '\u{1F622}', 'Sad'], ['mad', '\u{1F620}', 'Mad'], ['scared', '\u{1F628}', 'Scared']
];
const FEEL_COLOR = { happy: '#F2B705', calm: '#43A047', okay: '#3E8EDE', tired: '#8D8D8D', worried: '#F28C28', sad: '#5C6BC0', mad: '#D32F2F', scared: '#8E5BD0' };
const FEEL_TIP = {
  worried: 'Try the slow breathing or the 5-4-3-2-1 steps on the Calm tab.',
  scared: 'Try the 5-4-3-2-1 steps on the Calm tab. You are safe right now.',
  sad: 'Be gentle with yourself. A blanket, a hug, or telling a helper can lighten it.',
  mad: 'Mad is okay. Squeeze a pillow, stomp your feet twice, or take a quiet break.',
  tired: 'Your body might need rest. Screens away, water, and lie down.',
  happy: 'Nice. Notice what helped today.',
  calm: 'Nice. Notice what helped today.',
  okay: 'Okay is a good place to be.'
};
const ROUTINES = {
  morning: ['Wake up and stretch', 'Use the bathroom', 'Wash my hands', 'Wash and dry my face', 'Brush my teeth', 'Put on clean underwear and clothes', 'Brush my hair', 'Eat breakfast', 'Fill my water bottle', 'Look at today\'s plan'],
  bedtime: ['Put dirty clothes in the hamper', 'Tidy my things', 'Brush my teeth', 'Floss my teeth', 'Wash my face', 'Use the bathroom', 'Check the doors are locked', 'Screens away', 'Slow breathing', 'Lie down']
};

const slug = (t) => String(t).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim().replace(/ /g, '-');
const BIDX = {};
BOOK.forEach((sec, si) => sec.items.forEach((it, ii) => { BIDX[slug(it.o)] = [si, ii]; BIDX[slug(it.t)] = [si, ii]; }));
function migrate(st) {
  const out = {};
  Object.keys(st.skills || {}).forEach((k) => {
    const m = k.match(/^(\d+)-(\d+)$/);
    if (m && BOOK[+m[1]] && BOOK[+m[1]].items[+m[2]]) out[slug(BOOK[+m[1]].items[+m[2]].o)] = st.skills[k]; else out[k] = st.skills[k];
  });
  st.skills = out;
  return st;
}

function defaults() {
  return { name: '', helperName: '', helperPhone: '', skills: {}, plan: {}, mood: [], water: {}, routines: { morning: ROUTINES.morning.slice(), bedtime: ROUTINES.bedtime.slice() }, done: {}, theme: 'auto', custom: [], notes: '', curriculum: null, practice: {}, focusDone: {}, diary: [], food: [], profile: {}, reminders: [], clock24: false, remindInfo: '', paths: [], pathOther: '', shadows: [], pages: [], bibleTr: 'kjv', palette: 'purple', textScale: 100, font: 'default', spacing: false, cb: 'none', xclues: false, wide: false, apps: [] };
}
function load() {
  try { return migrate(Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}'))); } catch (e) { return defaults(); }
}
let S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }

const $ = (s) => document.querySelector(s);
const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function isDark() { return S.theme === 'dark' || (S.theme === 'auto' && !!(mq && mq.matches)); }
function anchored(el, sel, fn) {
  const v = $('#view');
  const top = el.getBoundingClientRect().top;
  fn();
  const n = sel ? document.querySelector(sel) : el;
  if (n) v.scrollTop += n.getBoundingClientRect().top - top;
}
function applyAccess() {
  const r = document.documentElement;
  r.style.setProperty('--ts', String((S.textScale || 100) / 100));
  r.setAttribute('data-font', S.font || 'default');
  if (S.spacing) r.setAttribute('data-sp', ''); else r.removeAttribute('data-sp');
  if (S.cb && S.cb !== 'none') r.setAttribute('data-cb', S.cb); else r.removeAttribute('data-cb');
  if (S.xclues) r.setAttribute('data-xc', ''); else r.removeAttribute('data-xc');
  if (S.wide) r.setAttribute('data-wide', ''); else r.removeAttribute('data-wide');
}
const WKEY = 'taking_care_wall_v1';
function loadWall() { try { return JSON.parse(localStorage.getItem(WKEY) || 'null') || { img: '', dim: 35 }; } catch (e) { return { img: '', dim: 35 }; } }
let WALL = loadWall();
function saveWall() { try { localStorage.setItem(WKEY, JSON.stringify(WALL)); return true; } catch (e) { return false; } }
function applyWall() {
  const r = document.documentElement;
  if (WALL.img) {
    r.style.setProperty('--wall', 'url("' + WALL.img + '")');
    r.style.setProperty('--dim', String((WALL.dim || 0) / 100));
    r.setAttribute('data-wall', '');
  } else { r.style.removeProperty('--wall'); r.removeAttribute('data-wall'); }
}
function wallFromFile(f, cb) {
  const rd = new FileReader();
  rd.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1400 / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', 0.82));
    };
    im.onerror = () => cb('');
    im.src = String(rd.result);
  };
  rd.onerror = () => cb('');
  rd.readAsDataURL(f);
}
function wallCard() {
  const dims = [[0, 'None'], [20, 'Light'], [35, 'Medium'], [55, 'Strong']];
  return '<div class="card"><h3>Wallpaper</h3><div class="mute">Pick a picture to show behind the app. It stays on this device.</div>' +
    (WALL.img ? '<div class="wallprev" style="background-image:url(\'' + WALL.img + '\')"></div>' : '') +
    '<label class="btn alt full" style="display:block;text-align:center;margin-top:10px" for="wallfile">' + (WALL.img ? 'Choose a different picture' : 'Choose a picture') + '</label><input type="file" id="wallfile" accept="image/*" hidden>' +
    (WALL.img ? '<label>Dim the picture so words are easy to read</label><div class="seg">' + dims.map((d) => '<button class="T' + ((WALL.dim || 0) === d[0] ? ' on' : '') + '" data-a="walldim" data-v="' + d[0] + '">' + d[1] + '</button>').join('') + '</div><button class="btn alt full" style="margin-top:10px" data-a="wallclear">Remove wallpaper</button>' : '') +
    '<div class="mute" id="wallmsg" style="margin-top:8px"></div></div>';
}
function applyTheme() {
  const d = isDark();
  document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light');
  document.documentElement.setAttribute('data-pal', S.palette || 'purple');
  applyAccess();
  applyWall();
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--head').trim() || '#7B4FC4');
  const b = document.getElementById('theme');
  if (b) b.innerHTML = d ? '&#9728;' : '&#9790;';
}
if (mq && mq.addEventListener) mq.addEventListener('change', () => { if (S.theme === 'auto') applyTheme(); });
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const dkey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const uid = () => Math.random().toString(36).slice(2, 9);

const NATIVE = Capacitor.isNativePlatform();
let tab = NATIVE ? 'apps' : 'mood';
let editRt = {};
let day = new Date();
let openSec = null;
let search = '';
let moodDraft = { feeling: null, level: 3 };
let breathTimer = null;
let ground = 0;

function toast(t) {
  const e = document.createElement('div');
  e.className = 'toast';
  e.textContent = t;
  document.body.appendChild(e);
  setTimeout(() => e.remove(), 2200);
}

function status(id, def) { return S.skills[id] || def; }
const SECCOL = BOOK.map((b) => b.color);
const sentences = (t) => String(t || '').split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
function curriculum() {
  const C = S.curriculum;
  if (C && C.sections && C.sections.length) {
    return C.sections.map((sec, i) => ({
      n: sec.n, title: sec.title, intro: sec.intro, color: SECCOL[i % SECCOL.length], img: sec.n >= 1 && sec.n <= 6 ? 's' + sec.n : 'mascot',
      items: sec.items.map((it) => {
        const b = BIDX[slug(it.t)];
        const bi = b ? BOOK[b[0]].items[b[1]] : null;
        return { key: slug(it.t), t: bi ? bi.t : it.t, k: it.k, pri: !!it.pri, say: bi ? bi.say : ((SITE[slug(it.t)] || {}).d || ''), icon: (SITE[slug(it.t)] || {}).i || '', note: it.note || '', steps: bi ? bi.steps : sentences(it.tip || (SITE[slug(it.t)] || {}).h), fromBook: !!bi };
      })
    }));
  }
  return BOOK.map((sec) => ({
    n: sec.n, title: sec.title, intro: sec.intro, color: sec.color, img: 's' + sec.n,
    items: sec.items.map((it) => ({ key: slug(it.o), t: it.t, k: it.k, pri: it.k === 'P', say: it.say, steps: it.steps, fromBook: true }))
  }));
}
function allSkills() {
  const out = [];
  curriculum().forEach((sec) => sec.items.forEach((it) => out.push({ id: it.key, sec, it })));
  return out;
}

function greet() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return S.name ? g + ', ' + S.name : g;
}

function setHeader(sub) { $('#sub').textContent = sub || ''; }

/* ---------- TODAY ---------- */
function viewToday() {
  const k = dkey(day);
  const isToday = k === dkey(new Date());
  setHeader(greet());
  const tasks = (S.plan[k] || []).slice().sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  const cups = S.water[k] || 0;
  let h = '<div class="dayrow"><button class="btn alt" data-a="day" data-d="-1">&lsaquo;</button><div class="dlab">' +
    (isToday ? 'Today' : day.toLocaleDateString(undefined, { weekday: 'long' })) + '<div class="mute">' +
    day.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) + '</div></div><button class="btn alt" data-a="day" data-d="1">&rsaquo;</button></div>';
  if (!isToday) h += '<button class="btn alt full" data-a="daytoday" style="margin-bottom:12px">Back to today</button>';
  h += clockCard() + focusCard();
  ['morning', 'bedtime'].forEach((r) => {
    const list = S.routines[r];
    const doneMap = S.done[k + '|' + r] || {};
    const n = list.filter((x) => doneMap[x]).length;
    h += '<div class="card"><div class="row"><h3 class="sp">' + (r === 'morning' ? 'Morning routine' : 'Bedtime routine') + '</h3><span class="mute">' + n + '/' + list.length + '</span><button class="btn alt" style="padding:6px 12px;min-height:36px;font-size:14px" data-a="editrt" data-r="' + r + '">' + (editRt[r] ? 'Done' : 'Edit') + '</button></div>' +
      '<div class="bar"><i style="width:' + (list.length ? Math.round(100 * n / list.length) : 0) + '%"></i></div>';
    list.forEach((x, i) => {
      if (editRt[r]) {
        h += '<div class="chk"><div class="rtmv"><button class="x" data-a="mvrt" data-r="' + r + '" data-i="' + i + '" data-d="-1"' + (i === 0 ? ' disabled' : '') + '>&#9650;</button><button class="x" data-a="mvrt" data-r="' + r + '" data-i="' + i + '" data-d="1"' + (i === list.length - 1 ? ' disabled' : '') + '>&#9660;</button></div><input type="text" class="rtedit" data-r="' + r + '" data-i="' + i + '" value="' + esc(x) + '"><button class="x" data-a="delrt" data-r="' + r + '" data-i="' + i + '">&times;</button></div>';
        return;
      }
      h += '<div class="chk ' + (doneMap[x] ? 'done' : '') + '" data-a="rt" data-r="' + r + '" data-i="' + i + '"><div class="box">' + (doneMap[x] ? '✓' : '') + '</div><div class="lbl sp">' + esc(x) + '</div></div>';
    });
    h += '<div class="row" style="margin-top:10px"><input type="text" id="addrt-' + r + '" placeholder="Add a step"><button class="btn alt" data-a="addrt" data-r="' + r + '">Add</button></div>' +
      (editRt[r] ? '<button class="btn alt full" style="margin-top:10px" data-a="resetrt" data-r="' + r + '">Put back the original steps</button>' : '') + '</div>';
  });
  h += '<div class="card"><h3>Water</h3><div class="mute">Aim for about 8 cups. Small sips all day count.</div><div class="water">';
  for (let i = 0; i < 8; i++) h += '<b class="' + (i < cups ? 'f' : '') + '"></b>';
  h += '</div><div class="row"><button class="btn alt" data-a="water" data-d="-1">&minus;</button><div class="sp" style="text-align:center;font-weight:800">' + cups + ' cups</div><button class="btn" data-a="water" data-d="1">+ Cup</button></div></div>';
  h += '<div class="card"><h3>Plan</h3>';
  if (!tasks.length) h += '<div class="mute">Nothing planned yet.</div>';
  tasks.forEach((t) => {
    h += '<div class="chk ' + (t.done ? 'done' : '') + '"><div class="box" data-a="task" data-id="' + t.id + '">' + (t.done ? '✓' : '') + '</div><div class="lbl sp" data-a="task" data-id="' + t.id + '">' +
      (t.time ? '<b>' + esc(t.time) + '</b> ' : '') + esc(t.text) + '</div><button class="x" data-a="deltask" data-id="' + t.id + '">&times;</button></div>';
  });
  h += '<label>Add something</label><input type="text" id="ttext" placeholder="What do you want to do?"><div class="row" style="margin-top:8px"><input type="time" id="ttime"><button class="btn" data-a="addtask">Add</button></div></div>';
  $('#view').innerHTML = h;
}

/* ---------- SKILLS ---------- */
function counts() {
  const c = { P: 0, H: 0, D: 0 };
  allSkills().forEach((x) => { c[status(x.id, x.it.k)]++; });
  return c;
}
function dots(id, st) {
  return '<div class="dots">' + ['P', 'H', 'D'].map((k) => '<button class="dot ' + k + (st === k ? ' on' : '') + '" data-a="quick" data-id="' + id + '" data-k="' + k + '" aria-label="' + KIND[k] + '">' + (st === k ? '✓' : '') + '</button>').join('') + '</div>';
}
function viewSkills() {
  setHeader('It is okay to ask for help!');
  const c = counts();
  const total = c.P + c.H + c.D;
  let h = '<div class="card"><div class="hero"><img src="img/cover.jpg" alt=""><div class="sp"><div class="ask">It is okay to ask for help!</div><div class="mute">Tap how each thing feels for you today.</div></div></div>' +
    '<div class="bar" style="margin-top:12px"><i style="width:' + Math.round(100 * c.D / total) + '%"></i></div><div class="mute" style="margin-top:6px">' + c.D + ' of ' + total + ' skills I know</div>' +
    '<div class="row" style="margin-top:10px;flex-wrap:wrap"><span class="chip D">' + c.D + ' I know it</span><span class="chip H">' + c.H + ' I need help</span><span class="chip P">' + c.P + ' I want to learn it</span></div>' +
    '<div class="mute" style="margin-top:10px">' + esc(sourceLabel()) + '</div>' +
    '<button class="btn full" style="margin-top:10px" data-a="import">Import my inventory file</button>' +
    '<a class="btn alt full" style="display:block;text-align:center;text-decoration:none;margin-top:10px" href="https://care.theskysanctum.com/inventory/" target="_blank" rel="noopener">Open the inventory page</a>' +
    '<button class="btn alt full" style="margin-top:10px" data-a="pdf">Open or share the PDF book</button></div>' +
    '<div class="legend"><span><i class="dot D"></i>I know it</span><span><i class="dot H"></i>I need help</span><span><i class="dot P"></i>I want to learn it</span></div>' +
    '<input type="text" id="srch" placeholder="Search skills" value="' + esc(search) + '" style="margin-bottom:12px">';
  const q = search.trim().toLowerCase();
  curriculum().forEach((s, si) => {
    const list = s.items.map((it) => ({ it, id: it.key })).filter((x) => !q || x.it.t.toLowerCase().includes(q));
    if (!list.length) return;
    const done = s.items.filter((it) => status(it.key, it.k) === 'D').length;
    const open = q || openSec === si;
    h += '<div class="sec"><div class="sechead" style="background:' + s.color + '" data-a="sec" data-s="' + si + '"><img src="img/' + s.img + '.jpg" alt=""><div class="sp"><b>' + s.n + '. ' + esc(s.title) + '</b><div style="font-size:13px;opacity:.95">' + done + ' of ' + s.items.length + ' known</div></div><span style="font-size:22px">' + (open ? '−' : '+') + '</span></div>';
    if (open) {
      h += '<div style="padding:12px 14px" class="mute">' + esc(s.intro) + '</div>';
      list.forEach((x) => {
        h += '<div class="item"><div class="t" data-a="skill" data-id="' + x.id + '">' + esc(x.it.t) + '</div>' + dots(x.id, status(x.id, x.it.k)) + '</div>';
      });
    }
    h += '</div>';
  });
  h += '<h2>Add something else</h2><div class="card"><div class="mute">Is there something that is not on the list? Add it here.</div>' +
    '<div class="row" style="margin-top:10px"><input type="text" id="ctext" placeholder="Something I want help with"><button class="btn" data-a="addcustom">Add</button></div>';
  S.custom.forEach((cc) => {
    h += '<div class="item" style="padding-left:0;padding-right:0"><div class="t">' + esc(cc.t) + '</div>' + dots('c:' + cc.id, cc.k) + '<button class="x" data-a="delcustom" data-id="' + cc.id + '">&times;</button></div>';
  });
  h += '</div><h2>Extra notes and thoughts</h2><div class="card"><textarea id="notes" placeholder="Anything else you want to remember or tell a helper">' + esc(S.notes) + '</textarea>' +
    '<button class="btn full" style="margin-top:12px" data-a="savelist">Done! Save my list</button></div>';
  $('#view').innerHTML = h;
  const sr = $('#srch');
  if (sr) sr.addEventListener('input', (e) => { search = e.target.value; const pos = e.target.selectionStart; viewSkills(); const n = $('#srch'); n.focus(); n.setSelectionRange(pos, pos); });
  const nt = $('#notes');
  if (nt) nt.addEventListener('input', (e) => { S.notes = e.target.value; save(); });
}
function buildList() {
  const L = ['MY PERSONAL INVENTORY', new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })];
  if (S.name) L.push('Name: ' + S.name);
  const g = { D: [], H: [], P: [] };
  allSkills().forEach((x) => g[status(x.id, x.it.k)].push(x.it.t + '  (' + x.sec.title + ')'));
  S.custom.forEach((cc) => g[cc.k].push(cc.t + '  (my own list)'));
  const names = { H: 'I NEED HELP', P: 'I WANT TO LEARN IT', D: 'I KNOW IT' };
  ['H', 'P', 'D'].forEach((k) => {
    L.push('', names[k] + ' (' + g[k].length + ')', '------------------------');
    if (!g[k].length) L.push('  (none)');
    g[k].forEach((t) => L.push('  - ' + t));
  });
  if (S.notes.trim()) L.push('', 'EXTRA NOTES AND THOUGHTS', '------------------------', S.notes.trim());
  return L.join('\n');
}
async function shareList() {
  try {
    const r = await maybeLock(buildList(), 'Your inventory');
    if (!r) return;
    const data = btoa(unescape(encodeURIComponent(r.text)));
    await deliver(r.locked ? 'My_Personal_Inventory_locked.txt' : 'My_Personal_Inventory.txt', data, 'My personal inventory', 'Save or send my list');
  } catch (e) { if (!(e && /cancel/i.test(String(e.message || e)))) toast('Could not save the list'); }
}
function sourceLabel() {
  const C = S.curriculum;
  if (!C) return 'Curriculum: the built-in book. Import your inventory file to build one from it.';
  return 'Curriculum: built from your inventory' + (C.profile ? ' (' + C.profile + ')' : '') + (C.date ? ', ' + C.date : '') + '.';
}
function findSkill(id) { return allSkills().find((x) => x.id === id); }
function openSkill(id) {
  const f = findSkill(id);
  if (!f) return;
  const it = f.it;
  const st = status(id, it.k);
  const n = S.practice[id] || 0;
  const doneToday = !!S.focusDone[dkey(new Date()) + '|' + id];
  let h = '<div class="row"><h3 class="sp" style="font-size:21px">' + esc(it.t) + '</h3><button class="x" data-a="closesheet">&times;</button></div>';
  if (it.say) h += '<p>' + esc(it.say) + '</p>';
  if (it.note) h += '<p class="mute">My note: ' + esc(it.note) + '</p>';
  if (it.steps.length) {
    h += '<div class="mute" style="font-weight:700">' + (it.fromBook ? 'TRY IT, STEP BY STEP' : 'THINGS THAT CAN HELP') + '</div><ol class="steps">' + it.steps.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>';
  } else h += '<p class="mute">No steps were listed for this one yet. A helper can show you.</p>';
  h += '<div class="mute" style="font-weight:700">HOW DOES THIS FEEL FOR YOU TODAY?</div><div class="seg">' +
    ['P', 'H', 'D'].map((k) => '<button class="' + k + (k === st ? ' on' : '') + '" data-a="setst" data-id="' + id + '" data-k="' + k + '">' + KIND[k] + '</button>').join('') + '</div>' +
    '<button class="btn ' + (doneToday ? '' : 'alt') + ' full" data-a="practice" data-id="' + id + '">' + (doneToday ? '✓ I practiced this today' : 'I practiced this today') + '</button>' +
    '<div class="mute" style="text-align:center;margin-top:8px">Practiced ' + n + (n === 1 ? ' time' : ' times') + '</div>';
  showSheet(h);
}
function togglePractice(id) {
  const key = dkey(new Date()) + '|' + id;
  if (S.focusDone[key]) { delete S.focusDone[key]; S.practice[id] = Math.max(0, (S.practice[id] || 0) - 1); }
  else { S.focusDone[key] = true; S.practice[id] = (S.practice[id] || 0) + 1; toast('Nice practice!'); }
  save();
}

/* ---------- inventory import ---------- */
function parseChecklist(text) {
  const lines = String(text).replace(/\r/g, '').split('\n');
  const secs = [];
  const meta = {};
  let cur = null, grp = null, it = null, i = 0, xn = false;
  const isSep = (x) => /^=+$/.test(x.trim());
  while (i < lines.length) {
    const line = lines[i].trim();
    if (isSep(line)) {
      const m = (lines[i + 1] || '').trim().match(/^(\d+)\.\s+(.+)$/);
      if (m) {
        cur = { n: Number(m[1]), title: m[2].trim(), intro: '', items: [] };
        secs.push(cur);
        let j = i + 2;
        const buf = [];
        while (j < lines.length && !isSep(lines[j])) { if (lines[j].trim()) buf.push(lines[j].trim()); j++; }
        cur.intro = buf.join(' ');
        i = j + 1; grp = null; it = null; continue;
      }
      i++; continue;
    }
    let mm;
    if ((mm = line.match(/^Profile Mode:\s*(.+)$/i))) meta.profile = mm[1].trim();
    else if ((mm = line.match(/^Date:\s*(.+)$/i))) meta.date = mm[1].trim();
    else if (/NOT ANSWERED/i.test(line)) { grp = { k: 'P', pri: false, un: true }; it = null; }
    else if (/EXTRA NOTES/i.test(line)) { grp = null; it = null; xn = true; }
    else if (xn && line && !/^-+$/.test(line)) meta.extra = (meta.extra ? meta.extra + '\n' : '') + line;
    else if (/THINGS/i.test(line) && /(TEACH|NEED HELP|CAN DO)/i.test(line)) {
      grp = { k: /TEACH/i.test(line) ? 'P' : /NEED HELP/i.test(line) ? 'H' : 'D', pri: /PRIORITY/i.test(line) };
      it = null;
    } else if (/^[•*\-]\s+/.test(line) && cur && grp) {
      let t = line.replace(/^[•*\-]\s+/, '').trim();
      let note = '';
      const nm = t.match(/^(.*?)\s*\(Note:\s*([\s\S]*)\)$/);
      if (nm) { t = nm[1].trim(); note = nm[2].trim(); }
      if (t && !/none marked/i.test(t)) { it = { t, tip: '', note, k: grp.k, pri: grp.pri, un: !!grp.un }; cur.items.push(it); }
    } else if (it && /Things that can help:/i.test(line)) {
      it.tip = line.replace(/^.*?Things that can help:\s*/i, '').trim();
    }
    i++;
  }
  const sections = secs.filter((x) => x.items.length);
  const prof = meta.profile ? meta.profile.toLowerCase().replace(/^./, (c) => c.toUpperCase()) : '';
  return { sections, profile: prof, date: meta.date || '', extra: meta.extra || '' };
}
let pendingImport = null;
function importSheet(msg) {
  showSheet('<div class="row"><h3 class="sp" style="font-size:21px">Import my inventory</h3><button class="x" data-a="closesheet">&times;</button></div>' +
    '<p class="mute">Save the report (the .txt file) from care.theskysanctum.com, then pick it here. The app turns it into your curriculum.</p>' +
    (msg ? '<p style="color:var(--red);font-weight:700">' + esc(msg) + '</p>' : '') +
    '<label>Pick the file</label><input type="file" id="ifile" accept="text/plain,.txt,text/*">' +
    '<label>Or paste the text here</label><textarea id="ipaste" placeholder="Paste the report text"></textarea>' +
    '<button class="btn alt full" style="margin-top:10px" data-a="readpaste">Read the pasted text</button>');
}
async function handleImport(text) {
  if (isLocked(text)) {
    const u = await unlockFlow(text);
    if (u.cancel) return importSheet();
    if (u.err) return importSheet(u.err);
    text = u.text;
  }
  const p = parseChecklist(text);
  const total = p.sections.reduce((a, s) => a + s.items.length, 0);
  if (!total) return importSheet('I could not find any inventory items in that. Try the .txt report from the site.');
  pendingImport = p;
  const c = { P: 0, H: 0, D: 0 }, fresh = [];
  p.sections.forEach((s) => s.items.forEach((x) => { c[x.k]++; if (!BIDX[slug(x.t)]) fresh.push(x.t); }));
  showSheet('<div class="row"><h3 class="sp" style="font-size:21px">Found your inventory</h3><button class="x" data-a="closesheet">&times;</button></div>' +
    '<p>' + total + ' skills in ' + p.sections.length + ' sections' + (p.profile ? ' (' + esc(p.profile) + ')' : '') + '.</p>' +
    '<div class="row" style="flex-wrap:wrap"><span class="chip P">' + c.P + ' I want to learn it</span><span class="chip H">' + c.H + ' I need help</span><span class="chip D">' + c.D + ' I know it</span></div>' +
    (fresh.length ? '<p class="mute" style="margin-top:12px">' + fresh.length + ' are new topics that are not in the book. They will use the tips from your file: ' + esc(fresh.slice(0, 6).join(', ')) + (fresh.length > 6 ? ', and more' : '') + '.</p>' : '<p class="mute" style="margin-top:12px">Every topic matches the book, so each one gets the full steps.</p>') +
    '<p class="mute">Your red, yellow, and green dots will be set to match this file. Today\'s lesson starts with the priority items.</p>' +
    '<button class="btn full" data-a="useimport">Build my curriculum</button><button class="btn alt full" style="margin-top:10px" data-a="closesheet">Cancel</button>');
}
function useImport() {
  if (!pendingImport) return;
  const p = pendingImport;
  S.curriculum = { sections: p.sections, profile: p.profile, date: p.date, importedAt: Date.now() };
  p.sections.forEach((s) => s.items.forEach((x) => { if (!x.un) S.skills[slug(x.t)] = x.k; }));
  if (p.extra && (S.notes || '').indexOf(p.extra) < 0) S.notes = ((S.notes || '') + (S.notes ? '\n\n' : '') + p.extra).trim();
  pendingImport = null; openSec = null; save(); closeSheet(); render(); toast('Curriculum ready');
}

/* ---------- daily lesson ---------- */
function focusList() {
  const all = allSkills().map((x) => ({ x, st: status(x.id, x.it.k) })).filter((y) => y.st !== 'D');
  const pri = all.filter((y) => y.st === 'P' && y.x.it.pri);
  const hh = all.filter((y) => y.st === 'H');
  const rest = all.filter((y) => y.st === 'P' && !y.x.it.pri);
  return pri.concat(hh, rest).map((y) => y.x);
}
function focusCard() {
  const L = focusList();
  if (!L.length) return '<div class="card"><h3>Today\'s lesson</h3><div class="mute">Everything on your list is marked I know it. Nice work!</div></div>';
  const dayNo = Math.floor(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) / 86400000);
  const n = Math.min(3, L.length);
  const k = dkey(day);
  let done = 0, rows = '';
  for (let i = 0; i < n; i++) {
    const x = L[(dayNo * n + i) % L.length];
    const d = !!S.focusDone[k + '|' + x.id];
    if (d) done++;
    rows += '<div class="chk ' + (d ? 'done' : '') + '"><div class="box" data-a="focusdone" data-id="' + x.id + '">' + (d ? '✓' : '') + '</div><div class="lbl sp" data-a="skill" data-id="' + x.id + '">' + esc(x.it.t) + '<div class="mute">' + esc(x.sec.title) + '</div></div></div>';
  }
  return '<div class="card"><div class="row"><h3 class="sp">Today\'s lesson</h3><span class="mute">' + done + '/' + n + '</span></div><div class="mute">A few skills to work on today. Tap one to see the steps, tick it when you practice.</div>' + rows + '</div>';
}

/* ---------- MOOD ---------- */
function moodHtml() {
  let h = '<div class="card"><h3>Right now I feel</h3><div class="feels">';
  FEELS.forEach((f) => { h += '<button class="feel ' + (moodDraft.feeling === f[0] ? 'on' : '') + '" data-a="feel" data-f="' + f[0] + '"><b>' + f[1] + '</b>' + f[2] + '</button>'; });
  h += '</div><label>How strong is it? (1 small, 5 big)</label><div class="lvl">';
  for (let i = 1; i <= 5; i++) h += '<button class="' + (moodDraft.level === i ? 'on' : '') + '" data-a="lvl" data-l="' + i + '">' + i + '</button>';
  h += '</div><label>Anything to add? (optional)</label><textarea id="mnote" placeholder="What happened? What helped?"></textarea>' +
    '<button class="btn full" style="margin-top:12px" data-a="savemood">Save</button></div>';
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  h += '<div class="card"><h3>Last 14 days</h3><div class="chart">';
  days.forEach((d) => {
    const es = S.mood.filter((m) => dkey(new Date(m.ts)) === dkey(d));
    const m = es[es.length - 1];
    const f = m && FEELS.find((x) => x[0] === m.feeling);
    h += '<div><em>' + (f ? f[1] : '') + '</em><i style="height:' + (m ? m.level * 16 : 3) + 'px;background:' + (m ? FEEL_COLOR[m.feeling] : '#E7E0F3') + '"></i>' + d.getDate() + '</div>';
  });
  h += '</div><div class="mute">Taller means a stronger feeling.</div></div><h2>History</h2>';
  if (!S.mood.length) h += '<div class="mute">No entries yet.</div>';
  S.mood.slice().reverse().slice(0, 40).forEach((m) => {
    const f = FEELS.find((x) => x[0] === m.feeling);
    const d = new Date(m.ts);
    h += '<div class="card"><div class="row"><div style="font-size:30px">' + f[1] + '</div><div class="sp"><b>' + f[2] + ' &middot; ' + m.level + '/5</b><div class="mute">' +
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) +
      '</div></div><button class="x" data-a="delmood" data-ts="' + m.ts + '">&times;</button></div>' + (m.note ? '<div style="margin-top:6px">' + esc(m.note) + '</div>' : '') + '</div>';
  });
  return h;
}


let meSub = 'mood';
let diaryDraft = '';
let foodDraft = { meal: 'Breakfast', tummy: '', text: '' };
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const TUMMY = [['hungry', 'Still hungry'], ['right', 'Just right'], ['full', 'Too full']];
const fmtDay = (d) => d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const fmtTime = (d) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
function diaryHtml() {
  let h = '<div class="card"><h3>My diary</h3><div class="mute">A private place for my thoughts. Nobody sees this unless I share it.</div>' +
    '<textarea id="dtext" style="min-height:140px;margin-top:10px" placeholder="Today I...">' + esc(diaryDraft) + '</textarea>' +
    '<button class="btn full" style="margin-top:12px" data-a="savediary">Save to my diary</button></div>';
  if (!S.diary.length) return h + '<div class="mute">No entries yet.</div>';
  h += '<h2>Past pages</h2><input type="text" id="dsearch" placeholder="Search my diary" value="' + esc(diarySearch) + '">';
  const q = diarySearch.toLowerCase();
  S.diary.slice().reverse().filter((e) => !q || e.text.toLowerCase().indexOf(q) >= 0).forEach((e) => {
    const d = new Date(e.ts);
    h += '<div class="card"><div class="row"><div class="sp mute">' + fmtDay(d) + ' &middot; ' + fmtTime(d) + (e.edited ? ' &middot; edited' : '') + '</div>' +
      '<button class="x" data-a="editdiary" data-id="' + e.id + '">&#9998;</button><button class="x" data-a="deldiary" data-id="' + e.id + '">&times;</button></div>' +
      '<div style="white-space:pre-wrap;margin-top:6px">' + esc(e.text) + '</div></div>';
  });
  return h;
}
let diarySearch = '';
function foodHtml() {
  const now = new Date(), tk = dkey(now);
  let h = '<div class="card"><h3>What did I eat?</h3><div class="seg">' +
    MEALS.map((m) => '<button class="T' + (foodDraft.meal === m ? ' on' : '') + '" data-a="fmeal" data-m="' + m + '">' + m + '</button>').join('') + '</div>' +
    '<input type="text" id="ftext" placeholder="Like: eggs, toast, and an apple" value="' + esc(foodDraft.text) + '">' +
    '<label>How does my tummy feel?</label><div class="seg">' +
    TUMMY.map((t) => '<button class="T' + (foodDraft.tummy === t[0] ? ' on' : '') + '" data-a="ftummy" data-t="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
    '<button class="btn full" style="margin-top:6px" data-a="savefood">Save</button></div>';
  const cups = S.water[tk] || 0;
  h += '<div class="card"><div class="row"><h3 class="sp">Water today</h3><b>' + cups + ' / 8 cups</b></div><div class="mute">Add cups on the Today tab.</div></div>';
  const days = {};
  S.food.forEach((f) => { const k = dkey(new Date(f.ts)); (days[k] = days[k] || []).push(f); });
  const keys = Object.keys(days).sort().reverse().slice(0, 14);
  if (!keys.length) return h + '<div class="mute">No meals saved yet.</div>';
  keys.forEach((k) => {
    const L = days[k].slice().sort((a, b) => a.ts - b.ts);
    h += '<h2>' + (k === tk ? 'Today' : fmtDay(new Date(L[0].ts))) + '</h2><div class="card">';
    L.forEach((f) => {
      const t = TUMMY.find((x) => x[0] === f.tummy);
      h += '<div class="chk"><div class="lbl sp"><b>' + esc(f.meal) + '</b> &middot; <span class="mute">' + fmtTime(new Date(f.ts)) + (t ? ' &middot; ' + t[1] : '') + '</span><div>' + esc(f.text) + '</div></div><button class="x" data-a="delfood" data-id="' + f.id + '">&times;</button></div>';
    });
    h += '</div>';
  });
  return h;
}

const PROFILE_FIELDS = [['foods', 'Foods', '🍎'], ['drinks', 'Drinks', '🥤'], ['music', 'Music', '🎵'], ['shows', 'Shows and movies', '📺'], ['colors', 'Colors', '🎨'], ['smells', 'Smells', '🌸'], ['textures', 'Textures and feels', '🧶'], ['sounds', 'Sounds', '🔊'], ['activities', 'Things to do', '🧩'], ['animals', 'Animals', '🐾'], ['places', 'Places', '🏡'], ['calm', 'Comforts', '🧸'], ['other', 'Anything else', '⭐']];
function profileHtml() {
  let h = '<div class="card"><h3>All about me</h3><div class="mute">Fill in only what you want. Everything here is optional and saves as you type. Helpers can use it to know what I love and what is hard for me.</div></div>' +
    '<div class="card"><label style="margin-top:0">About me</label><textarea data-pf="about" placeholder="Anything I want people to know about me">' + esc(S.profile.about || '') + '</textarea></div>';
  PROFILE_FIELDS.forEach((f) => {
    const v = S.profile[f[0]] || {};
    h += '<div class="card"><h3>' + f[2] + ' ' + f[1] + '</h3><label style="color:var(--green)">I like</label><textarea data-pf="' + f[0] + '" data-side="like" placeholder="Separate with commas">' + esc(v.like || '') + '</textarea>' +
      '<label style="color:var(--red)">I do not like</label><textarea data-pf="' + f[0] + '" data-side="dislike" placeholder="Separate with commas">' + esc(v.dislike || '') + '</textarea></div>';
  });
  return h + '<button class="btn alt full" data-a="shareprofile">Share my profile</button>';
}
function profileText() {
  let t = 'ALL ABOUT ' + (S.name || 'ME').toUpperCase() + '\n\n';
  if (S.profile.about) t += S.profile.about + '\n\n';
  PROFILE_FIELDS.forEach((f) => {
    const v = S.profile[f[0]] || {};
    if (v.like || v.dislike) t += f[1].toUpperCase() + '\n' + (v.like ? '  Likes: ' + v.like + '\n' : '') + (v.dislike ? '  Does not like: ' + v.dislike + '\n' : '') + '\n';
  });
  return t.trim();
}
const SYN = 29.530588853;
const NEWREF = Date.UTC(2000, 0, 6, 18, 14);
const MKEY = 'taking_care_moon_v1';
const PF = { 'New Moon': 0, 'First Quarter': 0.25, 'Full Moon': 0.5, 'Last Quarter': 0.75 };
let MC = {};
try { MC = JSON.parse(localStorage.getItem(MKEY) || '{}') || {}; } catch (e) { MC = {}; }
let moonEv = null, moonStatus = '';
function buildEvents() {
  const ev = [];
  Object.keys(MC).forEach((y) => (MC[y].p || []).forEach((r) => {
    const hm = String(r[3]).split(':');
    if (PF[r[4]] == null) return;
    ev.push({ t: Date.UTC(r[0], r[1] - 1, r[2], Number(hm[0]), Number(hm[1])), f: PF[r[4]] });
  }));
  ev.sort((a, b) => a.t - b.t);
  moonEv = ev;
}
buildEvents();
function fracAt(ms) {
  if (moonEv && moonEv.length) {
    let lo = 0, hi = moonEv.length - 1;
    if (ms >= moonEv[0].t && ms < moonEv[hi].t) {
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (moonEv[mid].t <= ms) lo = mid; else hi = mid; }
      const a = moonEv[lo], b = moonEv[lo + 1];
      if (b.t - a.t < 12 * 86400000) {
        const bf = b.f === 0 ? 1 : b.f;
        return (a.f + (ms - a.t) / (b.t - a.t) * (bf - a.f)) % 1;
      }
    }
  }
  const a = ((ms - NEWREF) / 86400000) % SYN;
  return (a < 0 ? a + SYN : a) / SYN;
}
const MOONS = [['🌑', 'New moon'], ['🌒', 'Waxing crescent'], ['🌓', 'First quarter'], ['🌔', 'Waxing gibbous'], ['🌕', 'Full moon'], ['🌖', 'Waning gibbous'], ['🌗', 'Last quarter'], ['🌘', 'Waning crescent']];
function moonAt(d) {
  const ms = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
  const f = fracAt(ms);
  const m = MOONS[Math.floor(f * 8 + 0.5) % 8];
  return { e: m[0], n: m[1], ill: Math.round((1 - Math.cos(2 * Math.PI * f)) / 2 * 100), f };
}
function nextPhase(frac) {
  const now = Date.now();
  if (moonEv) { const e = moonEv.find((x) => x.t > now && x.f === frac); if (e) return e.t; }
  const n = Math.floor((now - NEWREF) / 86400000 / SYN);
  for (let i = 0; i < 3; i++) { const t = NEWREF + (n + i + frac) * SYN * 86400000; if (t > now) return t; }
  return now;
}
async function fetchMoonYear(y) {
  const r = await fetch('https://aa.usno.navy.mil/api/moon/phases/year?year=' + y);
  if (!r.ok) throw new Error('http ' + r.status);
  const j = await r.json();
  if (!j || !Array.isArray(j.phasedata) || j.phasedata.length < 40) throw new Error('bad data');
  MC[y] = { at: Date.now(), p: j.phasedata.map((x) => [x.year, x.month, x.day, x.time, x.phase]) };
}
let moonBusy = false;
async function ensureMoon(force) {
  if (moonBusy) return;
  const cy = new Date().getFullYear();
  const mm = moonMonth.getFullYear();
  const years = Array.from(new Set([cy - 1, cy, cy + 1, mm - 1, mm, mm + 1])).filter((y) => y >= 1700 && y <= 2100);
  const stale = (y) => !MC[y] || (force && true) || (y >= cy && Date.now() - MC[y].at > 180 * 86400000);
  const todo = years.filter(stale);
  if (!todo.length) return;
  moonBusy = true; moonStatus = 'Updating...';
  if (tab === 'mood' && meSub === 'moon') render();
  let ok = 0;
  await Promise.all(todo.map((y) => fetchMoonYear(y).then(() => { ok++; }, () => { })));
  moonBusy = false;
  if (ok) { try { localStorage.setItem(MKEY, JSON.stringify(MC)); } catch (e) { } buildEvents(); }
  moonStatus = ok === todo.length ? '' : (ok ? 'Some years could not be updated.' : 'Could not reach the internet.');
  if (tab === 'mood' && meSub === 'moon') render();
}
function moonSource() {
  const ys = Object.keys(MC);
  if (!ys.length) return 'Using a built-in estimate. Open this page once with internet to download exact dates from the U.S. Naval Observatory.';
  const last = Math.max.apply(null, ys.map((y) => MC[y].at));
  return 'Dates from the U.S. Naval Observatory, saved on this phone. Last updated ' + new Date(last).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + '.';
}
let moonMonth = new Date(); moonMonth = new Date(moonMonth.getFullYear(), moonMonth.getMonth(), 1);
function moonHtml() {
  const now = new Date(), mt = moonAt(now);
  const nf = nextPhase(0.5), nn = nextPhase(0);
  const dd = (t) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const left = (t) => { const k = Math.ceil((t - Date.now()) / 86400000); return k <= 1 ? 'about a day' : k + ' days'; };
  let h = '<div class="card" style="text-align:center"><div style="font-size:84px;line-height:96px">' + mt.e + '</div><div class="big" style="margin:6px 0">' + mt.n + '</div><div class="mute">' + mt.ill + '% lit tonight</div></div>' +
    '<div class="card"><div class="row"><div class="sp"><b>Next full moon</b><div class="mute">' + dd(nf) + ' &middot; in ' + left(nf) + '</div></div><div style="font-size:34px">🌕</div></div>' +
    '<div class="row" style="margin-top:10px"><div class="sp"><b>Next new moon</b><div class="mute">' + dd(nn) + ' &middot; in ' + left(nn) + '</div></div><div style="font-size:34px">🌑</div></div></div>';
  h += '<h2>Next 7 nights</h2><div class="card">';
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i), m = moonAt(d);
    h += '<div class="chk"><div style="font-size:30px">' + m.e + '</div><div class="lbl sp"><b>' + (i === 0 ? 'Tonight' : i === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'long' })) + '</b><div class="mute">' + m.n + ' &middot; ' + m.ill + '% lit</div></div></div>';
  }
  h += '</div>';
  const y = moonMonth.getFullYear(), mo = moonMonth.getMonth();
  const first = new Date(y, mo, 1).getDay(), dim = new Date(y, mo + 1, 0).getDate();
  h += '<div class="dayrow"><button class="btn alt" data-a="moonmo" data-d="-1">&lsaquo;</button><div class="dlab">' + moonMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) + '</div><button class="btn alt" data-a="moonmo" data-d="1">&rsaquo;</button></div><div class="card"><div class="mcal">';
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((x) => { h += '<div class="mh">' + x + '</div>'; });
  for (let i = 0; i < first; i++) h += '<div></div>';
  const tk = dkey(now);
  for (let d = 1; d <= dim; d++) {
    const dt = new Date(y, mo, d), m = moonAt(dt);
    h += '<button class="md' + (dkey(dt) === tk ? ' today' : '') + '" data-a="moonday" data-t="' + dt.getTime() + '"><span>' + d + '</span><b>' + m.e + '</b></button>';
  }
  h += '</div></div><div class="mute" style="text-align:center">' + esc(moonSource()) + (moonStatus ? '<br><b>' + esc(moonStatus) + '</b>' : '') + '</div><button class="btn alt full" style="margin-top:12px" data-a="moonrefresh"' + (moonBusy ? ' disabled' : '') + '>Update moon dates now</button>';
  return h;
}
function viewMood() {
  if (meSub === 'shadows' && !hasPagan()) meSub = 'mood';
  if (meSub.indexOf('sec:') === 0 && activeSecs().indexOf(meSub.slice(4)) < 0) meSub = 'mood';
  setHeader((meSub.indexOf('sec:') === 0 && PATH_SECS[meSub.slice(4)]) ? PATH_SECS[meSub.slice(4)].title : { shadows: 'Book of Shadows', diary: 'My diary', food: 'My food', profile: 'All about me', moon: 'The moon' }[meSub] || 'How am I feeling?');
  const seg = '<div class="seg" style="flex-wrap:wrap">' + [['mood', 'Mood'], ['diary', 'Diary'], ['food', 'Food'], ['moon', 'Moon'], ['profile', 'Profile']].concat(hasPagan() ? [['shadows', 'Shadows']] : []).concat(activeSecs().map((id) => ['sec:' + id, PATH_SECS[id].label])).map((x) => '<button class="T' + (meSub === x[0] ? ' on' : '') + '" data-a="mesub" data-s="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
  $('#view').innerHTML = seg + (meSub === 'diary' ? diaryHtml() : meSub === 'food' ? foodHtml() : meSub === 'moon' ? moonHtml() : meSub === 'profile' ? profileHtml() : meSub === 'shadows' ? shadowsHtml() : meSub.indexOf('sec:') === 0 ? pagesHtml(meSub.slice(4)) : moodHtml());
}

/* ---------- CALM ---------- */
function stopBreath() {
  if (breathTimer) { clearTimeout(breathTimer); clearInterval(breathTimer); breathTimer = null; }
  const el = document.getElementById('breath'), b = document.getElementById('breathbtn');
  if (el) { el.textContent = 'Tap start'; el.style.transitionDuration = '0.6s'; el.style.transform = 'scale(1)'; }
  if (b) { b.textContent = 'Start'; b.classList.remove('alt'); }
}
function viewCalm() {
  stopBreath();
  setHeader('Calm and safe');
  const dn = new Date().toLocaleDateString(undefined, { weekday: 'long' });
  const steps = [['5', 'things you can SEE', 'Look around. Name 5 things.'], ['4', 'things you can TOUCH', 'Feel your feet on the floor, your clothes, a blanket.'], ['3', 'things you can HEAR', 'Listen for the quiet sounds around you.'], ['2', 'things you can SMELL', 'Or think of 2 smells you like.'], ['1', 'thing you can TASTE', 'Take a sip of cold water.']];
  const g = steps[ground];
  let h = '<div class="card"><h3>I am safe</h3><div class="big">Today is ' + dn + '.<br>I am safe right now.</div><div class="mute" style="text-align:center">Press your feet into the floor. Touch 3 solid things.</div></div>' +
    '<div class="card"><h3>Slow breathing</h3><div class="mute">Smell the flower, blow out the candle.</div><div class="breath" id="breath">Tap start</div><button class="btn full" id="breathbtn" data-a="breath">Start</button></div>' +
    '<div class="card"><h3>5-4-3-2-1</h3><div class="big">' + g[0] + ' ' + g[1] + '</div><div class="mute" style="text-align:center">' + g[2] + '</div>' +
    '<div class="row" style="margin-top:12px"><button class="btn alt sp" data-a="gprev">Back</button><button class="btn sp" data-a="gnext">' + (ground === 4 ? 'Start over' : 'Next') + '</button></div></div>' +
    '<div class="card"><h3>Quick helpers</h3><div class="mute">Wrap up in a warm blanket. Hug a stuffed animal. Squeeze a fidget. Say: "I need a 5 minute quiet break, please."</div></div>' +
    helpCard();
  $('#view').innerHTML = h;
}
function helpCard() {
  let h = '<div class="card help"><h3>Need help right now?</h3><div class="mute">If you are in danger or feel like you might hurt yourself, reach out right away.</div>' +
    '<a class="tel" href="tel:911">Call 911</a><a class="tel" href="tel:988">Call or text 988 (Suicide and Crisis Lifeline)</a>';
  if (S.helperPhone) h += '<a class="tel" style="background:var(--purple)" href="tel:' + esc(S.helperPhone.replace(/[^0-9+]/g, '')) + '">Call ' + esc(S.helperName || 'my safe helper') + '</a>';
  else h += '<div class="mute" style="margin-top:10px">Add your safe helper\'s number on the More tab.</div>';
  return h + '</div>';
}
function startBreath() {
  stopBreath();
  const el = $('#breath');
  if (!el) return;
  const bb = document.getElementById('breathbtn');
  if (bb) { bb.textContent = 'Stop'; bb.classList.add('alt'); }
  const seq = [['Breathe in', 4, 1.25], ['Hold', 2, 1.25], ['Breathe out', 6, 0.85]];
  let i = 0;
  const run = () => {
    const s = seq[i % 3];
    el.textContent = s[0];
    el.style.transitionDuration = s[1] + 's';
    el.style.transform = 'scale(' + s[2] + ')';
    i++;
    clearTimeout(breathTimer);
    breathTimer = setTimeout(run, s[1] * 1000);
  };
  run();
}

/* ---------- MORE ---------- */

const DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const QUICK_REM = [['Morning routine', '08:00'], ['Drink water', '10:00'], ['Lunch', '12:00'], ['Drink water', '15:00'], ['Dinner', '18:00'], ['Bedtime routine', '21:00'], ['Write in my diary', '20:00'], ['Check in on my mood', '19:00']];
const t12 = (hhmm) => { const a = String(hhmm).split(':'); const d = new Date(2000, 0, 1, Number(a[0]), Number(a[1])); return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: !S.clock24 }); };
const nowStr = () => new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: !S.clock24 });
let clockTimer = null;
function tickClock() {
  document.querySelectorAll('[data-clock]').forEach((n) => { n.textContent = nowStr(); });
  document.querySelectorAll('[data-clockdate]').forEach((n) => { n.textContent = fmtDay(new Date()); });
}
function startClock() { if (!clockTimer) clockTimer = setInterval(tickClock, 5000); }
function nextReminder() {
  const now = new Date(); let best = null;
  S.reminders.filter((r) => r.on && r.days.length).forEach((r) => {
    const a = r.time.split(':');
    for (let i = 0; i < 8; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, Number(a[0]), Number(a[1]));
      if (d > now && r.days.indexOf(d.getDay()) >= 0) { if (!best || d < best.d) best = { d, r }; break; }
    }
  });
  return best;
}
function clockCard() {
  const nx = nextReminder();
  let nxt = '';
  if (nx) nxt = '<div class="mute" style="margin-top:6px">Next reminder: <b>' + esc(nx.r.label) + '</b> at ' + t12(nx.r.time) + (nx.d.toDateString() === new Date().toDateString() ? '' : ' on ' + DAYN[nx.d.getDay()]) + '</div>';
  return '<div class="card" data-a="bigclock" style="text-align:center"><div class="clocknum" data-clock>' + nowStr() + '</div><div class="mute" data-clockdate>' + fmtDay(new Date()) + '</div>' + nxt + '</div>';
}
function bigClock() {
  showSheet('<div class="row"><h3 class="sp" style="font-size:21px">Clock</h3><button class="x" data-a="closesheet">&times;</button></div><div class="clocknum big2" data-clock>' + nowStr() + '</div><div class="mute" style="text-align:center;font-size:18px" data-clockdate>' + fmtDay(new Date()) + '</div>' +
    '<div class="seg" style="margin-top:18px"><button class="T' + (!S.clock24 ? ' on' : '') + '" data-a="clockfmt" data-v="12">12 hour</button><button class="T' + (S.clock24 ? ' on' : '') + '" data-a="clockfmt" data-v="24">24 hour</button></div>');
}
function remindersCard() {
  let h = '<div class="card"><h3>Reminders and alarms</h3><div class="mute">Gentle reminders that show up even when the app is closed.</div>';
  if (!S.reminders.length) h += '<div class="mute" style="margin-top:8px">No reminders yet.</div>';
  S.reminders.forEach((r) => {
    h += '<div class="chk"><div class="lbl sp" data-a="editrem" data-id="' + r.id + '"><b>' + esc(r.label) + '</b><div class="mute">' + t12(r.time) + ' &middot; ' + (r.days.length === 7 ? 'Every day' : r.days.length ? r.days.map((d) => DAYN[d]).join(' ') : 'No days') + '</div></div>' +
      '<div class="tog' + (r.on ? ' on' : '') + '" data-a="togrem" data-id="' + r.id + '"><i></i></div></div>';
  });
  h += '<button class="btn full" style="margin-top:10px" data-a="newrem">Add a reminder</button>' +
    (S.remindInfo ? '<div class="mute" style="margin-top:8px"><b>' + esc(S.remindInfo) + '</b></div>' : '') + '</div>';
  return h;
}
let remDraft = null;
function remSheet() {
  const r = remDraft;
  showSheet('<div class="row"><h3 class="sp" style="font-size:21px">' + (r.isNew ? 'New reminder' : 'Edit reminder') + '</h3><button class="x" data-a="closesheet">&times;</button></div>' +
    (r.isNew ? '<div class="mute" style="margin-top:8px">Quick picks</div><div class="row" style="flex-wrap:wrap;gap:6px;margin:6px 0">' + QUICK_REM.map((q, i) => '<button class="chip P" style="background:var(--purple);border:0;font-size:13px;padding:6px 10px" data-a="remquick" data-i="' + i + '">' + q[0] + ' ' + t12(q[1]) + '</button>').join('') + '</div>' : '') +
    '<label>What is it for?</label><input type="text" id="rlabel" value="' + esc(r.label) + '" placeholder="Like: Take a walk">' +
    '<label>What time?</label><input type="time" id="rtime" value="' + esc(r.time) + '">' +
    '<label>Which days?</label><div class="seg">' + DAYN.map((d, i) => '<button class="T' + (r.days.indexOf(i) >= 0 ? ' on' : '') + '" style="padding:10px 0;font-size:12px" data-a="remday" data-d="' + i + '">' + d + '</button>').join('') + '</div>' +
    '<button class="btn full" style="margin-top:12px" data-a="saverem">Save</button>' +
    (r.isNew ? '' : '<button class="btn red full" style="margin-top:10px" data-a="delrem">Delete this reminder</button>'));
}
function remKeep() { if (!remDraft) return; const l = $('#rlabel'), t = $('#rtime'); if (l) remDraft.label = l.value; if (t && t.value) remDraft.time = t.value; }
let webRemTimer = null, webFired = {};
function webCheckReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date(), hm = pad(now.getHours()) + ':' + pad(now.getMinutes()), k = dkey(now);
  S.reminders.filter((r) => r.on && r.time === hm && r.days.indexOf(now.getDay()) >= 0).forEach((r) => {
    const fk = k + '|' + r.id + '|' + hm;
    if (webFired[fk]) return;
    webFired[fk] = true;
    const opts = { body: 'SkyCare', icon: 'icon-192.png', tag: fk };
    if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then((reg) => reg.showNotification(r.label, opts)).catch(() => { try { new Notification(r.label, opts); } catch (e) { } });
    else { try { new Notification(r.label, opts); } catch (e) { } }
  });
}
async function syncWebReminders() {
  if (!('Notification' in window)) { S.remindInfo = 'This browser cannot show notifications.'; save(); return render(); }
  if (S.reminders.some((r) => r.on) && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (e) { } }
  if (!webRemTimer) webRemTimer = setInterval(webCheckReminders, 15000);
  S.remindInfo = Notification.permission === 'granted' ? 'On the web, reminders only show while this app is open in a window or tab. Install the Android app for reminders that work any time.' : (S.reminders.some((r) => r.on) ? 'Notifications are blocked for this site. Allow them in the browser settings to get reminders.' : '');
  save(); render();
}
async function syncReminders() {
  if (!NATIVE) return syncWebReminders();
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const r = await LocalNotifications.requestPermissions();
      if (r.display !== 'granted') { S.remindInfo = 'Notifications are turned off for this app. Turn them on in the phone settings to get reminders.'; save(); return render(); }
    }
    try { await LocalNotifications.createChannel({ id: 'reminders', name: 'Reminders', description: 'Daily reminders', importance: 4, visibility: 1, vibration: true }); } catch (e) { }
    try {
      const ex = await LocalNotifications.checkExactNotificationSetting();
      if (ex.exact_alarm !== 'granted') S.remindInfo = 'For reminders at the exact minute, allow "Alarms and reminders" for this app in the phone settings.'; else S.remindInfo = '';
    } catch (e) { }
    const pend = await LocalNotifications.getPending();
    if (pend.notifications.length) await LocalNotifications.cancel({ notifications: pend.notifications.map((n) => ({ id: n.id })) });
    const list = [];
    S.reminders.filter((r) => r.on).forEach((r) => {
      const a = r.time.split(':');
      r.days.forEach((d) => {
        list.push({ id: (r.n || 1) * 10 + d + 1, title: r.label, body: 'SkyCare', channelId: 'reminders', schedule: { on: { weekday: d + 1, hour: Number(a[0]), minute: Number(a[1]) }, allowWhileIdle: true } });
      });
    });
    if (list.length) await LocalNotifications.schedule({ notifications: list });
    save(); render();
  } catch (e) { S.remindInfo = 'Reminders only work in the installed app.'; save(); render(); }
}


const PATHS = ['Agnostic', 'Atheist', 'Buddhism', 'Christianity', 'Hinduism', 'Islam', 'Judaism', 'Paganism', 'Sikhism', 'Spiritual, no set religion', 'Other', 'Prefer not to say'];
const hasPagan = () => (S.paths || []).indexOf('Paganism') >= 0;
function pathCard() {
  let h = '<div class="card"><h3>My path</h3><div class="mute">Optional. Pick any that fit, or none. This stays on this phone and only leaves in a backup you make yourself. Some choices add extra pages to the Me tab.</div><div class="row" style="flex-wrap:wrap;gap:8px;margin-top:10px">';
  PATHS.forEach((x) => { const on = S.paths.indexOf(x) >= 0; h += '<button class="pill' + (on ? ' on' : '') + '" data-a="path" data-p="' + esc(x) + '">' + esc(x) + '</button>'; });
  h += '</div>';
  if (S.paths.indexOf('Other') >= 0) h += '<input type="text" id="pathother" style="margin-top:10px" placeholder="Tell me more (optional)" value="' + esc(S.pathOther || '') + '">';
  const adds = activeSecs().map((id) => PATH_SECS[id].title).concat(hasPagan() ? ['Book of Shadows'] : []);
  if (adds.length) h += '<div class="mute" style="margin-top:10px">&#10024; Added to the Me tab: <b>' + esc(adds.join(', ')) + '</b>.</div>';
  return h + '</div>';
}
const BOS_KINDS = ['Spell', 'Ritual', 'Herbs and crystals', 'Dream', 'Note'];
const SABBATS = [['Imbolc', 1, 1], ['Ostara', 2, 20], ['Beltane', 4, 1], ['Litha', 5, 21], ['Lammas', 7, 1], ['Mabon', 8, 22], ['Samhain', 9, 31], ['Yule', 11, 21]];
let bosDraft = { kind: 'Spell', title: '', text: '' };
let bosFilter = '', bosSearch = '';
function nextSabbat() {
  const now = new Date(), t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let best = null;
  [0, 1].forEach((yo) => SABBATS.forEach((x) => { const d = new Date(now.getFullYear() + yo, x[1], x[2]); if (d >= t0 && (!best || d < best.d)) best = { n: x[0], d }; }));
  return best;
}
function shadowsHtml() {
  const mt = moonAt(new Date()), sb = nextSabbat();
  const days = Math.round((sb.d - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000);
  let h = '<div class="card" style="text-align:center"><div style="font-size:44px;line-height:52px">&#128214;</div><h3 style="margin:4px 0">My Book of Shadows</h3><div class="mute">' + mt.e + ' Tonight: ' + mt.n + ' &middot; Next sabbat: <b>' + sb.n + '</b> ' + (days === 0 ? 'today' : days === 1 ? 'tomorrow' : 'in ' + days + ' days') + '</div><div class="mute" style="font-size:13px">Sabbat dates are for the Northern Hemisphere and can shift by a day.</div></div>';
  h += '<div class="card"><div class="seg" style="flex-wrap:wrap">' + BOS_KINDS.map((k) => '<button class="T' + (bosDraft.kind === k ? ' on' : '') + '" style="font-size:12px;padding:8px 6px" data-a="boskind" data-k="' + k + '">' + k + '</button>').join('') + '</div>' +
    '<input type="text" id="bstitle" placeholder="Title" value="' + esc(bosDraft.title) + '"><textarea id="bstext" style="min-height:130px;margin-top:8px" placeholder="Write it here...">' + esc(bosDraft.text) + '</textarea>' +
    '<button class="btn full" style="margin-top:10px" data-a="bossave">Add to my book</button><div class="mute" style="margin-top:6px">The moon phase is saved with each page.</div></div>';
  if (!S.shadows.length) return h;
  h += '<h2>My pages</h2><div class="seg" style="flex-wrap:wrap"><button class="T' + (!bosFilter ? ' on' : '') + '" style="font-size:12px;padding:8px 6px" data-a="bosfilter" data-k="">All</button>' + BOS_KINDS.map((k) => '<button class="T' + (bosFilter === k ? ' on' : '') + '" style="font-size:12px;padding:8px 6px" data-a="bosfilter" data-k="' + k + '">' + k + '</button>').join('') + '</div><input type="text" id="bssearch" placeholder="Search my book" value="' + esc(bosSearch) + '">';
  const q = bosSearch.toLowerCase();
  S.shadows.slice().reverse().filter((e) => (!bosFilter || e.kind === bosFilter) && (!q || (e.title + ' ' + e.text).toLowerCase().indexOf(q) >= 0)).forEach((e) => {
    const d = new Date(e.ts);
    h += '<div class="card"><div class="row"><div class="sp"><b>' + esc(e.title || e.kind) + '</b><div class="mute">' + esc(e.kind) + ' &middot; ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' &middot; ' + (e.moon || '') + (e.edited ? ' &middot; edited' : '') + '</div></div><button class="x" data-a="editbos" data-id="' + e.id + '">&#9998;</button><button class="x" data-a="delbos" data-id="' + e.id + '">&times;</button></div>' +
      '<div style="white-space:pre-wrap;margin-top:8px">' + esc(e.text) + '</div></div>';
  });
  return h;
}


const VERSES = [['Psalm 23:1', 'The LORD is my shepherd; I shall not want.'], ['John 3:16', 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'], ['Proverbs 3:5', 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.'], ['Isaiah 41:10', 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.'], ['Psalm 46:1', 'God is our refuge and strength, a very present help in trouble.'], ['Matthew 11:28', 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.'], ['Joshua 1:9', 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.'], ['Psalm 118:24', 'This is the day which the LORD hath made; we will rejoice and be glad in it.'], ['Psalm 34:18', 'The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit.'], ['Philippians 4:13', 'I can do all things through Christ which strengtheneth me.'], ['1 John 4:19', 'We love him, because he first loved us.'], ['Psalm 56:3', 'What time I am afraid, I will trust in thee.']];
const calDate = (cal) => { try { return new Intl.DateTimeFormat('en-u-ca-' + cal, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); } catch (e) { return ''; } };
const moonDates = () => { const f = (t) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); return 'Next full moon: <b>' + f(nextPhase(0.5)) + '</b> &middot; Next new moon: <b>' + f(nextPhase(0)) + '</b>'; };
const PATH_SECS = {
  bible: { label: 'Bible', title: 'Bible Study', icon: '&#128214;', hint: 'Reference, like John 3:16', kinds: ['Verse notes', 'Prayer', 'Prayer request', 'Sermon notes', 'Gratitude'],
    head: () => liveHead('bible') },
  torah: { label: 'Torah', title: 'Torah Study', icon: '&#128214;', hint: 'Portion or text', kinds: ['Study notes', 'Prayer', 'Mitzvah', 'Question', 'Gratitude'],
    head: () => { const dd = (5 - new Date().getDay() + 7) % 7; return liveHead('torah') + '<div class="mute">Hebrew date: <b>' + esc(calDate('hebrew')) + '</b></div><div class="mute">' + (dd === 0 ? 'Shabbat begins this evening.' : 'Shabbat begins Friday evening, in ' + dd + (dd === 1 ? ' day' : ' days') + '.') + ' Check your local candle-lighting time.</div>'; } },
  quran: { label: 'Quran', title: 'Quran and Dua', icon: '&#128214;', hint: 'Surah and ayah, or a title', kinds: ['Ayah reflection', 'Dua', 'Dhikr', 'Gratitude', 'Reflection'],
    head: () => liveHead('quran') + '<div class="mute">Hijri date: <b>' + esc(calDate('islamic-umalqura')) + '</b></div><div class="mute">The date can differ by a day depending on moon sighting.</div>' },
  dharma: { label: 'Dharma', title: 'Dharma Journal', icon: '&#9784;', hint: 'Title', kinds: ['Meditation', 'Teaching', 'Loving-kindness', 'Gratitude', 'Reflection'],
    head: () => '<div class="mute">Uposatha days follow the moon.</div><div class="mute">' + moonDates() + '</div>' },
  sadhana: { label: 'Sadhana', title: 'Sadhana Journal', icon: '&#128367;', hint: 'Title', kinds: ['Mantra', 'Puja', 'Scripture study', 'Gratitude', 'Reflection'],
    head: () => '<div class="mute">Purnima is the full moon and Amavasya is the new moon.</div><div class="mute">' + moonDates() + '</div>' },
  gurbani: { label: 'Gurbani', title: 'Gurbani and Simran', icon: '&#127802;', hint: 'Shabad or title', kinds: ['Gurbani reflection', 'Simran', 'Seva', 'Ardas', 'Gratitude'],
    head: () => '<div class="mute">A place for reflection, remembering the Name, and acts of service.</div>' },
  reflect: { label: 'Reflect', title: 'Questions and Reflections', icon: '&#128173;', hint: 'Title', kinds: ['Question', 'Idea', 'Reading', 'Values', 'Gratitude'],
    head: () => '<div class="mute">Good questions are welcome here. So are good answers, and "I do not know yet."</div>' },
  spirit: { label: 'Spirit', title: 'Spiritual Journal', icon: '&#10024;', hint: 'Title', kinds: ['Practice', 'Intention', 'Reflection', 'Dream', 'Gratitude'],
    head: () => '<div class="mute">Whatever feeds my spirit, I can write it down here.</div>' }
};
const PATH_SEC = { Christianity: 'bible', Judaism: 'torah', Islam: 'quran', Buddhism: 'dharma', Hinduism: 'sadhana', Sikhism: 'gurbani', Agnostic: 'reflect', Atheist: 'reflect', 'Spiritual, no set religion': 'spirit' };
const activeSecs = () => { const out = []; (S.paths || []).forEach((p) => { const id = PATH_SEC[p]; if (id && out.indexOf(id) < 0) out.push(id); }); return out; };

const LKEY = 'taking_care_live_v1';
let LIVE = {};
try { LIVE = JSON.parse(localStorage.getItem(LKEY) || '{}') || {}; } catch (e) { LIVE = {}; }
const liveSave = () => { try { localStorage.setItem(LKEY, JSON.stringify(LIVE)); } catch (e) { } };
const dayNum = () => Math.floor(Date.now() / 86400000);
const TRNAME = { kjv: 'King James Version', web: 'World English Bible', bsb: 'Berean Standard Bible' };
async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}
let liveBusy = {};
async function ensureLive(id) {
  if (liveBusy[id]) return;
  const today = dayNum();
  const rerender = () => { if (tab === 'mood' && meSub === 'sec:' + id) render(); };
  try {
    if (id === 'bible') {
      const key = 'verse-' + S.bibleTr;
      if (LIVE[key] && LIVE[key].day === today) return;
      liveBusy[id] = true;
      const j = await getJson('https://bible-api.com/data/' + S.bibleTr + '/random');
      const v = j.random_verse || j;
      if (!v || !v.text) throw new Error('bad');
      LIVE[key] = { day: today, ref: (v.book || v.book_name) + ' ' + v.chapter + ':' + v.verse, text: String(v.text).replace(/\s+/g, ' ').trim(), tr: S.bibleTr };
      liveSave();
    } else if (id === 'quran') {
      if (LIVE.quran && LIVE.quran.day === today) return;
      liveBusy[id] = true;
      const n = (today * 97) % 6236 + 1;
      const j = await getJson('https://api.alquran.cloud/v1/ayah/' + n + '/editions/quran-uthmani,en.sahih');
      const a = j.data;
      if (!Array.isArray(a) || a.length < 2 || !a[1].text) throw new Error('bad');
      LIVE.quran = { day: today, ar: a[0].text, en: a[1].text, ref: (a[1].surah.englishName || '') + ' ' + (a[1].surah.number || '') + ':' + a[1].numberInSurah };
      liveSave();
    } else if (id === 'torah') {
      if (LIVE.torah && LIVE.torah.day === today) return;
      liveBusy[id] = true;
      const j = await getJson('https://www.sefaria.org/api/calendars');
      const it = (j.calendar_items || []).find((x) => x.title && x.title.en === 'Parashat Hashavua');
      if (!it) throw new Error('bad');
      LIVE.torah = { day: today, name: it.displayValue && it.displayValue.en, ref: it.ref || '' };
      liveSave();
    } else return;
  } catch (e) { /* offline or changed: keep old cache */ }
  liveBusy[id] = false;
  rerender();
}
function liveHead(id) {
  if (id === 'bible') {
    const c = LIVE['verse-' + S.bibleTr];
    const v = c || (() => { const x = VERSES[dayNum() % VERSES.length]; return { ref: x[0], text: x[1], tr: 'kjv' }; })();
    return '<div class="mute" style="font-weight:700">VERSE OF THE DAY (' + esc((v.tr || 'kjv').toUpperCase()) + ')' + (c ? '' : ' &middot; OFFLINE PICK') + '</div><p style="margin:6px 0"><i>' + esc(v.text) + '</i></p><b>' + esc(v.ref) + '</b>';
  }
  if (id === 'quran') {
    const q = LIVE.quran;
    if (!q) return '';
    return '<div class="mute" style="font-weight:700">AYAH OF THE DAY</div><p style="margin:6px 0;font-size:22px;text-align:right" dir="rtl" lang="ar">' + esc(q.ar) + '</p><p style="margin:6px 0"><i>' + esc(q.en) + '</i></p><b>' + esc(q.ref) + '</b><div class="mute" style="font-size:13px">Translation: Sahih International</div>';
  }
  if (id === 'torah') {
    const t = LIVE.torah;
    return t && t.name ? '<div class="mute">This week\'s portion: <b>' + esc(t.name) + '</b>' + (t.ref ? ' (' + esc(t.ref) + ')' : '') + '</div><div class="mute" style="font-size:13px">From Sefaria.</div>' : '';
  }
  return '';
}
let bibleLookup = { q: '', res: null, err: '', busy: false };
async function lookupBible() {
  const q = (($('#biblook') || {}).value || '').trim();
  if (!q) return toast('Type a passage, like John 3:16');
  bibleLookup = { q, res: null, err: '', busy: true }; render();
  const key = 'p-' + S.bibleTr + '-' + q.toLowerCase();
  try {
    if (LIVE[key]) bibleLookup.res = LIVE[key];
    else {
      const j = await getJson('https://bible-api.com/' + encodeURIComponent(q) + '?translation=' + S.bibleTr);
      if (!j || !j.text) throw new Error('none');
      bibleLookup.res = { ref: j.reference || q, text: String(j.text).replace(/\s+\n/g, '\n').trim(), tr: S.bibleTr };
      LIVE[key] = bibleLookup.res;
      const ks = Object.keys(LIVE).filter((x) => x.indexOf('p-') === 0);
      if (ks.length > 60) delete LIVE[ks[0]];
      liveSave();
    }
  } catch (e) { bibleLookup.err = 'I could not find that. Check the spelling and your internet.'; }
  bibleLookup.busy = false; render();
}
function bibleExtra() {
  const b = bibleLookup;
  let h = '<div class="card"><h3>Look up a passage</h3><div class="seg">' + Object.keys(TRNAME).map((t) => '<button class="T' + (S.bibleTr === t ? ' on' : '') + '" data-a="bibletr" data-t="' + t + '">' + t.toUpperCase() + '</button>').join('') + '</div>' +
    '<div class="row"><input type="text" id="biblook" placeholder="Like: Psalm 23 or John 3:16-18" value="' + esc(b.q) + '"><button class="btn alt" data-a="biblook"' + (b.busy ? ' disabled' : '') + '>' + (b.busy ? '...' : 'Find') + '</button></div>';
  if (b.err) h += '<p style="color:var(--red);font-weight:700">' + esc(b.err) + '</p>';
  if (b.res) h += '<div style="margin-top:12px"><b>' + esc(b.res.ref) + '</b> <span class="mute">(' + esc((b.res.tr || '').toUpperCase()) + ')</span><div style="white-space:pre-wrap;margin-top:6px">' + esc(b.res.text) + '</div><button class="btn alt full" style="margin-top:10px" data-a="bibsave">Save to my pages</button></div>';
  return h + '<div class="mute" style="font-size:13px;margin-top:8px">' + esc(TRNAME[S.bibleTr]) + ', from bible-api.com. Saved passages work offline.</div></div>';
}

let padDraft = {}, padView = {};
function pagesHtml(id) {
  const c = PATH_SECS[id];
  const d = padDraft[id] = padDraft[id] || { kind: c.kinds[0], title: '', text: '' };
  const v = padView[id] = padView[id] || { f: '', q: '' };
  const chipSt = 'font-size:12px;padding:8px 6px';
  let h = '<div class="card"><div class="row"><div style="font-size:34px">' + c.icon + '</div><h3 class="sp" style="margin:0">' + esc(c.title) + '</h3></div><div style="margin-top:8px">' + c.head() + '</div></div>';
  if (id === 'bible') h += bibleExtra();
  h += '<div class="card"><div class="seg" style="flex-wrap:wrap">' + c.kinds.map((k) => '<button class="T' + (d.kind === k ? ' on' : '') + '" style="' + chipSt + '" data-a="pgkind" data-k="' + esc(k) + '">' + esc(k) + '</button>').join('') + '</div>' +
    '<input type="text" id="pgtitle" placeholder="' + esc(c.hint) + '" value="' + esc(d.title) + '"><textarea id="pgtext" style="min-height:130px;margin-top:8px" placeholder="Write here...">' + esc(d.text) + '</textarea>' +
    '<button class="btn full" style="margin-top:10px" data-a="pgsave">Save</button></div>';
  const mine = S.pages.filter((e) => e.sec === id);
  if (!mine.length) return h;
  h += '<h2>My pages</h2><div class="seg" style="flex-wrap:wrap"><button class="T' + (!v.f ? ' on' : '') + '" style="' + chipSt + '" data-a="pgfilter" data-k="">All</button>' + c.kinds.map((k) => '<button class="T' + (v.f === k ? ' on' : '') + '" style="' + chipSt + '" data-a="pgfilter" data-k="' + esc(k) + '">' + esc(k) + '</button>').join('') + '</div><input type="text" id="pgsearch" placeholder="Search" value="' + esc(v.q) + '">';
  const q = v.q.toLowerCase();
  mine.slice().reverse().filter((e) => (!v.f || e.kind === v.f) && (!q || (e.title + ' ' + e.text).toLowerCase().indexOf(q) >= 0)).forEach((e) => {
    const dt = new Date(e.ts);
    h += '<div class="card"><div class="row"><div class="sp"><b>' + esc(e.title || e.kind) + '</b><div class="mute">' + esc(e.kind) + ' &middot; ' + dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + (e.edited ? ' &middot; edited' : '') + '</div></div><button class="x" data-a="editpg" data-id="' + e.id + '">&#9998;</button><button class="x" data-a="delpg" data-id="' + e.id + '">&times;</button></div><div style="white-space:pre-wrap;margin-top:8px">' + esc(e.text) + '</div></div>';
  });
  return h;
}

function layoutCard() {
  return '<div class="card"><h3>Screen layout</h3><div class="row"><div class="sp"><b>Tablet layout</b><div class="mute">Makes the app wider on a big screen. Phones look the same either way.</div></div><div class="tog' + (S.wide ? ' on' : '') + '" data-a="togwide"><i></i></div></div></div>';
}
function accessCard() {
  const seg = (items, cur, act, key) => '<div class="seg" style="flex-wrap:wrap">' + items.map((x) => '<button class="T' + (cur === x[0] ? ' on' : '') + '" data-a="' + act + '" data-v="' + x[0] + '" style="font-size:13px">' + x[1] + '</button>').join('') + '</div>';
  const tog = (on, act) => '<div class="tog' + (on ? ' on' : '') + '" data-a="' + act + '"><i></i></div>';
  return '<div class="card"><h3>Reading and seeing</h3><div class="mute">Make the app easier on the eyes. These are all optional.</div>' +
    '<label>Text size: <span id="tsval">' + (S.textScale || 100) + '%</span></label><input type="range" class="range" id="tsize" min="80" max="170" step="5" value="' + (S.textScale || 100) + '"><div class="mute" style="margin-top:2px">The quick brown fox jumps over the lazy dog.</div>' +
    '<label>Font</label>' + seg([['default', 'Standard'], ['atkinson', 'Easy to read'], ['dyslexic', 'Dyslexia friendly']], S.font || 'default', 'setfont') +
    '<div class="row" style="margin-top:12px"><div class="sp"><b>Extra spacing</b><div class="mute">More room between letters, words, and lines</div></div>' + tog(S.spacing, 'togspacing') + '</div>' +
    '<label>Color blindness</label>' + seg([['none', 'Off'], ['rg', 'Red-green'], ['tri', 'Blue-yellow']], S.cb || 'none', 'setcb') +
    '<div class="row" style="margin-top:12px"><div class="sp"><b>Extra clues besides color</b><div class="mute">Adds a star, triangle, or check mark to the red, yellow, and green skill marks</div></div>' + tog(S.xclues, 'togxc') + '</div>' +
    '<button class="btn alt full" style="margin-top:12px" data-a="resetaccess">Put everything back to normal</button></div>';
}
const PALS = [['purple', 'Lavender', 'The original', ['#7B4FC4', '#7B4FC4', '#FAF7FF']], ['ocean', 'Ocean', 'Cool blues', ['#1F6FB5', '#1F6FB5', '#F3F8FD']], ['forest', 'Forest', 'Soft greens', ['#2E7D4F', '#2E7D4F', '#F4F9F5']], ['sunset', 'Sunset', 'Warm orange', ['#C9531F', '#C9531F', '#FFF8F3']], ['rose', 'Rose', 'Gentle pink', ['#C13F78', '#C13F78', '#FFF5F9']], ['slate', 'Slate', 'Quiet gray-blue', ['#4F6470', '#4F6470', '#F5F7F8']], ['nd', 'Calm and clear', 'Neurodivergent friendly: muted colors, roomier text, no animations, easy-to-tell status colors', ['#3F7F86', '#F6F3EC', '#B87A14']], ['kid', 'Bright and bouncy', 'Child friendly: big bold text, round shapes, cheerful colors', ['#E8456F', '#3E7BFA', '#FFFBEA']]];
function palGrid() {
  return '<label>Colors</label><div class="palgrid">' + PALS.map((p) => '<button class="palbtn' + ((S.palette || 'purple') === p[0] ? ' on' : '') + '" data-a="setpal" data-p="' + p[0] + '"><div class="sw">' + p[3].map((c) => '<i style="background:' + c + '"></i>').join('') + '</div>' + esc(p[1]) + '<small>' + esc(p[2]) + '</small></button>').join('') + '</div>';
}
function installCard() {
  if (NATIVE) return '';
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return '';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return '<div class="card"><h3>Install this app</h3><div class="mute">' + (installEvt ? 'Add SkyCare to this device so it opens in its own window and works offline.' : ios ? 'On iPhone or iPad, tap the Share button, then "Add to Home Screen."' : 'In your browser menu, choose "Install app" or "Add to Home screen" so it opens in its own window and works offline.') + '</div>' + (installEvt ? '<button class="btn full" style="margin-top:10px" data-a="installapp">Install</button>' : '') + '</div>';
}
function viewMore() {
  setHeader('Settings');
  const h = installCard() + pathCard() + remindersCard() + '<div class="card"><h3>Look</h3><div class="seg">' + ['auto', 'light', 'dark'].map((t) => '<button class="' + (S.theme === t ? 'on T' : '') + '" data-a="settheme" data-t="' + t + '">' + { auto: 'Match my phone', light: 'Light', dark: 'Dark' }[t] + '</button>').join('') + '</div>' + palGrid() + '</div>' + layoutCard() + (appsOn ? '<div class="card"><h3>Apps</h3><button class="btn full" data-a="appadd">Add or remove apps</button><button class="btn alt full" style="margin-top:8px" data-a="apphome">Home app settings</button></div>' : '') + wallCard() + accessCard() +
    '<div class="card"><h3>About me</h3><label>My name</label><input type="text" id="sname" value="' + esc(S.name) + '">' +
    '<label>My safe helper\'s name</label><input type="text" id="shname" value="' + esc(S.helperName) + '">' +
    '<label>My safe helper\'s phone</label><input type="tel" id="shphone" value="' + esc(S.helperPhone) + '">' +
    '<button class="btn full" style="margin-top:14px" data-a="savesettings">Save</button></div>' +
    '<div class="card"><h3>My curriculum</h3><div class="mute">' + esc(sourceLabel()) + '</div><button class="btn full" style="margin-top:10px" data-a="import">Import an inventory file</button>' + '<a class="btn alt full" style="display:block;text-align:center;text-decoration:none;margin-top:10px" href="https://care.theskysanctum.com/inventory/" target="_blank" rel="noopener">Open the inventory page</a>' + (S.curriculum ? '<button class="btn alt full" style="margin-top:10px" data-a="builtin">Go back to the built-in book</button>' : '') + '</div>' +
    '<div class="card"><h3>The PDF book</h3><div class="mute">The whole book is inside this app on the Skills tab. You can also open the PDF.</div><button class="btn alt full" style="margin-top:10px" data-a="pdf">Open or share the PDF</button></div>' +
    '<div class="card"><h3>Move to a new phone</h3><div class="mute">Saves everything you added to one file: your plan, moods, routines, notes, skill colors, practice counts, imported curriculum, and settings. Send it to yourself, then restore it on the new phone. You can lock the file with a password so only you can open it.</div><button class="btn alt full" style="margin-top:10px" data-a="backup">Export all my data</button><button class="btn alt full" style="margin-top:10px" data-a="restoresheet">Restore from a file</button></div>' +
    '<div class="card"><h3>Start over</h3><div class="mute">Erases everything saved in this app on this phone.</div><button class="btn red full" style="margin-top:10px" data-a="reset">Erase my data</button></div>' +
    '<div class="mute" style="text-align:center;padding:10px">Your information stays on this phone. Nothing is sent anywhere.</div>' +
    '<div class="mute" style="text-align:center;font-size:12px">Illustrations in SkyCare were drawn for the app.<br>Version ' + VERSION + '</div>';
  $('#view').innerHTML = h;
}

/* ---------- sheet + actions ---------- */
function showSheet(html) { $('#sheetbox').innerHTML = html; $('#sheet').hidden = false; }
function closeSheet() {
  $('#sheet').hidden = true;
  if (pwDone) { const r = pwDone; pwDone = null; r(null); }
}
let pwDone = null, pwMode = '', pwShown = false;
function askPw(mode, msg, what) {
  return new Promise((res) => {
    pwDone = res; pwMode = mode; pwShown = false;
    const err = msg ? '<p id="pwerr" style="color:var(--red);font-weight:700">' + esc(msg) + '</p>' : '<p id="pwerr" style="color:var(--red);font-weight:700" hidden></p>';
    const head = (t) => '<div class="row"><h3 class="sp" style="font-size:21px">' + t + '</h3><button class="x" data-a="pwcancel" aria-label="Cancel">&times;</button></div>';
    if (mode === 'nolock') {
      showSheet(head('Save without a password?') + '<p class="mute">This browser cannot lock files, so this file would be saved as plain text that anyone with the file can read.</p><button class="btn full" data-a="pwskip">Save it anyway</button><button class="btn alt full" style="margin-top:10px" data-a="pwcancel">Cancel</button>');
    } else if (mode === 'lock') {
      showSheet(head('Lock this file?') + '<p class="mute">' + esc(what || 'This file') + ' has private things in it. Pick a password so only people who know it can open the file.</p>' +
        '<label>Password (at least 8 characters)</label><input id="pw1" type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false">' +
        '<label>Type it again</label><input id="pw2" type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false">' + err +
        '<p class="mute">Tip: three or four random words are easy to remember and hard to guess. Write it down somewhere safe. If you forget it, no one can open the file, not even us.</p>' +
        '<button class="btn full" data-a="pwok">Lock and save</button><button class="btn alt full" style="margin-top:10px" data-a="pwshow">Show what I typed</button><button class="btn alt full" style="margin-top:10px" data-a="pwskip">Save without a password</button>');
    } else {
      showSheet(head('This file is locked') + '<p class="mute">Type the password that was used to lock it.</p>' +
        '<label>Password</label><input id="pw1" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false">' + err +
        '<button class="btn full" data-a="pwok">Unlock</button><button class="btn alt full" style="margin-top:10px" data-a="pwshow">Show what I typed</button>');
    }
    const f = $('#pw1'); if (f) setTimeout(() => f.focus(), 50);
  });
}
function pwFail(t) { const e = $('#pwerr'); if (e) { e.textContent = t; e.hidden = false; } }
function pwAction(a) {
  if (!pwDone) return;
  if (a === 'pwcancel') return closeSheet();
  if (a === 'pwshow') { pwShown = !pwShown; ['#pw1', '#pw2'].forEach((q) => { const n = $(q); if (n) n.type = pwShown ? 'text' : 'password'; }); return; }
  if (a === 'pwskip') { const r = pwDone; pwDone = null; closeSheet(); return r({ pw: '' }); }
  const p1 = ($('#pw1') || {}).value || '';
  if (pwMode === 'lock') {
    if (p1.length < 8) return pwFail('Use at least 8 characters.');
    if (p1 !== ($('#pw2') || {}).value) return pwFail('The two passwords are not the same.');
  } else if (!p1) return pwFail('Type the password first.');
  const r = pwDone; pwDone = null; closeSheet(); r({ pw: p1 });
}
async function maybeLock(plain, what) {
  if (!canLock()) { const r = await askPw('nolock'); return r ? { text: plain, locked: false } : null; }
  const r = await askPw('lock', '', what);
  if (r === null) return null;
  if (!r.pw) return { text: plain, locked: false };
  toast('Locking your file...');
  return { text: await lockText(plain, r.pw), locked: true };
}
async function unlockFlow(text) {
  let msg = '';
  for (;;) {
    const r = await askPw('unlock', msg);
    if (r === null) return { cancel: true };
    try { return { text: await unlockText(text, r.pw) }; } catch (e) {
      if (e && e.message === 'damaged') return { err: 'That file looks damaged and could not be opened.' };
      msg = 'That password did not work. Check it and try again.';
    }
  }
}

async function b64FromUrl(url) {
  const r = await fetch(url);
  const blob = await r.blob();
  return new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1]); f.onerror = rej; f.readAsDataURL(blob); });
}
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
async function imgData(name) {
  try {
    const r = await fetch('img/' + name + '.jpg'); const b = await r.blob();
    const u = await new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = rej; f.readAsDataURL(b); });
    const dim = await new Promise((res) => { const im = new Image(); im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([1, 1]); im.src = u; });
    return { u, w: dim[0], h: dim[1] };
  } catch (e) { return null; }
}
async function makePdf() {
  const cur = curriculum();
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = 612, H = 792, M = 54, CW = W - 2 * M;
  const nm = S.name || 'My';
  const title = (S.name ? S.name + "'s " : 'My ') + 'Big Book of SkyCare';
  const imgs = {};
  for (const n of ['cover', 'end', 'mascot'].concat(cur.map((c) => c.img))) if (!imgs[n]) imgs[n] = await imgData(n);
  const put = (n, x, y, mw, mh) => {
    const im = imgs[n]; if (!im) return 0;
    const r = Math.min(mw / im.w, mh / im.h); const w = im.w * r, h = im.h * r;
    try { doc.addImage(im.u, 'JPEG', x + (mw - w) / 2, y, w, h); } catch (e) { return 0; }
    return h;
  };
  const tocLines = cur.reduce((a, c) => a + 1 + c.items.length, 0);
  const perPage = 36;
  const tocPages = Math.max(1, Math.ceil(tocLines / perPage));
  doc.setFont('helvetica', 'bold'); doc.setFontSize(34); doc.setTextColor(142, 91, 208);
  const ih = put('cover', M, 90, CW, 250);
  const tl = doc.splitTextToSize(title, CW - 40);
  doc.text(tl, W / 2, 90 + ih + 60, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(16); doc.setTextColor(70);
  doc.text(doc.splitTextToSize('Simple steps for my body, my home, my feelings, and staying safe', CW - 60), W / 2, 90 + ih + 60 + tl.length * 40 + 14, { align: 'center' });
  doc.setFontSize(12); doc.setTextColor(120);
  doc.text('Made ' + new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) + (S.curriculum && S.curriculum.profile ? ' from my ' + S.curriculum.profile + ' inventory' : ''), W / 2, H - 70, { align: 'center' });
  doc.addPage();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(142, 91, 208); doc.text('For My Helper', M, M + 24);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.setTextColor(34);
  const tips = ['Pick one skill at a time. Start with the red ones, Learn First.', 'Show first, then do it together, then let me try on my own.', 'Use the same words every time.', 'Practice in the real place when you can.', 'Cheer for every try. Mistakes are part of learning.', 'When a skill gets easy, move it up to green, I know it.'];
  let y = M + 52;
  tips.forEach((t) => { const l = doc.splitTextToSize('\u2022  ' + t, CW); doc.text(l, M, y); y += l.length * 18 + 6; });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(142, 91, 208); doc.text('What the Colors Mean', M, y + 30);
  [['LEARN FIRST', '#D32F2F', 'Brand new. A helper shows me and we practice together.'], ['PRACTICE WITH HELP', '#E69500', "I'm learning this. A helper stays nearby."], ['I CAN DO IT!', '#2E9E44', "I already know this. I'm proud of myself!"]].forEach((r, i) => {
    const yy = y + 52 + i * 34; doc.setFillColor(...hex(r[1])); doc.roundedRect(M, yy, 150, 22, 6, 6, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255); doc.text(r[0], M + 75, yy + 15, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(50); doc.text(r[2], M + 162, yy + 15);
  });
  for (let i = 0; i < tocPages; i++) doc.addPage();
  const pos = [];
  let first = true;
  const foot = () => { const n = doc.getCurrentPageInfo().pageNumber; doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(120); doc.text('Page ' + n, W / 2, H - 30, { align: 'center' }); };
  for (let si = 0; si < cur.length; si++) {
    const sec = cur[si];
    doc.addPage(); y = M;
    pos.push({ sec: true, t: sec.n + '. ' + sec.title, p: doc.getNumberOfPages(), si });
    doc.outline.add(null, sec.n + '. ' + sec.title, { pageNumber: doc.getNumberOfPages() });
    const bl = doc.splitTextToSize(sec.n + '. ' + sec.title, CW - 32);
    doc.setFillColor(...hex(sec.color)); doc.rect(M, y, CW, bl.length * 34 + 22, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(255); doc.text(bl, M + 16, y + 38);
    y += bl.length * 34 + 40;
    const h = put(sec.img, M, y, CW, 170); y += h + 16;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.setTextColor(34);
    const il = doc.splitTextToSize(sec.intro || '', CW); doc.text(il, M, y); y += il.length * 18 + 16;
    foot();
    for (const it of sec.items) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(13);
      const sl = it.say ? doc.splitTextToSize(it.say, CW) : [];
      const stl = it.steps.map((x) => doc.splitTextToSize(x, CW - 44));
      const need = 22 + 26 + sl.length * 17 + 20 + stl.reduce((a, l) => a + l.length * 17 + 8, 0) + (it.note ? 24 : 0);
      if (y + Math.min(need, 260) > H - 60) { doc.addPage(); y = M; foot(); }
      pos.push({ t: it.t, p: doc.getNumberOfPages(), si });
      doc.outline.add(null, it.t, { pageNumber: doc.getNumberOfPages() });
      const col = it.k === 'D' ? '#2E9E44' : it.k === 'H' ? '#E69500' : '#D32F2F';
      const lab = it.k === 'D' ? 'I CAN DO IT!' : it.k === 'H' ? 'PRACTICE WITH HELP' : 'LEARN FIRST';
      doc.setFillColor(...hex(col)); doc.roundedRect(M, y, 130, 18, 5, 5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255); doc.text(lab, M + 65, y + 12.5, { align: 'center' });
      y += 38;
      doc.setFontSize(17); doc.setTextColor(27);
      const ttl = doc.splitTextToSize(it.t, CW); doc.text(ttl, M, y); y += ttl.length * 21 + 2;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.setTextColor(51);
      if (sl.length) { doc.text(sl, M, y); y += sl.length * 17 + 8; }
      if (it.note) { doc.setTextColor(110); const nl = doc.splitTextToSize('My note: ' + it.note, CW); doc.text(nl, M, y); y += nl.length * 17 + 6; doc.setTextColor(51); }
      if (stl.length) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(102); doc.text(it.fromBook ? 'TRY IT, STEP BY STEP' : 'THINGS THAT CAN HELP', M, y + 4); y += 18;
        stl.forEach((l, i) => {
          if (y + l.length * 17 > H - 60) { doc.addPage(); y = M; foot(); }
          doc.setFillColor(...hex(sec.color)); doc.roundedRect(M, y - 13, 24, 22, 5, 5, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255); doc.text(String(i + 1), M + 12, y + 2, { align: 'center' });
          doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.setTextColor(34); doc.text(l, M + 36, y);
          y += l.length * 17 + 8;
        });
      }
      y += 18;
    }
  }
  doc.addPage();
  const eh = put('end', M, 110, CW, 280);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(32); doc.setTextColor(142, 91, 208); doc.text('You Are Doing Great!', W / 2, 110 + eh + 60, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(15); doc.setTextColor(70);
  doc.text(doc.splitTextToSize('Every new skill starts with one small step. Keep going, and ask for help any time.', CW - 60), W / 2, 110 + eh + 94, { align: 'center' });
  doc.setFontSize(8.5); doc.setTextColor(130);
  doc.text(doc.splitTextToSize('Illustrations in SkyCare were drawn for the app.', CW), M, H - 60);
  foot();
  let ti = 0;
  const lines = [];
  pos.forEach((x) => lines.push(x));
  for (let pg = 0; pg < tocPages; pg++) {
    doc.setPage(3 + pg); y = M;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(142, 91, 208);
    doc.text(pg ? "What's in This Book (more)" : "What's in This Book", M, y + 22); y += 52;
    for (let k = 0; k < perPage && ti < lines.length; k++, ti++) {
      const x = lines[ti];
      doc.setFont('helvetica', x.sec ? 'bold' : 'normal'); doc.setFontSize(x.sec ? 13 : 11);
      doc.setTextColor(...(x.sec ? [142, 91, 208] : [34, 34, 34]));
      const ind = x.sec ? 0 : 16;
      let tx = x.t; while (doc.getTextWidth(tx) > CW - ind - 40 && tx.length > 4) tx = tx.slice(0, -2);
      if (tx !== x.t) tx += '...';
      doc.text(tx, M + ind, y); doc.text(String(x.p), W - M, y, { align: 'right' });
      doc.link(M, y - 12, CW, 16, { pageNumber: x.p });
      y += x.sec ? 20 : 15.5;
    }
    foot();
  }
  doc.setProperties({ title });
  return doc;
}
async function sharePdf() {
  try {
    toast('Making your book...');
    const doc = await makePdf();
    const data = doc.output('datauristring').split(',')[1];
    await deliver('Big_Book_of_SkyCare.pdf', data, 'Big Book of SkyCare', 'Open the book');
  } catch (e) {
    if (e && /cancel/i.test(String(e.message || e))) return;
    toast('Could not make the PDF');
  }
}
function restoreSheet(msg) {
  showSheet('<div class="row"><h3 class="sp" style="font-size:21px">Restore my data</h3><button class="x" data-a="closesheet">&times;</button></div>' +
    '<p class="mute">Pick the backup file (skycare_backup.json) from your old phone. This replaces what is on this phone now.</p>' +
    (msg ? '<p style="color:var(--red);font-weight:700">' + esc(msg) + '</p>' : '') +
    '<label>Pick the file</label><input type="file" id="bfile" accept="application/json,.json,text/*">' +
    '<label>Or paste the backup text</label><textarea id="bpaste" placeholder="Paste the backup text"></textarea>' +
    '<button class="btn alt full" style="margin-top:10px" data-a="restorepaste">Restore from pasted text</button>');
}
async function restoreData(text) {
  if (isLocked(text)) {
    const u = await unlockFlow(text);
    if (u.cancel) return restoreSheet();
    if (u.err) return restoreSheet(u.err);
    text = u.text;
  }
  let o;
  try { o = JSON.parse(text); } catch (e) { return restoreSheet('That does not look like a backup file.'); }
  if (!o || typeof o !== 'object' || Array.isArray(o) || !('skills' in o || 'routines' in o || 'plan' in o)) return restoreSheet('That does not look like a SkyCare backup.');
  S = migrate(Object.assign(defaults(), o));
  save(); openSec = null; closeSheet(); applyTheme(); render(); toast('Your data is back'); syncReminders();
}
if (NATIVE) enableApps();
window.__lock = (t, p) => lockText(t, p); window.__unlock = (t, p) => unlockText(t, p); window.__ask = askPw; window.__enableApps = (list) => { AppsImpl = { list: () => Promise.resolve({ apps: list.map((a) => ({ pkg: a.pkg, label: a.label })), seen: list.length }), icons: (o) => Promise.resolve({ icons: Object.fromEntries(o.pkgs.map((p) => [p, (list.find((a) => a.pkg === p) || {}).icon || ''])) }), homeStatus: () => Promise.resolve({ isHome: !!window.__home }), launch: (o) => { window.__launched = o.pkg; return Promise.resolve(); }, openHomeSettings: () => Promise.resolve() }; enableApps(); };
if(!NATIVE)document.documentElement.setAttribute("data-web","1");
const MIMES = { pdf: 'application/pdf', txt: 'text/plain', json: 'application/json' };
async function deliver(name, b64, title, dlg) {
  if (NATIVE) {
    const w = await Filesystem.writeFile({ path: name, data: b64, directory: Directory.Cache });
    await Share.share({ title, url: w.uri, dialogTitle: dlg });
    return;
  }
  const bin = atob(b64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const mime = MIMES[name.split('.').pop()] || 'application/octet-stream';
  const file = new File([u8], name, { type: mime });
  const touch = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
  if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Saved to your downloads');
}
async function shareProfile() {
  try {
    const r = await maybeLock(profileText(), 'Your profile');
    if (!r) return;
    const data = btoa(unescape(encodeURIComponent(r.text)));
    await deliver(r.locked ? 'All_About_Me_locked.txt' : 'All_About_Me.txt', data, 'All about me', 'Share my profile');
  } catch (e) { if (!(e && /cancel/i.test(String(e.message || e)))) toast('Could not share'); }
}
async function shareBackup() {
  try {
    const r = await maybeLock(JSON.stringify(S, null, 1), 'Your backup');
    if (!r) return;
    const data = btoa(unescape(encodeURIComponent(r.text)));
    await deliver(r.locked ? 'skycare_backup_locked.txt' : 'skycare_backup.json', data, 'SkyCare backup', 'Save backup');
  } catch (e) { if (!(e && /cancel/i.test(String(e.message || e)))) toast('Could not make the backup'); }
}

function onAction(el) {
  const a = el.dataset.a;
  const k = dkey(day);
  switch (a) {
    case 'day': day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + Number(el.dataset.d)); return render();
render();
    case 'daytoday': day = new Date(); return render();
    case 'rt': {
      const key = k + '|' + el.dataset.r;
      const label = S.routines[el.dataset.r][Number(el.dataset.i)];
      S.done[key] = S.done[key] || {};
      S.done[key][label] = !S.done[key][label];
      save(); return render();
    }
    case 'editrt': editRt[el.dataset.r] = !editRt[el.dataset.r]; return render();
    case 'mvrt': {
      const L = S.routines[el.dataset.r], i = Number(el.dataset.i), j = i + Number(el.dataset.d);
      if (j < 0 || j >= L.length) return;
      const t = L[i]; L[i] = L[j]; L[j] = t; save(); return render();
    }
    case 'delrt': S.routines[el.dataset.r].splice(Number(el.dataset.i), 1); save(); return render();
    case 'resetrt': S.routines[el.dataset.r] = ROUTINES[el.dataset.r].slice(); save(); return render();
    case 'addrt': {
      const inp = $('#addrt-' + el.dataset.r);
      const v = inp.value.trim();
      if (!v) return;
      S.routines[el.dataset.r].push(v); save(); return render();
    }
    case 'water': S.water[k] = Math.max(0, (S.water[k] || 0) + Number(el.dataset.d)); save(); return render();
    case 'task': {
      const t = (S.plan[k] || []).find((x) => x.id === el.dataset.id);
      if (t) { t.done = !t.done; save(); render(); } return;
    }
    case 'deltask': S.plan[k] = (S.plan[k] || []).filter((x) => x.id !== el.dataset.id); save(); return render();
    case 'addtask': {
      const v = $('#ttext').value.trim();
      if (!v) return;
      (S.plan[k] = S.plan[k] || []).push({ id: uid(), text: v, time: $('#ttime').value || '', done: false });
      save(); return render();
    }
    case 'sec': { const s = Number(el.dataset.s); openSec = openSec === s ? null : s; return render(); }
    case 'skill': return openSkill(el.dataset.id);
    case 'setst': {
      S.skills[el.dataset.id] = el.dataset.k; save(); openSkill(el.dataset.id); render();
      if (el.dataset.k === 'D') toast('Great job!');
      return;
    }
    case 'pwok': case 'pwskip': case 'pwcancel': case 'pwshow': return pwAction(a);
    case 'closesheet': return closeSheet();
    case 'import': return importSheet('');
    case 'readpaste': { const t = ($('#ipaste') || {}).value || ''; return handleImport(t); }
    case 'useimport': return useImport();
    case 'builtin': S.curriculum = null; openSec = null; save(); render(); return toast('Using the built-in book');
    case 'focusdone': togglePractice(el.dataset.id); return render();
    case 'practice': togglePractice(el.dataset.id); openSkill(el.dataset.id); return render();
    case 'quick': {
      const id = el.dataset.id, kk = el.dataset.k;
      if (id.startsWith('c:')) { const cc = S.custom.find((x) => x.id === id.slice(2)); if (cc) cc.k = kk; } else S.skills[id] = kk;
      save(); render();
      if (kk === 'D') toast('Great job!');
      return;
    }
    case 'addcustom': {
      const v = $('#ctext').value.trim();
      if (!v) return;
      S.custom.push({ id: uid(), t: v, k: 'P' }); save(); return render();
    }
    case 'delcustom': S.custom = S.custom.filter((x) => x.id !== el.dataset.id); save(); return render();
    case 'savelist': return shareList();
    case 'setfont': return anchored(el, '[data-a="setfont"][data-v="' + el.dataset.v + '"]', () => { S.font = el.dataset.v; save(); applyAccess(); render(); });
    case 'togspacing': return anchored(el, '[data-a="togspacing"]', () => { S.spacing = !S.spacing; save(); applyAccess(); render(); });
    case 'setcb': return anchored(el, '[data-a="setcb"][data-v="' + el.dataset.v + '"]', () => { S.cb = el.dataset.v; if (S.cb !== 'none') S.xclues = true; save(); applyAccess(); render(); });
    case 'appadd': appQ = ''; loadApps(false); return showAppPicker();
    case 'appdone': closeSheet(); return render();
    case 'apprefresh': appList = null; appBusy = false; loadApps(true); return render();
    case 'apptoggle': { const p = el.dataset.p, i = (S.apps || []).indexOf(p); if (i >= 0) S.apps.splice(i, 1); else (S.apps = S.apps || []).push(p); save(); const sc = ($('.applist') || {}).scrollTop || 0; showAppPicker(); if ($('.applist')) $('.applist').scrollTop = sc; if (tab === 'apps') render(); return; }
    case 'applaunch': return AppsImpl.launch({ pkg: el.dataset.p }).catch(() => { toast('That app could not be opened'); });
    case 'apphome': return AppsImpl.openHomeSettings().catch(() => { });
    case 'walldim': WALL.dim = Number(el.dataset.v); saveWall(); applyWall(); return render();
    case 'wallclear': WALL = { img: '', dim: 35 }; try { localStorage.removeItem(WKEY); } catch (e) { } applyWall(); return render();
    case 'togwide': S.wide = !S.wide; save(); applyAccess(); return render();
    case 'togxc': S.xclues = !S.xclues; save(); applyAccess(); return render();
    case 'resetaccess': return anchored(el, '[data-a="resetaccess"]', () => { S.textScale = 100; S.font = 'default'; S.spacing = false; S.cb = 'none'; S.xclues = false; save(); applyAccess(); render(); });
    case 'setpal': S.palette = el.dataset.p; save(); applyTheme(); return render();
    case 'settheme': S.theme = el.dataset.t; save(); applyTheme(); return render();
    case 'pdf': return sharePdf();
    case 'feel': moodDraft.feeling = el.dataset.f; return renderKeep();
    case 'lvl': moodDraft.level = Number(el.dataset.l); return renderKeep();
    case 'savemood': {
      if (!moodDraft.feeling) return toast('Pick a feeling first');
      S.mood.push({ ts: Date.now(), feeling: moodDraft.feeling, level: moodDraft.level, note: ($('#mnote').value || '').trim() });
      const tip = FEEL_TIP[moodDraft.feeling];
      moodDraft = { feeling: null, level: 3 };
      save(); render(); toast('Saved'); showSheet('<div class="row"><h3 class="sp">Thank you for checking in</h3><button class="x" data-a="closesheet">&times;</button></div><p>' + esc(tip) + '</p><button class="btn full" data-a="closesheet">OK</button>');
      return;
    }
    case 'moonmo': moonMonth = new Date(moonMonth.getFullYear(), moonMonth.getMonth() + Number(el.dataset.d), 1); render(); return ensureMoon();
    case 'moonrefresh': return ensureMoon(true);
    case 'moonday': {
      const d = new Date(Number(el.dataset.t)), m = moonAt(d);
      showSheet('<div class="row"><h3 class="sp" style="font-size:21px">' + fmtDay(d) + '</h3><button class="x" data-a="closesheet">&times;</button></div><div style="text-align:center;font-size:80px;line-height:96px">' + m.e + '</div><div class="big">' + m.n + '</div><p class="mute" style="text-align:center">' + m.ill + '% lit</p>' +
        (S.mood.filter((x) => dkey(new Date(x.ts)) === dkey(d)).length ? '<p>I wrote ' + S.mood.filter((x) => dkey(new Date(x.ts)) === dkey(d)).length + ' mood check-in(s) this day.</p>' : '') + '<button class="btn full" data-a="closesheet">OK</button>');
      return;
    }
    case 'shareprofile': return shareProfile();
    case 'path': {
      const p = el.dataset.p, i = S.paths.indexOf(p);
      if (i >= 0) S.paths.splice(i, 1); else S.paths.push(p);
      if (p === 'Prefer not to say' && i < 0) S.paths = ['Prefer not to say'];
      else if (i < 0) S.paths = S.paths.filter((x) => x !== 'Prefer not to say');
      save(); return render();
    }
    case 'bibletr': S.bibleTr = el.dataset.t; save(); bibleLookup = { q: bibleLookup.q, res: null, err: '', busy: false }; render(); return ensureLive('bible');
    case 'biblook': return lookupBible();
    case 'bibsave': {
      const r = bibleLookup.res; if (!r) return;
      S.pages.push({ id: uid(), sec: 'bible', ts: Date.now(), kind: 'Verse notes', title: r.ref + ' (' + (r.tr || '').toUpperCase() + ')', text: r.text });
      save(); render(); return toast('Saved');
    }
    case 'pgkind': { const d = padDraft[meSub.slice(4)]; d.title = ($('#pgtitle') || {}).value || ''; d.text = ($('#pgtext') || {}).value || ''; d.kind = el.dataset.k; return render(); }
    case 'pgfilter': padView[meSub.slice(4)].f = el.dataset.k; return render();
    case 'pgsave': {
      const id = meSub.slice(4), d = padDraft[id];
      const t = (($('#pgtext') || {}).value || '').trim(), ti = (($('#pgtitle') || {}).value || '').trim();
      if (!t && !ti) return toast('Write something first');
      S.pages.push({ id: uid(), sec: id, ts: Date.now(), kind: d.kind, title: ti, text: t });
      padDraft[id] = { kind: d.kind, title: '', text: '' }; save(); render(); return toast('Saved');
    }
    case 'editpg': {
      const e = S.pages.find((x) => x.id === el.dataset.id); if (!e) return;
      const c = PATH_SECS[e.sec];
      showSheet('<div class="row"><h3 class="sp" style="font-size:21px">Edit this page</h3><button class="x" data-a="closesheet">&times;</button></div><label>Kind</label><select id="epkind">' + c.kinds.map((k) => '<option' + (k === e.kind ? ' selected' : '') + '>' + esc(k) + '</option>').join('') + '</select><label>Title</label><input type="text" id="eptitle" value="' + esc(e.title) + '"><label>Page</label><textarea id="eptext" style="min-height:180px">' + esc(e.text) + '</textarea><button class="btn full" style="margin-top:12px" data-a="pgsaveedit" data-id="' + e.id + '">Save changes</button>');
      return;
    }
    case 'pgsaveedit': {
      const e = S.pages.find((x) => x.id === el.dataset.id); if (!e) return;
      e.kind = $('#epkind').value; e.title = $('#eptitle').value.trim(); e.text = $('#eptext').value.trim(); e.edited = true; save(); closeSheet(); return render();
    }
    case 'delpg': S.pages = S.pages.filter((x) => x.id !== el.dataset.id); save(); return render();
    case 'boskind': bosDraft.title = ($('#bstitle') || {}).value || ''; bosDraft.text = ($('#bstext') || {}).value || ''; bosDraft.kind = el.dataset.k; return render();
    case 'bosfilter': bosFilter = el.dataset.k; return render();
    case 'bossave': {
      const t = (($('#bstext') || {}).value || '').trim(), ti = (($('#bstitle') || {}).value || '').trim();
      if (!t && !ti) return toast('Write something first');
      S.shadows.push({ id: uid(), ts: Date.now(), kind: bosDraft.kind, title: ti, text: t, moon: moonAt(new Date()).e + ' ' + moonAt(new Date()).n });
      bosDraft = { kind: bosDraft.kind, title: '', text: '' }; save(); render(); return toast('Added to my book');
    }
    case 'editbos': {
      const e = S.shadows.find((x) => x.id === el.dataset.id); if (!e) return;
      showSheet('<div class="row"><h3 class="sp" style="font-size:21px">Edit this page</h3><button class="x" data-a="closesheet">&times;</button></div><label>Kind</label><select id="ebkind">' + BOS_KINDS.map((k) => '<option' + (k === e.kind ? ' selected' : '') + '>' + k + '</option>').join('') + '</select><label>Title</label><input type="text" id="ebtitle" value="' + esc(e.title) + '"><label>Page</label><textarea id="ebtext" style="min-height:180px">' + esc(e.text) + '</textarea><button class="btn full" style="margin-top:12px" data-a="bossaveedit" data-id="' + e.id + '">Save changes</button>');
      return;
    }
    case 'bossaveedit': {
      const e = S.shadows.find((x) => x.id === el.dataset.id); if (!e) return;
      e.kind = $('#ebkind').value; e.title = $('#ebtitle').value.trim(); e.text = $('#ebtext').value.trim(); e.edited = true; save(); closeSheet(); return render();
    }
    case 'delbos': S.shadows = S.shadows.filter((x) => x.id !== el.dataset.id); save(); return render();
    case 'installapp': if (installEvt) { installEvt.prompt(); installEvt = null; render(); } return;
    case 'bigclock': return bigClock();
    case 'clockfmt': S.clock24 = el.dataset.v === '24'; save(); tickClock(); render(); return bigClock();
    case 'newrem': remDraft = { isNew: true, id: uid(), n: (S.reminders.reduce((a, r) => Math.max(a, r.n || 0), 0)) + 1, label: '', time: '09:00', days: [0, 1, 2, 3, 4, 5, 6], on: true }; return remSheet();
    case 'editrem': { const r = S.reminders.find((x) => x.id === el.dataset.id); if (!r) return; remDraft = JSON.parse(JSON.stringify(r)); remDraft.isNew = false; return remSheet(); }
    case 'remquick': { const q = QUICK_REM[Number(el.dataset.i)]; remKeep(); remDraft.label = q[0]; remDraft.time = q[1]; return remSheet(); }
    case 'remday': { remKeep(); const d = Number(el.dataset.d), i = remDraft.days.indexOf(d); if (i >= 0) remDraft.days.splice(i, 1); else remDraft.days.push(d); remDraft.days.sort(); return remSheet(); }
    case 'saverem': {
      remKeep();
      if (!remDraft.label.trim()) return toast('Add a name first');
      if (!remDraft.days.length) return toast('Pick at least one day');
      const o = { id: remDraft.id, n: remDraft.n, label: remDraft.label.trim(), time: remDraft.time, days: remDraft.days.slice(), on: true };
      const i = S.reminders.findIndex((x) => x.id === o.id);
      if (i >= 0) { o.on = S.reminders[i].on; S.reminders[i] = o; } else S.reminders.push(o);
      save(); closeSheet(); render(); return syncReminders();
    }
    case 'delrem': S.reminders = S.reminders.filter((x) => x.id !== remDraft.id); save(); closeSheet(); render(); return syncReminders();
    case 'togrem': { const r = S.reminders.find((x) => x.id === el.dataset.id); if (r) { r.on = !r.on; save(); render(); syncReminders(); } return; }
    case 'mesub': meSub = el.dataset.s; render(); if (meSub === 'moon') ensureMoon(); if (meSub.indexOf('sec:') === 0) ensureLive(meSub.slice(4)); return;
    case 'savediary': {
      const v = (($('#dtext') || {}).value || '').trim();
      if (!v) return toast('Write something first');
      S.diary.push({ id: uid(), ts: Date.now(), text: v }); diaryDraft = ''; save(); render(); return toast('Saved to my diary');
    }
    case 'editdiary': {
      const e = S.diary.find((x) => x.id === el.dataset.id); if (!e) return;
      showSheet('<div class="row"><h3 class="sp" style="font-size:21px">Edit this page</h3><button class="x" data-a="closesheet">&times;</button></div><textarea id="detext" style="min-height:180px">' + esc(e.text) + '</textarea><button class="btn full" style="margin-top:12px" data-a="savedit" data-id="' + e.id + '">Save changes</button>');
      return;
    }
    case 'savedit': {
      const e = S.diary.find((x) => x.id === el.dataset.id); const v = (($('#detext') || {}).value || '').trim();
      if (!e || !v) return toast('Write something first');
      e.text = v; e.edited = true; save(); closeSheet(); return render();
    }
    case 'deldiary': S.diary = S.diary.filter((x) => x.id !== el.dataset.id); save(); return render();
    case 'fmeal': foodDraft.text = ($('#ftext') || {}).value || ''; foodDraft.meal = el.dataset.m; return render();
    case 'ftummy': foodDraft.text = ($('#ftext') || {}).value || ''; foodDraft.tummy = foodDraft.tummy === el.dataset.t ? '' : el.dataset.t; return render();
    case 'savefood': {
      const v = (($('#ftext') || {}).value || '').trim();
      if (!v) return toast('Type what you ate first');
      S.food.push({ id: uid(), ts: Date.now(), meal: foodDraft.meal, tummy: foodDraft.tummy, text: v });
      foodDraft = { meal: foodDraft.meal, tummy: '', text: '' }; save(); render(); return toast('Saved');
    }
    case 'delfood': S.food = S.food.filter((x) => x.id !== el.dataset.id); save(); return render();
    case 'delmood': S.mood = S.mood.filter((m) => String(m.ts) !== el.dataset.ts); save(); return render();
    case 'breath': return breathTimer ? stopBreath() : startBreath();
    case 'gnext': ground = (ground + 1) % 5; return render();
    case 'gprev': ground = (ground + 4) % 5; return render();
    case 'savesettings':
      S.name = $('#sname').value.trim(); S.helperName = $('#shname').value.trim(); S.helperPhone = $('#shphone').value.trim();
      save(); toast('Saved'); return;
    case 'backup': return shareBackup();
    case 'restoresheet': return restoreSheet();
    case 'restorepaste': return restoreData(($('#bpaste') || {}).value || '');
    case 'reset':
      if (confirm('Erase everything saved in this app?')) { S = defaults(); save(); moodDraft = { feeling: null, level: 3 }; render(); toast('Erased'); }
      return;
  }
}
function renderKeep() {
  const note = $('#mnote') ? $('#mnote').value : '';
  const sc = $('#view').scrollTop;
  render();
  if ($('#mnote')) $('#mnote').value = note;
  $('#view').scrollTop = sc;
}
const Apps = registerPlugin('Apps');
let AppsImpl = Apps;
let appList = null, appErr = '', appQ = '', appHome = null, appsOn = false, appBusy = false, appSeen = null;
function appByPkg(p) { return (appList || []).find((a) => a.pkg === p); }
function enableApps() {
  if (appsOn) return;
  appsOn = true;
  const b = document.createElement('button');
  b.dataset.tab = 'apps';
  b.setAttribute('aria-label', 'Apps'); b.title = 'Apps';
  b.innerHTML = '<span><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/></svg></span>';
  const calmBtn = document.querySelector('#tabs [data-tab="calm"]');
  calmBtn.parentNode.insertBefore(b, calmBtn);
}
function refreshHome() {
  if (!appsOn) return;
  AppsImpl.homeStatus().then((r) => { const v = !!r.isHome; if (v !== appHome) { appHome = v; if (tab === 'apps') render(); } }).catch(() => { });
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshHome(); });
window.addEventListener('focus', refreshHome);
let appIconRun = 0;
function loadIcons() {
  const run = ++appIconRun;
  const todo = (appList || []).filter((a) => a.icon === undefined).map((a) => a.pkg);
  const step = () => {
    if (run !== appIconRun || !todo.length) return;
    const chunk = todo.splice(0, 12);
    AppsImpl.icons({ pkgs: chunk }).then((r) => {
      chunk.forEach((p) => { const a = appByPkg(p); if (a) a.icon = (r.icons || {})[p] || ''; });
      if (!$('#sheet').hidden) { const sc = ($('.applist') || {}).scrollTop || 0; showAppPicker(true); if ($('.applist')) $('.applist').scrollTop = sc; }
      if (tab === 'apps') render();
      step();
    }).catch(() => { chunk.forEach((p) => { const a = appByPkg(p); if (a) a.icon = ''; }); step(); });
  };
  step();
}
function loadApps(force) {
  if (appBusy || (appList && !force)) return;
  appBusy = true;
  appErr = '';
  const timer = setTimeout(() => { if (appBusy) { appBusy = false; appErr = 'The app list is taking too long. Try again.'; if (tab === 'apps') render(); } }, 15000);
  AppsImpl.list().then((r) => { clearTimeout(timer); appBusy = false; appList = r.apps || []; appSeen = r.seen; if (tab === 'apps') render(); if (!$('#sheet').hidden) showAppPicker(); loadIcons(); }).catch((e) => { clearTimeout(timer); appBusy = false; appErr = 'Could not read your apps. ' + ((e && e.message) || ''); if (tab === 'apps') render(); });
}
function viewApps() {
  setHeader('My apps');
  loadApps(false);
  refreshHome();
  const mine = (S.apps || []).map(appByPkg).filter(Boolean);
  let h = '';
  if (appErr) h += '<div class="card"><div class="mute">' + esc(appErr) + '</div><button class="btn full" style="margin-top:10px" data-a="apprefresh">Try again</button></div>';
  else if (!appList) h += '<div class="card"><div class="mute">Looking for your apps...</div></div>';
  else if (appList && !appList.length) h += '<div class="card"><div class="mute">Android did not show any apps to SkyCare' + (appSeen === 0 ? ' (it reported 0 launchable apps)' : '') + '. Try again, or reinstall the latest SkyCare.</div><button class="btn full" style="margin-top:10px" data-a="apprefresh">Try again</button></div>';
  else if (!mine.length) h += '<div class="card"><div class="mute">Nothing here yet. Open More, tap Add or remove apps, then check the apps you want on this page.</div></div>';
  else h += '<div class="appgrid">' + mine.map((a) => '<button class="apptile" data-a="applaunch" data-p="' + esc(a.pkg) + '">' + (a.icon ? '<img src="' + a.icon + '" alt="">' : '<div class="noicon"></div>') + '<span>' + esc(a.label) + '</span></button>').join('') + '</div>';
  $('#view').innerHTML = h;
}
function showAppPicker(keepFocus) {
  const q = appQ.trim().toLowerCase();
  const list = (appList || []).filter((a) => !q || a.label.toLowerCase().includes(q));
  const on = new Set(S.apps || []);
  showSheet('<h3>Choose your apps</h3><div class="mute">Check the ones you want on My apps. Uncheck to take one off.</div>' +
    '<input id="appsearch" type="search" placeholder="Search apps" value="' + esc(appQ) + '" style="margin-top:10px">' +
    '<div class="applist">' + (list.length ? list.map((a) => '<button class="approw" data-a="apptoggle" data-p="' + esc(a.pkg) + '" role="checkbox" aria-checked="' + on.has(a.pkg) + '">' + (a.icon ? '<img src="' + a.icon + '" alt="">' : '<div class="noicon"></div>') + '<span class="sp">' + esc(a.label) + '</span><i class="achk' + (on.has(a.pkg) ? ' on' : '') + '">' + (on.has(a.pkg) ? '&#10003;' : '') + '</i></button>').join('') : '<div class="mute" style="padding:12px 0">' + (appList ? 'No apps match.' : 'Looking for your apps...') + '</div>') + '</div>' +
    '<button class="btn full" data-a="appdone" style="margin-top:12px">Done</button>');
  const n = $('#appsearch'); if (n && appQ && keepFocus !== true) { n.focus(); try { n.setSelectionRange(appQ.length, appQ.length); } catch (x) { } }
}
function goTab(next) {
  const ids = Array.from(document.querySelectorAll('#tabs [data-tab]')).map((b) => b.dataset.tab);
  const ix = (t) => (t === 'more' ? 999 : ids.indexOf(t));
  const dir = ix(next) >= ix(tab) ? 'r' : 'l';
  const same = next === tab;
  tab = next; $('#view').scrollTop = 0; render();
  if (same) return;
  const v = $('#view');
  v.classList.remove('in-l', 'in-r'); void v.offsetWidth; v.classList.add(dir === 'r' ? 'in-r' : 'in-l');
  clearTimeout(goTab.t); goTab.t = setTimeout(() => v.classList.remove('in-l', 'in-r'), 320);
}
function render() {
  stopBreath();
  document.querySelectorAll('#tabs button,#more').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  const sc = $('#view').scrollTop;
  ({ today: viewToday, skills: viewSkills, mood: viewMood, calm: viewCalm, apps: viewApps, more: viewMore })[tab]();
  $('#view').scrollTop = sc;
}

let sw = null;
const view0 = $('#view');
view0.addEventListener('touchstart', (e) => {
  sw = null;
  if (e.touches.length !== 1 || !$('#sheet').hidden) return;
  if (e.target.closest('input,textarea,select,button[data-a="walldim"],[data-noswipe]')) return;
  let n = e.target;
  while (n && n !== view0) { if (n.scrollWidth > n.clientWidth + 4 && /(auto|scroll)/.test(getComputedStyle(n).overflowX)) return; n = n.parentElement; }
  const t = e.touches[0];
  sw = { x: t.clientX, y: t.clientY, t: Date.now() };
}, { passive: true });
view0.addEventListener('touchend', (e) => {
  if (!sw) return;
  const t = e.changedTouches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y, dt = Date.now() - sw.t;
  sw = null;
  if (dt > 700 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
  const ids = Array.from(document.querySelectorAll('#tabs [data-tab]')).map((b) => b.dataset.tab);
  const i = tab === 'more' ? ids.length : ids.indexOf(tab), j = i + (dx < 0 ? 1 : -1);
  if (i < 0 || j < 0 || j >= ids.length) return;
  goTab(ids[j]);
}, { passive: true });
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab]');
  if (t) return goTab(t.dataset.tab);
  if (e.target.id === 'sheet') return closeSheet();
  const el = e.target.closest('[data-a]');
  if (el) onAction(el);
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (!t) return;
  if (t.dataset && t.dataset.pf) {
    const k = t.dataset.pf;
    if (k === 'about') S.profile.about = t.value;
    else { S.profile[k] = S.profile[k] || {}; S.profile[k][t.dataset.side] = t.value; }
    save(); return;
  }
  if (t.id === 'pgtitle' || t.id === 'pgtext') { const d = padDraft[meSub.slice(4)]; if (d) d[t.id === 'pgtitle' ? 'title' : 'text'] = t.value; return; }
  if (t.id === 'pgsearch') {
    padView[meSub.slice(4)].q = t.value; const pos = t.selectionStart; render();
    const n = $('#pgsearch'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { } }
    return;
  }
  if (t.id === 'appsearch') { appQ = t.value; showAppPicker(); return; }
  if (t.id === 'tsize') { S.textScale = Number(t.value); anchored(t, null, () => { applyAccess(); const v = $('#tsval'); if (v) v.textContent = S.textScale + '%'; }); save(); return; }
  if (t.id === 'pathother') { S.pathOther = t.value; save(); return; }
  if (t.id === 'bstitle') { bosDraft.title = t.value; return; }
  if (t.id === 'bstext') { bosDraft.text = t.value; return; }
  if (t.id === 'bssearch') {
    bosSearch = t.value; const pos = t.selectionStart; render();
    const n = $('#bssearch'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { } }
    return;
  }
  if (t.id === 'dtext') diaryDraft = t.value;
  else if (t.id === 'ftext') foodDraft.text = t.value;
  else if (t.id === 'dsearch') {
    diarySearch = t.value; const pos = t.selectionStart; render();
    const n = $('#dsearch'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { } }
  }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t && t.classList && t.classList.contains('rtedit')) {
    const v = t.value.trim();
    if (v) { S.routines[t.dataset.r][Number(t.dataset.i)] = v; save(); }
    return render();
  }
  if (t && t.id === 'wallfile' && t.files && t.files[0]) {
    wallFromFile(t.files[0], (img) => {
      const m = $('#wallmsg');
      if (!img) { if (m) m.textContent = 'That picture could not be opened. Try a different one.'; return; }
      const old = WALL.img; WALL.img = img;
      if (!saveWall()) { WALL.img = old; if (m) m.textContent = 'There is not enough room to save that picture. Try a smaller one.'; return; }
      applyWall(); render();
    });
    return;
  }
  if (t && t.id === 'bfile' && t.files && t.files[0]) {
    const r = new FileReader();
    r.onload = () => restoreData(String(r.result));
    r.onerror = () => restoreSheet('I could not read that file.');
    r.readAsText(t.files[0]);
    return;
  }
  if (t && t.id === 'ifile' && t.files && t.files[0]) {
    const r = new FileReader();
    r.onload = () => handleImport(String(r.result));
    r.onerror = () => importSheet('I could not read that file.');
    r.readAsText(t.files[0]);
  }
});
applyTheme();
render();
window.__makePdf = makePdf; window.__parse = parseChecklist; window.__restore = restoreData; window.__moon = moonAt; window.__sync = syncReminders; window.__webcheck = webCheckReminders; window.__ens = ensureMoon; window.__MC = () => MC; window.__next = nextPhase; window.__setSub = (x) => { meSub = x; }; window.__S = () => S;
setTimeout(() => ensureMoon(), 1500);
startClock();
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (tab === 'more') render(); });
window.addEventListener('appinstalled', () => { installEvt = null; if (tab === 'more') render(); });
if (!NATIVE && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { }); });
}
if (!NATIVE) { setTimeout(() => { if (S.reminders.some((r) => r.on) && 'Notification' in window && Notification.permission === 'granted' && !webRemTimer) webRemTimer = setInterval(webCheckReminders, 15000); }, 2000); }
