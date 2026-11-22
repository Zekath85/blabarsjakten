// Reglerna i Memory. Ren logik, inga bilder. Testas i test/logic.test.js.
// Brickorna ligger med baksidan upp. Man vänder två per tur: blir det par behåller man dem och får vända igen,
// annars vänds de tillbaka och nästa spelare tar över. Flest par vinner.

// Tre storlekar. a = långsidan, b = kortsidan (mobil i stående läge byter plats på dem). Alltid ett jämnt antal brickor.
export const SIZES = { small: { a: 4, b: 3 }, medium: { a: 4, b: 4 }, large: { a: 6, b: 5 } };
export const pairsOf = size => (SIZES[size].a * SIZES[size].b) / 2;
export const LEVELS = ['easy', 'normal', 'hard'];
// Hur stor del av det datorn ser som den kommer ihåg. Lätt glömmer nästan allt, svår nästan inget.
export const MEMORY = { easy: 0.25, normal: 0.6, hard: 0.95 };

// Alla bilder som kan vara med (15 par behövs i den största storleken).
export const FIGS = ['fox', 'owl', 'squirrel', 'hedgehog', 'hare', 'bear', 'basket', 'star', 'tree', 'flower', 'bush', 'leaf', 'mushroom', 'apple', 'butterfly'];

const shuffle = (list, rnd) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Ett nytt spel: cards[i] = bildens namn, owner[i] = vem som tog brickan (null = ligger kvar).
export function createGame(size, players, rnd = Math.random, starter = 0) {
  const figs = shuffle(FIGS, rnd).slice(0, pairsOf(size));
  return { cards: shuffle([...figs, ...figs], rnd), owner: Array(figs.length * 2).fill(null), flipped: [], current: starter, players };
}

export const canFlip = (g, i) => g.owner[i] === null && !g.flipped.includes(i) && g.flipped.length < 2;
// Vänder en bricka. Ger false om det inte går (redan vänd, tagen eller två redan uppe).
export function flip(g, i) {
  if (!canFlip(g, i)) return false;
  g.flipped.push(i);
  return true;
}
// Två brickor uppe: par eller inte. Par = spelaren behåller dem och är kvar. Annars vänds de tillbaka och nästa tar över.
export function resolve(g) {
  if (g.flipped.length !== 2) return null;
  const [a, b] = g.flipped;
  const match = g.cards[a] === g.cards[b];
  g.flipped = [];
  if (match) g.owner[a] = g.owner[b] = g.current;
  else g.current = (g.current + 1) % g.players;
  return { match, a, b };
}
export const isDone = g => g.owner.every(o => o !== null);
export const scores = g => Array.from({ length: g.players }, (_, p) => g.owner.filter(o => o === p).length / 2);
// Den som har flest par. Flera om det är lika (då blir det ingen vinnare).
export function winners(g) {
  const s = scores(g), top = Math.max(...s);
  return s.flatMap((v, p) => (v === top ? [p] : []));
}

// ---------- Datorn ----------
// Minnet: mem[i] = bilden på bricka i, men bara det datorn kommer ihåg. Allt som vänds (av vem som helst) ses,
// men bara en del fastnar (se MEMORY). Tagna brickor glöms.
export const newMemory = () => ({});
export function remember(mem, i, fig, level, rnd = Math.random) {
  if (rnd() < MEMORY[level]) mem[i] = fig;
}
export function forget(mem, ...idx) { idx.forEach(i => delete mem[i]); }

const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];
const free = g => g.owner.map((o, i) => (o === null && !g.flipped.includes(i) ? i : -1)).filter(i => i >= 0);

// Första brickan: vet datorn var ett par finns tar den det. Annars en bricka den inte har sett (så att den lär sig något nytt).
export function botFirst(g, mem, rnd = Math.random) {
  const seen = Object.entries(mem).filter(([i]) => g.owner[i] === null);
  for (const [i, f] of seen) {
    const mate = seen.find(([j, f2]) => j !== i && f2 === f);
    if (mate) return +i;
  }
  const unknown = free(g).filter(i => !(i in mem));
  return pick(unknown.length ? unknown : free(g), rnd);
}
// Andra brickan: finns paret till den första i minnet tar den det. Annars en okänd bricka (inte en den vet är fel).
export function botSecond(g, mem, rnd = Math.random) {
  const first = g.flipped[0], fig = g.cards[first];
  const mate = Object.keys(mem).map(Number).find(j => j !== first && g.owner[j] === null && mem[j] === fig);
  if (mate !== undefined) return mate;
  const rest = free(g);
  const unknown = rest.filter(i => !(i in mem));
  return pick(unknown.length ? unknown : rest, rnd);
}
