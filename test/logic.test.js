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
  assert.equal([b.length, b[0].length].join('x'), '4x5', '4 rader, 5 kolumner');
  // Alla fyra spelplaner: varje rad har alla fem figurer, och alla fyra färger finns en gång.
  for (const lay of Object.values(F.LAYOUTS)) {
    lay.forEach(row => assert.deepEqual([...row.figs].sort(), [...F.FIGS].sort()));
    assert.deepEqual(lay.map(r => r.color).sort(), ['blue', 'green', 'red', 'yellow']);
  }
  const L = F.LAYOUTS.blue;
  assert.notDeepEqual(F.LAYOUTS.blue, F.LAYOUTS.green, 'spelplanerna är olika');
  assert.equal(F.legalCells(b, L, 'red', 'owl').length, 1, 'färg + figur = en ruta');
  assert.equal(F.legalCells(b, L, 'red', 'any').length, F.COLS, 'valfri figur: hela raden');
  assert.equal(F.legalCells(b, L, 'white', 'fox').length, F.ROWS, 'vitt: figuren i alla rader');
  assert.equal(F.legalCells(b, L, 'white', 'any').length, F.ROWS * F.COLS, 'vitt + stjärna: allt');
  const [[r0, c0]] = F.legalCells(b, L, 'red', 'owl');
  b[r0][c0] = 0;
  assert.equal(F.legalCells(b, L, 'red', 'owl').length, 0, 'rutan är tagen: turen går vidare');
  assert.ok(F.DIE_COLOR.includes('white') && L.every(r => F.DIE_COLOR.includes(r.color)));
  assert.ok(F.FIGS.every(f => F.DIE_FIG.includes(f)) && F.DIE_FIG.includes('any'));
  const w = rows => { const c = F.emptyBoard(); rows.forEach(([r, k, p]) => (c[r][k] = p)); return c; };
  assert.ok(F.winLine(w([[2, 0, 0], [2, 1, 0], [2, 2, 0], [2, 3, 0]]), 2, 1), 'vågrätt');
  assert.ok(F.winLine(w([[2, 4, 0], [2, 1, 0], [2, 2, 0], [2, 3, 0]]), 2, 4), 'vågrätt, höger kant');
  assert.ok(F.winLine(w([[0, 2, 1], [1, 2, 1], [2, 2, 1], [3, 2, 1]]), 2, 2), 'lodrätt');
  assert.ok(F.winLine(w([[0, 0, 0], [1, 1, 0], [2, 2, 0], [3, 3, 0]]), 0, 0), 'diagonalt ner');
  assert.ok(F.winLine(w([[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1]]), 3, 4), 'diagonalt ner (höger)');
  assert.ok(F.winLine(w([[0, 3, 1], [1, 2, 1], [2, 1, 1], [3, 0, 1]]), 2, 1), 'diagonalt upp');
  assert.equal(F.winLine(w([[2, 0, 0], [2, 1, 0], [2, 2, 1], [2, 3, 0]]), 2, 1), null, 'tre räcker inte');
  assert.equal(F.isFull(F.emptyBoard()), false);
}
