import * as F from './logic.js';
import { FIG_ART, ART } from './art.js';
import { FIGURES } from '../blabarsjakten/cards.js';
import { SONGS } from '../blabarsjakten/songs.js';
import { sfx, settings, playClip, stop } from '../../shared/audio.js';
import { avatar, robot, DEFAULT_LOOKS } from '../../shared/avatar.js';
import { confirmQuit } from '../../shared/dialog.js';
import { music } from '../../shared/music.js';
import { MENU_SONG } from '../../shared/menu-song.js';
import { ICONS, fillIcons } from '../../shared/icons.js';

const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const COLOR_NAME = { green: 'Grön', red: 'Röd', blue: 'Blå', yellow: 'Gul', white: 'Valfri rad' };
const FIG_NAME = { fox: 'Räven', owl: 'Ugglan', squirrel: 'Ekorren', hedgehog: 'Igelkotten', hare: 'Haren', bear: 'Björnen' };
const BOARDS = { blue: 'Blå', green: 'Grön', yellow: 'Gul', red: 'Röd' }; // fyra spelplaner: egen ordning på raderna och figurerna
const BOARD_SWATCH = { blue: ['#5a8fd0', '#dbe9fb'], green: ['#7fb069', '#e9f3d4'], yellow: ['#e0b040', '#fff3c4'], red: ['#d0605a', '#fbdcd8'] };
const LEVEL_NAME = { easy: 'Lätt', normal: 'Medel', hard: 'Svår' };
// Spelarnas färger är medvetet inte grön, röd, blå eller gul, så att en lagd bricka aldrig liknar en ruta.
const PLAYER_COLORS = ['#8e24aa', '#37474f'];

// ---------- Val som sparas: spelplan, datorns nivå och hur många omgångar som krävs ----------
let names = ['Spelare 1', 'Spelare 2'], looks = DEFAULT_LOOKS.map(l => ({ ...l })), bot = false, botName = 'Robo';
let board = 'blue', level = 'normal', target = 1;
try { ({ names, looks, bot, botName } = { names, looks, bot, botName, ...JSON.parse(localStorage.getItem('bbj-players') || '{}') }); } catch {}
try { ({ board, level, target } = { board, level, target, ...JSON.parse(localStorage.getItem('fyra-prefs') || '{}') }); } catch {}
const savePrefs = () => { try { localStorage.setItem('fyra-prefs', JSON.stringify({ board, level, target })); } catch {} };
const lineup = () => (bot
  ? [{ name: names[0], look: looks[0] }, { name: botName, bot: true }]
  : [0, 1].map(i => ({ name: names[i], look: looks[i] }))).map((p, i) => ({ ...p, color: PLAYER_COLORS[i] }));
const figure = (p, headOnly = true) => (p.bot ? robot(p.color, headOnly) : avatar(p.look, p.color, headOnly));

// state: setup, preview (välja spelplan), roll1 (färgtärningen), roll2 (bildtärningen), busy, place, over
let players = lineup(), cells = F.emptyBoard(), current = 0, state = 'setup', allowed = [], rolled = {};
let wins = [0, 0], starter = 0, matchDone = false; // matchDone: hela spelet är slut (då behövs ingen fråga när man går till menyn)
const layout = () => F.LAYOUTS[board];
const bothDice = () => !!settings.get('bothDice');

// ---------- 1. Välj spelare ----------
function show(id) { document.querySelectorAll('.screen').forEach(s => (s.hidden = s.id !== id)); }
$('#figures').innerHTML = Object.entries(FIGURES).map(([k, f]) => `<span style="background:${f.color}">${ART[k]}</span>`).join('');
function renderSetup() {
  $('#counts').innerHTML =
    `<button class="count ${bot ? 'on' : ''}" data-n="bot" aria-label="En spelare mot datorn">1</button>` +
    `<button class="count ${bot ? '' : 'on'}" data-n="2">2</button>`;
  $('#names').innerHTML = lineup().map((p, i) =>
    `<div class="name-row"><span class="avatar-btn" style="--c:${p.color}">${figure(p)}</span>` +
    `<input value="${esc(p.name)}" readonly aria-label="Namn på spelare ${i + 1}"></div>`).join('');
}
$('#counts').onclick = e => {
  const n = e.target.closest('.count')?.dataset.n;
  if (!n) return;
  bot = n === 'bot';
  sfx.click(); renderSetup();
};

// ---------- 2. Välj spelplan, nivå och omgångar (som "Välj bana" i Blåbärsjakten) ----------
$('#toBoardBtn').onclick = () => {
  sfx.click();
  players = lineup(); cells = F.emptyBoard(); current = 0; wins = [0, 0]; state = 'preview';
  $('#previewActions').hidden = false;
  $('#actionBtn').hidden = true;
  $('#tray').innerHTML = '';
  show('play');
  renderPicker(); renderBoard(); renderScores(); fit();
};
function renderPicker() {
  const pill = (id, label, buttons) => ($(id).innerHTML = `<span class="lbl">${label}</span>${buttons}`);
  pill('#boards', 'Bräde', Object.entries(BOARDS).map(([key, name]) =>
    `<button class="size ${key === board ? 'on' : ''}" data-board="${key}" aria-label="${name} spelplan">` +
    `<svg viewBox="0 0 40 40"><rect x="3" y="5" width="34" height="30" rx="7" fill="${BOARD_SWATCH[key][0]}"/><rect x="8" y="10" width="24" height="20" rx="4" fill="${BOARD_SWATCH[key][1]}"/></svg><small>${name}</small></button>`).join(''));
  // Datorns nivå visas bara när man spelar mot datorn.
  $('#levels').hidden = !bot;
  if (bot) pill('#levels', 'Datorn', F.LEVELS.map((lvl, i) =>
    `<button class="size level ${lvl === level ? 'on' : ''}" data-level="${lvl}" aria-label="${LEVEL_NAME[lvl]} dator"><span class="heads">${robot('#1e88e5', true).repeat(i + 1)}</span><small>${LEVEL_NAME[lvl]}</small></button>`).join(''));
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
  savePrefs(); sfx.pop(); renderPicker(); renderBoard(); renderScores(); fit();
};

// ---------- Brädet: 4 rader (färger) x 4 kolumner (figurer) ----------
function fit() { // rutorna är runda: räkna ut bredden så att hela brädet får plats (ramar och luft: 74px bredd, 104px höjd)
  const w = $('#boardWrap').getBoundingClientRect();
  const cell = Math.max(24, Math.min((w.width - 24 - 74) / 4, (w.height - 24 - 104) / 4));
  $('#board').style.setProperty('--bw', 4 * cell + 74 + 'px');
}
addEventListener('resize', () => !$('#play').hidden && fit());

function renderBoard() {
  const hint = state === 'roll2' && rolled.color !== 'white' ? rolled.color : null; // efter första kastet: raden lyser
  $('#board').innerHTML = layout().map((row, r) =>
    `<div class="band" style="--c:${F.COLOR_HEX[row.color]}">${row.figs.map((fig, c) => {
      const v = cells[r][c];
      // Lagd bricka: egen färg och form (rund eller fyrkantig) så man ser direkt vems den är.
      return `<div class="cell ${hint && hint !== row.color ? 'dim' : ''}" data-r="${r}" data-c="${c}">${FIG_ART[fig]}` +
        (v !== null ? `<span class="coin p${v}" style="--c:${players[v].color}">${figure(players[v])}</span>` : '') + '</div>';
    }).join('')}</div>`).join('');
  $('#board').classList.toggle('placing', state === 'place' || !!hint);
  if (state !== 'place') return;
  document.querySelectorAll('.cell').forEach(el => el.classList.add('dim'));
  allowed.forEach(([r, c]) => $(`.cell[data-r="${r}"][data-c="${c}"]`).classList.replace('dim', 'ok'));
}

function renderScores() {
  $('#scores').innerHTML = players.map((p, i) =>
    `<div class="chip p${i} ${i === current && !['over', 'preview'].includes(state) ? 'on' : ''}" style="--c:${p.color}">` +
    `<span class="chip-face">${figure(p)}</span><b>${esc(p.name)}</b><span class="bk">${ART.basket}</span>` +
    `<span class="num">${cells.flat().filter(v => v === i).length}</span>` +
    (target > 1 ? `<span class="wins" aria-label="Vunna omgångar">${ART.golden}${wins[i]}</span>` : '') + '</div>').join('');
}

const me = () => players[current];
const isBot = () => !['preview', 'setup'].includes(state) && me().bot;

function start() {
  sfx.good();
  music.play(SONGS[settings.get('song')] || SONGS.theme);
  $('#previewActions').hidden = true;
  $('#actionBtn').hidden = false;
  wins = [0, 0]; starter = 0; matchDone = false;
  beginRound();
}
$('#startBtn').onclick = start;
function beginRound() {
  cells = F.emptyBoard(); current = starter;
  fit();
  startTurn();
}

function startTurn() {
  state = 'roll1'; allowed = []; rolled = {};
  renderBoard(); renderScores();
  $('#tray').innerHTML = '';
  setButton();
  sfx.turn(current);
  if (isBot()) botThrow();
}
const botThrow = () => wait(1100).then(() => roll({ power: 0.35 + Math.random() * 0.5, dx: (Math.random() - 0.5) * 0.8, dy: -1 }));
const canThrow = () => state === 'roll1' || state === 'roll2';

function setButton() {
  const btn = $('#actionBtn');
  btn.disabled = !canThrow() || isBot();
  btn.className = 'btn action' + (canThrow() && !isBot() ? ' pulse throw' : '');
  btn.innerHTML = isBot() ? `${robot(me().color, true)}<span class="wait-dots"><i></i><i></i><i></i></span>`
    : canThrow() ? `<span class="throw-dice">${ICONS.dice}</span><span class="throw-hint">${ICONS.arrowUp}</span>`
    : '<span class="wait-dots"><i></i><i></i><i></i></span>';
}

// ---------- Slå tärningarna (samma kast som i Blåbärsjakten: dra uppåt och släpp) ----------
const MAX_PULL = 520;
const dieIndex = () => (state === 'roll2' ? 1 : 0); // först färgtärningen, sedan bildtärningen
let aim = null;
$('#actionBtn').addEventListener('pointerdown', e => {
  if (isBot() || !canThrow()) return;
  const r = $('#actionBtn').getBoundingClientRect();
  aim = { x: r.left + r.width / 2, y: r.top + r.height / 2, dx: 0, dy: -1, power: 0, step: 0 };
  try { $('#actionBtn').setPointerCapture(e.pointerId); } catch {}
  showDiceAt([dieIndex()], aim.x, aim.y - 10);
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
  $(DIE[dieIndex()].wrap).style.setProperty('--shake', `${1 + aim.power * 5}px`);
  const step = Math.floor(aim.power * 4);
  if (step !== aim.step) { aim.step = step; sfx.aim(step); }
}

// Texten i nedre raden: det som tärningarna har visat hittills.
const swatch = color => `<i style="--c:${F.COLOR_HEX[color]}">${color === 'white' ? WHITE_FACE : ''}</i>`;
function renderRolled(extra = '') {
  $('#tray').innerHTML = (rolled.color || rolled.fig
    ? `<div class="rolled">${rolled.color ? swatch(rolled.color) : ''}${rolled.fig ? `<i class="fig">${FIG_ART[rolled.fig]}</i>` : ''}` +
      `<span>${[rolled.color && COLOR_NAME[rolled.color], rolled.fig && FIG_NAME[rolled.fig]].filter(Boolean).join(' + ')}</span></div>` : '') + extra;
}

async function roll(t) {
  const both = bothDice(), k = state === 'roll2' ? 1 : 0;
  state = 'busy'; setButton();
  // Siffrorna är alltid slumpade och rättvisa, kastet styr bara hur tärningarna flyger.
  const ns = both ? [F.rollDie(), F.rollDie()] : [F.rollDie()];
  await throwDice(both ? [0, 1] : [k], ns, t);
  if (both) rolled = { color: F.DIE_COLOR[ns[0] - 1], fig: F.DIE_FIG[ns[1] - 1] };
  else if (k === 0) { // färgtärningen klar: nu bildtärningen
    rolled = { color: F.DIE_COLOR[ns[0] - 1] };
    state = 'roll2';
    renderBoard(); renderRolled(); setButton(); sfx.good();
    if (isBot()) botThrow();
    return;
  } else rolled.fig = F.DIE_FIG[ns[0] - 1];
  allowed = F.legalCells(cells, layout(), rolled.color, rolled.fig);
  if (!allowed.length) { // figuren finns inte kvar i raden: turen går vidare
    renderBoard(); renderRolled('<div class="rolled miss">Ingen ledig ruta. Turen går vidare.</div>'); setButton(); sfx.bad();
    await wait(2200);
    current = 1 - current;
    return startTurn();
  }
  state = 'place';
  renderBoard();
  // Kortet är bara en blåbärskorg: dra den till en ruta som lyser.
  renderRolled(isBot() ? '' : `<div class="token" id="token" aria-label="Blåbärskorg: dra till en ruta">${ART.basket}</div>`);
  setButton();
  sfx.good();
  if (isBot()) { await wait(1300); place(...F.pickCell(cells, allowed, current, level)); }
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
  renderBoard(); renderScores(); renderRolled(); setButton();
  sfx.land();
  sfx.figure(layout()[r].figs[c]); // varje figur har sitt eget lilla ljud
  const line = F.winLine(cells, r, c);
  if (line) return win(line);
  if (F.isFull(cells)) return end('draw');
  await wait(900);
  current = 1 - current;
  startTurn();
}

// ---------- Fyra i rad! En omgång vunnen, eller hela spelet ----------
async function win(line) {
  state = 'over';
  line.forEach(([r, c]) => $(`.cell[data-r="${r}"][data-c="${c}"]`).classList.add('win'));
  wins[current]++;
  renderScores();
  sfx.win();
  await wait(2000);
  end(wins[current] >= target ? 'final' : 'round');
}
// kind: 'round' (omgång klar, spelet fortsätter), 'final' (någon vann spelet), 'draw' (brädet fullt)
function end(kind) {
  matchDone = kind === 'final';
  state = 'over';
  const winner = kind === 'draw' ? null : me();
  const score = target > 1 ? ` Ställning: ${wins[0]}–${wins[1]}. Först till ${target}.` : '';
  $('#winFace').style.setProperty('--c', winner ? winner.color : '#999');
  $('#winFace').innerHTML = winner ? figure(winner) : ART.basket;
  $('#winTitle').textContent = kind === 'draw' ? 'Brädet är fullt. Lika!'
    : kind === 'final' ? `${winner.name} vann${target > 1 ? ' hela spelet' : ''}!` : `${winner.name} vann omgången!`;
  $('#winText').textContent = kind === 'draw' ? 'Ingen fick fyra i rad. Ingen får poäng, vi spelar om.' : kind === 'final' ? `Grattis!${score}` : score.trim();
  $('#nextBtn').hidden = kind === 'final';
  $('#againBtn').hidden = $('#menuBtn').hidden = kind !== 'final';
  const FLAG = ['#e53935', '#fbc02d', '#43a047', '#1e88e5', '#8e24aa', '#fb8c00'];
  $('#confetti').innerHTML = kind === 'draw' ? '' : Array.from({ length: kind === 'final' ? 28 : 12 }, (_, i) =>
    `<i style="left:${Math.random() * 100}%;background:${FLAG[i % 6]};animation-delay:${-Math.random() * 6}s;animation-duration:${4 + Math.random() * 4}s"></i>`).join('');
  $('#winPanel').hidden = false;
}
// Nästa omgång: den andra spelaren börjar.
$('#nextBtn').onclick = () => { $('#winPanel').hidden = true; sfx.click(); starter = 1 - starter; beginRound(); };
// Nytt spel: tillbaka till att välja spelplan (samma spelare).
$('#againBtn').onclick = () => { $('#winPanel').hidden = true; sfx.click(); $('#toBoardBtn').onclick(); };
$('#menuBtn').onclick = () => (location.href = '../../index.html');

// ---------- Två tärningar: färger (vitt två gånger) och figurer (sex sidor, en per figur) ----------
const FACE = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 5: [-90, 0], 2: [90, 0] };
// Vit sida: helt vit (inga prickar eller färger) = "välj själv".
const WHITE_FACE = '';
$('#cube').innerHTML = F.DIE_COLOR.map((col, i) =>
  `<div class="face fc f${i + 1}" style="--c:${F.COLOR_HEX[col]}">${col === 'white' ? WHITE_FACE : ''}</div>`).join('');
$('#cube2').innerHTML = F.DIE_FIG.map((fig, i) =>
  `<div class="face fc fig f${i + 1}" style="--c:#fbf1d9">${FIG_ART[fig]}</div>`).join('');
const DICE = 96, DT = 1 / 60;
const DIE = [{ wrap: '#diceWrap', shadow: '#diceShadow', cube: '#cube' }, { wrap: '#diceWrap2', shadow: '#diceShadow2', cube: '#cube2' }];

function showDiceAt(ks, x, y) { // bara tärningarna i ks syns
  const zone = $('#diceZone');
  zone.hidden = false;
  zone.classList.remove('landed', 'flying');
  zone.classList.add('aiming');
  DIE.forEach((d, i) => { $(d.wrap).style.display = $(d.shadow).style.display = ks.includes(i) ? '' : 'none'; });
  ks.forEach(k => placeDice(k, x, y, 0));
}
function placeDice(k, x, y, z) {
  $(DIE[k].wrap).style.transform = `translate(${x - DICE / 2}px, ${y - DICE / 2 - z}px) scale(${1 + z / 500})`;
  const sh = $(DIE[k].shadow);
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
// Vrid riktningen (och kraften) lite, så att två tärningar flyger åt olika håll.
const turn = (t, a, k = 1) => ({ ...t, power: t.power * k, dx: t.dx * Math.cos(a) - t.dy * Math.sin(a), dy: t.dx * Math.sin(a) + t.dy * Math.cos(a) });

// Kastar en tärning (ks = [k]) eller båda samtidigt (ks = [0, 1]). ns = vad de ska visa.
async function throwDice(ks, ns, t) {
  const zone = $('#diceZone');
  const btn = $('#actionBtn').getBoundingClientRect(), vp = $('#boardWrap').getBoundingClientRect();
  const box = { l: vp.left + DICE / 2, r: vp.right - DICE / 2, t: vp.top + DICE / 2, b: innerHeight - DICE / 2 };
  const x0 = t.x ?? btn.left + btn.width / 2, y0 = t.y ?? btn.top + btn.height / 2;
  showDiceAt(ks, x0, y0);
  zone.classList.remove('aiming');
  zone.classList.add('flying');
  const runs = ks.length === 1 ? [simulateThrow(x0, y0, t, box)]
    : [simulateThrow(x0, y0, turn(t, -0.2), box), simulateThrow(x0, y0, turn(t, 0.35, 0.9), box)];
  if (runs.length === 2) { // landar de på varandra: skjut isär den andra tärningen jämnt under kastet
    const a = runs[0].at(-1), b = runs[1].at(-1), d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d < DICE * 1.15) {
      const [ux, uy] = d > 1 ? [(b.x - a.x) / d, (b.y - a.y) / d] : [1, 0], push = DICE * 1.15 - d;
      runs[1] = runs[1].map((f, i, all) => ({ ...f, x: f.x + ux * push * i / all.length, y: f.y + uy * push * i / all.length }));
    }
  }
  // Siffrorna är redan slumpade: varje tärning vrids från början så att den stannar med rätt sida uppåt.
  const len = Math.max(...runs.map(r => r.length));
  const o = runs.map((fr, i) => [FACE[ns[i]][0] - fr.at(-1).rx + 360 * Math.round(Math.random() * 2), FACE[ns[i]][1] - fr.at(-1).ry + 360 * Math.round(Math.random() * 2)]);
  ks.forEach(k => ($(DIE[k].cube).style.transition = 'none'));
  sfx.whoosh(Math.max(0.15, t.power));
  await new Promise(done => {
    const t0 = performance.now();
    let shown = -1;
    const step = now => {
      const i = Math.max(0, Math.min(len - 1, Math.floor((now - t0) / 1000 / DT)));
      for (let j = shown + 1; j <= i; j++) for (const fr of runs) if (j < fr.length && fr[j].knock) sfx.knock(fr[j].knock);
      shown = i;
      runs.forEach((fr, n) => {
        const f = fr[Math.min(i, fr.length - 1)];
        placeDice(ks[n], f.x, f.y, f.z);
        $(DIE[ks[n]].cube).style.transform = `rotateX(${o[n][0] + f.rx}deg) rotateY(${o[n][1] + f.ry}deg)`;
      });
      if (i === len - 1) return done();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  zone.classList.remove('flying');
  zone.classList.add('landed');
  const last = runs[0].at(-1);
  $('#sparks').style.cssText = `left:${last.x}px;top:${last.y}px`;
  sfx.land();
  const spark = ks[0] === 0 ? F.COLOR_HEX[F.DIE_COLOR[ns[0] - 1]] : '#ffe08a';
  $('#sparks').innerHTML = Array.from({ length: 12 }, (_, i) => {
    const ang = (i / 12) * Math.PI * 2, dist = 90 + Math.random() * 90;
    return `<i class="spark" style="--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist}px;--c:${[spark, '#fff'][i % 2]}"></i>`;
  }).join('');
  await wait(1000);
  zone.hidden = true;
  zone.classList.remove('landed');
}

// ---------- Knappar högst upp ----------
const inGame = () => !['setup', 'preview'].includes(state) && !matchDone;
$('#backBtn').onclick = async () => {
  if (state === 'preview') { show('setup'); state = 'setup'; document.body.dataset.board = ''; return; } // tillbaka till spelarna
  if (inGame() && !(await confirmQuit('Fyra i rad'))) return;
  location.href = '../../index.html';
};

// Inställningar (samma som i Blåbärsjakten): musik, låtar, volym, ljud, lugnt läge. Plus: båda tärningarna samtidigt.
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

// Lugnt läge: färre rörelser. Slås på av sig självt om plattan är långsam i Blåbärsjakten.
const applyCalm = () => document.body.classList.toggle('calm', !!settings.get('calm'));
settings.onChange(key => key === 'calm' && applyCalm());
applyCalm();

// Så spelar man: öppnas av sig själv första gången, och med frågetecknet.
// En enda knapp i rubrikraden: play-ikon läser upp reglerna (voice/rules.mp3, gjord med ElevenLabs), medan det läses visas bara stopp.
// Stopp ger tillbaka play-ikonen, och play börjar om från början.
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
try { if (!localStorage.getItem('fyra-seen')) { setRules(true); localStorage.setItem('fyra-seen', '1'); } } catch {}

music.autostart(MENU_SONG);
fillIcons();
renderSetup();
