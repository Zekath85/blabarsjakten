import * as F from './logic.js';
import { PICS, NAMES, ART } from './art.js';
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
const SIZE_NAME = { small: 'Liten', medium: 'Mellan', large: 'Stor' };
const LEVEL_NAME = { easy: 'Lätt', normal: 'Medel', hard: 'Svår' };
// Spelarnas färger: röd, blå, grön och lila (som i Fyra i rad). Paret man tar får kant i den egna färgen.
const PLAYER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#8e24aa'];
const PAIR_ICON = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="9" width="17" height="23" rx="4" fill="#fff4c9" stroke="#fff" stroke-width="2"/><rect x="17" y="9" width="17" height="23" rx="4" fill="#ffe08a" stroke="#fff" stroke-width="2" transform="rotate(8 25 20)"/></svg>';

// Baksidan: ett vitt frågetecken.
const BACK = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M33 36 Q33 16 51 16 Q69 16 69 34 Q69 46 56 54 Q50 58 50 66" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="84" r="7" fill="#fff"/></svg>';

// ---------- Val som sparas ----------
let count = 2, names = ['Spelare 1', 'Spelare 2', 'Spelare 3', 'Spelare 4'], looks = DEFAULT_LOOKS.map(l => ({ ...l })), bot = false, botName = 'Robo';
let size = 'medium', board = 'blue', level = 'normal', target = 1;
try { ({ names, looks, bot, botName, count } = { names, looks, bot, botName, count, ...JSON.parse(localStorage.getItem('bbj-players') || '{}') }); } catch {}
try { ({ size, board, level, target } = { size, board, level, target, ...JSON.parse(localStorage.getItem('memory-prefs') || '{}') }); } catch {}
const savePrefs = () => { try { localStorage.setItem('memory-prefs', JSON.stringify({ size, board, level, target })); } catch {} };
// Namn och figurer delas med de andra spelen (samma nyckel). Vi lägger bara till våra värden.
const savePlayers = () => { try { localStorage.setItem('bbj-players', JSON.stringify({ ...JSON.parse(localStorage.getItem('bbj-players') || '{}'), names, looks, count, bot, botName })); } catch {} };
const lineup = () => (bot
  ? [{ name: names[0], look: looks[0] }, { name: botName, bot: true }]
  : Array.from({ length: count }, (_, i) => ({ name: names[i], look: looks[i] }))).map((p, i) => ({ ...p, color: PLAYER_COLORS[i] }));
const figure = (p, headOnly = true) => (p.bot ? robot(p.color, headOnly) : avatar(p.look, p.color, headOnly));

// state: setup, preview (välja storlek), pick (någon får vända), busy, over
let players = lineup(), g = null, state = 'setup', mem = {}, wins = [], starter = 0, matchDone = false, gen = 0, fresh = null;
const me = () => players[g.current];
const isBot = () => !!g && state !== 'over' && me().bot;

// ---------- 1. Välj spelare ----------
function show(id) { document.querySelectorAll('.screen').forEach(s => (s.hidden = s.id !== id)); }
$('#figures').innerHTML = [['fox', '#f08a24'], ['owl', '#8e6cc9'], ['squirrel', '#3a8ee6'], ['hedgehog', '#5bb04a'], ['hare', '#d9a441'], ['bear', '#b07a45']]
  .map(([k, c]) => `<span style="background:${c}">${PICS[k]}</span>`).join('');
function renderSetup() {
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

// Figurskapare (samma som i Blåbärsjakten och Fyra i rad)
let lookIndex = 0;
function openLook(i) { lookIndex = i; sfx.click(); renderLook(); $('#lookPanel').hidden = false; }
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

// ---------- 2. Välj storlek, färg, nivå och omgångar ----------
$('#toBoardBtn').onclick = () => {
  sfx.click();
  gen++; g = null; mem = {};
  players = lineup(); wins = players.map(() => 0); state = 'preview'; matchDone = false;
  $('#bar').hidden = false;
  $('#previewActions').hidden = false;
  show('play');
  renderPicker(); buildBoard(); renderScores(); fit();
};
const gridIcon = (a, b) => {
  const w = 30 / a, h = 24 / b;
  return `<svg viewBox="0 0 40 40">${Array.from({ length: a * b }, (_, i) => `<rect x="${5 + (i % a) * w + 1}" y="${8 + Math.floor(i / a) * h + 1}" width="${w - 2}" height="${h - 2}" rx="2" fill="currentColor"/>`).join('')}</svg>`;
};
function renderPicker() {
  const pill = (id, label, buttons) => ($(id).innerHTML = `<span class="lbl">${label}</span>${buttons}`);
  pill('#sizes', 'Brickor', Object.keys(F.SIZES).map(k =>
    `<button class="size ${k === size ? 'on' : ''}" data-size="${k}" aria-label="${SIZE_NAME[k]}">${gridIcon(F.SIZES[k].a, F.SIZES[k].b)}<small>${F.pairsOf(k) * 2}</small></button>`).join(''));
  pill('#boards', 'Färg', Object.entries(BOARDS).map(([key, name]) =>
    `<button class="size color ${key === board ? 'on' : ''}" data-board="${key}" aria-label="${name}">` +
    `<svg viewBox="0 0 40 40"><rect x="3" y="5" width="34" height="30" rx="7" fill="${BOARD_SWATCH[key][0]}"/><rect x="8" y="10" width="24" height="20" rx="4" fill="${BOARD_SWATCH[key][1]}"/></svg></button>`).join(''));
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
  const d = b.dataset;
  if (d.size) size = d.size;
  if (d.board) board = d.board;
  if (d.level) level = d.level;
  if (d.n) target = +d.n;
  savePrefs(); sfx.pop(); renderPicker();
  if (d.size) buildBoard();
  renderScores(); fit();
};

// ---------- Brädet ----------
// Rutnätet väljer den riktning (bred eller hög) som ger störst brickor. Brickorna är lite högre än breda, som kort.
function fit() {
  const r = $('#boardWrap').getBoundingClientRect(), { a, b } = F.SIZES[size];
  const gap = Math.max(5, Math.min(12, r.width / 60)), chrome = innerWidth <= 600 ? 48 : 66, W = r.width - chrome, H = r.height - chrome;
  const calc = (cols, rows) => {
    let cw = (W - gap * (cols - 1)) / cols, ch = (H - gap * (rows - 1)) / rows;
    if (cw > ch * 1.1) cw = ch * 1.1; else if (ch > cw * 1.3) ch = cw * 1.3;
    return { cols, cw: Math.max(26, cw), ch: Math.max(30, ch) };
  };
  const wide = calc(a, b), tall = calc(b, a);
  const best = wide.cw * wide.ch >= tall.cw * tall.ch ? wide : tall;
  const s = $('#board').style;
  s.setProperty('--cols', best.cols); s.setProperty('--cw', best.cw + 'px'); s.setProperty('--ch', best.ch + 'px'); s.setProperty('--gap', gap + 'px');
}
addEventListener('resize', () => !$('#play').hidden && fit());
new ResizeObserver(() => !$('#play').hidden && fit()).observe($('#boardWrap'));

// Bygger alla brickor en gång. Efter det ändras bara klasser (up, taken, hov), så inget ritas om och inget spelar om sin animation.
function buildBoard() {
  const n = g ? g.cards.length : F.pairsOf(size) * 2;
  $('#board').innerHTML = Array.from({ length: n }, (_, i) =>
    `<button class="mc" data-i="${i}" aria-label="Bricka ${i + 1}"><span class="mc-in"><span class="mc-side mc-back">${BACK}</span>` +
    `<span class="mc-side mc-front">${g ? PICS[g.cards[i]] : ''}</span></span></button>`).join('');
  $('#board').classList.remove('locked');
  $('#board').style.removeProperty('--turn');
}
const cardEl = i => $(`.mc[data-i="${i}"]`);

function renderScores() {
  const sc = g ? F.scores(g) : players.map(() => 0);
  $('#scores').classList.toggle('many', players.length > 2); // fyra på en smal skärm: korgikonen göms
  $('#scores').innerHTML = players.map((p, i) => {
    const mine = g ? [...new Set(g.cards.filter((_, k) => g.owner[k] === i))] : [];
    return `<div class="pl"><div class="chip p${i} ${g && i === g.current && state !== 'over' ? 'on' : ''}" style="--c:${p.color}">` +
      `<span class="chip-face">${figure(p)}</span><b>${esc(p.name)}</b><span class="bk">${PAIR_ICON}</span><span class="num">${sc[i]}</span>` +
      (target > 1 ? `<span class="wins" aria-label="Vunna omgångar">${ART.golden}${wins[i] || 0}</span>` : '') + '</div>' +
      `<div class="got" style="--c:${p.color}">${mine.map(f => `<span class="mini ${f === fresh ? 'new' : ''}" style="--c:${p.color}">${PICS[f]}</span>`).join('')}</div></div>`;
  }).join('');
}

// ---------- Spelet ----------
// Berättaren säger vad brickan visar, "Ett par!" och "Din tur". En ny replik avbryter den förra. Går att slå av (memVoice).
const say = (file, text) => { if (settings.get('memVoice') !== false) playClip(`voice/${file}.mp3`, text, undefined, 'always'); };

$('#startBtn').onclick = () => {
  sfx.good();
  music.play(SONGS[settings.get('song')] || SONGS.theme);
  $('#bar').hidden = true;
  wins = players.map(() => 0); starter = 0; matchDone = false;
  beginRound();
};
function beginRound() {
  $('#winPanel').hidden = true;
  gen++;
  g = F.createGame(size, players.length, Math.random, starter);
  mem = F.newMemory();
  buildBoard(); fit();
  startTurn(true);
}
function startTurn(announce) {
  state = isBot() ? 'busy' : 'pick';
  $('#board').style.setProperty('--turn', me().color);
  $('#board').classList.toggle('locked', state !== 'pick');
  renderScores(); fresh = null;
  if (announce && !isBot()) say('tur', 'Nu är det din tur');
  if (isBot()) botTurn();
}

// Vänder en bricka (för människa eller dator) och datorn får se den.
function reveal(i) {
  const fig = g.cards[i];
  F.flip(g, i);
  const el = cardEl(i);
  el.classList.remove('hov');
  el.classList.add('up');
  sfx.pop();
  say(`f-${fig}`, NAMES[fig]);
  F.remember(mem, i, fig, level);
}
$('#board').addEventListener('click', async e => {
  const el = e.target.closest('.mc');
  if (!el || state !== 'pick' || isBot()) return;
  const i = +el.dataset.i;
  if (!F.canFlip(g, i)) return;
  reveal(i);
  if (g.flipped.length < 2) return;
  state = 'busy'; $('#board').classList.add('locked');
  await afterTwo();
});

// Två brickor uppe: titta en stund, sedan par eller inte.
async function afterTwo() {
  const my = gen;
  await wait(1300);
  if (my !== gen) return;
  const who = g.current, r = F.resolve(g);
  if (r.match) {
    const fig = g.cards[r.a];
    F.forget(mem, r.a, r.b);
    [r.a, r.b].forEach(i => { const el = cardEl(i); el.style.setProperty('--c', players[who].color); el.classList.add('taken'); });
    fresh = fig;
    if (['fox', 'owl', 'squirrel', 'hedgehog', 'hare', 'bear'].includes(fig)) sfx.figure(fig); else sfx.pop(); // de sex figurerna har eget ljud
    sfx.good();
    say('par', 'Ett par!');
    renderScores(); fresh = null;
    await wait(1500);
    if (my !== gen) return;
    return F.isDone(g) ? finishRound() : startTurn(false);
  }
  [r.a, r.b].forEach(i => cardEl(i).classList.remove('up'));
  sfx.click();
  await wait(650);
  if (my !== gen) return;
  startTurn(true);
}

async function botTurn() {
  const my = gen;
  const lift = async i => { cardEl(i).classList.add('hov'); await wait(500); };
  await wait(900);
  if (my !== gen) return;
  const a = F.botFirst(g, mem);
  await lift(a); if (my !== gen) return;
  reveal(a);
  await wait(1100); if (my !== gen) return;
  const b = F.botSecond(g, mem);
  await lift(b); if (my !== gen) return;
  reveal(b);
  await afterTwo();
}

// ---------- Omgång slut ----------
function finishRound() {
  state = 'over';
  const top = F.winners(g);
  if (top.length > 1) return end('draw');
  wins[top[0]]++;
  renderScores();
  sfx.win();
  end(wins[top[0]] >= target ? 'final' : 'round', top[0]);
}
// kind: 'round' (omgång klar), 'final' (någon vann spelet), 'draw' (lika)
function end(kind, w) {
  matchDone = kind === 'final';
  state = 'over';
  renderScores();
  const winner = kind === 'draw' ? null : players[w];
  const sc = F.scores(g);
  const score = target > 1 ? ` Ställning: ${wins.join('–')}. Först till ${target}.` : '';
  $('#winFace').style.setProperty('--c', winner ? winner.color : '#999');
  $('#winFace').innerHTML = winner ? figure(winner) : ART.basket;
  $('#winTitle').textContent = kind === 'draw' ? 'Lika!'
    : kind === 'final' ? `${winner.name} vann${target > 1 ? ' hela spelet' : ''}!` : `${winner.name} vann omgången!`;
  $('#winText').textContent = (kind === 'draw' ? 'Ni fick lika många par. Ingen får poäng, vi spelar om.' : kind === 'final' ? 'Grattis!' : '') +
    ` Par: ${sc.join('–')}.${score}`.trim();
  $('#nextBtn').hidden = kind === 'final';
  $('#againBtn').hidden = kind !== 'final';
  $('#menuBtn').hidden = kind === 'round';
  const FLAG = ['#e53935', '#fbc02d', '#43a047', '#1e88e5', '#8e24aa', '#fb8c00'];
  $('#confetti').innerHTML = kind === 'draw' ? '' : Array.from({ length: kind === 'final' ? 28 : 12 }, (_, i) =>
    `<i style="left:${Math.random() * 100}%;background:${FLAG[i % 6]};animation-delay:${-Math.random() * 6}s;animation-duration:${4 + Math.random() * 4}s"></i>`).join('');
  $('#winPanel').hidden = false;
  // Knapparna är gråa en sekund, så att ett oväntat tryck inte startar en ny omgång av misstag.
  const btns = document.querySelectorAll('#winPanel .btn');
  btns.forEach(b => (b.disabled = true));
  setTimeout(() => btns.forEach(b => (b.disabled = false)), 1000);
}
$('#nextBtn').onclick = () => { sfx.click(); starter = (starter + 1) % players.length; beginRound(); };
$('#againBtn').onclick = () => { $('#winPanel').hidden = true; sfx.click(); $('#toBoardBtn').onclick(); };
$('#menuBtn').onclick = () => (location.href = '../../index.html');

// ---------- Knappar högst upp ----------
const inGame = () => !['setup', 'preview'].includes(state) && !matchDone;
$('#backBtn').onclick = async () => {
  if (state === 'preview') { show('setup'); state = 'setup'; document.body.dataset.board = ''; return; }
  if (inGame() && !(await confirmQuit('Memory'))) return;
  location.href = '../../index.html';
};

// Inställningar (samma som i Fyra i rad): musik, låtar, volym, ljud, lugnt läge. Plus: berättaren (memVoice).
const soundIcon = () => ($('#soundBtn').innerHTML = `<svg viewBox="0 0 40 40"><path d="M6 15 H13 L22 7 V33 L13 25 H6Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>${
  ['sfx', 'music'].some(settings.get)
    ? '<path d="M27 14 Q31 20 27 26 M31 10 Q38 20 31 30" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'
    : '<path d="M28 15 L36 25 M36 15 L28 25" stroke="#ff8a80" stroke-width="3.5" stroke-linecap="round"/>'}</svg>`);
const SONG_ICON = { theme: ART.basket, walk: ART.tree, lullaby: ART.owl, fox: ART.fox };
function renderSongs() {
  $('#songList').innerHTML = Object.entries(SONGS).map(([key, s]) =>
    `<button class="song ${key === settings.get('song') ? 'on' : ''}" data-song="${key}">${SONG_ICON[key] || ''}<small>${s.name}</small></button>`).join('');
}
function closeSoundPanel() {
  $('#soundPanel').hidden = true;
  document.body.classList.remove('sound-open');
  if (!inGame()) music.play(MENU_SONG);
}
$('#soundBtn').onclick = () => {
  if (!$('#soundPanel').hidden) return closeSoundPanel();
  document.body.classList.add('sound-open');
  document.querySelectorAll('[data-pref]').forEach(cb => (cb.checked = cb.dataset.pref === 'memVoice' ? settings.get('memVoice') !== false : !!settings.get(cb.dataset.pref)));
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
// En enda knapp i rubrikraden: play-ikon läser upp reglerna (voice/rules.mp3), medan det läses visas bara stopp.
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
try { if (!localStorage.getItem('memory-seen')) { setRules(true); localStorage.setItem('memory-seen', '1'); } } catch {}

music.autostart(MENU_SONG);
fillIcons();
renderSetup();
