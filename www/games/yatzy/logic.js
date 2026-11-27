// Yatzy: regler och poäng (svensk Yatzy). Inget om skärmen här, så att allt kan testas i test/logic.test.js.

export const ROWS = [
  { id: 'ones', name: 'Ettor' }, { id: 'twos', name: 'Tvåor' }, { id: 'threes', name: 'Treor' },
  { id: 'fours', name: 'Fyror' }, { id: 'fives', name: 'Femmor' }, { id: 'sixes', name: 'Sexor' },
  { id: 'pair', name: 'Ett par' }, { id: 'twoPairs', name: 'Två par' }, { id: 'three', name: 'Tretal' },
  { id: 'four', name: 'Fyrtal' }, { id: 'small', name: 'Liten stege' }, { id: 'large', name: 'Stor stege' },
  { id: 'house', name: 'Kåk' }, { id: 'chance', name: 'Chans' }, { id: 'yatzy', name: 'Yatzy' },
];
export const UPPER = ROWS.slice(0, 6).map(r => r.id);
export const BONUS_AT = 63, BONUS = 50;

// Hur många av varje siffra: c[1] = antal ettor … c[6] = antal sexor.
const counts = dice => dice.reduce((c, d) => (c[d]++, c), [0, 0, 0, 0, 0, 0, 0]);
const sum = dice => dice.reduce((a, b) => a + b, 0);
// Siffror som finns minst n gånger, högst först.
const atLeast = (c, n) => [6, 5, 4, 3, 2, 1].filter(f => c[f] >= n);

export function score(id, dice) {
  const c = counts(dice);
  const up = UPPER.indexOf(id);
  if (up >= 0) return c[up + 1] * (up + 1);
  switch (id) {
    case 'pair': { const f = atLeast(c, 2)[0]; return f ? f * 2 : 0; }
    case 'twoPairs': { const f = atLeast(c, 2); return f.length >= 2 ? (f[0] + f[1]) * 2 : 0; }
    case 'three': { const f = atLeast(c, 3)[0]; return f ? f * 3 : 0; }
    case 'four': { const f = atLeast(c, 4)[0]; return f ? f * 4 : 0; }
    case 'small': return [1, 2, 3, 4, 5].every(f => c[f] === 1) ? 15 : 0;
    case 'large': return [2, 3, 4, 5, 6].every(f => c[f] === 1) ? 20 : 0;
    case 'house': return c.includes(3) && c.includes(2) ? sum(dice) : 0; // fem lika är inte kåk
    case 'chance': return sum(dice);
    case 'yatzy': return c.includes(5) ? 50 : 0;
  }
  throw new Error('Okänd rad: ' + id);
}

export const upperSum = sheet => UPPER.reduce((a, id) => a + (sheet[id] || 0), 0);
export const bonus = sheet => (upperSum(sheet) >= BONUS_AT ? BONUS : 0);
export const total = sheet => ROWS.reduce((a, r) => a + (sheet[r.id] || 0), 0) + bonus(sheet);
export const left = sheet => ROWS.map(r => r.id).filter(id => !(id in sheet));

export function createGame(players, target = 1) {
  return { players: players.map(p => ({ ...p })), sheets: players.map(() => ({})), current: 0, wins: players.map(() => 0), target, round: 1 };
}

// Fyll i en rad för den som har tur, och gå vidare till nästa spelare som har rader kvar.
export function fill(g, id, dice) {
  const sheet = g.sheets[g.current];
  if (id in sheet) throw new Error(`Raden ${id} är redan ifylld`);
  const points = score(id, dice);
  sheet[id] = points;
  const n = g.players.length;
  for (let k = 1; k <= n; k++) {
    const next = (g.current + k) % n;
    if (left(g.sheets[next]).length) {
      if (next <= g.current) g.round++;
      g.current = next;
      break;
    }
  }
  return points;
}

export const matchOver = g => g.sheets.every(s => left(s).length === 0);
// Placering per spelare (1 = bäst). Lika poäng ger samma placering.
export function ranking(g) {
  const t = g.sheets.map(total);
  return t.map(x => 1 + t.filter(y => y > x).length);
}
export function newMatch(g) { g.sheets = g.players.map(() => ({})); g.current = 0; g.round = 1; }

export const toSave = g => JSON.parse(JSON.stringify(g));
export const fromSave = o => JSON.parse(JSON.stringify(o));

// ---------- Hjälp och datorn ----------
export const LEVELS = ['easy', 'normal', 'hard'];
export const HELP = ['none', 'some', 'lots'];
// Vad en rad brukar ge i ett vanligt spel. Används för att se om ett kast är bra för raden.
export const TYPICAL = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18, pair: 8, twoPairs: 14, three: 12, four: 13, small: 15, large: 20, house: 18, chance: 22, yatzy: 20 }; // yatzy: snittet i ett spel är lågt eftersom den är ovanlig
const value = (id, dice) => score(id, dice) / TYPICAL[id];

// Stjärnor vid bra rader: 0, 2 eller 3 rader, aldrig en enda (spelet ska inte peka ut "bästa valet").
export function goodRows(sheet, dice) {
  const free = left(sheet).filter(id => score(id, dice) > 0).sort((a, b) => value(b, dice) - value(a, dice));
  const good = free.filter(id => value(id, dice) >= 1).slice(0, 3);
  if (good.length === 1) return free.length > 1 ? free.slice(0, 2) : [];
  return good;
}

const mostCommon = dice => { const c = counts(dice); return [6, 5, 4, 3, 2, 1].reduce((best, f) => (c[f] > c[best] ? f : best), 6); };
const keepFace = (dice, f) => dice.map(d => d === f);
// Fyra tärningar i följd (för stegarna): behåll en av varje i följden.
function straightHold(dice) {
  for (const run of [[2, 3, 4, 5], [1, 2, 3, 4], [3, 4, 5, 6]]) {
    if (run.every(f => dice.includes(f))) { const used = new Set(); return dice.map(d => run.includes(d) && !used.has(d) && used.add(d)); }
  }
  return null;
}
const bestFree = (sheet, dice) => Math.max(...left(sheet).map(id => value(id, dice)));

export function botHold(sheet, dice, level, rnd = Math.random) {
  if (level === 'hard') {
    // Prova alla 32 sätt att spara, slå om resten många gånger och välj det som brukar ge bäst rad.
    let best = null, bestMean = -1;
    for (let mask = 0; mask < 32; mask++) {
      const hold = dice.map((_, i) => !!(mask & (1 << i)));
      let s = 0;
      for (let k = 0; k < 100; k++) s += bestFree(sheet, dice.map((d, i) => (hold[i] ? d : 1 + Math.floor(rnd() * 6))));
      if (s > bestMean) { bestMean = s; best = hold; }
    }
    return best;
  }
  const free = left(sheet);
  if (level === 'normal' && (free.includes('small') || free.includes('large'))) { const s = straightHold(dice); if (s) return s; }
  return keepFace(dice, mostCommon(dice));
}

export function botPick(sheet, dice, level, rnd = Math.random) {
  const free = left(sheet);
  if (level === 'easy' && rnd() < 0.5) {
    const some = free.filter(id => score(id, dice) > 0);
    if (some.length) return some[Math.floor(rnd() * some.length)];
  }
  if (level === 'easy') return free.reduce((a, b) => (score(b, dice) > score(a, dice) ? b : a));
  const top = free.reduce((a, b) => (value(b, dice) > value(a, dice) ? b : a));
  if (score(top, dice) > 0) return top;
  return free.reduce((a, b) => (TYPICAL[b] < TYPICAL[a] ? b : a)); // allt ger 0: stryk den rad som brukar ge minst
}
