import * as Y from './logic.js';
import { simulateTray, startRotation, DT } from './dice.js';
import { ART } from '../blabarsjakten/art.js';
// Yatzys egna lugna låtar. Valet sparas bara för Yatzy (yatzy-prefs).
import { SONGS, FIRST_SONG } from './songs.js';
import { settings, playClip, stop } from '../../shared/audio.js';
import { sfx } from './sounds.js'; // Yatzys egna, lugnare ljud
import { avatar, robot, OPTIONS, DEFAULT_LOOKS } from '../../shared/avatar.js';
import { confirmQuit, ask } from '../../shared/dialog.js';
import { music } from '../../shared/music.js';
import { MENU_SONG } from '../../shared/menu-song.js';
import { ICONS, fillIcons } from '../../shared/icons.js';

const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const LEVEL_NAME = { easy: 'Lätt', normal: 'Medel', hard: 'Svår' };
const HELP_NAME = { none: 'Ingen hjälp', some: 'Lite hjälp', lots: 'Mycket hjälp' };
// Spelarnas färger: röd, blå, grön och lila (som i Fyra i rad och Fia med knuff).
const PLAYER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#8e24aa'];
const STAR = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 L25 14 L37 15.5 L28 24 L30.5 36 L20 30 L9.5 36 L12 24 L3 15.5 L15 14Z" fill="#ffd54f" stroke="#c98a00" stroke-width="2.5" stroke-linejoin="round"/></svg>';

// Berättaren: korta repliker, i kö så att de aldrig pratar i munnen på varandra. Spelet väntar inte på rösten. Går att slå av (dice).
// Texterna ska vara samma som i scripts/make-voices-eleven.mjs --yatzy (som läser dem härifrån).
const LINES = { turn: 'Din tur! Skaka bägaren.', two: 'Två kast kvar.', last: 'Sista kastet!', pick: 'Välj en rad.', yatzy: 'Yatzy!', house: 'Kåk!', large: 'Stor stege!', small: 'Liten stege!', four: 'Fyrtal!', bonus: 'Bonus! Femtio poäng.', strike: 'Vill du stryka raden?', bot: 'Nu är det Robos tur.', win: 'Grattis till vinnaren!', tie: 'Det blev lika!' };
let voiceChain = Promise.resolve();
const say = key => { voiceChain = voiceChain.then(() => Promise.race([playClip(`voice/${key}.mp3`, LINES[key], undefined, 'dice'), wait(4500)])); };

// ---------- Val som sparas ----------
let count = 2, names = ['Spelare 1', 'Spelare 2', 'Spelare 3', 'Spelare 4'], looks = DEFAULT_LOOKS.map(l => ({ ...l })), bot = false, botName = 'Robo';
let level = 'normal', target = 1, song = FIRST_SONG, help = ['some', 'some', 'some', 'some']; // help: per plats (spelare 1–4)
try { ({ names, looks, bot, botName, count } = { names, looks, bot, botName, count, ...JSON.parse(localStorage.getItem('bbj-players') || '{}') }); } catch {}
try { ({ level, target, help, song } = { level, target, help, song, ...JSON.parse(localStorage.getItem('yatzy-prefs') || '{}') }); } catch {}
if (![1, 2, 3].includes(target)) target = 1;
if (!SONGS[song]) song = FIRST_SONG;
const savePrefs = () => { try { localStorage.setItem('yatzy-prefs', JSON.stringify({ level, target, help, song })); } catch {} };
// Namn och figurer delas med de andra spelen (samma nyckel). Vi lägger bara till våra värden, så inget där försvinner.
const savePlayers = () => { try { localStorage.setItem('bbj-players', JSON.stringify({ ...JSON.parse(localStorage.getItem('bbj-players') || '{}'), names, looks, count, bot, botName })); } catch {} };
const lineup = () => (bot
  ? [{ name: names[0], look: looks[0], help: help[0] }, { name: botName, bot: true, help: 'none' }]
  : Array.from({ length: count }, (_, i) => ({ name: names[i], look: looks[i], help: help[i] }))).map((p, i) => ({ ...p, color: PLAYER_COLORS[i] }));
const figure = (p, headOnly = true) => (p.bot ? robot(p.color, headOnly) : avatar(p.look, p.color, headOnly));

// state: setup, preview (välja nivå och matcher), turn (spelarens tur), busy, over
let state = 'setup', game = null, players = lineup();
let dice = [1, 1, 1, 1, 1], held = [false, false, false, false, false], rollsLeft = 3, busy = false;
let viewing = 0, peekTimer; // vems block som visas (man kan kika på de andras en stund)

// ---------- 1. Välj spelare och hjälp ----------
function show(id) { document.querySelectorAll('.screen').forEach(s => (s.hidden = s.id !== id)); }
const helpStars = n => STAR.repeat(n) || '<span class="no-star"></span>';
function renderSetup() {
  $('#figures').innerHTML = PLAYER_COLORS.map((c, i) => `<span style="background:${c}">${avatar(looks[i], c, true)}</span>`).join('');
  $('#counts').innerHTML =
    `<button class="count ${bot ? 'on' : ''}" data-n="bot" aria-label="En spelare mot datorn">1</button>` +
    [2, 3, 4].map(n => `<button class="count ${!bot && n === count ? 'on' : ''}" data-n="${n}">${n}</button>`).join('');
  $('#names').innerHTML = lineup().map((p, i) => {
    const id = p.bot ? 'bot' : i;
    const helpBtns = p.bot ? '' : `<div class="help-pick" role="group" aria-label="Hjälp för ${esc(p.name)}">${Y.HELP.map((h, k) =>
      `<button class="help-opt ${help[i] === h ? 'on' : ''}" data-seat="${i}" data-help="${h}" aria-label="${HELP_NAME[h]}" title="${HELP_NAME[h]}">${helpStars(k)}</button>`).join('')}</div>`;
    return `<div class="name-row"><button class="avatar-btn" data-i="${id}" style="--c:${p.color}" ${p.bot ? 'disabled' : ''} aria-label="Ändra figur">${figure(p)}</button>` +
      `<input value="${esc(p.name)}" data-i="${id}" maxlength="14" readonly aria-label="Namn på spelare ${i + 1}">` +
      `<button class="pen" data-i="${id}" aria-label="Ändra namn">${ICONS.pencil}</button>${helpBtns}</div>`;
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
  const h = e.target.closest('.help-opt');
  if (h) { help[+h.dataset.seat] = h.dataset.help; savePrefs(); sfx.pop(); return renderSetup(); }
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

// Figurskapare (samma som i de andra spelen): Tjej/Kille + hudfärg, hårfärg, frisyr och extra.
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

// ---------- 2. Välj datorns nivå och antal matcher ----------
$('#toPickBtn').onclick = () => {
  sfx.click();
  players = lineup(); state = 'preview';
  game = Y.createGame(players, target); viewing = 0;
  $('#previewActions').hidden = false;
  $('#turnbar').hidden = true;
  show('play');
  renderPicker(); renderScores(); renderSheet(0);
};
function renderPicker() {
  const pill = (id, label, buttons) => ($(id).innerHTML = `<span class="lbl">${label}</span>${buttons}`);
  $('#levels').hidden = !bot; // datorns nivå visas bara när man spelar mot datorn
  if (bot) pill('#levels', 'Datorn', Y.LEVELS.map((lvl, i) =>
    `<button class="size level ${lvl === level ? 'on' : ''}" data-level="${lvl}" aria-label="${LEVEL_NAME[lvl]} dator"><span class="heads">${robot('#1e88e5', true).repeat(i + 1)}</span><small>${LEVEL_NAME[lvl]}</small></button>`).join(''));
  pill('#rounds', 'Först till', [1, 2, 3].map(n =>
    `<button class="size round-n ${n === target ? 'on' : ''}" data-n="${n}" aria-label="Först till ${n} vunna matcher">${n}</button>`).join(''));
}
$('#previewActions').onclick = e => {
  const b = e.target.closest('.size');
  if (!b) return;
  if (b.dataset.level) level = b.dataset.level;
  if (b.dataset.n) { target = +b.dataset.n; game.target = target; }
  savePrefs(); sfx.pop(); renderPicker(); renderScores();
};

// ---------- Blocket ----------
// Små tärningar som bild för varje rad, så att man förstår raden utan att läsa.
const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }; // prickarna på den stora tärningen (3 x 3)
const PIP_AT = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[26, 26], [50, 50], [74, 74]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]], 6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]] };
export const miniDie = n => `<svg class="mini" viewBox="0 0 100 100" aria-hidden="true"><rect x="6" y="6" width="88" height="88" rx="22" fill="#fffdf6" stroke="#b8a77f" stroke-width="7"/>${
  PIP_AT[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="#3a2614"/>`).join('')}</svg>`;
const ROW_PIC = { ones: [1], twos: [2], threes: [3], fours: [4], fives: [5], sixes: [6], pair: [5, 5], twoPairs: [3, 3, 5, 5], three: [4, 4, 4],
  four: [6, 6, 6, 6], small: [1, 2, 3, 4, 5], large: [2, 3, 4, 5, 6], house: [2, 2, 3, 3, 3], chance: [], yatzy: [6, 6, 6, 6, 6] };
const CHANCE_PIC = '<svg class="mini q" viewBox="0 0 100 100" aria-hidden="true"><rect x="6" y="6" width="88" height="88" rx="22" fill="#ffe9a8" stroke="#c98a00" stroke-width="7"/><path d="M34 38 Q34 20 51 20 Q68 20 68 36 Q68 46 57 52 Q51 55 51 64" fill="none" stroke="#7a4a00" stroke-width="10" stroke-linecap="round"/><circle cx="51" cy="80" r="7" fill="#7a4a00"/></svg>';
const rowPic = id => (id === 'chance' ? CHANCE_PIC : ROW_PIC[id].map(miniDie).join(''));

const thrown = () => rollsLeft < 3; // har spelaren kastat minst en gång den här turen?
const me = () => players[game.current];
const isBot = () => ['turn', 'busy'].includes(state) && me().bot;
const canPick = () => state === 'turn' && !busy && !isBot() && thrown() && viewing === game.current;

function renderSheet(i = viewing) {
  viewing = i;
  const p = players[i], sheet = game.sheets[i], mine = i === game.current && ['turn', 'busy'].includes(state);
  const hint = mine && thrown() && !p.bot ? p.help : 'none';
  const stars = hint === 'lots' ? Y.goodRows(sheet, dice) : [];
  const row = r => {
    const done = r.id in sheet, val = done ? sheet[r.id] : Y.score(r.id, dice);
    const ghost = !done && hint !== 'none';
    const cls = ['srow', done ? 'done' : 'free', ghost && val === 0 ? 'zero' : '', stars.includes(r.id) ? 'star' : '', canPick() && mine && !done ? 'pick' : ''].join(' ');
    return `<button class="${cls}" data-id="${r.id}" ${done || !mine ? 'tabindex="-1"' : ''}><span class="pic">${rowPic(r.id)}</span><span class="name">${r.name}</span>` +
      `<span class="val">${done ? (val === 0 ? '<s>0</s>' : val) : ghost ? `<i>${val}</i>` : ''}</span>${stars.includes(r.id) ? `<span class="glitter">${STAR}</span>` : ''}</button>`;
  };
  const up = Y.upperSum(sheet), need = Math.max(0, Y.BONUS_AT - up), upDone = Y.UPPER.every(id => id in sheet);
  $('#sheet').style.setProperty('--c', p.color);
  $('#sheet').classList.toggle('peek', !mine && state !== 'preview');
  $('#sheet').innerHTML =
    `<header class="sheet-head"><span class="sheet-face">${figure(p)}</span><b>${esc(p.name)}</b><span class="sheet-total">${Y.total(sheet)}</span></header>` +
    `<div class="group">${Y.ROWS.slice(0, 6).map(row).join('')}` +
    `<div class="srow sum"><span class="pic"></span><span class="name">Summa</span><span class="val">${up}</span></div>` +
    `<div class="srow bonus ${Y.bonus(sheet) ? 'got' : ''}"><span class="pic">${STAR}</span><span class="name">Bonus` +
    `<small>${Y.bonus(sheet) ? 'Klart!' : upDone ? 'Ingen bonus den här gången' : `${need} kvar till bonus`}</small>` +
    `<span class="meter"><i style="width:${Math.min(100, (up / Y.BONUS_AT) * 100)}%"></i></span></span><span class="val">${Y.bonus(sheet) || (upDone ? 0 : '')}</span></div></div>` +
    `<div class="group">${Y.ROWS.slice(6).map(row).join('')}</div>` +
    `<div class="srow grand"><span class="pic"></span><span class="name">Totalt</span><span class="val">${Y.total(sheet)}</span></div>`;
}

$('#sheet').addEventListener('click', e => {
  const r = e.target.closest('.srow.free');
  if (r && canPick()) onRowTap(r.dataset.id);
});

async function onRowTap(id) {
  if (!canPick() || id in game.sheets[game.current]) return;
  const value = Y.score(id, dice);
  if (value === 0) {
    busy = true;
    const yes = await ask(`Stryka ${Y.ROWS.find(r => r.id === id).name}?`, 'Raden får noll poäng.', 'voice/strike.mp3', LINES.strike, 'red', 'dice');
    busy = false;
    if (!yes) return;
  }
  await commitRow(id);
}

// Fyller i raden: siffran räknas upp, sedan nästa spelare.
async function commitRow(id) {
  busy = true;
  clearTimeout(peekTimer);
  closeTray();
  const who = game.current, bonusBefore = Y.bonus(game.sheets[who]);
  Y.fill(game, id, dice);
  const value = game.sheets[who][id];
  const cur = game.current; game.current = who; // visa ifyllningen i rätt block innan turen går vidare
  renderSheet(who);
  const cell = $(`#sheet [data-id="${id}"]`);
  cell?.classList.add('filled');
  cell?.scrollIntoView({ block: 'nearest', behavior: settings.get('calm') ? 'auto' : 'smooth' });
  const val = cell?.querySelector('.val');
  if (val && value > 0 && !settings.get('calm')) {
    for (let k = 1; k <= 12; k++) { val.textContent = Math.round((value * k) / 12); await wait(30); }
  }
  value > 0 ? sfx.good() : sfx.bad();
  if (!bonusBefore && Y.bonus(game.sheets[who])) { sfx.six(); say('bonus'); }
  game.current = cur;
  renderScores();
  await wait(700);
  busy = false;
  afterFill();
}

function renderScores() {
  $('#scores').classList.toggle('many', players.length > 2);
  $('#scores').classList.toggle('wins-on', target > 1);
  $('#scores').innerHTML = players.map((p, i) =>
    `<button class="chip p${i} ${i === game.current && !['over', 'preview'].includes(state) ? 'on' : ''} ${i === viewing ? 'viewing' : ''}" data-i="${i}" style="--c:${p.color}">` +
    `<span class="chip-face">${figure(p)}</span><b>${esc(p.name)}</b><span class="num">${Y.total(game.sheets[i])}</span>` +
    (target > 1 ? `<span class="wins" aria-label="Vunna matcher">${ART.golden}${game.wins[i]}</span>` : '') + '</button>').join('');
}
// Kika på någon annans block en stund.
$('#scores').onclick = e => {
  const c = e.target.closest('.chip');
  if (!c || !game) return;
  const i = +c.dataset.i;
  clearTimeout(peekTimer);
  sfx.click();
  renderSheet(i); renderScores();
  if (i !== game.current && state !== 'preview') peekTimer = setTimeout(() => { renderSheet(game.current); renderScores(); }, 3000);
};

// ---------- Tur ----------
function start() {
  sfx.good();
  game = Y.createGame(players, target);
  game.starter = 0;
  beginPlay();
}
$('#startBtn').onclick = start;
// Gemensamt för ny match och fortsatt match.
function beginPlay() {
  music.play(SONGS[song]);
  $('#previewActions').hidden = true;
  $('#turnbar').hidden = false;
  show('play');
  state = 'turn';
  startTurn();
}

let botFast = false; // ett tryck under Robos tur snabbspolar resten av turen
async function startTurn() {
  dice = [1, 1, 1, 1, 1]; held = held.map(() => false); rollsLeft = 3; botFast = false;
  clearTimeout(peekTimer); clearTray();
  viewing = game.current;
  renderScores(); renderSheet(game.current); renderTurnbar();
  const sh = $('#sheet');
  sh.classList.remove('flip'); void sh.offsetWidth; sh.classList.add('flip'); // bladet vänds till nästa spelare
  turnBanner();
  say(isBot() ? 'bot' : 'turn');
  if (isBot()) return botTurn();
  await wait(settings.get('calm') ? 300 : 1000);
  if (state === 'turn' && !isBot() && !thrown()) openTray();
}
// Spelarens ansikte stort i mitten en kort stund (samma som i Blåbärsjakten).
let bannerTimer;
function turnBanner() {
  if (players.length < 2) return;
  const b = $('#turnBanner'), p = me();
  b.style.setProperty('--c', p.color);
  b.innerHTML = `<span>${figure(p)}</span><b>${esc(p.name)}</b>`;
  b.hidden = false;
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  sfx.turn(game.current);
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => (b.hidden = true), 1300);
}

// Robo: kastar, sparar tärningar efter sin nivå och väljer en rad. Lagom takt, och ett tryck snabbspolar.
const botWait = ms => wait(botFast ? Math.min(ms, 80) : ms);
async function botTurn() {
  const g0 = game, who = game.current;
  const still = () => state === 'turn' && game === g0 && game.current === who;
  await botWait(1300);
  for (let t = 0; t < 3 && still(); t++) {
    openTray();
    await botWait(350);
    if (botFast) skip = true;
    await autoThrow();
    if (!still() || rollsLeft === 0) break;
    const h = Y.botHold(game.sheets[who], dice, level);
    if (h.every(Boolean)) break; // nöjd: kastar inte mer
    await botWait(500);
    for (let k = 0; k < 5; k++) if (h[k] !== held[k]) { held[k] = h[k]; sfx.hold(h[k]); placeDie(k, true); renderTurnbar(); await botWait(260); }
    await botWait(500);
  }
  if (!still()) return;
  const id = Y.botPick(game.sheets[who], dice, level);
  await botWait(800);
  if (still()) await commitRow(id);
}
// Tryck på poängpillren, knapparna högst upp eller en fråga snabbspolar inte (man kanske bara vill kika).
document.addEventListener('pointerdown', e => { if (isBot() && !e.target.closest('#scores, .dialog, .icon-btn, .overlay')) { botFast = true; skip = true; } });
function renderTurnbar() {
  $('#rolls').innerHTML = [0, 1, 2].map(k => `<i class="${k < rollsLeft ? 'on' : ''}"></i>`).join('');
  const c = [0, 0, 0, 0, 0, 0, 0];
  dice.forEach(d => c[d]++);
  $('#hold').style.setProperty('--c', me().color);
  $('#hold').innerHTML = thrown() ? dice.map((d, k) =>
    `<button class="hd ${held[k] ? 'held' : trayOpen ? 'away' : ''} ${c[d] >= 2 ? 'match' : ''}" data-k="${k}" aria-label="Tärning ${d}${held[k] ? ', sparad' : ''}">${miniDie(d)}</button>`).join('') : '';
  const btn = $('#cupBtn');
  btn.disabled = isBot() || busy || trayOpen || !Y.canThrow(rollsLeft, held, busy);
  btn.innerHTML = `${ICONS.dice}<span>${!thrown() ? 'Skaka' : rollsLeft === 0 ? 'Välj en rad' : !held.includes(false) ? 'Släpp en tärning' : 'Kasta igen'}</span>`;
}
$('#hold').onclick = e => {
  const b = e.target.closest('.hd');
  if (!b || isBot() || busy || rollsLeft === 0 || trayOpen) return;
  const k = +b.dataset.k;
  held[k] = !held[k];
  sfx.hold(held[k]); renderTurnbar();
};
$('#cupBtn').onclick = () => { if (!isBot() && Y.canThrow(rollsLeft, held, busy)) openTray(); };

// ---------- Asken och bägaren ----------
const DSIZE = () => (innerWidth < 600 ? 56 : 72);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const CUBE_FACES = [1, 2, 3, 4, 5, 6].map(n =>
  `<div class="face f${n}">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => (PIPS[n].includes(c) ? `<i style="grid-area:${Math.ceil(c / 3)}/${(c - 1) % 3 + 1}"></i>` : '')).join('')}</div>`).join('');
// Bägaren: läder med mässingsband, ritad i SVG.
$('#cup').innerHTML = `<svg viewBox="0 0 120 140" aria-hidden="true">
  <defs><linearGradient id="cupL" x1="0" x2="1"><stop offset="0" stop-color="#5a2e14"/><stop offset=".35" stop-color="#9a5a2c"/><stop offset=".6" stop-color="#7a4220"/><stop offset="1" stop-color="#4a250f"/></linearGradient>
  <linearGradient id="cupB" x1="0" x2="1"><stop offset="0" stop-color="#9a6a10"/><stop offset=".4" stop-color="#ffe08a"/><stop offset="1" stop-color="#9a6a10"/></linearGradient></defs>
  <path d="M14 22 L26 128 Q60 138 94 128 L106 22 Z" fill="url(#cupL)" stroke="#3a1c0a" stroke-width="3"/>
  <path d="M20 70 Q60 80 100 70 L99 82 Q60 92 21 82 Z" fill="url(#cupB)" opacity=".9"/>
  <path d="M25 118 Q60 128 95 118 L94 126 Q60 136 26 126 Z" fill="url(#cupB)" opacity=".8"/>
  <ellipse cx="60" cy="22" rx="46" ry="12" fill="#2a1306" stroke="url(#cupB)" stroke-width="5"/>
  <path d="M30 36 Q34 90 38 120" stroke="rgba(255,255,255,.18)" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`;
let trayOpen = false;
// Tärningarna i asken (en per plats 0–4) ligger kvar mellan kasten. pos: var de vilar på filten när de inte är sparade.
let tdice = [], pos = [];
const keepW = () => Math.round(DSIZE() * 1.5); // bredden på rutan "Sparade" till vänster i asken
function slotOf(k) { const S = DSIZE(), H = $('#felt').clientHeight; return { x: keepW() / 2, y: H / 2 + 12 + (k - 2) * (S + 8) }; }
// Lägger tärning k där den ska vara: i "Sparade" om den är sparad, annars där den landade. animate: glid dit.
function placeDie(k, animate) {
  const el = tdice[k];
  if (!el) return;
  const S = DSIZE(), p = held[k] ? slotOf(k) : pos[k];
  el.style.transition = animate && !settings.get('calm') ? 'transform .35s cubic-bezier(.3,.7,.3,1)' : 'none';
  el.style.transform = `translate(${p.x - S / 2}px, ${p.y - S / 2}px)`;
  el.firstElementChild.style.transform = '';
  el.classList.toggle('kept', held[k]);
}
function trayHint() {
  $('#trayHint').textContent = rollsLeft === 3 ? 'Skaka bägaren!'
    : rollsLeft === 0 ? ''
    : !held.includes(false) ? 'Släpp en tärning för att kasta'
    : rollsLeft === 1 ? 'Sista kastet! Tryck på tärningar för att spara dem.' : 'Tryck på tärningar för att spara dem.';
  cup.classList.toggle('off', !Y.canThrow(rollsLeft, held, busy));
  $('#throwBtn').disabled = isBot() || !Y.canThrow(rollsLeft, held, busy);
  $('#toSheetBtn').hidden = !thrown() || isBot();
  $('#tray').classList.toggle('thrown', thrown());
}
function openTray() {
  if (trayOpen) return;
  trayOpen = true;
  const bar = $('#play .bar').getBoundingClientRect();
  $('#trayLayer').style.bottom = Math.max(0, innerHeight - bar.top) + 'px';
  $('#trayLayer').hidden = false;
  $('#felt').style.setProperty('--keep', keepW() + 'px');
  resetCup();
  tdice.forEach((_, k) => placeDie(k, false)); // tärningar man sparat i raden nedanför ligger i "Sparade"
  if (!isBot() && rollsLeft < 3) say(rollsLeft === 1 ? 'last' : 'two');
  trayHint();
  renderTurnbar();
}
function closeTray() { trayOpen = false; $('#trayLayer').hidden = true; $('#trayLayer').classList.remove('slowmo'); }
function clearTray() { $('#dice').innerHTML = ''; tdice = []; pos = []; }
const toSheet = () => { if (thrown() && !busy && !isBot()) { closeTray(); renderTurnbar(); renderSheet(game.current); } };
// Tryck bredvid asken eller på "Till blocket": tillbaka till blocket (bara om man redan har kastat en gång).
$('#trayLayer').addEventListener('click', e => { if (e.target.id === 'trayLayer') toSheet(); });
$('#toSheetBtn').onclick = e => { e.stopPropagation(); toSheet(); };
// Tryck på en tärning i asken: spara den (den glider till "Sparade") eller släpp den igen.
$('#dice').addEventListener('click', e => {
  const el = e.target.closest('.tdie');
  if (!el || busy || isBot() || rollsLeft === 0) return;
  e.stopPropagation();
  const k = +el.dataset.k;
  held[k] = !held[k];
  sfx.hold(held[k]);
  placeDie(k, true);
  trayHint(); renderTurnbar();
});
const cup = $('#cup');
function resetCup() { cup.className = 'cup'; cup.style.transform = ''; }

// Skaka: håll på bägaren och dra fram och tillbaka. Varje vändning skramlar, kraftigare ju längre man skakar.
let shake = null;
cup.addEventListener('pointerdown', e => {
  if (busy || isBot() || !Y.canThrow(rollsLeft, held, busy)) return;
  try { cup.setPointerCapture(e.pointerId); } catch {}
  shake = { x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, dir: 0, n: 0, acc: 0 };
  cup.classList.add('held');
  $('#trayHint').textContent = 'Skaka, skaka …';
});
cup.addEventListener('pointermove', e => {
  if (!shake) return;
  const dx = e.clientX - shake.lx, dy = e.clientY - shake.ly, m = Math.abs(dx) > Math.abs(dy) ? dx : dy, d = Math.sign(m);
  shake.acc += Math.abs(m);
  if (d && d !== shake.dir && shake.acc > 22) {
    shake.n++; shake.dir = d; shake.acc = 0;
    sfx.rattle(Math.min(1, shake.n / 8));
    cup.classList.remove('rat'); void cup.offsetWidth; cup.classList.add('rat');
  }
  // Medan bägaren rör sig skramlar tärningarna lätt (ett klick ungefär var 30:e pixel).
  shake.move = (shake.move || 0) + Math.abs(m);
  if (shake.move > 30) { shake.move = 0; sfx.tick(Math.min(1, 0.3 + shake.n / 10)); }
  shake.lx = e.clientX; shake.ly = e.clientY;
  const ox = clamp(e.clientX - shake.x0, -80, 80), oy = clamp(e.clientY - shake.y0, -60, 40);
  cup.style.transform = `translate(${ox}px, ${oy}px) rotate(${ox / 4}deg)`;
});
cup.addEventListener('pointerup', () => {
  if (!shake) return;
  const n = shake.n;
  shake = null;
  cup.classList.remove('held');
  throwDice(n ? Math.min(1, n / 8) : 0.5);
});
cup.addEventListener('pointercancel', () => { shake = null; resetCup(); });
// Knappen Kasta: bägaren skakar av sig själv och tärningarna hälls ut (för de minsta, och för Robo).
$('#throwBtn').onclick = e => { e.stopPropagation(); if (!isBot()) autoThrow(); };
async function autoThrow() {
  if (!Y.canThrow(rollsLeft, held, busy)) return;
  busy = true;
  $('#trayHint').textContent = 'Skaka, skaka …';
  for (let k = 0; k < 5; k++) {
    sfx.rattle(0.3 + k * 0.12);
    setTimeout(() => sfx.tick(0.4), 60);
    cup.style.transform = `translate(${k % 2 ? 26 : -26}px, ${k % 2 ? -8 : 4}px) rotate(${k % 2 ? 9 : -9}deg)`;
    await wait(120);
  }
  busy = false;
  return throwDice(0.65);
}

let skip = false;
$('#tray').addEventListener('click', e => { if (!e.target.closest('#throwBtn') && busy) skip = true; }); // ett tryck snabbspolar kastet

async function throwDice(power) {
  if (!Y.canThrow(rollsLeft, held, busy)) return resetCup();
  busy = true; skip = botFast; rollsLeft--;
  renderTurnbar();
  const calm = settings.get('calm');
  const idx = [0, 1, 2, 3, 4].filter(k => !held[k]);
  const faces = idx.map(() => 1 + Math.floor(Math.random() * 6)); // slumpat och rättvist, kastet styr bara hur de rullar
  const felt = $('#felt'), W = felt.clientWidth, H = felt.clientHeight, S = DSIZE();
  // Bägaren tippar och tärningarna hälls ut från dess mynning.
  cup.style.transform = '';
  cup.classList.add('pour');
  $('#trayHint').textContent = '';
  sfx.pour();
  await wait(calm ? 120 : 240);
  const fr = felt.getBoundingClientRect(), cr = cup.getBoundingClientRect(), L = keepW() + 6;
  const mx = clamp(cr.left - fr.left + 10, L + S, W - S), my = clamp(cr.top - fr.top + cr.height * 0.4, 46 + S, H - S - $('#throwBtn').offsetHeight - 14);
  const r = () => Math.random();
  const starts = idx.map((_, j) => ({ x: mx - j * 6, y: my + (j - 2) * 10, vx: -(420 + 900 * power) * (0.7 + r() * 0.6), vy: (r() - 0.65) * (300 + 800 * power) }));
  const sim = simulateTray(starts, { l: L, t: 46, r: W, b: H - $('#throwBtn').offsetHeight - 14 }, S, Math.random); // till höger om "Sparade", under texten och ovanför knappen
  const rot = sim.frames.map((f, j) => startRotation(faces[j], f.at(-1), Math.random));
  const final = dice.map((d, k) => (held[k] ? d : faces[idx.indexOf(k)]));
  if (!tdice.length) { // första kastet i turen: fem tärningar läggs i asken
    $('#dice').innerHTML = [0, 1, 2, 3, 4].map(k => `<div class="tdie" data-k="${k}" style="--s:${S / 96};width:${S}px;height:${S}px"><div class="tshadow"></div><div class="tlift"><div class="cube">${CUBE_FACES}</div></div></div>`).join('');
    tdice = [...$('#dice').children];
  }
  const els = idx.map(k => tdice[k]);
  els.forEach(el => { el.style.transition = 'none'; el.classList.remove('match', 'kept'); el.querySelector('.tshadow').style.opacity = ''; });
  // När stannar varje tärning? (sista bildrutan den rör sig)
  const stopAt = sim.frames.map(f => { for (let i = f.length - 1; i > 0; i--) if (f[i].z > 0 || Math.hypot(f[i].x - f[i - 1].x, f[i].y - f[i - 1].y) > 0.3) return i; return 0; });
  // Spänning: fyra lika och den femte rullar fortfarande. Då går den sista i slow motion med trumvirvel.
  let slow = -1, s0 = 0;
  if (idx.length) {
    const last = stopAt.indexOf(Math.max(...stopAt)), k = idx[last];
    const others = final.filter((_, i) => i !== k), c = [0, 0, 0, 0, 0, 0, 0];
    others.forEach(d => c[d]++);
    s0 = Math.max(0, stopAt[last] - 45); // den sista biten av rullningen går i halv fart
    if (c.includes(4) && !calm) slow = last;
  }
  const len = sim.length, endIdx = slow < 0 ? len - 1 : s0 + (len - 1 - s0) * 2;
  let drum = false;
  await new Promise(done => {
    const t0 = performance.now();
    let shown = -1;
    const step = now => {
      let i = Math.max(0, Math.floor((now - t0) / 1000 / DT));
      if (skip) i = endIdx;
      i = Math.min(i, endIdx);
      els.forEach((el, j) => {
        const n = Math.min(len - 1, j === slow && i > s0 ? s0 + Math.floor((i - s0) / 2) : i), f = sim.frames[j][n];
        el.style.transform = `translate(${f.x - S / 2}px, ${f.y - S / 2 - f.z}px)`;
        el.firstElementChild.style.transform = `translate(0, ${f.z}px) scale(${Math.max(0.5, 1 - f.z / 300)})`;
        el.querySelector('.cube').style.transform = `rotateX(${rot[j].rx + f.rx}deg) rotateY(${rot[j].ry + f.ry}deg)`;
      });
      if (!skip) for (let n = shown + 1; n <= i; n++) { const kn = Math.max(...sim.frames.map(f => f[Math.min(len - 1, n)].knock)); if (kn) { sfx.knock(kn); break; } }
      shown = i;
      if (slow >= 0 && i > s0 && !drum && !skip) { drum = true; $('#trayLayer').classList.add('slowmo'); sfx.drumroll((endIdx - s0) * DT * 1000); }
      if (i >= endIdx) return done();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  $('#trayLayer').classList.remove('slowmo');
  dice = final;
  idx.forEach((k, j) => { const f = sim.frames[j].at(-1); pos[k] = { x: f.x, y: f.y }; });
  sfx.land();
  // Tärningar med samma siffra lyser upp.
  const c = [0, 0, 0, 0, 0, 0, 0];
  dice.forEach(d => c[d]++);
  tdice.forEach((el, k) => el.classList.toggle('match', c[dice[k]] >= 2));
  await celebrate(slow >= 0);
  if (rollsLeft === 0) {
    // Sista kastet: alla tärningar glider ner till raden under blocket, och man väljer en rad.
    await wait(calm ? 250 : 550);
    await glideToHold(tdice, [0, 1, 2, 3, 4]);
    closeTray();
  }
  busy = false;
  if (trayOpen) trayHint(); // asken är kvar: nu kan man spara tärningar och kasta igen
  renderTurnbar(); renderSheet(game.current);
  if (rollsLeft === 0 && !isBot()) say('pick');
}

// Firande när tärningarna har landat: Yatzy, stege, kåk och fyrtal.
async function celebrate(wasClose) {
  const free = id => !(id in game.sheets[game.current]);
  if (Y.score('yatzy', dice) > 0) {
    call('Yatzy!', 'big');
    say('yatzy');
    sfx.six(); setTimeout(() => sfx.win(), 250);
    if (!settings.get('calm')) { fireworks(2600); document.body.classList.remove('quake'); void document.body.offsetWidth; document.body.classList.add('quake'); }
    return wait(1400);
  }
  if (wasClose) sfx.almost();
  const best = [['large', 'Stor stege!'], ['small', 'Liten stege!'], ['house', 'Kåk!'], ['four', 'Fyrtal!']].find(([id]) => free(id) && Y.score(id, dice) > 0);
  if (best) { call(best[1]); say(best[0]); sfx.good(); return wait(700); }
}
function call(text, cls = '') {
  const el = document.createElement('div');
  el.className = `call ${cls}`;
  el.textContent = text;
  $('#tray').append(el);
  setTimeout(() => el.remove(), 1600);
}

// Tärningarna glider från asken ner till raden med tärningar under blocket.
async function glideToHold(els, idx) {
  trayOpen = false; renderTurnbar(); trayOpen = true; // rita raden med de nya tärningarna (osynliga tills tärningarna är framme)
  const slots = [...document.querySelectorAll('#hold .hd')];
  idx.forEach(k => slots[k]?.classList.add('arriving'));
  const fr = $('#felt').getBoundingClientRect(), S = DSIZE();
  els.forEach((el, j) => {
    const t = slots[idx[j]]?.getBoundingClientRect();
    if (!t) return;
    el.style.transition = 'transform .38s cubic-bezier(.4,.1,.3,1)';
    el.style.transform = `translate(${t.left - fr.left + t.width / 2 - S / 2}px, ${t.top - fr.top + t.height / 2 - S / 2}px) scale(${t.width / S})`;
    el.querySelector('.tshadow').style.opacity = 0;
  });
  await wait(settings.get('calm') ? 150 : 400);
  slots.forEach(s => s.classList.remove('arriving'));
}

// Fyrverkeri (samma som i Blåbärsjakten).
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

function afterFill() {
  if (Y.matchOver(game)) return endMatch();
  save();
  startTurn();
}

// ---------- Matchen är slut: prispallen ----------
function endMatch() {
  state = 'over';
  closeTray();
  const rank = Y.ranking(game);
  rank.forEach((r, i) => r === 1 && game.wins[i]++);
  const champ = game.wins.some(w => w >= game.target);
  champ ? clearSave() : save();
  renderScores();
  const order = players.map((p, i) => i).sort((a, b) => rank[a] - rank[b]);
  const shown = [order[1], order[0], order[2], order[3]].filter(i => i !== undefined); // tvåan, ettan, trean, fyran
  $('#podiumList').innerHTML = shown.map(i =>
    `<div class="step rank${rank[i]}"><span class="score">${miniDie(6)}<b>${Y.total(game.sheets[i])}</b></span>` +
    `<span class="pawn-big">${figure(players[i], false)}</span>` +
    `<div class="block"><span class="medal">${rank[i]}</span><span class="plate">${esc(players[i].name)}</span></div></div>`).join('');
  const winners = order.filter(i => rank[i] === 1).map(i => players[i].name);
  const who = winners.length > 1 ? 'Det blev lika!' : `${winners[0]} vann`;
  $('#winTitle').textContent = winners.length > 1 ? who : champ ? `${who}${game.target > 1 ? ' hela spelet' : ''}!` : `${who} matchen!`;
  $('#winText').textContent = game.target > 1 ? `Ställning: ${game.wins.join('–')}. Först till ${game.target}.` : '';
  $('#nextBtn').hidden = champ;
  $('#againBtn').hidden = !champ;
  const FLAG = ['#e53935', '#fbc02d', '#43a047', '#1e88e5', '#8e24aa', '#fb8c00'];
  $('#flags').innerHTML = Array.from({ length: 16 }, (_, i) => {
    const x = 30 + i * 62, y = 6 + 54 * 4 * (x / 1000) * (1 - x / 1000) * 0.5;
    return `<path d="M${x - 18} ${y} L${x + 18} ${y} L${x} ${y + 34}Z" fill="${FLAG[i % FLAG.length]}"/>`;
  }).join('');
  $('#confetti').innerHTML = Array.from({ length: 28 }, (_, i) =>
    `<i style="left:${Math.random() * 100}%;background:${FLAG[i % FLAG.length]};animation-delay:${-Math.random() * 6}s;animation-duration:${4 + Math.random() * 4}s"></i>`).join('');
  $('#podium').hidden = false;
  if (!settings.get('calm')) fireworks(4000);
  sfx.win();
  say(winners.length > 1 ? 'tie' : 'win');
  // Knapparna är gråa en sekund, så att ett oväntat tryck inte startar en ny match av misstag.
  const btns = document.querySelectorAll('#podium .btn');
  btns.forEach(b => (b.disabled = true));
  setTimeout(() => btns.forEach(b => (b.disabled = false)), 1000);
}
// Nästa match: blocken töms, nästa spelare börjar.
$('#nextBtn').onclick = () => {
  $('#podium').hidden = true; sfx.click();
  Y.nextMatch(game);
  save();
  state = 'turn'; startTurn();
};
$('#againBtn').onclick = () => { $('#podium').hidden = true; sfx.click(); state = 'setup'; renderSetup(); show('setup'); music.play(MENU_SONG); };
$('#menuBtn').onclick = () => (location.href = '../../index.html');

// ---------- Spara pågående match (efter varje ifylld rad) ----------
const SAVE = 'yatzy-save';
function save() { try { localStorage.setItem(SAVE, JSON.stringify({ game: Y.toSave(game), level })); } catch {} }
function clearSave() { try { localStorage.removeItem(SAVE); } catch {} }
async function offerResume() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SAVE) || 'null'); } catch {}
  if (!saved?.game?.sheets) return;
  if (!(await ask('Fortsätta förra matchen?', 'Matchen sparades där ni slutade.', null, null, 'green'))) return clearSave();
  game = Y.fromSave(saved.game);
  if (Y.matchOver(game)) Y.nextMatch(game); // sparad efter en färdig match: fortsätt med nästa match i serien
  players = game.players; target = game.target; level = saved.level || level;
  bot = players.some(p => p.bot);
  beginPlay();
}

// ---------- Knappar högst upp ----------
const inGame = () => ['turn', 'busy'].includes(state);
$('#backBtn').onclick = async () => {
  if (state === 'preview') { show('setup'); state = 'setup'; return; } // tillbaka till spelarna
  if (inGame() && !(await confirmQuit('Yatzy'))) return;
  location.href = '../../index.html';
};

// Inställningar (samma som i de andra spelen): musik, låtar, volym, ljud, berättaren, lugnt läge.
const soundIcon = () => ($('#soundBtn').innerHTML = `<svg viewBox="0 0 40 40"><path d="M6 15 H13 L22 7 V33 L13 25 H6Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>${
  ['sfx', 'music'].some(settings.get)
    ? '<path d="M27 14 Q31 20 27 26 M31 10 Q38 20 31 30" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'
    : '<path d="M28 15 L36 25 M36 15 L28 25" stroke="#ff8a80" stroke-width="3.5" stroke-linecap="round"/>'}</svg>`);
const SONG_ICON = { kvall: miniDie(1), regn: miniDie(2), tradgard: miniDie(3), fyren: miniDie(4) };
function renderSongs() {
  $('#songList').innerHTML = Object.entries(SONGS).map(([key, s]) =>
    `<button class="song ${key === song ? 'on' : ''}" data-song="${key}">${SONG_ICON[key] || ''}<small>${s.name}</small></button>`).join('');
}
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
  song = key; savePrefs();
  if (!settings.get('music')) settings.set('music', true);
  $('#soundPanel').querySelector('[data-pref="music"]').checked = true;
  music.play(SONGS[key]);
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
  playClip('voice/rules.mp3', $('#rulesText').innerText, undefined, 'always').then(() => setReading(false));
};
try { if (!localStorage.getItem('yatzy-seen')) { setRules(true); localStorage.setItem('yatzy-seen', '1'); } } catch {}

music.autostart(MENU_SONG);
fillIcons();
renderSetup();
offerResume();
