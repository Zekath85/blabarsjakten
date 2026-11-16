import * as L from './logic.js';
import { FIGURES, DECKS, GOLDEN } from './cards.js';
import { ART, puzzlePath, SEASONS } from './art.js';
import { makeLandscape, renderLandscape } from './landscape.js';
import { renderScenery, THEMES, SCENE_CELLS } from './scenery.js';
import { stop, playClip, sfx, settings } from '../../shared/audio.js';
import { avatar, robot, OPTIONS, DEFAULT_LOOKS } from '../../shared/avatar.js';
import { confirmQuit } from '../../shared/dialog.js';
import { music } from '../../shared/music.js';
import { MENU_SONG } from '../../shared/menu-song.js';
import { SONGS } from './songs.js';
import { ICONS, medal, sizeIcon, fillIcons } from '../../shared/icons.js';

// Inspelad röst för kortet (filer från "npm run voices").
// Berättarens inspelade repliker (Sofie). Texten används bara om filen saknas.
const LINE_TEXT = { turn: 'Din tur! Dra tärningen uppåt och släpp.', again: 'Slå igen!', tap: 'Tryck på kortet.', bot: 'Nu är det datorns tur.',
  board: 'Här är spelplanen.', win: 'Grattis till vinnaren!', tie: 'Det blev lika!' };
const say = (key, text = LINE_TEXT[key]) => playClip(`voice/line-${key}.mp3`, text, undefined, 'guide');
const readCard = kind => playClip(`voice/${card.deck}-${DECKS[card.deck].indexOf(card)}.mp3`, card.text, (FIGURES[card.deck] || GOLDEN).voice, kind);

const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const CELL = 90;
let W = L.GRID * CELL; // planens bredd i pixlar, beror på kartstorleken
const PLACE_WORD = ['Första', 'Andra', 'Tredje', 'Fjärde'];
const OFFSET = [[-18, -14], [18, -14], [-18, 12], [18, 12]];
const korg = n => `${n} ${n === 1 ? 'korg' : 'korgar'}`;

let names = ['Spelare 1', 'Spelare 2', 'Spelare 3', 'Spelare 4'];
let looks = DEFAULT_LOOKS.map(l => ({ ...l }));
let count = 2;
let bot = false, botName = 'Robo'; // bot: en spelare mot datorn
let mapSize = 'medium'; // liten, mellan eller stor karta
let foxLevel = 'normal'; // snäll, vanlig eller busig: hur många rävrutor
let seasonPick = 'summer'; // vår, sommar, höst eller vinter
// Kom ihåg namn och figurer till nästa gång.
try { ({ names, looks, count, bot, botName, mapSize, foxLevel, seasonPick } = { names, looks, count, bot, botName, mapSize, foxLevel, seasonPick, ...JSON.parse(localStorage.getItem('bbj-players') || '{}') }); } catch {}
const savePlayers = () => { try { localStorage.setItem('bbj-players', JSON.stringify({ names, looks, count, bot, botName, mapSize, foxLevel, seasonPick })); } catch {} };
// Vilka som spelar: antingen 2–4 personer, eller en person + datorn.
const lineup = () => bot
  ? [{ name: names[0], look: looks[0] }, { name: botName, bot: true }]
  : names.slice(0, count).map((name, i) => ({ name, look: looks[i] }));
// Figur för en spelare: barnet man skapat, eller roboten.
const figure = (p, color, headOnly = false) => (p.bot ? robot(color, headOnly) : avatar(p.look, color, headOnly));
let board, game, state = 'idle', card = null, lastCam = null;
const shown = []; // korgar som visas i topplisten, för att se ändringar

// ---------- Skärmar ----------
function show(id) { document.querySelectorAll('.screen').forEach(s => (s.hidden = s.id !== id)); }

// ---------- Välj spelare ----------
$('#figures').innerHTML = Object.entries(FIGURES).map(([k, f]) => `<span style="background:${f.color}">${ART[k]}</span>`).join('');

function renderSetup() {
  $('#counts').innerHTML =
    `<button class="count bot ${bot ? 'on' : ''}" data-n="bot" aria-label="En spelare mot datorn">1</button>` +
    [2, 3, 4].map(n => `<button class="count ${!bot && n === count ? 'on' : ''}" data-n="${n}">${n}</button>`).join('');
  $('#names').innerHTML = lineup().map((p, i) => {
    const id = p.bot ? 'bot' : i;
    return `<div class="name-row"><button class="avatar-btn" data-i="${id}" style="--c:${L.COLORS[i]}" ${p.bot ? 'disabled' : ''} aria-label="Ändra figur">${figure(p, L.COLORS[i], true)}</button>` +
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
  say('board');
};

// ---------- Spelplanen ----------
function dirTo(a, b) {
  if (!b) return -1;
  return b.x > a.x ? 1 : b.x < a.x ? 3 : b.y > a.y ? 2 : 0;
}

function tileIcon(t) {
  if (FIGURES[t.type]) return `<div class="ico fig" style="--c:${FIGURES[t.type].color}">${ART[t.type]}</div>`;
  if (t.type === 'berry') return `<div class="ico">${ART.basket}</div><span class="berries">${'<i></i>'.repeat(t.value)}</span>`;
  if (t.type === 'start') return `<div class="ico disc">START</div>`;
  if (t.type === 'goal') return `<div class="ico disc">MÅL</div>`;
  return `<div class="ico leaf">${ART.leaf}</div>`;
}

function newBoard() {
  board = L.makeBoard(Math.random, mapSize, foxLevel);
  const G = board.grid;
  W = G * CELL;
  renderSizes();
  // Landskapet: äng, åker, skog, by, sjö, bäck med broar, grusväg, hus och djur.
  const land = renderLandscape(makeLandscape(board), board, CELL);
  // Miljön runt planen: stad, skog eller bondgård (slumpas för varje ny bana).
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  document.body.dataset.theme = theme;
  const scene = renderScenery(G, CELL, theme);
  const shapes = board.map((t, i) => puzzlePath(dirTo(t, board[i + 1]), dirTo(t, board[i - 1])));
  const at = t => `left:${t.x * CELL}px;top:${t.y * CELL}px`;
  // Undre lager: skugga och tjock kant för alla bitar, så ingen kant hamnar ovanpå en annan bits ovansida.
  const bases = board.map((t, i) =>
    `<div class="tile" style="${at(t)}"><svg class="piece base" viewBox="-20 -20 140 140">` +
    `<path class="shadow" d="${shapes[i]}"/><path class="side" d="${shapes[i]}"/></svg></div>`).join('');
  const tiles = board.map((t, i) =>
    `<div class="tile t-${t.type}" id="tile${i}" style="${at(t)}${FIGURES[t.type] ? `;--rim:${FIGURES[t.type].color}` : ''}">` +
    `<svg class="piece" viewBox="-20 -20 140 140"><path class="top" d="${shapes[i]}"/><path class="shine" d="${shapes[i]}"/></svg>` +
    `${tileIcon(t)}</div>`).join('');
  const world = $('#world');
  world.style.width = world.style.height = W + 'px';
  world.innerHTML = TILE_GRADIENT + scene.ground + land.land + land.road + scene.deco + land.deco + bases + tiles + '<div id="pawns"></div>';
  setSeason(seasonPick, false); // planen visar den valda årstiden direkt
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
function setSeason(key, banner = true) {
  const S = SEASONS[key];
  document.body.dataset.season = key || '';
  document.querySelectorAll('.deco .sway').forEach(d => {
    const kind = d.parentNode.dataset.kind;
    if (['tree', 'bush', 'flower'].includes(kind)) d.innerHTML = (S || ART)[kind];
  });
  $('#weather').innerHTML = S ? Array.from({ length: 16 }, () =>
    `<i style="left:${Math.random() * 100}%;animation-delay:${-Math.random() * 14}s;animation-duration:${9 + Math.random() * 7}s;--s:${0.6 + Math.random() * 0.8}"></i>`).join('') : '';
  $('#corners').innerHTML = S ? [0, 1, 2, 3].map(c => `<div class="corner c${c}">${S.bush}${S.extra}${S.flower}</div>`).join('') : '';
  if (!S || !banner) return;
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
  const fit = Math.min(vw, vh) / (W + SCENE * 1.1) * 0.98;
  // inzoomat: planen fyller hela rutan, och kameran stannar vid kanterna
  const s = zoom ? Math.max(fit * 2, vw / W, vh / W) : fit;
  // I 3D förstoras den närmaste delen, så där får kameran gå lite förbi kanten för att allt ska synas.
  const m = margin(s);
  const fitAxis = (c, v) => (W * s >= v - 1 ? Math.min(m, Math.max(v - W * s - m, v / 2 - c * s)) : v / 2 - c * s);
  cam = { tx: fitAxis(x, vw), ty: fitAxis(y, vh), s, vw, vh };
  $('#recenterBtn').hidden = true;
  setWorld(cam.tx, cam.ty);
}
let cam = null;
const SCENE = SCENE_CELLS * CELL; // ramen runt planen
const margin = s => SCENE * (tilt ? 1.1 : 0.85) * s;
const setWorld = (tx, ty) => ($('#world').style.transform = `translate(${tx}px, ${ty}px) scale(${cam.s})`);

// Dra planen med fingret eller musen medan man väntar på att slå. "Slå tärningen" centrerar igen.
let drag = null;
$('#viewport').addEventListener('pointerdown', e => {
  if (!game || state !== 'roll' || isBot() || !cam) return;
  drag = { x: e.clientX, y: e.clientY, tx: cam.tx, ty: cam.ty };
  $('#world').style.transition = 'none';
  try { $('#viewport').setPointerCapture(e.pointerId); } catch {}
});
$('#viewport').addEventListener('pointermove', e => {
  if (!drag) return;
  // Gräns åt alla håll: kanten (plus lite extra i 3D), eller runt mitten om planen är smalare än rutan.
  const m = margin(cam.s);
  const lim = (t, v) => {
    const room = v - W * cam.s;
    const [lo, hi] = room < 0 ? [room - m, m] : [room / 2 - m, room / 2 + m];
    return Math.min(hi, Math.max(lo, t));
  };
  cam.tx = lim(drag.tx + e.clientX - drag.x, cam.vw);
  cam.ty = lim(drag.ty + e.clientY - drag.y, cam.vh);
  setWorld(cam.tx, cam.ty);
  // Man har tittat runt: visa knappen som tar en tillbaka till sin figur.
  const btn = $('#recenterBtn');
  if (btn.hidden) { btn.innerHTML = `<span>${figure(me(), me().color, true)}</span>`; btn.hidden = false; }
});
$('#recenterBtn').addEventListener('pointerdown', e => e.stopPropagation()); // inte börja dra när man trycker på knappen
$('#recenterBtn').onclick = () => { sfx.click(); focusTile(me().pos); };
const endDrag = () => { if (drag) { drag = null; $('#world').style.transition = ''; } };
$('#viewport').addEventListener('pointerup', endDrag);
$('#viewport').addEventListener('pointercancel', endDrag);
const overview = () => camera(W / 2, W / 2, false);
const focusTile = pos => camera(board[pos].x * CELL + CELL / 2, board[pos].y * CELL + CELL / 2, true);
addEventListener('resize', () => lastCam && camera(...lastCam));

$('#newBoardBtn').onclick = () => { sfx.pop(); newBoard(); };

// Kartstorlek: liten, mellan eller stor, med ungefärlig speltid för antalet spelare.
function renderSizes() {
  const players = lineup().length;
  $('#sizes').innerHTML = Object.entries(L.SIZES).map(([key, z]) =>
    `<button class="size ${key === mapSize ? 'on' : ''}" data-size="${key}" aria-label="${z.name} karta">${sizeIcon({ small: 2, medium: 3, large: 4 }[key])}<small>${ICONS.clock}${L.estimateMinutes(key, players)} min</small></button>`).join('');
  $('#seasons').innerHTML = Object.entries(SEASONS).map(([key, z]) =>
    `<button class="size season-pick ${key === seasonPick ? 'on' : ''}" data-season="${key}" aria-label="${z.name}">${ICONS[key]}<small>${{ spring: 'Vår', summer: 'Sommar', autumn: 'Höst', winter: 'Vinter' }[key]}</small></button>`).join('');
  const FOX_NAME = { kind: 'Snäll räv', normal: 'Vanlig räv', sly: 'Busig räv' };
  $('#foxLevels').innerHTML = Object.keys(L.FOX_LEVELS).map((lvl, i) =>
    `<button class="size fox-level ${lvl === foxLevel ? 'on' : ''}" data-fox="${lvl}" aria-label="${FOX_NAME[lvl]}"><span class="foxes">${ART.fox.repeat(i + 1)}</span><small>${FOX_NAME[lvl].split(' ')[0]}</small></button>`).join('');
}
$('#seasons').onclick = e => {
  const key = e.target.closest('.size')?.dataset.season;
  if (!key || key === seasonPick) return;
  seasonPick = key;
  savePlayers();
  sfx.pop();
  setSeason(seasonPick, false);
  renderSizes();
};
$('#foxLevels').onclick = e => {
  const lvl = e.target.closest('.size')?.dataset.fox;
  if (!lvl || lvl === foxLevel) return;
  foxLevel = lvl;
  savePlayers();
  sfx.pop();
  newBoard();
};
$('#sizes').onclick = e => {
  const size = e.target.closest('.size')?.dataset.size;
  if (!size || size === mapSize) return;
  mapSize = size;
  savePlayers();
  sfx.pop();
  newBoard();
};
$('#startBtn').onclick = startGame;

// ---------- Spelet ----------
function startGame() {
  sfx.good();
  setSeason(seasonPick, true);
  music.play(SONGS[settings.get('song')] || SONGS.theme);
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
  watchSpeed();
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
    `<span class="num" id="num${i}">${p.baskets}</span>${p.place ? `<span class="chip-medal">${medal(p.place)}</span>` : ''}</div>`).join('');
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
    flyBaskets(i, diff, r);
    shown[i] = p.baskets;
  });
  document.querySelectorAll('.pawn').forEach((el, i) => el.classList.toggle('me', i === game.current && !game.over));
}

// Korgar flyger från figuren upp till poängen (plus), eller ramlar ur poängen (minus).
function flyBaskets(i, diff, chip) {
  const pawn = $(`#pawn${i}`)?.getBoundingClientRect();
  if (!pawn || settings.get('calm')) return;
  for (let k = 0; k < Math.min(Math.abs(diff), 5); k++) {
    const b = document.createElement('div');
    b.className = 'fly-basket ' + (diff > 0 ? 'in' : 'out');
    b.innerHTML = ART.basket;
    const [x0, y0] = diff > 0 ? [pawn.left + pawn.width / 2, pawn.top] : [chip.left + chip.width / 2, chip.bottom];
    const [x1, y1] = diff > 0 ? [chip.left + chip.width / 2, chip.top + chip.height / 2] : [x0 + (k - 2) * 30, y0 + 160];
    b.style.cssText = `left:${x0}px;top:${y0}px;--dx:${x1 - x0}px;--dy:${y1 - y0}px;animation-delay:${k * 0.12}s`;
    document.body.append(b);
    setTimeout(() => b.remove(), 1400 + k * 120);
  }
}

function setState(s) {
  state = s;
  const btn = $('#actionBtn');
  btn.disabled = s === 'busy';
  btn.className = 'btn action' + (s === 'busy' ? '' : ' pulse');
  btn.innerHTML = s === 'roll' ? `<span class="throw-dice">${ICONS.dice}</span><span class="throw-hint">${ICONS.arrowUp}</span>` : '<span class="wait-dots"><i></i><i></i><i></i></span>';
  btn.classList.toggle('throw', s === 'roll');
  // Datorns tur: knappen är grå och visar att datorn spelar.
  if (game && !game.over && me().bot) {
    btn.disabled = true;
    btn.className = 'btn action';
    btn.innerHTML = `${robot(me().color, true)}<span class="wait-dots"><i></i><i></i><i></i></span>`;
  }
}
const isBot = () => game && me().bot;

// Dags att slå: personen trycker själv, datorn slår efter en liten stund.
async function readyToRoll(line) {
  setState('roll');
  if (!isBot()) return say(line);
  await wait(1100);
  // Datorn kastar med lite olika kraft och riktning, så det ser levande ut.
  roll({ power: 0.35 + Math.random() * 0.5, dx: (Math.random() - 0.5) * 0.8, dy: -1 });
}

async function startTurn() {
  renderScores();
  focusTile(me().pos);
  // Stort ansikte i mitten en kort stund: nu är det den här spelarens tur.
  const b = $('#turnBanner');
  b.style.setProperty('--c', me().color);
  b.innerHTML = `<span>${figure(me(), me().color, true)}</span><b>${esc(me().name)}</b>`;
  b.hidden = false;
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  sfx.turn(game.current);
  setTimeout(() => (b.hidden = true), 1300);
  if (isBot()) say('bot');
  readyToRoll('turn');
}

// Sikta: dra från tärningen. Ju längre man drar, desto hårdare kast. Släpp för att kasta. Ett snabbt tryck = lagom kast.
const MAX_PULL = 520; // så långt man drar för fullt hårt kast (grön → gul → röd)
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
  // Ett snabbt tryck utan att dra: lagom kast rakt uppåt.
  const tap = a.power < 0.08;
  roll(tap ? { power: 0.5, dx: (Math.random() - 0.5) * 0.4, dy: -1, x: a.x, y: a.y } : { power: a.power, dx: a.dx, dy: a.dy, x: a.x, y: a.y });
});
$('#actionBtn').addEventListener('pointercancel', () => { aim = null; $('#aim').setAttribute('hidden', ''); $('#diceZone').hidden = true; });

function updateAim(e) {
  const vx = e.clientX - aim.x, vy = e.clientY - aim.y, len = Math.hypot(vx, vy);
  aim.power = Math.min(1, len / MAX_PULL);
  if (len > 4) { aim.dx = vx / len; aim.dy = vy / len; }
  const L2 = Math.min(len, MAX_PULL);
  const ex = aim.x + aim.dx * L2, ey = aim.y + aim.dy * L2;
  // Pilen: tjockare och rödare ju hårdare kast (grön = löst, gul = lagom, röd = hårt).
  const line = $('#aimLine'), dot = $('#aimDot');
  line.setAttribute('x1', aim.x); line.setAttribute('y1', aim.y); line.setAttribute('x2', ex); line.setAttribute('y2', ey);
  line.style.stroke = dot.style.fill = `hsl(${120 - aim.power * 120} 85% 50%)`;
  line.style.strokeWidth = 10 + aim.power * 16;
  dot.setAttribute('cx', ex); dot.setAttribute('cy', ey); dot.setAttribute('r', 12 + aim.power * 10);
  // Tärningen darrar mer ju hårdare man drar, och ett klick för varje nivå.
  $('#diceWrap').style.setProperty('--shake', `${1 + aim.power * 5}px`);
  const step = Math.floor(aim.power * 4);
  if (step !== aim.step) { aim.step = step; sfx.aim(step); }
}

async function roll(t) {
  setState('busy');
  focusTile(me().pos); // tillbaka till spelaren om man har tittat runt
  // Siffran är alltid slumpad och rättvis. Kastet styr hur tärningen flyger, studsar och rullar.
  const n = L.rollDie();
  await throwDice(n, t);
  await walk(n);
  await onLand();
}

async function walk(steps) {
  const i = game.current;
  let n = 0;
  for (const pos of L.move(game, steps)) {
    game.players[i].pos = pos; // flytta pjäsen ruta för ruta i bild
    placePawn(i);
    const hop = $(`#pawn${i} .hop`);
    hop.classList.remove('go');
    void hop.offsetWidth; // starta om hopp-animationen
    hop.classList.add('go');
    focusTile(Math.min(pos + (steps > 0 ? 1 : 0), board.length - 1)); // titta lite framåt
    sfx.hop(n);
    countBubble(i, ++n);
    await wait(340);
  }
}

// Liten siffra som ploppar upp över figuren: 1, 2, 3 …
function countBubble(i, n) {
  const el = document.createElement('span');
  el.className = 'count-bubble';
  el.textContent = n;
  $(`#pawn${i}`)?.append(el);
  setTimeout(() => el.remove(), 700);
}

async function onLand() {
  // Rutan trycks ner lite när figuren landar.
  const tile = $(`#tile${me().pos}`);
  if (tile) { tile.classList.remove('landed'); void tile.offsetWidth; tile.classList.add('landed'); }
  const r = L.land(game);
  renderScores();
  if (r.type === 'goal') return finish(r);
  if (r.type === 'berry') {
    sfx.good();
    say(`berry${r.gained}`, `Blåbär! Du får ${korg(r.gained)}.`).then(() => r.extra && say('extra', 'Och en extra korg, för att du ligger efter!'));
    await wait(r.extra ? 3800 : 1800);
    return endTurn();
  }
  if (FIGURES[r.type]) {
    await wait(400);
    return showCard(r.type);
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
const DICE = 96;

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

async function throwDice(n, t = { power: 0.5, dx: 0, dy: -1 }) {
  const zone = $('#diceZone'), cube = $('#cube');
  const btn = $('#actionBtn').getBoundingClientRect();
  const vp = $('#viewport').getBoundingClientRect();
  const box = { l: vp.left + DICE / 2, r: vp.right - DICE / 2, t: vp.top + DICE / 2, b: innerHeight - DICE / 2 };
  let x = t.x ?? btn.left + btn.width / 2, y = t.y ?? btn.top + btn.height / 2, z = 0;
  showDiceAt(x, y);
  zone.classList.remove('aiming');
  zone.classList.add('flying');
  // Kraft: löst kast rullar kort, hårt kast flyger långt och studsar flera gånger.
  const p = Math.max(0.15, t.power), speed = 450 + 1500 * p;
  let vx = t.dx * speed, vy = t.dy * speed, vz = 350 + 750 * p;
  let rx = spinX + Math.random() * 90, ry = spinY + Math.random() * 90;
  const spin = 0.9 + Math.random() * 0.4;
  cube.style.transition = 'none';
  sfx.whoosh(p);
  await new Promise(done => {
    let last = performance.now();
    const step = now => {
      const dt = Math.min(0.033, (now - last) / 1000); last = now;
      vz -= 2300 * dt; z += vz * dt;
      if (z <= 0) {
        z = 0;
        if (vz < -140) { sfx.knock(Math.min(1, -vz / 1000)); vz = -vz * 0.42; vx *= 0.78; vy *= 0.78; }
        else vz = 0;
      }
      if (z === 0 && vz === 0) { const fr = Math.pow(0.12, dt); vx *= fr; vy *= fr; } // rullar och bromsar in
      x += vx * dt; y += vy * dt;
      // Studsa mot planens kanter.
      if (x < box.l) { x = box.l; vx = Math.abs(vx) * 0.6; sfx.knock(0.3); }
      if (x > box.r) { x = box.r; vx = -Math.abs(vx) * 0.6; sfx.knock(0.3); }
      if (y < box.t) { y = box.t; vy = Math.abs(vy) * 0.6; sfx.knock(0.3); }
      if (y > box.b) { y = box.b; vy = -Math.abs(vy) * 0.6; sfx.knock(0.3); }
      // Tärningen rullar i den riktning den åker (ungefär ett varv per fyra sidor).
      rx -= vy * 0.94 * spin * dt + (z > 0 ? vz * 0.15 * dt : 0);
      ry += vx * 0.94 * spin * dt;
      placeDice(x, y, z);
      cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      if (z === 0 && vz === 0 && Math.hypot(vx, vy) < 30) return done();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  // Lägg sig till rätta på rätt sida.
  spinX = Math.round(rx / 360) * 360; spinY = Math.round(ry / 360) * 360;
  cube.style.transition = 'transform .4s cubic-bezier(.3,1.5,.5,1)';
  cube.style.transform = `rotateX(${spinX + FACE[n][0]}deg) rotateY(${spinY + FACE[n][1]}deg)`;
  await wait(420);
  zone.classList.remove('flying');
  zone.classList.add('landed');
  $('#sparks').style.cssText = `left:${x}px;top:${y}px`;
  sfx.land();
  if (n === 6) sfx.six();
  burst(n === 6 ? 26 : 12, n === 6 ? ['#ffe08a', '#fff', '#ffd54f', '#b2ff59'] : [me().color, '#fff']);
  await wait(1000);
  zone.hidden = true;
  zone.classList.remove('landed');
}

function burst(n, colors) {
  const box = $('#sparks');
  box.innerHTML = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, d = 90 + Math.random() * 90;
    return `<i class="spark" style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--c:${colors[i % colors.length]}"></i>`;
  }).join('');
}

// ---------- Kort ----------
// Kort sammanfattning längst ner på kortet: vad det betyder för dig, och om det är bra (grön) eller dåligt (röd).
function effectLabel({ type, n }) {
  // Bilder först (korg, fotsteg, tärning, grupp) så att man förstår utan att läsa. Siffran står bredvid.
  const bk = ART.basket, all = ICONS.group;
  switch (type) {
    case 'gain': return [`${bk}+${n}`, 'good'];
    case 'lose': return [`${bk}−${n}`, 'bad'];
    case 'all': return [`${all}${bk}${n > 0 ? '+' : '−'}${Math.abs(n)}`, n > 0 ? 'good' : 'bad'];
    case 'move': return [`${n > 0 ? ICONS.stepsFwd : ICONS.stepsBack}${Math.abs(n)}`, n > 0 ? 'good' : 'bad'];
    case 'again': return [`${ICONS.dice}+1`, 'good'];
    case 'takeFromEach': return [`${bk}+${n} ${all}`, 'good'];
    case 'giveToPoorest': return [`${bk}−${n}`, 'bad'];
    case 'giveToEach': return [`${bk}−${n} ${all}`, 'bad'];
    case 'richToPoor': return [`${all}${bk}${n}`, 'neutral'];
    default: return [ICONS.calm, 'neutral'];
  }
}

// Kortet flyger fram med baksidan upp. Man trycker på kortet för att vända det.
async function showCard(deck) {
  setState('busy');
  card = L.drawCard(game, deck);
  const golden = card.deck === 'golden';
  const f = golden ? GOLDEN : FIGURES[deck];
  const ov = $('#cardOverlay');
  ov.style.setProperty('--c', f.color);
  // Räven: läskig stämning med mörkrött ljus, skakande kort och hotfullt ljud.
  ov.classList.toggle('danger', deck === 'fox');
  ov.classList.toggle('golden', golden);
  if (golden) sfx.six();
  if (deck === 'fox') sfx.danger();
  $('#cardBack').innerHTML = ART[card.deck];
  const [label, mood] = effectLabel(card.effect);
  $('#cardFront').innerHTML = `<div class="head"><span>${ART[card.deck]}</span><b>${f.name}</b></div><p>${card.text}</p>` +
    `<div class="effect ${mood}">${label}</div>`;
  $('#cardButtons').hidden = true;
  $('#tapHint').hidden = isBot();
  // Högen kortet kom ifrån lyser och växer nere till vänster. Mörkret får ett hål där, så högen syns.
  const pile = $(`.pile[data-deck="${deck}"]`), r = pile?.getBoundingClientRect();
  pile?.classList.add('picked');
  const dark = deck === 'fox' ? 'rgba(25, 0, 0, .92)' : 'rgba(8, 14, 11, .82)';
  ov.style.background = r?.width
    ? `radial-gradient(circle at ${r.left + r.width / 2}px ${r.top + r.height / 2}px, transparent 0 62px, ${dark} 92px)` : '';
  $(`#tile${me().pos}`).classList.add('lit');
  const c3 = $('#card3d');
  c3.classList.remove('flip');
  c3.classList.toggle('tappable', !isBot());
  ov.hidden = false;
  if (r?.width) { c3.style.setProperty('--fx', `${r.left + r.width / 2 - innerWidth / 2}px`); c3.style.setProperty('--fy', `${r.top + r.height / 2 - innerHeight / 2}px`); }
  c3.style.animation = 'none'; void c3.offsetWidth; c3.style.animation = ''; // starta om "kortet flyger in" från högen
  if (golden) say('golden', 'Oj! Ett gyllene kort!');
  else if (!isBot()) say('tap');
  sfx.card();
  if (isBot()) { await wait(1500); flipCard(); }
}

async function flipCard() {
  const c3 = $('#card3d');
  if (c3.classList.contains('flip')) return;
  c3.classList.add('flip');
  c3.classList.remove('tappable');
  $('#tapHint').hidden = true;
  sfx.pop();
  await wait(500);
  if (!isBot()) { $('#cardButtons').hidden = false; readCard('cards').then(() => $('#cardOkBtn').classList.add('ready')); return; }
  // Datorn: läs upp kortet, vänta tills det är klart (minst en stund att läsa), tryck sedan Okej.
  await Promise.all([readCard('cards'), wait(2800)]);
  await wait(700);
  okCard();
}
$('#card3d').onclick = () => {
  if (isBot()) return;
  if ($('#card3d').classList.contains('flip')) readCard('always'); // tryck igen: hör kortet en gång till
  else flipCard();
};

$('#cardSpeakBtn').onclick = () => readCard('always');
$('#cardOkBtn').onclick = () => okCard();
async function okCard() {
  $('#cardOverlay').hidden = true;
  $('#cardOkBtn').classList.remove('ready');
  stop();
  $('#cardOverlay').style.background = '';
  document.querySelectorAll('.pile.picked').forEach(p => p.classList.remove('picked'));
  document.querySelectorAll('.tile.lit').forEach(t => t.classList.remove('lit'));
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
    return readyToRoll('again');
  }
  await wait(900);
  endTurn();
}

// ---------- Mål ----------
async function finish(r) {
  renderScores();
  sfx.win();
  fireworks(3800);
  // Ruta i mitten: placering, bonus och hur många korgar man har nu. Man stänger med Okej (datorn stänger själv).
  const p = me();
  $('#goalMedal').innerHTML = medal(r.place);
  $('#goalFace').innerHTML = figure(p, p.color, true);
  $('#goalFace').style.setProperty('--c', p.color);
  $('#goalTitle').textContent = `${PLACE_WORD[r.place - 1]} plats i mål!`;
  $('#goalBasket').innerHTML = ART.basket;
  $('#goalBonus').textContent = `+${r.bonus}`;
  $('#goalTotal').innerHTML = `${esc(p.name)} har nu ${ART.basket}<b>${p.baskets}</b>`;
  $('#goalOkBtn').hidden = !!p.bot;
  $('#goalPanel').hidden = false;
  if (p.bot) await wait(3500);
  else {
    say(`goal${r.place}`, `Grattis! Du kom i mål på ${PLACE_WORD[r.place - 1].toLowerCase()} plats.`);
    await new Promise(done => ($('#goalOkBtn').onclick = done));
  }
  stop();
  sfx.click();
  $('#goalPanel').hidden = true;
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
  // Poängen överst, sedan figuren, sedan träpallen med medalj och namnskylt.
  $('#podiumList').innerHTML = order.map(({ player: p, rank }) =>
    `<div class="step rank${rank}"><span class="score">${ART.basket}<b>${p.baskets}</b></span>` +
    `<span class="pawn-big">${figure(p, p.color)}</span>` +
    `<div class="block"><span class="medal">${rank}</span><span class="plate">${esc(p.name)}</span></div></div>`).join('');
  // Vimplar längs snöret och konfetti som faller.
  const FLAG = ['#e53935', '#fbc02d', '#43a047', '#1e88e5', '#8e24aa', '#fb8c00'];
  $('#flags').innerHTML = Array.from({ length: 16 }, (_, i) => {
    const x = 30 + i * 62, y = 6 + 54 * 4 * (x / 1000) * (1 - x / 1000) * 0.5;
    return `<path d="M${x - 18} ${y} L${x + 18} ${y} L${x} ${y + 34}Z" fill="${FLAG[i % FLAG.length]}"/>`;
  }).join('');
  $('#confetti').innerHTML = Array.from({ length: 28 }, (_, i) =>
    `<i style="left:${Math.random() * 100}%;background:${FLAG[i % FLAG.length]};animation-delay:${-Math.random() * 6}s;animation-duration:${4 + Math.random() * 4}s"></i>`).join('');
  $('#podium').hidden = false;
  fireworks(5000);
  sfx.win();
  const winners = list.filter(r => r.rank === 1).map(r => r.player.name);
  say(winners.length > 1 ? 'tie' : 'win');
}
$('#againBtn').onclick = () => { $('#podium').hidden = true; renderSetup(); show('setup'); music.play(MENU_SONG); };
$('#menuBtn').onclick = () => (location.href = '../../index.html');

// ---------- Knappar högst upp ----------
$('#backBtn').onclick = async () => {
  if (game && !game.over && !(await confirmQuit('Blåbärsjakten'))) return;
  location.href = '../../index.html';
};
const soundIcon = () => ($('#soundBtn').innerHTML = `<svg viewBox="0 0 40 40"><path d="M6 15 H13 L22 7 V33 L13 25 H6Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>${
  ['cards', 'guide', 'sfx', 'music'].some(settings.get)
    ? '<path d="M27 14 Q31 20 27 26 M31 10 Q38 20 31 30" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'
    : '<path d="M28 15 L36 25 M36 15 L28 25" stroke="#ff8a80" stroke-width="3.5" stroke-linecap="round"/>'}</svg>`);
const SONG_ICON = { theme: ART.basket, walk: ART.tree, lullaby: ART.owl, fox: ART.fox };
const inGame = () => game && !game.over;
function renderSongs() {
  $('#songList').innerHTML = Object.entries(SONGS).map(([key, s]) =>
    `<button class="song ${key === settings.get('song') ? 'on' : ''}" data-song="${key}">${SONG_ICON[key] || ''}<small>${s.name}</small></button>`).join('');
}
$('#soundBtn').onclick = () => {
  document.querySelectorAll('[data-pref]').forEach(cb => (cb.checked = settings.get(cb.dataset.pref)));
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
$('#closeSoundBtn').onclick = () => {
  $('#soundPanel').hidden = true;
  if (!inGame()) music.play(MENU_SONG);
};
soundIcon();
$('#rulesBtn').onclick = () => ($('#rules').hidden = false);

// Platt eller 3D-vy av spelplanen. Valet sparas i plattan.
let tilt = false;
try { tilt = localStorage.getItem('bbj-tilt') === '1'; } catch {}
function applyTilt() {
  document.body.classList.toggle('tilt', tilt);
  $('#viewBtn').innerHTML = tilt
    ? '<svg viewBox="0 0 40 40"><rect x="8" y="8" width="24" height="24" rx="4" fill="none" stroke="#fff" stroke-width="3.5"/><path d="M8 20 H32 M20 8 V32" stroke="#fff" stroke-width="2.5"/></svg>'
    : '<svg viewBox="0 0 40 40"><path d="M20 5 L35 13 V27 L20 35 L5 27 V13Z" fill="rgba(255,255,255,.2)" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M5 13 L20 21 L35 13 M20 21 V35" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>';
  if (lastCam) camera(...lastCam);
}
$('#viewBtn').onclick = () => {
  tilt = !tilt;
  try { localStorage.setItem('bbj-tilt', tilt ? '1' : '0'); } catch {}
  sfx.pop();
  applyTilt();
};
applyTilt();
$('#closeRulesBtn').onclick = () => { $('#rules').hidden = true; stop(); };
$('#readRulesBtn').onclick = () => playClip('voice/rules.mp3', $('#rulesText').innerText, undefined, 'always');

// Lugnt läge: färre rörelser (väder, strålar, gungande träd). Slås på av sig självt om plattan är långsam.
const applyCalm = () => document.body.classList.toggle('calm', !!settings.get('calm'));
settings.onChange(key => key === 'calm' && applyCalm());
applyCalm();
function watchSpeed() {
  try { if (settings.get('calm') || localStorage.getItem('bbj-calm-auto')) return; } catch { return; }
  let frames = 0; const t0 = performance.now();
  const tick = t => {
    frames++;
    if (t - t0 < 3000) return requestAnimationFrame(tick);
    if (frames / 3 < 30) { try { localStorage.setItem('bbj-calm-auto', '1'); } catch {} settings.set('calm', true); }
  };
  requestAnimationFrame(tick);
}

// Lugn menymusik så fort sidan öppnas (eller vid första trycket om plattan kräver det).
music.autostart(MENU_SONG);

fillIcons();
renderSetup();
