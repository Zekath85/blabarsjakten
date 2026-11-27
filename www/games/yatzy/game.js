import * as Y from './logic.js';
import { ART } from '../blabarsjakten/art.js';
import { SONGS } from '../blabarsjakten/songs.js';
import { sfx, settings, playClip, stop } from '../../shared/audio.js';
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

// ---------- Val som sparas ----------
let count = 2, names = ['Spelare 1', 'Spelare 2', 'Spelare 3', 'Spelare 4'], looks = DEFAULT_LOOKS.map(l => ({ ...l })), bot = false, botName = 'Robo';
let level = 'normal', target = 1, help = ['some', 'some', 'some', 'some']; // help: per plats (spelare 1–4)
try { ({ names, looks, bot, botName, count } = { names, looks, bot, botName, count, ...JSON.parse(localStorage.getItem('bbj-players') || '{}') }); } catch {}
try { ({ level, target, help } = { level, target, help, ...JSON.parse(localStorage.getItem('yatzy-prefs') || '{}') }); } catch {}
if (![1, 2, 3].includes(target)) target = 1;
const savePrefs = () => { try { localStorage.setItem('yatzy-prefs', JSON.stringify({ level, target, help })); } catch {} };
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
    const yes = await ask(`Stryka ${Y.ROWS.find(r => r.id === id).name}?`, 'Raden får noll poäng.', 'voice/strike.mp3', 'Vill du stryka raden?');
    busy = false;
    if (!yes) return;
  }
  await commitRow(id);
}

// Fyller i raden: siffran räknas upp, sedan nästa spelare.
async function commitRow(id) {
  busy = true;
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
  if (!bonusBefore && Y.bonus(game.sheets[who])) { sfx.six(); }
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

// ---------- Tur (tillfälligt: knappen slumpar tärningarna, kastet med bägaren kommer i nästa steg) ----------
function start() {
  sfx.good();
  music.play(SONGS[settings.get('song')] || SONGS.theme);
  $('#previewActions').hidden = true;
  $('#turnbar').hidden = false;
  state = 'turn';
  startTurn();
}
$('#startBtn').onclick = start;

function startTurn() {
  dice = [1, 1, 1, 1, 1]; held = held.map(() => false); rollsLeft = 3;
  viewing = game.current;
  renderScores(); renderSheet(game.current); renderTurnbar();
}
function renderTurnbar() {
  $('#rolls').innerHTML = [0, 1, 2].map(k => `<i class="${k < rollsLeft ? 'on' : ''}"></i>`).join('');
  $('#hold').innerHTML = thrown() ? dice.map((d, k) => `<button class="hd ${held[k] ? 'held' : ''}" data-k="${k}" aria-label="Tärning ${d}${held[k] ? ', sparad' : ''}">${miniDie(d)}</button>`).join('') : '';
  const btn = $('#cupBtn');
  btn.disabled = !Y.canThrow(rollsLeft, held, busy) || isBot();
  btn.textContent = 'Slumpa';
}
$('#hold').onclick = e => {
  const b = e.target.closest('.hd');
  if (!b || isBot() || busy || rollsLeft === 0) return;
  held[+b.dataset.k] = !held[+b.dataset.k];
  sfx.pop(); renderTurnbar();
};
$('#cupBtn').onclick = () => {
  if (!Y.canThrow(rollsLeft, held, busy)) return;
  dice = dice.map((d, k) => (held[k] ? d : 1 + Math.floor(Math.random() * 6)));
  rollsLeft--;
  renderTurnbar(); renderSheet(game.current);
};

function afterFill() {
  if (Y.matchOver(game)) { state = 'over'; renderScores(); return; }
  startTurn();
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
