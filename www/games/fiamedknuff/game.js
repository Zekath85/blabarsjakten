import * as F from './logic.js';
import { ART } from '../blabarsjakten/art.js';
import { SONGS } from '../blabarsjakten/songs.js';
import { sfx, settings, playClip, stop } from '../../shared/audio.js';
import { avatar, robot, OPTIONS, DEFAULT_LOOKS } from '../../shared/avatar.js';
import { confirmQuit } from '../../shared/dialog.js';
import { music } from '../../shared/music.js';
import { MENU_SONG } from '../../shared/menu-song.js';
import { ICONS, fillIcons } from '../../shared/icons.js';

const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const BOARDS = { blue: 'Blå', green: 'Grön', yellow: 'Gul', red: 'Röd' };
const BOARD_SWATCH = { blue: ['#5a8fd0', '#dbe9fb'], green: ['#7fb069', '#e9f3d4'], yellow: ['#e0b040', '#fff3c4'], red: ['#d0605a', '#fbdcd8'] };
const LEVEL_NAME = { easy: 'Lätt', normal: 'Medel', hard: 'Svår' };
// Spelarnas färger: röd, blå, grön och lila (som i Fyra i rad).
const PLAYER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#8e24aa'];
const NEUTRAL = '#9a9a9a';
const STAR = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4 L25 15 L37 16 L28 24 L31 36 L20 30 L9 36 L12 24 L3 16 L15 15Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
const FLAG = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 5 V36" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M12 7 H33 L27 15 L33 23 H12Z" fill="#ffd54f" stroke="#a8661a" stroke-width="2" stroke-linejoin="round"/></svg>'; // pjäser i mål

// ---------- Val som sparas: spelplan, datorns nivå och hur många omgångar som krävs ----------
let count = 2, names = ['Spelare 1', 'Spelare 2', 'Spelare 3', 'Spelare 4'], looks = DEFAULT_LOOKS.map(l => ({ ...l })), bot = false, botName = 'Robo';
let board = 'blue', level = 'normal', target = 1, sixOut = true; // sixOut: måste man slå en sexa för att få ut en pjäs?
try { ({ names, looks, bot, botName, count } = { names, looks, bot, botName, count, ...JSON.parse(localStorage.getItem('bbj-players') || '{}') }); } catch {}
try { ({ board, level, target, sixOut } = { board, level, target, sixOut, ...JSON.parse(localStorage.getItem('fia-prefs') || '{}') }); } catch {}
const savePrefs = () => { try { localStorage.setItem('fia-prefs', JSON.stringify({ board, level, target, sixOut })); } catch {} };
// Namn och figurer delas med de andra spelen (samma nyckel). Vi lägger bara till våra värden, så inget där försvinner.
const savePlayers = () => { try { localStorage.setItem('bbj-players', JSON.stringify({ ...JSON.parse(localStorage.getItem('bbj-players') || '{}'), names, looks, count, bot, botName })); } catch {} };
const lineup = () => (bot
  ? [{ name: names[0], look: looks[0] }, { name: botName, bot: true }]
  : Array.from({ length: count }, (_, i) => ({ name: names[i], look: looks[i] }))).map((p, i) => ({ ...p, color: PLAYER_COLORS[i] }));
const figure = (p, headOnly = true) => (p.bot ? robot(p.color, headOnly) : avatar(p.look, p.color, headOnly));

// state: setup, preview (välja spelplan), roll (slå), busy, pick (välja pjäs), over
let players = lineup(), g = F.createGame(players.length), current = 0, state = 'setup', tries = 3;
let pcs = [];            // pcs[spelare][pjäs] = elementet på brädet (ritas en gång per omgång och flyttas sedan)
let wins = [], starter = 0, matchDone = false;
let pending = [];        // drag som går just nu (när man ska välja pjäs)
const tablet = () => Math.min(innerWidth, innerHeight) >= 560; // allt utom mobil

// ---------- 1. Välj spelare (samma som i Fyra i rad) ----------
function show(id) { document.querySelectorAll('.screen').forEach(s => (s.hidden = s.id !== id)); }
function renderSetup() {
  $('#figures').innerHTML = PLAYER_COLORS.map((c, i) => `<span style="background:${c}">${avatar(looks[i], c, true)}</span>`).join('');
  $('#counts').innerHTML =
    `<button class="count ${bot ? 'on' : ''}" data-n="bot" aria-label="En spelare mot datorn">1</button>` +
    [2, 3, 4].map(n => `<button class="count ${!bot && n === count ? 'on' : ''}" data-n="${n}">${n}</button>`).join('');
  $('#names').innerHTML = lineup().map((p, i) => {
    const id = p.bot ? 'bot' : i;
    return `<div class="name-row"><button class="avatar-btn" data-i="${id}" style="--c:${p.color}" ${p.bot ? 'disabled' : ''} aria-label="Ändra figur">${figure(p)}</button>` +
      `<input value="${esc(p.name)}" data-i="${id}" maxlength="14" readonly aria-label="Namn på spelare ${i + 1}">` +
      `<button class="pen" data-i="${id}" aria-label="Ändra namn">${ICONS.pencil}</button></div>`;
  }).join('');
}
$('#counts').onclick = e => {
  const n = e.target.closest('.count')?.dataset.n;
  if (!n) return;
  bot = n === 'bot';
  if (!bot) count = +n;
  sfx.click(); savePlayers(); renderSetup();
};
$('#names').onclick = e => {
  const av = e.target.closest('.avatar-btn');
  if (av) return openLook(+av.dataset.i);
  const pen = e.target.closest('.pen');
  if (!pen) return;
  const input = $(`#names input[data-i="${pen.dataset.i}"]`);
  input.readOnly = false;
  input.focus();
  input.select();
};
$('#names').addEventListener('focusout', e => {
  if (e.target.tagName !== 'INPUT') return;
  if (e.target.dataset.i === 'bot') {
    e.target.value = botName = e.target.value.trim() || 'Robo';
  } else {
    const i = +e.target.dataset.i;
    e.target.value = names[i] = e.target.value.trim() || `Spelare ${i + 1}`;
  }
  e.target.readOnly = true;
  savePlayers();
  renderSetup();
});
$('#names').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

// Figurskapare (samma som i Blåbärsjakten): Tjej/Kille + hudfärg, hårfärg, frisyr och extra.
let lookIndex = 0;
function openLook(i) {
  lookIndex = i;
  sfx.click();
  renderLook();
  $('#lookPanel').hidden = false;
}
function renderLook() {
  const i = lookIndex, look = looks[i], color = PLAYER_COLORS[i];
  $('#lookPreview').innerHTML = avatar(look, color);
  const opt = (key, v, inner, wide = '') =>
    `<button class="opt ${wide} ${look[key] === v ? 'on' : ''}" data-key="${key}" data-v="${v}">${inner}</button>`;
  const row = (label, buttons) => `<div class="look-row"><b>${label}</b>${buttons}</div>`;
  $('#lookRows').innerHTML =
    row('Jag är', opt('gender', 'girl', 'Tjej', 'wide') + opt('gender', 'boy', 'Kille', 'wide')) +
    Object.entries(OPTIONS).map(([key, o]) => row(o.label, [0, 1, 2].map(v =>
      opt(key, v, o.colors
        ? `<span class="swatch" style="background:${o.colors[v]}"></span>`
        : avatar({ ...look, [key]: v }, color, true))).join(''))).join('');
}
$('#lookRows').onclick = e => {
  const b = e.target.closest('.opt');
  if (!b) return;
  const { key, v } = b.dataset;
  looks[lookIndex][key] = key === 'gender' ? v : +v;
  sfx.pop();
  renderLook();
};
$('#lookDoneBtn').onclick = () => { $('#lookPanel').hidden = true; savePlayers(); renderSetup(); sfx.good(); };

// ---------- 2. Välj spelplan, nivå och omgångar ----------
$('#toBoardBtn').onclick = () => {
  sfx.click();
  players = lineup(); wins = players.map(() => 0); state = 'preview';
  $('#previewActions').hidden = false;
  $('#actionBtn').hidden = true;
  $('#tray').innerHTML = '';
  show('play');
  renderPicker(); fit(); newGame(); renderScores();
};
function renderPicker() {
  const pill = (id, label, buttons) => ($(id).innerHTML = `<span class="lbl">${label}</span>${buttons}`);
  pill('#boards', 'Bräde', Object.entries(BOARDS).map(([key, name]) =>
    `<button class="size ${key === board ? 'on' : ''}" data-board="${key}" aria-label="${name} spelplan">` +
    `<svg viewBox="0 0 40 40"><rect x="3" y="5" width="34" height="30" rx="7" fill="${BOARD_SWATCH[key][0]}"/><rect x="8" y="10" width="24" height="20" rx="4" fill="${BOARD_SWATCH[key][1]}"/></svg><small>${name}</small></button>`).join(''));
  $('#levels').hidden = !bot; // datorns nivå visas bara när man spelar mot datorn
  if (bot) pill('#levels', 'Datorn', F.LEVELS.map((lvl, i) =>
    `<button class="size level ${lvl === level ? 'on' : ''}" data-level="${lvl}" aria-label="${LEVEL_NAME[lvl]} dator"><span class="heads">${robot('#1e88e5', true).repeat(i + 1)}</span><small>${LEVEL_NAME[lvl]}</small></button>`).join(''));
  pill('#outs', 'Komma ut', [[true, 'Sexa'], [false, 'Alla slag']].map(([v, name]) =>
    `<button class="size out ${v === sixOut ? 'on' : ''}" data-six="${v}" aria-label="Komma ut med ${name.toLowerCase()}"><small>${name}</small></button>`).join(''));
  pill('#rounds', 'Först till', [1, 2, 3, 4, 5].map(n =>
    `<button class="size round-n ${n === target ? 'on' : ''}" data-n="${n}" aria-label="Först till ${n}">${n}</button>`).join(''));
  document.body.dataset.board = board;
}
$('#previewActions').onclick = e => {
  const b = e.target.closest('.size');
  if (!b) return;
  if (b.dataset.board) board = b.dataset.board;
  if (b.dataset.level) level = b.dataset.level;
  if (b.dataset.n) target = +b.dataset.n;
  if (b.dataset.six) sixOut = b.dataset.six === 'true';
  savePrefs(); sfx.pop(); renderPicker(); renderScores(); fit();
};

// ---------- Brädet: kors med 40 rutor. Byggs en gång per omgång. Pjäserna flyttas, brädet ritas aldrig om. ----------
function fit() {
  // Brädet ligger alltid mitt på skärmen. På tablet och dator sparas en lika bred remsa på båda sidor, så att tärningen får plats
  // till vänster om brädet utan att brädet flyttas åt sidan.
  const lane = tablet() && !$('#actionBtn').hidden ? 110 : 0;
  const wrap = $('#boardWrap');
  wrap.style.paddingLeft = wrap.style.paddingRight = lane + 'px';
  const w = wrap.getBoundingClientRect();
  const bw = Math.max(220, Math.min(w.width - 2 * lane - 8, w.height - 8)) + 'px', b = $('#board');
  if (b.style.getPropertyValue('--bw') === bw) return;
  b.classList.add('nofx'); // pjäserna glider inte när brädet byter storlek
  b.style.setProperty('--bw', bw);
  requestAnimationFrame(() => requestAnimationFrame(() => b.classList.remove('nofx')));
}
addEventListener('resize', () => !$('#play').hidden && fit());
new ResizeObserver(() => !$('#play').hidden && fit()).observe($('#boardWrap'));

const seatColor = seat => { const i = g.seats.indexOf(seat); return i < 0 ? null : players[i].color; };
function newGame() { // nytt bräde och nya pjäser, alla hemma
  g = F.createGame(players.length, sixOut);
  const sq = (cls, [x, y], c, inner = '') => `<div class="sq ${cls}" style="--x:${x};--y:${y};--c:${c}">${inner}</div>`;
  const QUAD = [[7, 0], [7, 7], [0, 7], [0, 0]]; // hörnet där varje plats har sitt hem
  let h = '';
  for (let s = 0; s < 4; s++) {
    const c = seatColor(s) || NEUTRAL;
    h += `<div class="homeq ${seatColor(s) ? '' : 'off'}" style="--x:${QUAD[s][0]};--y:${QUAD[s][1]};--c:${c}"></div>`;
    for (let i = 0; i < 4; i++) h += sq('slot', F.cellOf(s, -1, i), c);
  }
  F.TRACK.forEach((cell, k) => (h += sq(k % 10 === 0 ? 'start' : '', cell, seatColor(k / 10 | 0) || NEUTRAL)));
  for (let s = 0; s < 4; s++) for (let p = 40; p <= 43; p++) h += sq(p === 43 ? 'lane goal' : 'lane', F.cellOf(s, p), seatColor(s) || NEUTRAL, p === 43 ? STAR : '');
  const P = [[0, 0, 100, 0], [100, 0, 100, 100], [100, 100, 0, 100], [0, 100, 0, 0]];
  h += sq('hub', [5, 5], '#fff', `<svg viewBox="0 0 100 100"><clipPath id="hubc"><circle cx="50" cy="50" r="44"/></clipPath><circle cx="50" cy="50" r="46" fill="#fff" stroke="#cdb888" stroke-width="4"/><g clip-path="url(#hubc)">${P.map(([a, b, c, d], s) =>
    `<polygon points="${a},${b} ${c},${d} 50,50" fill="${seatColor(s) || NEUTRAL}"/>`).join('')}</g></svg>`);
  $('#ground').innerHTML = h;
  pcs = players.map((p, pi) => [0, 1, 2, 3].map(i => {
    const el = document.createElement('div');
    el.className = 'pc';
    el.dataset.i = i;
    el.style.setProperty('--c', p.color);
    el.innerHTML = `<div class="tok"><div class="hp">${figure(p)}</div></div>`;
    $('#ground').append(el);
    return el;
  }));
  pcs.forEach((row, p) => row.forEach((_, i) => setPos(p, i)));
  $('#board').classList.remove('pick');
}
// Sätter pjäsens ruta. Pjäser i mål är små och ligger fyra i ett hörn av målrutan.
function setPos(p, i) {
  const el = pcs[p][i], prog = g.pieces[p][i], [x, y] = F.cellOf(g.seats[p], prog, i), goal = prog === F.GOAL;
  el.style.setProperty('--x', x); el.style.setProperty('--y', y);
  el.style.setProperty('--ox', goal ? (i % 2 ? 0.24 : -0.24) : 0);
  el.style.setProperty('--oy', goal ? (i > 1 ? 0.24 : -0.24) : 0);
  el.style.setProperty('--s', goal ? 0.5 : 1);
}

function renderScores() {
  $('#scores').classList.toggle('many', players.length > 2); // många spelare på mobil: smalare piller
  $('#scores').classList.toggle('wins-on', target > 1); // på mobil visas då bara vunna omgångar
  $('#scores').innerHTML = players.map((p, i) =>
    `<div class="chip p${i} ${i === current && !['over', 'preview'].includes(state) ? 'on' : ''}" style="--c:${p.color}">` +
    `<span class="chip-face">${figure(p)}</span><b>${esc(p.name)}</b>` +
    `<span class="goalnum" aria-label="Pjäser i mål">${FLAG}${F.inGoal(g, i)}</span>` +
    (target > 1 ? `<span class="wins" aria-label="Vunna omgångar">${ART.golden}${wins[i]}</span>` : '') + '</div>').join('');
}

const me = () => players[current];
const isBot = () => !['preview', 'setup'].includes(state) && me().bot;
const msg = (text, cls = '') => ($('#tray').innerHTML = text ? `<div class="rolled ${cls}">${text}</div>` : '');

// Berättaren: korta repliker, i kö så att de aldrig pratar i munnen på varandra. Spelet väntar inte på rösten. Går att slå av (dice).
const LINES = { turn: 'Din tur. Dra tärningen.', six: 'Sex! Slå igen.', knuff: 'Knuff! Den får åka hem.', goal: 'Hurra! En pjäs är i mål.', nomove: 'Ingen pjäs kan flytta. Nästa tur.', retry: 'Ingen sexa. Försök igen.', win: 'Grattis! Du vann!' };
let voiceChain = Promise.resolve();
const say = key => {
  // race: om en annan röst avbryter (t.ex. avbryt-frågan) blir inspelningen aldrig klar, och kön ska inte fastna.
  voiceChain = voiceChain.then(() => Promise.race([playClip(`voice/${key}.mp3`, LINES[key], undefined, 'dice'), wait(4500)]));
};

function start() {
  sfx.good();
  music.play(SONGS[settings.get('song')] || SONGS.theme);
  $('#previewActions').hidden = true;
  $('#actionBtn').hidden = false;
  wins = players.map(() => 0); starter = 0; matchDone = false;
  beginRound();
}
$('#startBtn').onclick = start;
function beginRound() {
  fit(); newGame(); current = starter;
  fit();
  startTurn();
}

// ---------- Tur och slag ----------
function startTurn() {
  clearDice();
  tries = F.rollsAllowed(g, current);
  sfx.turn(current);
  if (!isBot()) say('turn');
  beginRoll();
}
// Dags att slå. note = text som ska stå kvar (t.ex. efter en sexa).
function beginRoll(note) {
  state = 'roll'; pending = [];
  renderScores();
  setButton();
  msg(note || (F.needSix(g, current) ? `Slå en sexa för att få ut en pjäs. Försök ${4 - tries} av 3.` : ''));
  if (isBot()) botThrow();
}
const botThrow = () => wait(1100).then(() => roll({ power: 0.35 + Math.random() * 0.5, dx: (Math.random() - 0.5) * 0.8, dy: -1 }));

const DIE_ICON = '<svg class="icon" viewBox="0 0 40 40" aria-hidden="true"><rect x="5" y="5" width="30" height="30" rx="8" fill="#fff" stroke="currentColor" stroke-width="3"/><circle cx="13" cy="13" r="3.2" fill="currentColor"/><circle cx="20" cy="20" r="3.2" fill="currentColor"/><circle cx="27" cy="27" r="3.2" fill="currentColor"/></svg>';
function setButton() {
  const btn = $('#actionBtn'), on = state === 'roll' && !isBot();
  btn.disabled = !on;
  btn.className = 'btn action' + (on ? ' pulse throw' : '');
  btn.innerHTML = isBot() ? `${robot(me().color, true)}<span class="wait-dots"><i></i><i></i><i></i></span>`
    : on ? `<span class="throw-dice">${DIE_ICON}</span><span class="throw-hint">${ICONS.arrowUp}</span>`
    : '<span class="wait-dots"><i></i><i></i><i></i></span>';
}

// ---------- Slå tärningen (samma kast som i Blåbärsjakten och Fyra i rad: dra uppåt och släpp) ----------
const MAX_PULL = 520;
let aim = null;
const btn = $('#actionBtn');
btn.addEventListener('pointerdown', e => {
  if (isBot() || state !== 'roll') return;
  const r = btn.getBoundingClientRect();
  aim = { x: r.left + r.width / 2, y: r.top + r.height / 2, dx: 0, dy: -1, power: 0, step: 0 };
  try { btn.setPointerCapture(e.pointerId); } catch {}
  showDie(aim.x, aim.y - 10);
  $('#aim').removeAttribute('hidden');
  updateAim(e);
});
btn.addEventListener('pointermove', e => aim && updateAim(e));
btn.addEventListener('pointerup', e => {
  const a = aim;
  if (!a) return;
  updateAim(e);
  aim = null;
  $('#aim').setAttribute('hidden', '');
  // Man måste dra ut för att kasta. Släpper man på knappen igen (eller drar nästan ingenting) avbryts kastet.
  const r = btn.getBoundingClientRect();
  const onButton = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (onButton || a.power < 0.1) { cancelAim(); if (a.power < 0.1) hint('Dra tärningen uppåt och släpp!'); return; }
  roll({ power: a.power, dx: a.dx, dy: a.dy, x: a.x, y: a.y });
});
btn.addEventListener('pointercancel', () => { aim = null; $('#aim').setAttribute('hidden', ''); cancelAim(); });
// Kastet avbröts: tärningen försvinner (om den inte är parkerad) och tärningsytan stängs.
function cancelAim() {
  if (!dieLive) { $('#diceWrap').style.display = $('#diceShadow').style.display = 'none'; $('#diceZone').hidden = true; }
}
// Kort tips i nedre raden (bara om raden är tom), så man förstår att man ska dra.
let hintTimer;
function hint(text) {
  const t = $('#tray');
  if (t.innerHTML && !t.querySelector('.hint-msg')) return;
  t.innerHTML = `<div class="rolled hint-msg">${text}</div>`;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => t.querySelector('.hint-msg') && (t.innerHTML = ''), 2200);
}
function updateAim(e) {
  const vx = e.clientX - aim.x, vy = e.clientY - aim.y, len = Math.hypot(vx, vy);
  aim.power = Math.min(1, len / MAX_PULL);
  if (len > 4) { aim.dx = vx / len; aim.dy = vy / len; }
  const L2 = Math.min(len, MAX_PULL), ex = aim.x + aim.dx * L2, ey = aim.y + aim.dy * L2;
  const line = $('#aimLine'), dot = $('#aimDot');
  line.setAttribute('x1', aim.x); line.setAttribute('y1', aim.y); line.setAttribute('x2', ex); line.setAttribute('y2', ey);
  line.style.stroke = dot.style.fill = `hsl(${120 - aim.power * 120} 85% 50%)`;
  line.style.strokeWidth = 10 + aim.power * 16;
  dot.setAttribute('cx', ex); dot.setAttribute('cy', ey); dot.setAttribute('r', 12 + aim.power * 10);
  $('#diceWrap').style.setProperty('--shake', `${1 + aim.power * 5}px`);
  const step = Math.floor(aim.power * 4);
  if (step !== aim.step) { aim.step = step; sfx.aim(step); }
}

async function roll(t) {
  if (state !== 'roll') return;
  state = 'busy'; setButton();
  const n = F.rollDie(); // slumpat och rättvist, kastet styr bara hur tärningen flyger
  await throwDie(n, t);
  await settleDice();
  return handleRoll(n);
}

// Tärningen har landat: vilka pjäser kan flytta?
async function handleRoll(n) {
  const moves = F.legalMoves(g, current, n);
  if (n === 6) sfx.six();
  if (!moves.length) {
    state = 'busy'; setButton();
    if (n === 6) { say('six'); msg('Sex! Ingen pjäs kan flytta. Slå igen.', 'miss'); await wait(1600); return beginRoll('Sex! Slå igen.'); }
    if (F.needSix(g, current) && tries > 1) { tries--; say('retry'); sfx.bad(); msg('Ingen sexa. Försök igen.', 'miss'); await wait(1500); return beginRoll(); }
    say('nomove'); sfx.bad(); msg('Ingen pjäs kan flytta.', 'miss');
    await wait(2000);
    return nextPlayer();
  }
  if (isBot()) { state = 'busy'; await wait(900); return doMove(F.pickMove(g, current, n, level, Math.random), n); }
  if (moves.length === 1) { state = 'busy'; await wait(700); return doMove(moves[0], n); } // bara ett drag: det görs av sig självt
  state = 'pick'; pending = moves.map(m => ({ ...m, n }));
  moves.forEach(m => {
    pcs[current][m.i].classList.add('ok');
    const d = document.createElement('div');
    d.className = 'dest'; d.dataset.i = m.i;
    const [x, y] = F.cellOf(g.seats[current], m.to, m.i);
    d.style.setProperty('--x', x); d.style.setProperty('--y', y);
    $('#ground').append(d);
  });
  $('#board').classList.add('pick');
  msg('Tryck på en pjäs som lyser.');
}
$('#ground').addEventListener('click', e => {
  const t = e.target.closest('.pc.ok, .dest');
  if (!t || state !== 'pick' || isBot()) return;
  const m = pending.find(x => x.i === +t.dataset.i);
  if (m) doMove(m, m.n);
});

// Flyttar pjäsen steg för steg, knuffar hem den som står där, och ger sexan en extra tur.
async function doMove(m, n) {
  state = 'busy'; setButton();
  document.querySelectorAll('.pc.ok').forEach(el => el.classList.remove('ok'));
  document.querySelectorAll('.dest').forEach(el => el.remove());
  $('#board').classList.remove('pick');
  msg('');
  const el = pcs[current][m.i], from = g.pieces[current][m.i];
  const res = F.applyMove(g, current, m.i, n);
  el.classList.add('mv');
  const hop = () => { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); };
  if (from === F.HOME) { setPos(current, m.i); hop(); sfx.pop(); await wait(450); }
  else {
    // Ett steg i taget. Landar pjäsen i målet går den dit i ett svep med de sista stegen.
    for (let s = from + 1; s <= res.to; s++) {
      el.style.setProperty('--x', F.cellOf(g.seats[current], s, m.i)[0]); el.style.setProperty('--y', F.cellOf(g.seats[current], s, m.i)[1]);
      if (s === F.GOAL) setPos(current, m.i);
      hop(); sfx.hop(s - from - 1);
      await wait(settings.get('calm') ? 160 : 260);
    }
  }
  el.classList.remove('mv', 'hop');
  sfx.land();
  for (const k of res.knuffed) { // knuff: den andras pjäs flyger hem
    const o = pcs[k.p][k.i];
    setPos(k.p, k.i);
    o.classList.add('far', 'shake'); sfx.bad();
    setTimeout(() => o.classList.remove('far', 'shake'), 700);
  }
  if (res.knuffed.length) { say('knuff'); msg('Knuff!', 'good'); await wait(900); }
  else if (res.goal) { sfx.good(); say('goal'); msg('En pjäs i mål!', 'good'); await wait(900); }
  renderScores();
  clearDice(); // draget är gjort: tärningen får lämna spelplanen
  if (res.won) return win();
  if (n === 6) { sfx.six(); say('six'); tries = F.rollsAllowed(g, current); return beginRoll('Sex! Slå igen.'); }
  await wait(res.knuffed.length || res.goal ? 400 : 600);
  nextPlayer();
}
function nextPlayer() { current = (current + 1) % players.length; startTurn(); }

// ---------- Vinst: en omgång, eller hela spelet ----------
async function win() {
  state = 'over';
  wins[current]++;
  renderScores();
  msg('');
  pcs[current].forEach(el => el.classList.add('win'));
  sfx.win(); say('win');
  await wait(2200);
  end(wins[current] >= target ? 'final' : 'round');
}
function end(kind) { // 'round': omgång klar, spelet fortsätter. 'final': någon vann spelet.
  matchDone = kind === 'final';
  state = 'over';
  const winner = me();
  const score = target > 1 ? ` Ställning: ${wins.join('–')}. Först till ${target}.` : '';
  $('#winFace').style.setProperty('--c', winner.color);
  $('#winFace').innerHTML = figure(winner);
  $('#winTitle').textContent = kind === 'final' ? `${winner.name} vann${target > 1 ? ' hela spelet' : ''}!` : `${winner.name} vann omgången!`;
  $('#winText').textContent = kind === 'final' ? `Grattis!${score}` : score.trim();
  $('#nextBtn').hidden = kind === 'final';
  $('#againBtn').hidden = kind !== 'final';
  $('#menuBtn').hidden = kind === 'round';
  const CONF = ['#e53935', '#fbc02d', '#43a047', '#1e88e5', '#8e24aa', '#fb8c00'];
  $('#confetti').innerHTML = Array.from({ length: kind === 'final' ? 28 : 12 }, (_, i) =>
    `<i style="left:${Math.random() * 100}%;background:${CONF[i % 6]};animation-delay:${-Math.random() * 6}s;animation-duration:${4 + Math.random() * 4}s"></i>`).join('');
  $('#winPanel').hidden = false;
  // Knapparna är gråa en sekund, så att ett oväntat tryck inte startar en ny omgång av misstag.
  const btns = document.querySelectorAll('#winPanel .btn');
  btns.forEach(b => (b.disabled = true));
  setTimeout(() => btns.forEach(b => (b.disabled = false)), 1000);
}
// Nästa omgång: nästa spelare börjar.
$('#nextBtn').onclick = () => { $('#winPanel').hidden = true; sfx.click(); starter = (starter + 1) % players.length; beginRound(); };
// Nytt spel: tillbaka till att välja spelplan (samma spelare).
$('#againBtn').onclick = () => { $('#winPanel').hidden = true; sfx.click(); $('#toBoardBtn').onclick(); };
$('#menuBtn').onclick = () => (location.href = '../../index.html');

// ---------- Tärningen: en vanlig tärning med prickar ----------
const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const FACE = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 5: [-90, 0], 2: [90, 0] };
$('#cube').innerHTML = [1, 2, 3, 4, 5, 6].map(n =>
  `<div class="face f${n}">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => (PIPS[n].includes(c) ? `<i style="grid-area:${Math.ceil(c / 3)}/${(c - 1) % 3 + 1}"></i>` : '')).join('')}</div>`).join('');
const DICE = 96, DT = 1 / 60;
// dieLive: tärningen flyger eller ligger kvar. parked: den har flyttats till vänster om spelplanen och ligger där tills draget är gjort.
let dieLive = false, parked = false;
function showDie(x, y) {
  const zone = $('#diceZone');
  zone.hidden = false;
  if (!dieLive) { zone.classList.remove('landed', 'flying'); zone.classList.add('aiming'); }
  $('#diceWrap').style.display = $('#diceShadow').style.display = '';
  $('#diceWrap').style.transition = '';
  parked = false;
  placeDice(x, y, 0);
}
// Var tärningen ligger: till vänster om spelplanen. Finns inte plats där (mobil) flyttas den inte, utan försvinner efter en stund.
function restSpot() {
  const b = $('#board').getBoundingClientRect(), avail = b.left - 6;
  const size = Math.min(64, avail - 8);
  if (size < 41) return null;
  return { x: b.left / 2, y: b.top + b.height / 2, s: size / DICE };
}
function parkDie() {
  const spot = restSpot();
  if (!spot) return;
  const w = $('#diceWrap');
  w.style.transition = 'transform .6s cubic-bezier(.3,.7,.3,1)';
  w.style.transform = `translate(${spot.x - DICE / 2}px, ${spot.y - DICE / 2}px) scale(${spot.s})`;
  $('#diceShadow').style.display = 'none';
  parked = true;
  $('#diceZone').classList.remove('landed', 'flying', 'aiming'); // ingen mörk ton över planen medan den ligger
}
async function settleDice() {
  if (restSpot()) return wait(650); // låt den hinna glida på plats
  await wait(1000);
  clearDice();
}
function clearDice() {
  dieLive = parked = false;
  const z = $('#diceZone');
  z.hidden = true;
  z.classList.remove('landed', 'flying', 'aiming');
  $('#diceWrap').style.transition = '';
}
function placeDice(x, y, z) {
  $('#diceWrap').style.transform = `translate(${x - DICE / 2}px, ${y - DICE / 2 - z}px) scale(${1 + z / 500})`;
  const sh = $('#diceShadow');
  sh.style.transform = `translate(${x - DICE / 2}px, ${y - DICE / 4}px) scale(${Math.max(0.4, 1 - z / 400)})`;
  sh.style.opacity = Math.max(0.15, 0.45 - z / 900);
}

// Räkna ut hela kastet i förväg (60 steg per sekund): var tärningen är och hur mycket den har rullat.
function simulateThrow(x, y, t, box) {
  const p = Math.max(0.15, t.power), speed = 450 + 1500 * p;
  let vx = t.dx * speed, vy = t.dy * speed, vz = 350 + 750 * p, z = 0, rx = 0, ry = 0;
  const spin = 0.9 + Math.random() * 0.4, frames = [];
  for (let i = 0; i < 900; i++) {
    let knock = 0;
    vz -= 2300 * DT; z += vz * DT;
    if (z <= 0) {
      z = 0;
      if (vz < -140) { knock = Math.min(1, -vz / 1000); vz = -vz * 0.42; vx *= 0.78; vy *= 0.78; }
      else vz = 0;
    }
    if (z === 0 && vz === 0) { const fr = Math.pow(0.12, DT); vx *= fr; vy *= fr; }
    x += vx * DT; y += vy * DT;
    if (x < box.l) { x = box.l; vx = Math.abs(vx) * 0.6; knock = knock || 0.3; }
    if (x > box.r) { x = box.r; vx = -Math.abs(vx) * 0.6; knock = knock || 0.3; }
    if (y < box.t) { y = box.t; vy = Math.abs(vy) * 0.6; knock = knock || 0.3; }
    if (y > box.b) { y = box.b; vy = -Math.abs(vy) * 0.6; knock = knock || 0.3; }
    rx -= vy * 0.94 * spin * DT + (z > 0 ? vz * 0.15 * DT : 0);
    ry += vx * 0.94 * spin * DT;
    frames.push({ x, y, z, rx, ry, knock });
    if (z === 0 && vz === 0 && Math.hypot(vx, vy) < 30) break;
  }
  return frames;
}

async function throwDie(n, t) {
  const zone = $('#diceZone'), cube = $('#cube');
  const b = btn.getBoundingClientRect(), vp = $('#boardWrap').getBoundingClientRect();
  const box = { l: vp.left + DICE / 2, r: vp.right - DICE / 2, t: vp.top + DICE / 2, b: innerHeight - DICE / 2 };
  const x0 = t.x ?? b.left + b.width / 2, y0 = t.y ?? b.top + b.height / 2;
  showDie(x0, y0);
  dieLive = true;
  zone.classList.remove('aiming');
  zone.classList.add('flying');
  const fr = simulateThrow(x0, y0, t, box), end = fr.at(-1);
  // Siffran är redan slumpad: tärningen vrids från början så att den stannar med rätt sida uppåt.
  const rx0 = FACE[n][0] - end.rx + 360 * Math.round(Math.random() * 2), ry0 = FACE[n][1] - end.ry + 360 * Math.round(Math.random() * 2);
  cube.style.transition = 'none';
  sfx.whoosh(Math.max(0.15, t.power));
  await new Promise(done => {
    const t0 = performance.now();
    let shown = -1;
    const step = now => {
      const i = Math.max(0, Math.min(fr.length - 1, Math.floor((now - t0) / 1000 / DT)));
      for (let j = shown + 1; j <= i; j++) if (fr[j].knock) sfx.knock(fr[j].knock);
      shown = i;
      const f = fr[i];
      placeDice(f.x, f.y, f.z);
      cube.style.transform = `rotateX(${rx0 + f.rx}deg) rotateY(${ry0 + f.ry}deg)`;
      if (i === fr.length - 1) return done();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  zone.classList.remove('flying');
  zone.classList.add('landed');
  $('#sparks').style.cssText = `left:${end.x}px;top:${end.y}px`;
  sfx.land();
  $('#sparks').innerHTML = Array.from({ length: 12 }, (_, i) => {
    const ang = (i / 12) * Math.PI * 2, dist = 90 + Math.random() * 90;
    return `<i class="spark" style="--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist}px;--c:${['#ffe08a', '#fff'][i % 2]}"></i>`;
  }).join('');
  await wait(700); // låt tärningen ligga en stund där den landade, flytta den sedan till vänster om spelplanen
  parkDie();
}

// ---------- Knappar högst upp ----------
const inGame = () => !['setup', 'preview'].includes(state) && !matchDone;
$('#backBtn').onclick = async () => {
  if (state === 'preview') { show('setup'); state = 'setup'; document.body.dataset.board = ''; return; } // tillbaka till spelarna
  if (inGame() && !(await confirmQuit('Fia med knuff'))) return;
  location.href = '../../index.html';
};

// Inställningar (samma som i Fyra i rad): musik, låtar, volym, ljud, berättaren, lugnt läge.
const soundIcon = () => ($('#soundBtn').innerHTML = `<svg viewBox="0 0 40 40"><path d="M6 15 H13 L22 7 V33 L13 25 H6Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>${
  ['sfx', 'music'].some(settings.get)
    ? '<path d="M27 14 Q31 20 27 26 M31 10 Q38 20 31 30" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'
    : '<path d="M28 15 L36 25 M36 15 L28 25" stroke="#ff8a80" stroke-width="3.5" stroke-linecap="round"/>'}</svg>`);
const SONG_ICON = { theme: ART.basket, walk: ART.tree, lullaby: ART.owl, fox: ART.fox };
function renderSongs() {
  $('#songList').innerHTML = Object.entries(SONGS).map(([key, s]) =>
    `<button class="song ${key === settings.get('song') ? 'on' : ''}" data-song="${key}">${SONG_ICON[key] || ''}<small>${s.name}</small></button>`).join('');
}
// Högtalaren öppnar inställningarna, och ett tryck till stänger dem. När de är öppna döljs de andra knapparna.
function closeSoundPanel() {
  $('#soundPanel').hidden = true;
  document.body.classList.remove('sound-open');
  if (!inGame()) music.play(MENU_SONG);
}
$('#soundBtn').onclick = () => {
  if (!$('#soundPanel').hidden) return closeSoundPanel();
  document.body.classList.add('sound-open');
  document.querySelectorAll('[data-pref]').forEach(cb => (cb.checked = !!settings.get(cb.dataset.pref)));
  $('#musicVol').value = settings.get('musicVol');
  renderSongs();
  $('#soundPanel').hidden = false;
};
$('#songList').onclick = e => {
  const key = e.target.closest('.song')?.dataset.song;
  if (!key) return;
  settings.set('song', key);
  if (!settings.get('music')) settings.set('music', true);
  $('#soundPanel').querySelector('[data-pref="music"]').checked = true;
  music.play(SONGS[key]); // spela direkt, så man hör hur den låter
  renderSongs();
};
$('#musicVol').oninput = e => settings.set('musicVol', +e.target.value);
$('#soundPanel').onchange = e => { settings.set(e.target.dataset.pref, e.target.checked); soundIcon(); };
$('#closeSoundBtn').onclick = closeSoundPanel;
soundIcon();

// Lugnt läge: färre rörelser.
const applyCalm = () => document.body.classList.toggle('calm', !!settings.get('calm'));
settings.onChange(key => key === 'calm' && applyCalm());
applyCalm();

// Så spelar man: öppnas av sig själv första gången, och med frågetecknet.
// En enda knapp i rubrikraden: play-ikon läser upp reglerna (voice/rules.mp3, gjord med ElevenLabs), medan det läses visas bara stopp.
const PLAY_ICON = ICONS.speaker;
const STOP_ICON = '<svg class="icon" viewBox="0 0 40 40" aria-hidden="true"><rect x="9" y="9" width="22" height="22" rx="4" fill="currentColor"/></svg>';
let reading = false;
const setReading = on => {
  reading = on;
  $('#readRulesBtn').innerHTML = on ? STOP_ICON : PLAY_ICON;
  $('#readRulesBtn').setAttribute('aria-label', on ? 'Stoppa uppläsningen' : 'Läs upp reglerna');
  $('#readRulesBtn').title = on ? 'Stoppa' : 'Läs upp';
};
const setRules = on => { $('#rules').hidden = !on; document.body.classList.toggle('rules-open', on); if (!on) { stop(); setReading(false); } };
$('#rulesBtn').onclick = () => setRules(true);
$('#closeRulesBtn').onclick = () => setRules(false);
$('#readRulesBtn').onclick = () => {
  if (reading) { stop(); return setReading(false); }
  setReading(true);
  playClip('voice/rules.mp3', $('#rulesText').innerText, undefined, 'always').then(() => setReading(false)); // klart: tillbaka till play
};
try { if (!localStorage.getItem('fia-seen')) { setRules(true); localStorage.setItem('fia-seen', '1'); } } catch {}

music.autostart(MENU_SONG);
fillIcons();
renderSetup();
