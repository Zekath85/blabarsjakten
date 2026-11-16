import * as L from './logic.js';
import { FIGURES, DECKS } from './cards.js';
import { ART, puzzlePath, SEASONS } from './art.js';
import { speak, stop, playClip, sfx, settings } from '../../shared/audio.js';
import { avatar, robot, OPTIONS, DEFAULT_LOOKS } from '../../shared/avatar.js';

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
let bot = false, botName = 'Robo'; // bot: en spelare mot datorn
// Kom ihåg namn och figurer till nästa gång.
try { ({ names, looks, count, bot, botName } = { names, looks, count, bot, botName, ...JSON.parse(localStorage.getItem('bbj-players') || '{}') }); } catch {}
const savePlayers = () => { try { localStorage.setItem('bbj-players', JSON.stringify({ names, looks, count, bot, botName })); } catch {} };
// Vilka som spelar: antingen 2–4 personer, eller en person + datorn.
const lineup = () => bot
  ? [{ name: names[0], look: looks[0] }, { name: botName, bot: true }]
  : names.slice(0, count).map((name, i) => ({ name, look: looks[i] }));
// Figur för en spelare: barnet man skapat, eller roboten.
const figure = (p, color, headOnly = false) => (p.bot ? robot(color, headOnly) : avatar(p.look, color, headOnly));
let board, game, state = 'idle', drawDeck = null, card = null, lastCam = null;
const shown = []; // korgar som visas i topplisten, för att se ändringar

// ---------- Skärmar ----------
function show(id) { document.querySelectorAll('.screen').forEach(s => (s.hidden = s.id !== id)); }

// ---------- Välj spelare ----------
$('#figures').innerHTML = Object.entries(FIGURES).map(([k, f]) => `<span style="background:${f.color}">${ART[k]}</span>`).join('');

function renderSetup() {
  $('#counts').innerHTML =
    `<button class="count bot ${bot ? 'on' : ''}" data-n="bot" aria-label="En spelare mot datorn">1+${robot('#1e88e5', true)}</button>` +
    [2, 3, 4].map(n => `<button class="count ${!bot && n === count ? 'on' : ''}" data-n="${n}">${n}</button>`).join('');
  $('#names').innerHTML = lineup().map((p, i) => {
    const id = p.bot ? 'bot' : i;
    return `<div class="name-row"><button class="avatar-btn" data-i="${id}" style="--c:${L.COLORS[i]}" ${p.bot ? 'disabled' : ''} aria-label="Ändra figur">${figure(p, L.COLORS[i], true)}</button>` +
      `<input value="${esc(p.name)}" data-i="${id}" maxlength="14" readonly aria-label="Namn på spelare ${i + 1}">` +
      `<button class="pen" data-i="${id}" aria-label="Ändra namn">✏️</button></div>`;
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
        deco += `<div class="deco" data-kind="${art}" style="left:${x * CELL}px;top:${y * CELL}px">${ART[art]}</div>`;
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
  world.innerHTML = TILE_GRADIENT + deco + bases + tiles + '<div id="pawns"></div>';
  setSeason(null); // banvalet har neutral bakgrund
  $('#scores').innerHTML = '';
  $('#piles').innerHTML = '';
  $('#previewActions').hidden = false;
  $('#actionBtn').hidden = true;
  $('#hint').hidden = true;
  game = null;
  overview();
}

// Mjuk ljusgradient på pusselbitarnas ovansida (en gång för alla bitar).
const TILE_GRADIENT = '<svg width="0" height="0" style="position:absolute"><defs><radialGradient id="tileTop" cx=".38" cy=".3" r=".95">' +
  '<stop offset="0" stop-color="#fff6d2"/><stop offset=".55" stop-color="#f6d77a"/><stop offset="1" stop-color="#e4ad4a"/></radialGradient></defs></svg>';

// Årstid: byter träd och blommor, väder (snö, löv, kronblad, ljus) och hörn-dekor runt planen.
function setSeason(key) {
  const S = SEASONS[key];
  document.body.dataset.season = key || '';
  document.querySelectorAll('.deco').forEach(d => (d.innerHTML = (S || ART)[d.dataset.kind]));
  $('#weather').innerHTML = S ? Array.from({ length: 16 }, () =>
    `<i style="left:${Math.random() * 100}%;animation-delay:${-Math.random() * 14}s;animation-duration:${9 + Math.random() * 7}s;--s:${0.6 + Math.random() * 0.8}"></i>`).join('') : '';
  $('#corners').innerHTML = S ? [0, 1, 2, 3].map(c => `<div class="corner c${c}">${S.bush}${S.extra}${S.flower}</div>`).join('') : '';
  if (!S) return;
  const b = $('#seasonBanner');
  b.textContent = S.name + ' i skogen';
  b.hidden = false;
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  setTimeout(() => (b.hidden = true), 2600);
}

function camera(x, y, zoom) {
  lastCam = [x, y, zoom];
  const vp = $('#viewport');
  const vw = vp.clientWidth, vh = vp.clientHeight;
  const fit = Math.min(vw, vh) / W * 0.96;
  // inzoomat: planen fyller hela rutan, och kameran stannar vid kanterna
  const s = zoom ? Math.max(fit * 2, vw / W, vh / W) : fit;
  const fitAxis = (c, v) => (W * s >= v - 1 ?Math.min(0, Math.max(v - W * s, v / 2 - c * s)) : v / 2 - c * s);
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
  const keys = Object.keys(SEASONS);
  setSeason(keys[Math.floor(Math.random() * keys.length)]);
  const who = lineup();
  game = L.createGame(who.map(p => p.name), board);
  shown.length = 0;
  game.players.forEach(p => shown.push(p.baskets));
  game.players.forEach((p, i) => { p.look = who[i].look; p.bot = !!who[i].bot; });
  $('#pawns').innerHTML = game.players.map((p, i) =>
    `<div class="pawn" id="pawn${i}" style="--c:${p.color}"><span class="shadow"></span><div class="hop">${figure(p, p.color)}</div>` +
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
    `<span class="chip-face">${figure(p, p.color, true)}</span><b>${esc(p.name)}</b><span class="bk">${ART.basket}</span>` +
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
  // Datorns tur: knappen är grå och visar att datorn spelar.
  if (game && !game.over && me().bot) {
    btn.disabled = true;
    btn.className = 'btn action';
    btn.innerHTML = `${robot(me().color, true)} ${esc(me().name)} spelar…`;
  }
}
const isBot = () => game && me().bot;

// Dags att slå: personen trycker själv, datorn slår efter en liten stund.
async function readyToRoll(say) {
  setState('roll');
  if (!isBot()) return speak(say);
  await wait(1100);
  roll();
}
const diceIcon = () => `<svg viewBox="0 0 40 40"><rect x="4" y="4" width="32" height="32" rx="8" fill="#fff" stroke="#4a2a00" stroke-width="3"/><circle cx="13" cy="13" r="3.5" fill="#4a2a00"/><circle cx="20" cy="20" r="3.5" fill="#4a2a00"/><circle cx="27" cy="27" r="3.5" fill="#4a2a00"/></svg>`;

function startTurn() {
  renderScores();
  focusTile(me().pos);
  readyToRoll(`Din tur, ${me().name}!`);
}

$('#actionBtn').onclick = () => {
  if (isBot()) return;
  if (state === 'roll') roll();
  else if (state === 'draw') drawFrom(drawDeck);
};
$('#piles').onclick = e => {
  const pile = e.target.closest('.pile');
  if (pile && !isBot() && state === 'draw' && pile.dataset.deck === drawDeck) drawFrom(drawDeck);
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
    if (!isBot()) return speak(`${FIGURES[r.type].name}! Tryck och dra ett kort.`);
    await wait(1200); // datorn "tänker" lite och drar sedan själv
    return drawFrom(r.type);
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
  zone.classList.add('landed');
  sfx.land();
  if (n === 6) sfx.six();
  burst(n === 6 ? 26 : 12, n === 6 ? ['#ffe08a', '#fff', '#ffd54f', '#b2ff59'] : [me().color, '#fff']);
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
    setTimeout(async () => {
      if (!isBot()) { $('#cardButtons').hidden = false; readCard('cards'); return; }
      // Datorn: läs upp kortet, vänta tills det är klart (minst en stund att läsa), tryck sedan Okej.
      await Promise.all([readCard('cards'), wait(2800)]);
      await wait(700);
      okCard();
    }, 500);
  }, 900);
  card.deck = deck;
}

$('#cardSpeakBtn').onclick = () => readCard('always');
$('#cardOkBtn').onclick = () => okCard();
async function okCard() {
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
    return onLand(); // den nya rutan gäller också: nytt kort, blåbär eller mål
  }
  if (r.again) {
    await wait(300);
    return readyToRoll('Slå igen!');
  }
  await wait(900);
  endTurn();
}

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
    `<div class="step rank${rank}"><span class="pawn-big">${figure(p, p.color)}</span><b>${esc(p.name)}</b>` +
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
const soundIcon = () => ($('#soundBtn').innerHTML = `<svg viewBox="0 0 40 40"><path d="M6 15 H13 L22 7 V33 L13 25 H6Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>${
  ['cards', 'narrator', 'sfx'].some(settings.get)
    ? '<path d="M27 14 Q31 20 27 26 M31 10 Q38 20 31 30" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'
    : '<path d="M28 15 L36 25 M36 15 L28 25" stroke="#ff8a80" stroke-width="3.5" stroke-linecap="round"/>'}</svg>`);
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
