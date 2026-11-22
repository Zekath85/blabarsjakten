import * as F from './logic.js';
import { COLORS } from '../blabarsjakten/logic.js';
import { FIGURES } from '../blabarsjakten/cards.js';
import { ART } from '../blabarsjakten/art.js';
import { SONGS } from '../blabarsjakten/songs.js';
import { sfx, settings } from '../../shared/audio.js';
import { avatar, robot, DEFAULT_LOOKS } from '../../shared/avatar.js';
import { confirmQuit } from '../../shared/dialog.js';
import { music } from '../../shared/music.js';
import { MENU_SONG } from '../../shared/menu-song.js';
import { ICONS, fillIcons } from '../../shared/icons.js';

const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const COLOR_NAME = { green: 'Grön', red: 'Röd', blue: 'Blå', yellow: 'Gul', white: 'Vit: välj själv' };
const CHARS = ['fox', 'owl', 'squirrel', 'hedgehog'];

// ---------- Spelare: samma figurer och namn som i Blåbärsjakten (om man har skapat egna där) ----------
let names = ['Spelare 1', 'Spelare 2'], looks = DEFAULT_LOOKS.map(l => ({ ...l })), bot = false, botName = 'Robo';
try { ({ names, looks, bot, botName } = { names, looks, bot, botName, ...JSON.parse(localStorage.getItem('bbj-players') || '{}') }); } catch {}
const lineup = () => bot
  ? [{ name: names[0], look: looks[0] }, { name: botName, bot: true }]
  : [0, 1].map(i => ({ name: names[i], look: looks[i] }));
const figure = (p, color, headOnly = true) => (p.bot ? robot(color, headOnly) : avatar(p.look, color, headOnly));

let players, cells, current, state = 'idle', allowed = [], rolledColor = null;

// ---------- Välj spelare ----------
function show(id) { document.querySelectorAll('.screen').forEach(s => (s.hidden = s.id !== id)); }
$('#figures').innerHTML = Object.entries(FIGURES).map(([k, f]) => `<span style="background:${f.color}">${ART[k]}</span>`).join('');
function renderSetup() {
  $('#counts').innerHTML =
    `<button class="count ${bot ? 'on' : ''}" data-n="bot" aria-label="En spelare mot datorn">1</button>` +
    `<button class="count ${bot ? '' : 'on'}" data-n="2">2</button>`;
  $('#names').innerHTML = lineup().map((p, i) =>
    `<div class="name-row"><span class="avatar-btn" style="--c:${COLORS[i]}">${figure(p, COLORS[i])}</span>` +
    `<input value="${esc(p.name)}" readonly aria-label="Namn på spelare ${i + 1}"></div>`).join('');
}
$('#counts').onclick = e => {
  const n = e.target.closest('.count')?.dataset.n;
  if (!n) return;
  bot = n === 'bot';
  sfx.click(); renderSetup();
};

// ---------- Brädet ----------
function fit() { // rutorna är runda: räkna ut bredden så att hela brädet (4 x 5 rutor) får plats i höjden
  const w = $('#boardWrap').getBoundingClientRect();
  const h = Math.min(w.height - 24, (w.width - 24) * 1.2); // ramar och luft ingår: 80px höjd, 44px bredd, 16px per kolumn
  const cell = Math.max(24, (h - 80) / 5);
  $('#board').style.setProperty('--bw', 4 * (cell + 16) + 44 + 'px');
}
addEventListener('resize', () => !$('#play').hidden && fit());

function renderBoard() {
  $('#board').innerHTML = F.COLS.map((col, c) =>
    `<div class="col" data-c="${c}" style="--c:${F.COLOR_HEX[col]}">${cells.map((row, r) => {
      const v = row[c], p = players[v];
      return `<div class="cell" data-r="${r}" data-c="${c}">${ART[CHARS[(r + 2 * c) % 4]]}` +
        (p ? `<span class="coin" style="--c:${p.color}">${figure(p, p.color)}</span>` : '') + '</div>';
    }).join('')}</div>`).join('');
  // Lediga rutor lyser medan man väljer plats.
  $('#board').classList.toggle('placing', state === 'place');
  document.querySelectorAll('.col').forEach(el => el.classList.toggle('dim', state === 'place' && !allowed.some(([, c]) => c === +el.dataset.c)));
  if (state === 'place') allowed.forEach(([r, c]) => $(`.cell[data-r="${r}"][data-c="${c}"]`).classList.add('ok'));
}

function renderScores() {
  $('#scores').innerHTML = players.map((p, i) =>
    `<div class="chip ${i === current && state !== 'over' ? 'on' : ''}" style="--c:${p.color}">` +
    `<span class="chip-face">${figure(p, p.color)}</span><b>${esc(p.name)}</b><span class="bk">${ART.basket}</span>` +
    `<span class="num">${cells.flat().filter(v => v === i).length}</span></div>`).join('');
}

const me = () => players[current];
const isBot = () => players && me().bot;

function start() {
  sfx.good();
  music.play(SONGS[settings.get('song')] || SONGS.theme);
  players = lineup().map((p, i) => ({ ...p, color: COLORS[i] }));
  cells = F.emptyBoard();
  current = 0;
  show('play');
  fit();
  startTurn();
}
$('#startBtn').onclick = start;

function startTurn() {
  state = 'roll'; allowed = []; rolledColor = null;
  renderBoard(); renderScores();
  $('#tray').innerHTML = '';
  setButton();
  sfx.turn(current);
  if (isBot()) wait(1100).then(() => roll({ power: 0.35 + Math.random() * 0.5, dx: (Math.random() - 0.5) * 0.8, dy: -1 }));
}

function setButton() {
  const btn = $('#actionBtn');
  btn.disabled = state !== 'roll' || isBot();
  btn.className = 'btn action' + (state === 'roll' && !isBot() ? ' pulse throw' : '');
  btn.innerHTML = isBot() ? `${robot(me().color, true)}<span class="wait-dots"><i></i><i></i><i></i></span>`
    : state === 'roll' ? `<span class="throw-dice">${ICONS.dice}</span><span class="throw-hint">${ICONS.arrowUp}</span>`
    : '<span class="wait-dots"><i></i><i></i><i></i></span>';
}

// ---------- Slå tärningen (samma kast som i Blåbärsjakten: dra uppåt och släpp) ----------
const MAX_PULL = 520;
let aim = null;
$('#actionBtn').addEventListener('pointerdown', e => {
  if (isBot() || state !== 'roll') return;
  const r = $('#actionBtn').getBoundingClientRect();
  aim = { x: r.left + r.width / 2, y: r.top + r.height / 2, dx: 0, dy: -1, power: 0, step: 0 };
  try { $('#actionBtn').setPointerCapture(e.pointerId); } catch {}
  showDiceAt(aim.x, aim.y - 10);
  $('#aim').removeAttribute('hidden');
  updateAim(e);
});
$('#actionBtn').addEventListener('pointermove', e => aim && updateAim(e));
$('#actionBtn').addEventListener('pointerup', e => {
  if (!aim) return;
  updateAim(e);
  const a = aim; aim = null;
  $('#aim').setAttribute('hidden', '');
  const tap = a.power < 0.08; // ett snabbt tryck = lagom kast
  roll(tap ? { power: 0.5, dx: (Math.random() - 0.5) * 0.4, dy: -1, x: a.x, y: a.y } : { power: a.power, dx: a.dx, dy: a.dy, x: a.x, y: a.y });
});
$('#actionBtn').addEventListener('pointercancel', () => { aim = null; $('#aim').setAttribute('hidden', ''); $('#diceZone').hidden = true; });

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
  state = 'busy'; setButton();
  const n = F.rollDie(); // alltid slumpat och rättvist, kastet styr bara hur tärningen flyger
  await throwDice(n, t);
  rolledColor = F.DIE[n - 1];
  allowed = F.legalCells(cells, rolledColor);
  state = 'place';
  renderBoard();
  const col = F.COLS.indexOf(rolledColor);
  const full = rolledColor !== 'white' && allowed.some(([, c]) => c !== col); // kolumnen är full: välj fritt
  const swatch = rolledColor === 'white' ? WHITE_FACE : '';
  $('#tray').innerHTML = `<div class="rolled" style="--c:${F.COLOR_HEX[rolledColor]}"><i>${swatch}</i>${full ? 'Full! Välj fritt' : COLOR_NAME[rolledColor]}${isBot() ? '' : ': dra korgen till en ruta som lyser'}</div>` +
    (isBot() ? '' : `<div class="token" id="token" style="--c:${me().color}"><span class="tk">${figure(me(), me().color)}</span><span class="bs">${ART.basket}</span></div>`);
  setButton();
  sfx.good();
  if (isBot()) { await wait(1300); place(...botPick()); }
}

// Datorn: vinn om den kan, stoppa annars motståndaren, annars en ruta nära mitten.
function botPick() {
  const wins = who => allowed.find(([r, c]) => { cells[r][c] = who; const w = F.winLine(cells, r, c); cells[r][c] = null; return w; });
  const mid = ([r, c]) => Math.abs(r - 2) + Math.abs(c - 1.5) + Math.random() * 2;
  return wins(current) || wins(1 - current) || [...allowed].sort((a, b) => mid(a) - mid(b))[0];
}

// ---------- Lägga korgen: dra den till en ruta, eller tryck på rutan ----------
$('#board').addEventListener('click', e => {
  const cell = e.target.closest('.cell.ok');
  if (cell && state === 'place' && !isBot()) place(+cell.dataset.r, +cell.dataset.c);
});
let ghost = null;
$('#tray').addEventListener('pointerdown', e => {
  const tok = e.target.closest('.token');
  if (!tok || state !== 'place' || isBot()) return;
  ghost = tok.cloneNode(true);
  ghost.removeAttribute('id');
  ghost.classList.add('ghost');
  document.body.append(ghost);
  tok.classList.add('used');
  moveGhost(e);
  sfx.pop();
});
const cellAt = e => document.elementFromPoint(e.clientX, e.clientY)?.closest('.cell.ok');
function moveGhost(e) {
  ghost.style.left = e.clientX + 'px';
  ghost.style.top = e.clientY + 'px';
  document.querySelectorAll('.cell.over').forEach(c => c.classList.remove('over'));
  cellAt(e)?.classList.add('over');
}
addEventListener('pointermove', e => ghost && moveGhost(e));
addEventListener('pointerup', e => {
  if (!ghost) return;
  const cell = cellAt(e);
  ghost.remove(); ghost = null;
  document.querySelectorAll('.cell.over').forEach(c => c.classList.remove('over'));
  if (cell) place(+cell.dataset.r, +cell.dataset.c);
  else $('#token')?.classList.remove('used'); // släpptes utanför: korgen går tillbaka
});

async function place(r, c) {
  if (state !== 'place') return;
  state = 'busy';
  cells[r][c] = current;
  allowed = [];
  $('#tray').innerHTML = '';
  renderBoard(); renderScores(); setButton();
  sfx.land();
  const line = F.winLine(cells, r, c);
  if (line) return win(line);
  if (F.isFull(cells)) return end(null);
  await wait(900);
  current = 1 - current;
  startTurn();
}

// ---------- Fyra i rad! ----------
async function win(line) {
  state = 'over';
  line.forEach(([r, c]) => $(`.cell[data-r="${r}"][data-c="${c}"]`).classList.add('win'));
  renderScores();
  sfx.win();
  await wait(2000);
  end(me());
}
function end(winner) {
  state = 'over';
  $('#winFace').style.setProperty('--c', winner ? winner.color : '#999');
  $('#winFace').innerHTML = winner ? figure(winner, winner.color) : ART.basket;
  $('#winTitle').textContent = winner ? `${winner.name} fick fyra i rad!` : 'Brädet är fullt. Lika!';
  $('#winText').textContent = winner ? 'Grattis!' : 'Ingen fick fyra i rad den här gången.';
  const FLAG = ['#e53935', '#fbc02d', '#43a047', '#1e88e5', '#8e24aa', '#fb8c00'];
  $('#confetti').innerHTML = winner ? Array.from({ length: 28 }, (_, i) =>
    `<i style="left:${Math.random() * 100}%;background:${FLAG[i % 6]};animation-delay:${-Math.random() * 6}s;animation-duration:${4 + Math.random() * 4}s"></i>`).join('') : '';
  $('#winPanel').hidden = false;
}
$('#againBtn').onclick = () => { $('#winPanel').hidden = true; sfx.click(); start(); };
$('#menuBtn').onclick = () => (location.href = '../../index.html');

// ---------- Tärning: sex sidor, fyra färger och vitt två gånger ----------
const FACE = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 5: [-90, 0], 2: [90, 0] };
// Vit sida: fyra små färger = "välj själv".
const WHITE_FACE = `<svg viewBox="0 0 40 40"><circle cx="13" cy="13" r="6" fill="#e53935"/><circle cx="27" cy="13" r="6" fill="#fbc02d"/><circle cx="13" cy="27" r="6" fill="#43a047"/><circle cx="27" cy="27" r="6" fill="#1e88e5"/></svg>`;
$('#cube').innerHTML = F.DIE.map((col, i) =>
  `<div class="face fc f${i + 1}" style="--c:${F.COLOR_HEX[col]}">${col === 'white' ? WHITE_FACE : ''}</div>`).join('');
const DICE = 96, DT = 1 / 60;

function showDiceAt(x, y) {
  const zone = $('#diceZone');
  zone.hidden = false;
  zone.classList.remove('landed', 'flying');
  zone.classList.add('aiming');
  placeDice(x, y, 0);
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
  return { frames, power: p };
}

async function throwDice(n, t) {
  const zone = $('#diceZone'), cube = $('#cube');
  const btn = $('#actionBtn').getBoundingClientRect(), vp = $('#boardWrap').getBoundingClientRect();
  const box = { l: vp.left + DICE / 2, r: vp.right - DICE / 2, t: vp.top + DICE / 2, b: innerHeight - DICE / 2 };
  const x0 = t.x ?? btn.left + btn.width / 2, y0 = t.y ?? btn.top + btn.height / 2;
  showDiceAt(x0, y0);
  zone.classList.remove('aiming');
  zone.classList.add('flying');
  // Siffran n är redan slumpad. Vi vet hur långt tärningen rullar, så den vrids från början och stannar med rätt sida uppåt.
  const { frames, power } = simulateThrow(x0, y0, t, box);
  const last = frames.at(-1);
  const rx0 = FACE[n][0] - last.rx + 360 * Math.round(Math.random() * 2);
  const ry0 = FACE[n][1] - last.ry + 360 * Math.round(Math.random() * 2);
  cube.style.transition = 'none';
  sfx.whoosh(power);
  await new Promise(done => {
    const t0 = performance.now();
    let shown = -1;
    const step = now => {
      const i = Math.max(0, Math.min(frames.length - 1, Math.floor((now - t0) / 1000 / DT)));
      for (let k = shown + 1; k <= i; k++) if (frames[k].knock) sfx.knock(frames[k].knock);
      shown = i;
      const f = frames[i];
      placeDice(f.x, f.y, f.z);
      cube.style.transform = `rotateX(${rx0 + f.rx}deg) rotateY(${ry0 + f.ry}deg)`;
      if (i === frames.length - 1) return done();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  zone.classList.remove('flying');
  zone.classList.add('landed');
  $('#sparks').style.cssText = `left:${last.x}px;top:${last.y}px`;
  sfx.land();
  $('#sparks').innerHTML = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2, d = 90 + Math.random() * 90;
    return `<i class="spark" style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--c:${[F.COLOR_HEX[F.DIE[n - 1]], '#fff'][i % 2]}"></i>`;
  }).join('');
  await wait(1000);
  zone.hidden = true;
  zone.classList.remove('landed');
}

// ---------- Knappar högst upp ----------
$('#backBtn').onclick = async () => {
  if (players && state !== 'over' && !(await confirmQuit('Fyra i rad'))) return;
  location.href = '../../index.html';
};
const soundIcon = () => ($('#soundBtn').innerHTML = `<svg viewBox="0 0 40 40"><path d="M6 15 H13 L22 7 V33 L13 25 H6Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>${
  settings.get('sfx')
    ? '<path d="M27 14 Q31 20 27 26 M31 10 Q38 20 31 30" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'
    : '<path d="M28 15 L36 25 M36 15 L28 25" stroke="#ff8a80" stroke-width="3.5" stroke-linecap="round"/>'}</svg>`);
// ponytail: ett tryck slår av/på musik och ljud tillsammans. Egen ljudpanel som i Blåbärsjakten om det behövs.
$('#soundBtn').onclick = () => {
  const on = !settings.get('sfx');
  settings.set('sfx', on); settings.set('music', on);
  if (on && !music.playing) music.play(players ? SONGS[settings.get('song')] || SONGS.theme : MENU_SONG);
  soundIcon();
};
soundIcon();
$('#rulesBtn').onclick = () => ($('#rules').hidden = false);
$('#closeRulesBtn').onclick = () => ($('#rules').hidden = true);

music.autostart(MENU_SONG);
fillIcons();
renderSetup();
