import assert from 'node:assert/strict';
import { mulberry32, generatePath, makeBoard, createGame, move, land, applyCard, nextTurn, ranking, drawCard, PATH_LEN, SIZES, estimateMinutes } from '../www/games/blabarsjakten/logic.js';
import { DECKS } from '../www/games/blabarsjakten/cards.js';
import { makeLandscape } from '../www/games/blabarsjakten/landscape.js';

// Banan, alla storlekar: rätt längd, inom rutnätet, sammanhängande, korsar aldrig sig själv, rör inte sig själv.
for (const { grid: GRID, len } of Object.values(SIZES)) for (let seed = 1; seed <= 150; seed++) {
  const path = generatePath(mulberry32(seed), GRID, len);
  assert.equal(path.length, len);
  const at = new Map(path.map((p, i) => [`${p.x},${p.y}`, i]));
  assert.equal(at.size, len, 'ingen ruta två gånger');
  path.forEach((p, i) => {
    assert.ok(p.x >= 0 && p.x < GRID && p.y >= 0 && p.y < GRID);
    if (i) assert.equal(Math.abs(p.x - path[i - 1].x) + Math.abs(p.y - path[i - 1].y), 1);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = at.get(`${p.x + dx},${p.y + dy}`);
      if (j !== undefined) assert.equal(Math.abs(j - i), 1, 'bara grannar i ordningen får röra varandra');
    }
  });
}

// Brädet
const board = makeBoard(mulberry32(7));
assert.equal(board[0].type, 'start');
assert.equal(board.at(-1).type, 'goal');
const count = t => board.filter(b => b.type === t).length;
assert.deepEqual([count('fox'), count('owl'), count('squirrel'), count('hedgehog'), count('berry')], [4, 3, 3, 3, 6]);
board.filter(b => b.type === 'berry').forEach(b => assert.ok(b.value >= 1 && b.value <= 3));

// Korthögar
assert.ok(['fox', 'owl', 'squirrel', 'hedgehog'].every(k => DECKS[k].length >= 15), 'minst 15 kort per hög');
assert.ok(DECKS.golden.every(c => ['gain', 'move', 'all', 'again'].includes(c.effect.type) && (c.effect.n ?? 1) > 0), 'gyllene kort är alltid bra');
// Räv-nivå: snäll har färre rävrutor än busig.
const foxes = lvl => makeBoard(mulberry32(5), 'medium', lvl).filter(t => t.type === 'fox').length;
assert.ok(foxes('kind') < foxes('normal') && foxes('normal') < foxes('sly'));
// Räven: inga kort som ger dig något.
assert.ok(DECKS.fox.every(({ effect: { type, n } }) => ['lose', 'giveToEach', 'none'].includes(type) || (['all', 'move'].includes(type) && n < 0)), 'Räven är aldrig snäll');
assert.ok(DECKS.fox.filter(c => c.effect.type === 'none').length <= 2, 'Räven tar oftast något');
// Alla andra kort ger alltid något bra (aldrig dåligt eller "inget händer").
const good = ({ type, n }) => ['gain', 'again', 'takeFromEach'].includes(type) || (['move', 'all'].includes(type) && n > 0);
for (const deck of ['owl', 'squirrel', 'hedgehog', 'golden']) DECKS[deck].forEach(c => assert.ok(good(c.effect), `${deck}: ${c.text}`));
// Storlekar: brädet följer storleken, och tiden växer med karta och spelare.
assert.equal(makeBoard(mulberry32(3), 'small').length, SIZES.small.len);
assert.equal(makeBoard(mulberry32(3), 'large').grid, SIZES.large.grid);
assert.ok(estimateMinutes('small', 2) < estimateMinutes('large', 2));
assert.ok(estimateMinutes('medium', 2) < estimateMinutes('medium', 4));

// Gyllene kort: aldrig från Räven, ibland från de andra.
{
  const gg = createGame(['A', 'B'], board, mulberry32(2));
  assert.equal(drawCard(gg, 'fox', () => 0).deck, 'fox');
  assert.equal(drawCard(gg, 'owl', () => 0).deck, 'golden');
  assert.equal(drawCard(gg, 'owl', () => 0.99).deck, 'owl');
}

// Hjälp åt den som ligger efter: minst korgar ger en extra på blåbärsruta.
{
  const bb = makeBoard(mulberry32(7));
  const berry = bb.findIndex(t => t.type === 'berry');
  const gg = createGame(['A', 'B'], bb, mulberry32(1));
  gg.players[0].baskets = 2; gg.players[0].pos = berry;
  assert.equal(land(gg).gained, bb[berry].value + 1);
  gg.players[0].baskets = 20;
  assert.equal(land(gg).gained, bb[berry].value, 'den som leder får ingen extra');
}

// Start
let g = createGame(['A', 'B', 'C', 'D'], board, mulberry32(1));
assert.deepEqual(g.players.map(p => p.baskets), [10, 10, 10, 10]);

// Dra kort: kortet läggs underst
const first = g.decks.fox[0];
assert.equal(drawCard(g, 'fox'), first);
assert.equal(g.decks.fox.at(-1), first);

// Flytt: hopp-lista, golv på start, tak på mål
assert.deepEqual(move(g, 3), [1, 2, 3]);
assert.deepEqual(move(g, -5), [2, 1, 0]);
assert.equal(g.players[0].pos, 0);
move(g, 99);
assert.equal(g.players[0].pos, PATH_LEN - 1);

// Målbonus 5/3/2/1 och turordning hoppar över klara
g = createGame(['A', 'B', 'C', 'D'], board, mulberry32(1));
const bonuses = [];
for (let i = 0; i < 4; i++) {
  move(g, 99);
  bonuses.push(land(g).bonus);
  nextTurn(g);
}
assert.deepEqual(bonuses, [5, 3, 2, 1]);
assert.equal(g.over, true);

// Mål via kort räknas
g = createGame(['A', 'B'], board, mulberry32(1));
move(g, PATH_LEN - 3);
const r = applyCard(g, { effect: { type: 'move', n: 4 } });
move(g, r.steps);
assert.equal(land(g).type, 'goal');
assert.equal(g.players[0].baskets, 10 + 5);
nextTurn(g);
assert.equal(g.current, 1);
nextTurn(g);
assert.equal(g.current, 1, 'klar spelare hoppas över');

// Korgar: aldrig under 0, och man får bara det andra faktiskt har
g = createGame(['A', 'B', 'C'], board, mulberry32(1));
g.players[1].baskets = 0;
g.players[2].baskets = 8;
g.players[0].baskets = 1;
applyCard(g, { effect: { type: 'lose', n: 3 } });
assert.equal(g.players[0].baskets, 0);
g.players[1].baskets = 0;
applyCard(g, { effect: { type: 'takeFromEach', n: 1 } });
assert.deepEqual(g.players.map(p => p.baskets), [1, 0, 7]);
applyCard(g, { effect: { type: 'giveToPoorest', n: 1 } });
assert.deepEqual(g.players.map(p => p.baskets), [0, 1, 7]);
applyCard(g, { effect: { type: 'richToPoor', n: 1 } });
assert.deepEqual(g.players.map(p => p.baskets), [1, 1, 6]);
assert.deepEqual(applyCard(g, { effect: { type: 'again' } }), { again: true });
// Räven: ge en korg till varje (bara så många du har)
g.players.forEach((p, i) => (p.baskets = [1, 0, 0][i]));
applyCard(g, { effect: { type: 'giveToEach', n: 1 } });
assert.deepEqual(g.players.map(p => p.baskets), [0, 1, 0]);
g.players.forEach((p, i) => (p.baskets = [1, 1, 6][i]));

// Den som är i mål påverkas inte av kort (varken bra eller dåliga).
g = createGame(['A', 'B', 'C'], board, mulberry32(1));
g.players[1].place = 1; // B är i mål
applyCard(g, { effect: { type: 'all', n: -2 } });
applyCard(g, { effect: { type: 'takeFromEach', n: 1 } });
assert.deepEqual(g.players.map(p => p.baskets), [8 + 1, 10, 7]);
g.players.forEach((p, i) => (p.baskets = [1, 1, 6][i]));
g.players[1].place = 0;

// Prispall: lika = delad plats
g.players[0].baskets = 6;
assert.deepEqual(ranking(g).map(r => [r.player.name, r.rank]), [['A', 1], ['C', 1], ['B', 3]]);

// Landskapet: bäcken hänger ihop, broar bara på raka bitar tvärs över, sjön och hus aldrig på banan.
for (const size of Object.keys(SIZES)) for (let seed = 1; seed <= 60; seed++) {
  const b = makeBoard(mulberry32(seed), size);
  const land = makeLandscape(b, mulberry32(seed + 1000));
  const cells = land.river.cells;
  cells.forEach((c, i) => i && assert.ok(Math.abs(c[0] - cells[i - 1][0]) + Math.abs(c[1] - cells[i - 1][1]) <= 2, 'bäcken hänger ihop'));
  land.bridges.forEach(i => {
    assert.ok(i > 0 && i < b.length - 1, 'ingen bro på start eller mål');
    assert.ok(land.straight(i), 'bro bara på rak bit');
  });
  land.lake.forEach(k => assert.ok(!land.path.has(k), 'sjön ligger inte på banan'));
  land.zone.forEach((_, k) => assert.ok(!land.path.has(k), 'zoner ligger inte på banan'));
}

console.log('OK');

// Fyra i rad
import * as F from '../www/games/fyrairad/logic.js';
{
  const b = F.emptyBoard();
  assert.equal([b.length, b[0].length].join('x'), '4x4', '4 rader, 4 kolumner');
  assert.equal(F.FIGS.length, 6);
  // Alla fyra spelplaner: 4x4, alla fyra färger en gång, alla sex figurer finns minst två gånger, ingen bräde är lika.
  for (const lay of Object.values(F.LAYOUTS)) {
    assert.equal(lay.length, 4);
    lay.forEach(row => assert.equal(row.figs.length, 4));
    assert.deepEqual(lay.map(r => r.color).sort(), ['blue', 'green', 'red', 'yellow']);
    const all = lay.flatMap(r => r.figs);
    F.FIGS.forEach(f => assert.ok(all.filter(x => x === f).length >= 2, `${f} finns minst två gånger`));
  }
  assert.notDeepEqual(F.LAYOUTS.blue, F.LAYOUTS.green, 'spelplanerna är olika');
  const L = F.LAYOUTS.blue; // rad 1 (röd) = R B F O
  assert.deepEqual(F.legalCells(b, L, 'red', 'bear'), [[1, 1]], 'färg + figur = en ruta');
  assert.equal(F.legalCells(b, L, 'red', 'squirrel').length, 0, 'figuren finns inte i raden: turen går vidare');
  assert.equal(F.legalCells(b, F.LAYOUTS.green, 'yellow', 'squirrel').length, 2, 'figuren två gånger: man väljer');
  assert.equal(F.legalCells(b, L, 'white', 'fox').length, 3, 'vitt: figuren i alla rader');
  b[1][1] = 0;
  assert.equal(F.legalCells(b, L, 'red', 'bear').length, 0, 'rutan är tagen: turen går vidare');
  assert.ok(F.DIE_COLOR.includes('white') && L.every(r => F.DIE_COLOR.includes(r.color)));
  const whites = F.DIE_COLOR.flatMap((c, i) => (c === 'white' ? [i] : []));
  assert.equal(whites.length + F.DIE_COLOR.filter(c => c !== 'white').length, 6);
  assert.equal(whites.length, 2);
  assert.equal(whites[0] + whites[1], 5, 'de vita sidorna är motsatta sidor på tärningen (1-6, 2-5 eller 3-4)');
  assert.deepEqual([...F.DIE_FIG].sort(), [...F.FIGS].sort());
  const w = rows => { const c = F.emptyBoard(); rows.forEach(([r, k, p]) => (c[r][k] = p)); return c; };
  assert.ok(F.winLine(w([[2, 0, 0], [2, 1, 0], [2, 2, 0], [2, 3, 0]]), 2, 1), 'vågrätt');
  assert.ok(F.winLine(w([[0, 2, 1], [1, 2, 1], [2, 2, 1], [3, 2, 1]]), 2, 2), 'lodrätt');
  assert.ok(F.winLine(w([[0, 0, 0], [1, 1, 0], [2, 2, 0], [3, 3, 0]]), 0, 0), 'diagonalt ner');
  assert.ok(F.winLine(w([[0, 3, 1], [1, 2, 1], [2, 1, 1], [3, 0, 1]]), 2, 1), 'diagonalt upp');
  assert.equal(F.winLine(w([[2, 0, 0], [2, 1, 0], [2, 2, 1], [2, 3, 0]]), 2, 1), null, 'tre räcker inte');
  assert.equal(F.isFull(F.emptyBoard()), false);
  // Datorn: normal och svår tar vinsten, svår stoppar också.
  const free = [[0, 3], [3, 0], [1, 1]];
  const three = w([[0, 0, 1], [0, 1, 1], [0, 2, 1]]); // spelare 1 har tre i rad, [0,3] saknas
  assert.deepEqual(F.pickCell(three, free, 0, 'hard'), [0, 3], 'svår stoppar motståndarens fyra i rad');
  const mineThree = w([[0, 0, 0], [0, 1, 0], [0, 2, 0]]);
  for (const lvl of ['normal', 'hard']) assert.deepEqual(F.pickCell(mineThree, free, 0, lvl), [0, 3], `${lvl} tar sin vinst`);
  for (const lvl of F.LEVELS) { const p = F.pickCell(F.emptyBoard(), free, 0, lvl); assert.ok(free.some(([r, c]) => r === p[0] && c === p[1]), `${lvl} väljer en tillåten ruta`); }
  // Tre spelare: svår stoppar den som har tre i rad, även om det är spelare 2.
  const three2 = w([[0, 0, 2], [0, 1, 2], [0, 2, 2]]);
  assert.deepEqual(F.pickCell(three2, free, 0, 'hard', Math.random, 3), [0, 3], 'svår stoppar också spelare 3');
}

// Fia med knuff
import * as FK from '../www/games/fiamedknuff/logic.js';
{
  const key = c => c.join(',');
  // Steg-talet (0-39) som en spelare på plats seat har när den står på samma ruta som cell.
  const stepOn = (seat, cell) => { for (let s = 0; s < 40; s++) if (key(FK.cellOf(seat, s)) === key(cell)) return s; throw new Error('ingen ruta'); };
  // Brädet: 40 olika rutor, grannar hänger ihop, gången går från spetsen in mot mitten.
  assert.equal(new Set(FK.TRACK.map(key)).size, 40);
  FK.TRACK.forEach((c, i) => { const n = FK.TRACK[(i + 1) % 40]; assert.equal(Math.abs(c[0] - n[0]) + Math.abs(c[1] - n[1]), 1, `ruta ${i} ligger intill nästa`); });
  for (let s = 0; s < 4; s++) {
    assert.deepEqual(FK.cellOf(s, 0), FK.TRACK[s * 10], 'startrutan');
    const tip = FK.cellOf(s, 39), lane = FK.cellOf(s, 40);
    assert.equal(Math.abs(tip[0] - lane[0]) + Math.abs(tip[1] - lane[1]), 1, 'gången börjar vid sista banrutan');
    assert.deepEqual(FK.cellOf(s, 43).map(v => Math.abs(v - 5)).sort(), [0, 1], 'målet ligger nära mitten');
  }
  const all = new Set([...FK.TRACK, ...[0, 1, 2, 3].flatMap(s => [-1, 40, 41, 42, 43].flatMap(p => (p < 0 ? [0, 1, 2, 3] : [0]).map(i => FK.cellOf(s, p, i))))].map(key));
  assert.equal(all.size, 40 + 16 + 16, 'hemma-platser och gångar delar inte ruta med banan eller varandra');
  assert.deepEqual(FK.seatsFor(2), [0, 2]);

  // Sexa för att komma ut. Alla hemma = tre försök. Likadana pjäser hemma ger bara ett drag.
  let g = FK.createGame(2);
  assert.equal(FK.needSix(g, 0), true); assert.equal(FK.rollsAllowed(g, 0), 3);
  for (const d of [1, 2, 3, 4, 5]) assert.equal(FK.legalMoves(g, 0, d).length, 0, 'ingen sexa: inget drag');
  assert.deepEqual(FK.legalMoves(g, 0, 6), [{ i: 0, to: 0 }]);
  FK.applyMove(g, 0, 0, 6);
  assert.equal(g.pieces[0][0], 0); assert.equal(FK.rollsAllowed(g, 0), 1);
  assert.deepEqual(FK.legalMoves(g, 0, 6), [{ i: 0, to: 6 }], 'startrutan är upptagen: ingen ny pjäs ut');
  g.pieces[0][1] = 3;
  assert.ok(!FK.legalMoves(g, 0, 3).some(m => m.i === 0), 'inte på egen pjäs');
  // Knuff: pjäs 0 landar på en motståndare.
  g = FK.createGame(2);
  g.pieces[0][0] = 5; g.pieces[1][0] = stepOn(2, FK.cellOf(0, 9));
  const r = FK.applyMove(g, 0, 0, 4);
  assert.deepEqual(r.knuffed, [{ p: 1, i: 0 }]); assert.equal(g.pieces[1][0], FK.HOME); assert.equal(g.pieces[0][0], 9);
  // En sexa ut knuffar den som står på startrutan.
  g = FK.createGame(2); g.pieces[1][0] = stepOn(2, FK.cellOf(0, 0)); g.pieces[0][1] = 7;
  assert.deepEqual(FK.applyMove(g, 0, 0, 6).knuffed, [{ p: 1, i: 0 }], 'sexa ut knuffar den på startrutan');
  // Gången är trygg: ingen knuff där. Exakt slag krävs för mål.
  g = FK.createGame(2); g.pieces[0] = [38, 41, FK.HOME, FK.HOME];
  assert.equal(FK.legalMoves(g, 0, 3).some(m => m.i === 1), false, 'för långt förbi målet');
  assert.deepEqual(FK.legalMoves(g, 0, 2).filter(m => m.i === 1), [{ i: 1, to: 43 }], 'exakt slag ger mål');
  assert.equal(FK.legalMoves(g, 0, 3).some(m => m.i === 0), false, 'gången är upptagen av egen pjäs');
  assert.equal(FK.legalMoves(g, 0, 4).find(m => m.i === 0).to, 42, 'in i gången');
  // Vinst: alla fyra i mål. En pjäs hemma och resten i mål = sexa behövs.
  g = FK.createGame(3); g.pieces[1] = [43, 43, 43, FK.HOME];
  assert.equal(FK.needSix(g, 1), true); assert.equal(FK.hasWon(g, 1), false);
  g.pieces[1] = [43, 43, 43, 42];
  assert.equal(FK.applyMove(g, 1, 3, 1).won, true);
  // Hot: en motståndare 1-6 rutor bakom kan knuffa. Långt bort hotar ingen.
  g = FK.createGame(2); g.pieces[0][0] = 10; g.pieces[1][0] = stepOn(2, FK.cellOf(0, 25));
  assert.equal(FK.threatened(g, 0, 10), false, 'långt bort');
  g.pieces[1][0] = stepOn(2, FK.cellOf(0, 8));
  assert.equal(FK.threatened(g, 0, 10), true, 'två rutor bakom');
  // Datorn: svår går i mål före knuff, knuffar före vanligt drag. Medel knuffar. Alla väljer ett giltigt drag.
  g = FK.createGame(2); g.pieces[0] = [41, 8, FK.HOME, FK.HOME]; g.pieces[1] = [stepOn(2, FK.cellOf(0, 11)), FK.HOME, FK.HOME, FK.HOME];
  assert.equal(FK.pickMove(g, 0, 2, 'hard').i, 0, 'svår går i mål (41 + 2 = 43)');
  assert.equal(FK.pickMove(g, 0, 3, 'hard').i, 1, 'svår knuffar (8 + 3 = 11)');
  assert.equal(FK.pickMove(g, 0, 3, 'normal').i, 1, 'medel knuffar');
  for (const lvl of FK.LEVELS) for (let d = 1; d <= 6; d++) { const m = FK.pickMove(g, 0, d, lvl); if (m) assert.ok(FK.legalMoves(g, 0, d).some(x => x.i === m.i && x.to === m.to)); }
  // Svår skyddar: pjäs 1 (på 5) hotas av en motståndare två rutor bakom, så den flyttas hellre än främre pjäsen 0.
  g = FK.createGame(2); g.pieces[0] = [25, 5, FK.HOME, FK.HOME]; g.pieces[1] = [stepOn(2, FK.cellOf(0, 3)), FK.HOME, FK.HOME, FK.HOME];
  assert.equal(FK.threatened(g, 0, 5), true);
  assert.equal(FK.pickMove(g, 0, 5, 'hard', () => 0).i, 1, 'svår skyddar den hotade pjäsen');
  // Utan krav på sexa: vilket slag som helst tar ut en pjäs, och den går slaget minus ett steg.
  g = FK.createGame(2, false);
  assert.equal(FK.needSix(g, 0), false); assert.equal(FK.rollsAllowed(g, 0), 1);
  for (let d = 1; d <= 6; d++) assert.deepEqual(FK.legalMoves(g, 0, d), [{ i: 0, to: d - 1 }], 'alla slag tar ut en pjäs');
  assert.equal(FK.applyMove(g, 0, 0, 3).to, 2);
  // Hela spel med slump: alla nivåer, 2-4 spelare. Någon vinner alltid och reglerna håller hela vägen.
  const play = (n, levels, sixOut = true) => {
    const G = FK.createGame(n, sixOut);
    let p = 0, turns = 0, winner = -1;
    while (winner < 0 && turns++ < 20000) {
      let rolls = FK.rollsAllowed(G, p), again = true;
      while (again && winner < 0) {
        again = false;
        const d = FK.rollDie(), mv = FK.pickMove(G, p, d, levels[p]);
        if (mv && FK.applyMove(G, p, mv.i, d).won) winner = p;
        if (d === 6) again = true; else if (!mv && --rolls > 0) again = true;
        const seen = new Set(); // aldrig två pjäser på samma ruta (utom i mål)
        G.pieces.forEach((ps, q) => ps.forEach(v => { if (v >= 0 && v < 43) { const k = key(FK.cellOf(G.seats[q], v)); assert.ok(!seen.has(k), `dubbel ruta ${k}`); seen.add(k); } }));
      }
      p = (p + 1) % n;
    }
    assert.ok(winner >= 0 && FK.hasWon(G, winner), `spelet tar slut (${n} spelare)`);
    return winner;
  };
  for (let run = 0; run < 90; run++) play(2 + (run % 3), [0, 1, 2, 3].map(i => FK.LEVELS[(run + i) % 3]));
  for (let run = 0; run < 45; run++) play(2 + (run % 3), [0, 1, 2, 3].map(i => FK.LEVELS[(run + i) % 3]), false);
  let hardWins = 0;
  for (let run = 0; run < 200; run++) { const first = run % 2; if (play(2, first ? ['easy', 'hard'] : ['hard', 'easy']) === (first ? 1 : 0)) hardWins++; }
  assert.ok(hardWins > 110, `svår vinner oftast mot lätt (${hardWins}/200)`);
}

// ---------- Memory ----------
import * as M from '../www/games/memory/logic.js';
{
  // Alla storlekar: jämnt antal, rätt antal par, varje bild exakt två gånger.
  for (const size of Object.keys(M.SIZES)) for (let n = 1; n <= 4; n++) {
    const g = M.createGame(size, n);
    assert.equal(g.cards.length, M.SIZES[size].a * M.SIZES[size].b);
    assert.equal(g.cards.length % 2, 0);
    const count = {};
    g.cards.forEach(f => (count[f] = (count[f] || 0) + 1));
    assert.ok(Object.values(count).every(v => v === 2), 'varje bild två gånger');
  }
  assert.ok(M.FIGS.length >= M.pairsOf('large'), 'tillräckligt många bilder');

  // Regler: par = behåll och vänd igen, annars nästa spelare.
  const g = { cards: ['a', 'b', 'a', 'b'], owner: [null, null, null, null], flipped: [], current: 0, players: 2 };
  assert.ok(M.flip(g, 0));
  assert.equal(M.flip(g, 0), false, 'samma bricka två gånger går inte');
  assert.equal(M.resolve(g), null, 'bara en bricka uppe');
  assert.ok(M.flip(g, 1));
  assert.equal(M.flip(g, 2), false, 'inte tre brickor');
  let r = M.resolve(g);
  assert.equal(r.match, false);
  assert.equal(g.current, 1, 'inget par: nästa spelare');
  assert.deepEqual(g.flipped, []);
  M.flip(g, 1); M.flip(g, 3);
  r = M.resolve(g);
  assert.equal(r.match, true);
  assert.equal(g.current, 1, 'par: samma spelare igen');
  assert.deepEqual(g.owner, [null, 1, null, 1]);
  assert.equal(M.flip(g, 1), false, 'tagen bricka går inte att vända');
  assert.equal(M.isDone(g), false);
  M.flip(g, 0); M.flip(g, 2); M.resolve(g);
  assert.ok(M.isDone(g));
  assert.deepEqual(M.scores(g), [0, 2]);
  assert.deepEqual(M.winners(g), [1]);
  assert.deepEqual(M.winners({ owner: [0, 0, 1, 1], players: 2 }), [0, 1], 'lika');

  // Datorn: tar ett par den känner till, och spelar färdigt hela spel på alla nivåer.
  const g2 = { cards: ['a', 'b', 'a', 'b'], owner: [null, null, null, null], flipped: [], current: 0, players: 2 };
  assert.equal(M.botFirst(g2, { 0: 'a', 2: 'a' }) % 2, 0, 'känner paret: tar det');
  g2.flipped = [0];
  assert.equal(M.botSecond(g2, { 0: 'a', 2: 'a' }), 2, 'känner paret: tar andra brickan');
  assert.notEqual(M.botSecond(g2, { 1: 'b', 0: 'a' }), 1, 'tar hellre en okänd bricka än en känd fel');
  const play = (size, levels) => {
    const g = M.createGame(size, levels.length);
    const mems = levels.map(M.newMemory);
    let turns = 0;
    while (!M.isDone(g)) {
      assert.ok(++turns < 2000, 'spelet tar slut');
      const p = g.current, lvl = levels[p];
      const see = i => mems.forEach((m, k) => M.remember(m, i, g.cards[i], levels[k]));
      const a = M.botFirst(g, mems[p]); assert.ok(M.flip(g, a)); see(a);
      const b = M.botSecond(g, mems[p]); assert.ok(M.flip(g, b), `${lvl}: tillåten bricka`); see(b);
      const res = M.resolve(g);
      if (res.match) mems.forEach(m => M.forget(m, res.a, res.b));
    }
    return M.scores(g);
  };
  for (const size of Object.keys(M.SIZES)) for (const lvl of M.LEVELS) {
    for (let k = 0; k < 20; k++) assert.equal(play(size, [lvl, lvl]).reduce((s, v) => s + v, 0), M.pairsOf(size), 'alla par tas');
  }
  // Svår är bättre än lätt (flest par över många spel).
  let hard = 0, easy = 0;
  for (let k = 0; k < 300; k++) { const [e, h] = play('large', ['easy', 'hard']); easy += e; hard += h; }
  assert.ok(hard > easy * 1.3, `svår slår lätt (${hard} mot ${easy})`);
}

// ---------- Yatzy ----------
import * as Y from '../www/games/yatzy/logic.js';
{
  assert.equal(Y.ROWS.length, 15);
  assert.equal(Y.score('fives', [5,5,5,5,5]), 25);
  assert.equal(Y.score('pair', [3,3,5,5,1]), 10);
  assert.equal(Y.score('twoPairs', [3,3,5,5,1]), 16);
  assert.equal(Y.score('twoPairs', [4,4,4,4,4]), 0);
  assert.equal(Y.score('three', [4,4,4,4,4]), 12);
  assert.equal(Y.score('four', [4,4,4,4,2]), 16);
  assert.equal(Y.score('small', [5,3,1,2,4]), 15);
  assert.equal(Y.score('small', [2,3,4,5,6]), 0);
  assert.equal(Y.score('large', [6,2,3,5,4]), 20);
  assert.equal(Y.score('house', [2,2,3,3,3]), 13);
  assert.equal(Y.score('house', [3,3,3,3,3]), 0);
  assert.equal(Y.score('chance', [1,2,3,4,6]), 16);
  assert.equal(Y.score('yatzy', [6,6,6,6,6]), 50);
  assert.equal(Y.score('yatzy', [6,6,6,6,5]), 0);
  const full = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 };
  assert.equal(Y.upperSum(full), 63); assert.equal(Y.bonus(full), 50); assert.equal(Y.total(full), 113);
  assert.equal(Y.bonus({ ...full, sixes: 12 }), 0);
  const g = Y.createGame([{ name: 'A', help: 'none' }, { name: 'B', help: 'lots' }], 2);
  assert.equal(Y.fill(g, 'chance', [1,1,1,1,2]), 6); assert.equal(g.current, 1);
  assert.throws(() => { g.current = 0; Y.fill(g, 'chance', [1,1,1,1,1]); });
  assert.deepEqual(Y.fromSave(JSON.parse(JSON.stringify(Y.toSave(g)))), g);
  // Matchen är slut när alla har fyllt 15 rader. Lika poäng ger delad placering.
  const h = Y.createGame([{ name: 'A' }, { name: 'B' }]);
  for (let i = 0; i < 30; i++) Y.fill(h, Y.left(h.sheets[h.current])[0], [1,2,3,4,5]);
  assert.ok(Y.matchOver(h)); assert.deepEqual(Y.ranking(h), [1, 1]);
  console.log('Yatzy OK');
}
{
  const rnd = mulberry32(7);
  assert.notEqual(Y.goodRows({}, [6,6,6,6,6]).length, 1);
  assert.ok(Y.goodRows({}, [6,6,6,6,6]).includes('yatzy'));
  assert.ok(Y.goodRows({}, [6,6,6,6,6]).length <= 3);
  assert.deepEqual(Y.goodRows(Object.fromEntries(Y.ROWS.map(r => [r.id, 0]).filter(([id]) => id !== 'ones')), [2,3,4,5,6]), []);
  assert.deepEqual(Y.botHold({}, [3,3,3,1,6], 'easy', rnd), [true,true,true,false,false]);
  for (const lvl of Y.LEVELS) assert.ok(Y.left({}).includes(Y.botPick({}, [1,2,3,4,5], lvl, rnd)));
  assert.equal(Y.botPick({}, [2,3,4,5,6], 'normal', rnd), 'large');
  // bara ettor och yatzy lediga, båda ger 0: stryk raden med lägst TYPICAL (ettor = 3)
  assert.equal(Y.botPick(Object.fromEntries(Y.ROWS.filter(r => !['yatzy','ones'].includes(r.id)).map(r => [r.id, 5])), [2,3,4,5,6], 'normal', rnd), 'ones');
  // Svår ska få fler poäng än lätt över många matcher.
  const play = (lvl, seed) => { const r = mulberry32(seed); let s = {}; for (let t = 0; t < 15; t++) { let d = [0,0,0,0,0].map(() => 1 + Math.floor(r() * 6)); for (let k = 0; k < 2; k++) { const h = Y.botHold(s, d, lvl, r); d = d.map((x, i) => (h[i] ? x : 1 + Math.floor(r() * 6))); } s[Y.botPick(s, d, lvl, r)] = 0; const id = Object.keys(s).at(-1); s[id] = Y.score(id, d); } return Y.total(s); };
  let easy = 0, hard = 0; for (let k = 0; k < 20; k++) { easy += play("easy", k); hard += play("hard", k); }
  assert.ok(hard > easy, `svår slår lätt (${hard} mot ${easy})`);
  console.log('Yatzy Robo OK');
}
