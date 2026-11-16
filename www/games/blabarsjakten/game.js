import * as L from './logic.js';
import { FIGURES, DECKS } from './cards.js';
import { ART, puzzlePath } from './art.js';
import { speak, stop, playClip, sfx, settings } from '../../shared/audio.js';
import { avatar, OPTIONS, DEFAULT_LOOKS } from '../../shared/avatar.js';

// Inspelad röst för kortet (filer från "npm run voices").
const readCard = kind => playClip(`voice/${card.deck}-${DECKS[card.deck].indexOf(card)}.mp3`, card.text, FIGURES[card.deck].voice, kind);

const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const CELL = 90, W = L.GRID * CELL;
const NUM = ['ett', 'två', 'tre', 'fyra', 'fem', 'sex'];
const MEDAL = ['🥇', '🥈', '🥉', '🏅'];
const OFFSET = [[-18, -14], [18, -14], [-18, 12], [18, 12]];
const korg = n => `${n} ${n === 1 ? 'korg' : 'korgar'}`;

let names = ['Spelare 1', 'Spelare 2', 'Spelare 3', 'Spelare 4'];
let looks = DEFAULT_LOOKS.map(l => ({ ...l }));
let count = 2;
// Kom ihåg namn och figurer till nästa gång.
try { ({ names, looks, count } = { names, looks, count, ...JSON.parse(localStorage.getItem('bbj-players') || '{}') }); } catch {}
const savePlayers = () => { try { localStorage.setItem('bbj-players', JSON.stringify({ names, looks, count })); } catch {} };
let board, game, state = 'idle', drawDeck = null, card = null, lastCam = null;
const shown = []; // korgar som visas i topplisten, för att se ändringar

// ---------- Skärmar ----------
function show(id) { document.querySelectorAll('.screen').forEach(s => (s.hidden = s.id !== id)); }

// ---------- Välj spelare ----------
$('#figures').innerHTML = Object.entries(FIGURES).map(([k, f]) => `<span style="background:${f.color}">${ART[k]}</span>`).join('');

function renderSetup() {
  $('#counts').innerHTML = [2, 3, 4].map(n => `<button class="count ${n === count ? 'on' : ''}" data-n="${n}">${n}</button>`).join('');
  $('#names').innerHTML = names.slice(0, count).map((nm, i) =>
    `<div class="name-row"><button class="avatar-btn" data-i="${i}" style="--c:${L.COLORS[i]}" aria-label="Ändra figur">${avatar(looks[i], L.COLORS[i], true)}</button>` +
    `<input value="${esc(nm)}" data-i="${i}" maxlength="14" readonly aria-label="Namn på spelare ${i + 1}">` +
    `<button class="pen" data-i="${i}" aria-label="Ändra namn">✏️</button></div>`).join('');
}
$('#counts').onclick = e => {
  const n = +e.target.dataset.n;
  if (n) { count = n; sfx.click(); savePlayers(); renderSetup(); }
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
  const i = +e.target.dataset.i;
  if (e.target.tagName !== 'INPUT') return;
  names[i] = e.target.value.trim() || `Spelare ${i + 1}`;
  e.target.value = names[i];
  e.target.readOnly = true;
  savePlayers();
});

// ---------- Figurskapare: Tjej/Kille + fyra val med tre alternativ var ----------
let lookIndex = 0;
function openLook(i) {
  lookIndex = i;
  sfx.click();
  renderLook();
  $('#lookPanel').hidden = false;
}
function renderLook() {
  const i = lookIndex, look = looks[i], color = L.COLORS[i];
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
$('#names').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

$('#toBoardBtn').onclick = () => {
  sfx.click();
  show('play');
  newBoard();
  speak('Här är spelplanen. Vill du ha en ny bana, eller ska vi starta?');
};

// ---------- Spelplanen ----------
function dirTo(a, b) {
  if (!b) return -1;
  return b.x > a.x ? 1 : b.x < a.x ? 3 : b.y > a.y ? 2 : 0;
}

function tileIcon(t) {
  if (FIGURES[t.type]) return `<div class="ico fig" style="--c:${FIGURES[t.type].color}">${ART[t.type]}</div>`;
  if (t.type === 'berry') return `<div class="ico">${ART.basket}</div><span class="val">${t.value}</span>`;
  if (t.type === 'start') return `<div class="ico disc">START</div>`;
  if (t.type === 'goal') return `<div class="ico disc">MÅL</div>`;
  return `<div class="ico leaf">${ART.leaf}</div>`;
}

function newBoard() {
  board = L.makeBoard();
  const used = new Set(board.map(t => t.y * L.GRID + t.x));
  let deco = '';
  for (let y = 0; y < L.GRID; y++)
    for (let x = 0; x < L.GRID; x++)
      if (!used.has(y * L.GRID + x) && Math.random() < 0.28) {
        const art = ['tree', 'tree', 'bush', 'flower'][Math.floor(Math.random() * 4)];
        deco += `<div class="deco" style="left:${x * CELL}px;top:${y * CELL}px">${ART[art]}</div>`;
      }
  const shapes = board.map((t, i) => puzzlePath(dirTo(t, board[i + 1]), dirTo(t, board[i - 1])));
  const at = t => `left:${t.x * CELL}px;top:${t.y * CELL}px`;
  // Undre lager: skugga och tjock kant för alla bitar, så ingen kant hamnar ovanpå en annan bits ovansida.
  const bases = board.map((t, i) =>
    `<div class="tile" style="${at(t)}"><svg class="piece base" viewBox="-20 -20 140 140">` +
    `<path class="shadow" d="${shapes[i]}"/><path class="side" d="${shapes[i]}"/></svg></div>`).join('');
  const tiles = board.map((t, i) =>
    `<div class="tile t-${t.type}" id="tile${i}" style="${at(t)}">` +
    `<svg class="piece" viewBox="-20 -20 140 140"><path class="top" d="${shapes[i]}"/><path class="shine" d="${shapes[i]}"/></svg>` +
    `${tileIcon(t)}</div>`).join('');
  const world = $('#world');
  world.style.width = world.style.height = W + 'px';
  world.innerHTML = deco + bases + tiles + '<div id="pawns"></div>';
  $('#scores').innerHTML = '';
  $('#piles').innerHTML = '';
  $('#previewActions').hidden = false;
  $('#actionBtn').hidden = true;
  $('#hint').hidden = true;
  game = null;
  overview();
}

function camera(x, y, zoom) {
  lastCam = [x, y, zoom];
  const vp = $('#viewport');
  const vw = vp.clientWidth, vh = vp.clientHeight;
  const fit = Math.min(vw, vh) / W * 0.96;
  // inzoomat: planen fyller hela rutan, och kameran stannar vid kanterna
  const s = zoom ? Math.max(fit * 2, vw / W, vh / W) : fit;
  const fitAxis = (c, v) => (W * s > v ? Math.min(0, Math.max(v - W * s, v / 2 - c * s)) : v / 2 - c * s);
  $('#world').style.transform = `translate(${fitAxis(x, vw)}px, ${fitAxis(y, vh)}px) scale(${s})`;
}
const overview = () => camera(W / 2, W / 2, false);
const focusTile = pos => camera(board[pos].x * CELL + CELL / 2, board[pos].y * CELL + CELL / 2, true);
addEventListener('resize', () => lastCam && camera(...lastCam));

$('#newBoardBtn').onclick = () => { sfx.pop(); newBoard(); };
$('#startBtn').onclick = startGame;

// ---------- Spelet ----------
function startGame() {
  sfx.good();
  game = L.createGame(names.slice(0, count), board);
  shown.length = 0;
  game.players.forEach(p => shown.push(p.baskets));
  game.players.forEach((p, i) => (p.look = looks[i]));
  $('#pawns').innerHTML = game.players.map((p, i) =>
    `<div class="pawn" id="pawn${i}" style="--c:${p.color}"><span class="shadow"></span><div class="hop">${avatar(p.look, p.color)}</div>` +
    `<span class="tag">${esc(p.name)}</span></div>`).join('');
  game.players.forEach((_, i) => placePawn(i));
  $('#piles').innerHTML = Object.entries(FIGURES).map(([k, f]) =>
    `<button class="pile" data-deck="${k}" style="--c:${f.color}" aria-label="${f.kind}">${ART[k]}</button>`).join('');
  $('#previewActions').hidden = true;
  $('#actionBtn').hidden = false;
  startTurn();
}

const me = () => L.currentPlayer(game);

function placePawn(i) {
  game.players.forEach((p, j) =>
    $(`#pawn${j}`)?.classList.toggle('crowded', game.players.some((q, k) => k !== j && q.pos === p.pos)));
  const t = board[game.players[i].pos], [ox, oy] = OFFSET[i];
  $(`#pawn${i}`).style.transform = `translate(${t.x * CELL + CELL / 2 - 28 + ox}px, ${t.y * CELL + CELL / 2 - 52 + oy}px)`;
}

function renderScores() {
  $('#scores').innerHTML = game.players.map((p, i) =>
    `<div class="chip ${i === game.current && !game.over ? 'on' : ''} ${p.place ? 'done' : ''}" style="--c:${p.color}">` +
    `<span class="chip-face">${avatar(p.look, p.color, true)}</span><b>${esc(p.name)}</b><span class="bk">${ART.basket}</span>` +
    `<span class="num" id="num${i}">${p.baskets}</span>${p.place ? `<span>${MEDAL[p.place - 1]}</span>` : ''}</div>`).join('');
  game.players.forEach((p, i) => {
    const diff = p.baskets - shown[i];
    if (!diff) return;
    const num = $(`#num${i}`);
    num.classList.add(diff > 0 ? 'up' : 'down');
    const r = num.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = `float ${diff > 0 ? 'plus' : 'minus'}`;
    f.textContent = (diff > 0 ? '+' : '') + diff;
    f.style.left = r.left + r.width / 2 + 'px';
    f.style.top = r.bottom + 'px';
    document.body.append(f);
    setTimeout(() => f.remove(), 1500);
    shown[i] = p.baskets;
  });
  document.querySelectorAll('.pawn').forEach((el, i) => el.classList.toggle('me', i === game.current && !game.over));
}

function setState(s, deck = null) {
  state = s;
  drawDeck = deck;
  const btn = $('#actionBtn');
  btn.disabled = s === 'busy';
  btn.className = 'btn action' + (s === 'busy' ? '' : ' pulse') + (s === 'draw' ? ' draw' : '');
  btn.style.removeProperty('--c');
  document.querySelectorAll('.pile').forEach(p => p.classList.toggle('glow', p.dataset.deck === deck));
  document.querySelectorAll('.tile.lit').forEach(t => t.classList.remove('lit'));
  if (s === 'roll') btn.innerHTML = `${diceIcon()} Slå tärningen!`;
  if (s === 'busy') btn.innerHTML = 'Vänta…';
  if (s === 'draw') {
    btn.style.setProperty('--c', FIGURES[deck].color);
    btn.innerHTML = `${ART[deck]} Dra kort!`;
    $(`#tile${me().pos}`).classList.add('lit');
  }
}
const diceIcon = () => `<svg viewBox="0 0 40 40"><rect x="4" y="4" width="32" height="32" rx="8" fill="#fff" stroke="#4a2a00" stroke-width="3"/><circle cx="13" cy="13" r="3.5" fill="#4a2a00"/><circle cx="20" cy="20" r="3.5" fill="#4a2a00"/><circle cx="27" cy="27" r="3.5" fill="#4a2a00"/></svg>`;

function startTurn() {
  renderScores();
  focusTile(me().pos);
  setState('roll');
  speak(`Din tur, ${me().name}!`);
}

$('#actionBtn').onclick = () => {
  if (state === 'roll') roll();
  else if (state === 'draw') drawFrom(drawDeck);
};
$('#piles').onclick = e => {
  const pile = e.target.closest('.pile');
  if (pile && state === 'draw' && pile.dataset.deck === drawDeck) drawFrom(drawDeck);
};

async function roll() {
  setState('busy');
  const n = L.rollDie();
  await rollDice(n);
  await walk(n);
  await onLand();
}

async function walk(steps) {
  const i = game.current;
  for (const pos of L.move(game, steps)) {
    game.players[i].pos = pos; // flytta pjäsen ruta för ruta i bild
    placePawn(i);
    const hop = $(`#pawn${i} .hop`);
    hop.classList.remove('go');
    void hop.offsetWidth; // starta om hopp-animationen
    hop.classList.add('go');
    focusTile(pos);
    sfx.hop();
    await wait(340);
  }
}

async function onLand() {
  const r = L.land(game);
  renderScores();
  if (r.type === 'goal') return finish(r);
  if (r.type === 'berry') {
    sfx.good();
    speak(`Blåbär! Du får ${korg(r.gained)}.`);
    await wait(1800);
    return endTurn();
  }
  if (FIGURES[r.type]) {
    setState('draw', r.type);
    speak(`${FIGURES[r.type].name}! Tryck och dra ett kort.`);
    return;
  }
  await wait(500);
  endTurn();
}

function endTurn() {
  L.nextTurn(game);
  if (game.over) return showPodium();
  startTurn();
}

// ---------- Tärning ----------
const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const FACE = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 5: [-90, 0], 2: [90, 0] };
$('#cube').innerHTML = [1, 2, 3, 4, 5, 6].map(n =>
  `<div class="face f${n}">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => (PIPS[n].includes(c) ? `<i style="grid-area:${Math.ceil(c / 3)}/${(c - 1) % 3 + 1}"></i>` : '')).join('')}</div>`).join('');
let spinX = 0, spinY = 0;

async function rollDice(n) {
  const zone = $('#diceZone'), cube = $('#cube');
  zone.classList.remove('landed');
  zone.hidden = false;
  sfx.roll();
  spinX += 360 * (2 + Math.floor(Math.random() * 2));
  spinY += 360 * (2 + Math.floor(Math.random() * 2));
  void cube.offsetWidth;
  cube.style.transform = `rotateX(${spinX + FACE[n][0]}deg) rotateY(${spinY + FACE[n][1]}deg)`;
  await wait(1200);
  $('#diceNum').textContent = n;
  zone.classList.add('landed');
  sfx.land();
  if (n === 6) sfx.six();
  burst(n === 6 ? 26 : 12, n === 6 ? ['#ffe08a', '#fff', '#ffd54f', '#b2ff59'] : [me().color, '#fff']);
  speak(NUM[n - 1][0].toUpperCase() + NUM[n - 1].slice(1) + '!');
  await wait(1100);
  zone.hidden = true;
}

function burst(n, colors) {
  const box = $('#sparks');
  box.innerHTML = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, d = 90 + Math.random() * 90;
    return `<i class="spark" style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--c:${colors[i % colors.length]}"></i>`;
  }).join('');
}

// ---------- Kort ----------
function drawFrom(deck) {
  setState('busy');
  card = L.drawCard(game, deck);
  const f = FIGURES[deck];
  const ov = $('#cardOverlay');
  ov.style.setProperty('--c', f.color);
  $('#cardBack').innerHTML = ART[deck];
  $('#cardFront').innerHTML = `<div class="head"><span>${ART[deck]}</span><b>${f.name}</b></div><p>${card.text}</p>`;
  $('#cardButtons').hidden = true;
  const c3 = $('#card3d');
  c3.classList.remove('flip');
  ov.hidden = false;
  // starta om "kortet flyger in"
  c3.style.animation = 'none'; void c3.offsetWidth; c3.style.animation = '';
  sfx.card();
  setTimeout(() => {
    c3.classList.add('flip');
    sfx.pop();
    setTimeout(() => {
      $('#cardButtons').hidden = false;
      readCard('cards');
    }, 500);
  }, 900);
  card.deck = deck;
}

$('#cardSpeakBtn').onclick = () => readCard('always');
$('#cardOkBtn').onclick = async () => {
  $('#cardOverlay').hidden = true;
  const before = me().baskets;
  const r = L.applyCard(game, card);
  renderScores();
  const after = me().baskets;
  if (after > before) sfx.good();
  if (after < before) sfx.bad();
  if (r.steps) {
    await wait(400);
    await walk(r.steps);
    if (board[me().pos].type === 'goal') return finish(L.land(game));
  }
  if (r.again) {
    await wait(300);
    setState('roll');
    speak('Slå igen!');
    return;
  }
  await wait(900);
  endTurn();
};

// ---------- Mål ----------
async function finish(r) {
  renderScores();
  sfx.win();
  fireworks(3800);
  speak(`Hurra! ${me().name} gick i mål som nummer ${NUM[r.place - 1]} och får ${korg(r.bonus)}!`);
  await wait(4200);
  endTurn();
}

function fireworks(ms) {
  const cv = $('#fx'), g = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight; cv.hidden = false;
  const parts = [], t0 = performance.now(), COL = ['#ffe08a', '#ff6e6e', '#8fd3ff', '#b2ff59', '#e1a6ff', '#fff'];
  let last = 0;
  const frame = t => {
    if (t - last > 420 && t - t0 < ms - 900) {
      last = t;
      sfx.pop();
      const x = cv.width * (0.15 + Math.random() * 0.7), y = cv.height * (0.15 + Math.random() * 0.35), col = COL[Math.floor(Math.random() * COL.length)];
      for (let i = 0; i < 46; i++) {
        const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 4.5;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, col });
      }
    }
    g.clearRect(0, 0, cv.width, cv.height);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += 0.07; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.life -= 0.013;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      g.globalAlpha = p.life;
      g.fillStyle = p.col;
      g.fillRect(p.x, p.y, 5, 5);
    }
    if (t - t0 < ms || parts.length) requestAnimationFrame(frame);
    else cv.hidden = true;
  };
  requestAnimationFrame(frame);
}

// ---------- Prispall ----------
function showPodium() {
  renderScores();
  const list = L.ranking(game);
  const order = [list[1], list[0], list[2], list[3]].filter(Boolean); // tvåan, ettan, trean, fyran
  $('#podiumList').innerHTML = order.map(({ player: p, rank }) =>
    `<div class="step rank${rank}"><span class="pawn-big">${avatar(p.look, p.color)}</span><b>${esc(p.name)}</b>` +
    `<span class="score">${ART.basket}${p.baskets}</span><div class="block">${rank}</div></div>`).join('');
  $('#podium').hidden = false;
  fireworks(5000);
  sfx.win();
  const winners = list.filter(r => r.rank === 1).map(r => r.player.name);
  speak(winners.length > 1
    ? `Det blev lika! Grattis ${winners.join(' och ')}!`
    : `Grattis ${winners[0]}! Du vann med ${korg(list[0].player.baskets)}!`);
}
$('#againBtn').onclick = () => { $('#podium').hidden = true; renderSetup(); show('setup'); };
$('#menuBtn').onclick = () => (location.href = '../../index.html');

// ---------- Knappar högst upp ----------
$('#backBtn').onclick = () => {
  if (game && !game.over && !confirm('Vill du sluta spelet och gå till menyn?')) return;
  location.href = '../../index.html';
};
const soundIcon = () => ($('#soundBtn').textContent = ['cards', 'narrator', 'sfx'].some(settings.get) ? '🔊' : '🔇');
$('#soundBtn').onclick = () => {
  document.querySelectorAll('[data-pref]').forEach(cb => (cb.checked = settings.get(cb.dataset.pref)));
  $('#soundPanel').hidden = false;
};
$('#soundPanel').onchange = e => { settings.set(e.target.dataset.pref, e.target.checked); soundIcon(); };
$('#closeSoundBtn').onclick = () => ($('#soundPanel').hidden = true);
soundIcon();
$('#rulesBtn').onclick = () => ($('#rules').hidden = false);
$('#closeRulesBtn').onclick = () => { $('#rules').hidden = true; stop(); };
$('#readRulesBtn').onclick = () => playClip('voice/rules.mp3', $('#rulesText').innerText, undefined, 'always');

renderSetup();
