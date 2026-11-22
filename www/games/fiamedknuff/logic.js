// Reglerna i Fia med knuff. Ren logik, inga bilder. Testas i test/logic.test.js.
// En pjäs har ett "steg-tal" (progress):
//   -1 = hemma, 0..39 = på banan (0 = egna startrutan), 40..42 = färgade gången in mot mål, 43 = i mål.
// Banan har 40 rutor. Varje spelare har en plats (seat 0-3) med startruta 10 rutor efter förra platsen.
// Exakt slag krävs för att gå i mål: pjäsen får inte gå förbi målet.
export const HOME = -1, TRACK_LEN = 40, GOAL = 43;
export const LEVELS = ['easy', 'normal', 'hard'];
export const rollDie = (rnd = Math.random) => 1 + Math.floor(rnd() * 6);

// ---------- Brädet: ett kors på ett rutnät 11 x 11 (x = kolumn, y = rad) ----------
const rot = ([x, y], k = 1) => { for (; k > 0; k--) [x, y] = [10 - y, x]; return [x, y]; }; // ett kvarts varv medsols runt mitten
const ARM = [[6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [10, 5]]; // armen uppåt: 10 rutor, medsols
export const TRACK = [0, 1, 2, 3].flatMap(s => ARM.map(c => rot(c, s)));          // alla 40 banrutor, medsols
export const HOME_SPOTS = [[8, 1], [9, 1], [8, 2], [9, 2]].map(c => rot(c, 0));  // fyra platser hemma (för plats 0)
export const LANE = [[5, 1], [5, 2], [5, 3], [5, 4]];                             // gången in mot mål (steg 40..43)
export const seatsFor = n => (n === 2 ? [0, 2] : [0, 1, 2, 3].slice(0, n));       // två spelare sitter mitt emot varandra
// Vilken ruta (x, y) en pjäs står på. i = vilken av de fyra pjäserna (för platserna hemma).
export const cellOf = (seat, prog, i = 0) =>
  prog < 0 ? rot(HOME_SPOTS[i], seat) : prog < TRACK_LEN ? TRACK[(seat * 10 + prog) % TRACK_LEN] : rot(LANE[prog - TRACK_LEN], seat);

// ---------- Spelet ----------
export const createGame = n => ({ n, seats: seatsFor(n), pieces: Array.from({ length: n }, () => Array(4).fill(HOME)) });
const trackAt = (g, p, prog) => (g.seats[p] * 10 + prog) % TRACK_LEN;
const onTrack = v => v >= 0 && v < TRACK_LEN;
// Vilken pjäs står på banruta t? { p, i } eller null.
export function whoAt(g, t) {
  for (let p = 0; p < g.n; p++) for (let i = 0; i < 4; i++) if (onTrack(g.pieces[p][i]) && trackAt(g, p, g.pieces[p][i]) === t) return { p, i };
  return null;
}
// Är alla spelarens pjäser hemma (eller redan i mål)? Då får hen slå tre gånger för att få en sexa.
export const needSix = (g, p) => g.pieces[p].every(v => v === HOME || v === GOAL);
export const rollsAllowed = (g, p) => (needSix(g, p) ? 3 : 1);
export const hasWon = (g, p) => g.pieces[p].every(v => v === GOAL);
export const inGoal = (g, p) => g.pieces[p].filter(v => v === GOAL).length;

// Pjäser som får flyttas med slaget d: [{ i, to }]. Sexa tar ut en pjäs. Man får inte landa på sin egen pjäs (utom i mål)
// och inte gå förbi målet. Tom lista = inget drag går.
export function legalMoves(g, p, d) {
  const out = [];
  let homeSeen = false;
  g.pieces[p].forEach((prog, i) => {
    let to;
    if (prog === HOME) { if (d !== 6 || homeSeen) return; homeSeen = true; to = 0; } // pjäserna hemma är likadana: ett drag räcker
    else if (prog === GOAL) return;
    else { to = prog + d; if (to > GOAL) return; }
    if (to < GOAL && g.pieces[p].includes(to)) return;
    out.push({ i, to });
  });
  return out;
}

// Gör draget. Landar man på en motståndares pjäs knuffas den hem. Gången in mot mål är trygg.
export function applyMove(g, p, i, d) {
  const from = g.pieces[p][i], to = from === HOME ? 0 : from + d;
  g.pieces[p][i] = to;
  const knuffed = [];
  if (onTrack(to)) {
    const hit = whoAt({ ...g, pieces: g.pieces.map((ps, q) => (q === p ? [] : ps)) }, trackAt(g, p, to)); // bara motståndare
    if (hit) { g.pieces[hit.p][hit.i] = HOME; knuffed.push(hit); }
  }
  return { from, to, out: from === HOME, goal: to === GOAL, knuffed, won: hasWon(g, p) };
}

// Kan en motståndare knuffa en pjäs på banruta t med ett enda kast? (En sexa tar också ut en pjäs på sin startruta.)
export function threatened(g, p, t) {
  return g.pieces.some((ps, q) => q !== p && ps.some(v => {
    if (v === HOME) return trackAt(g, q, 0) === t;
    if (!onTrack(v)) return false;
    const d = (t - trackAt(g, q, v) + TRACK_LEN) % TRACK_LEN;
    return d >= 1 && d <= 6 && v + d < TRACK_LEN;
  }));
}

// Datorns val: ett drag { i, to } eller null. Tre nivåer:
//  easy:   slumpar bland de drag som går.
//  normal: går i mål om den kan, annars knuffar, annars tar ut en pjäs, annars slumpar.
//  hard:   går i mål, knuffar (helst den som kommit längst), tar ut pjäser, flyttar bort en pjäs som är hotad,
//          undviker rutor där den kan bli knuffad, och flyttar annars den främsta pjäsen.
export function pickMove(g, p, d, level = 'normal', rnd = Math.random) {
  const moves = legalMoves(g, p, d);
  if (!moves.length) return null;
  const pick = list => list[Math.floor(rnd() * list.length)];
  if (level === 'easy' || moves.length === 1) return pick(moves);
  const victim = m => (onTrack(m.to) ? whoAt({ ...g, pieces: g.pieces.map((ps, q) => (q === p ? [] : ps)) }, trackAt(g, p, m.to)) : null);
  const goal = moves.filter(m => m.to === GOAL), hits = moves.filter(victim), outs = moves.filter(m => g.pieces[p][m.i] === HOME);
  if (level === 'normal') return pick(goal.length ? goal : hits.length ? hits : outs.length ? outs : moves);
  const score = m => {
    const from = g.pieces[p][m.i], v = victim(m);
    let s = m.to + rnd() * 0.5; // annars: främsta pjäsen
    if (m.to === GOAL) s += 1000;
    if (v) s += 600 + g.pieces[v.p][v.i];
    if (from === HOME) s += 300;
    if (m.to >= TRACK_LEN && m.to < GOAL) s += 60; // gången är trygg
    const wasHit = onTrack(from) && threatened(g, p, trackAt(g, p, from));
    const nowHit = onTrack(m.to) && threatened(g, p, trackAt(g, p, m.to));
    if (wasHit && !nowHit) s += 250; // skydda
    if (nowHit) s -= 200;
    return s;
  };
  return moves.map(m => [score(m), m]).sort((a, b) => b[0] - a[0])[0][1];
}
