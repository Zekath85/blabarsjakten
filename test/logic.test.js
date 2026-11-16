import assert from 'node:assert/strict';
import { mulberry32, generatePath, makeBoard, createGame, move, land, applyCard, nextTurn, ranking, drawCard, GRID, PATH_LEN } from '../www/games/blabarsjakten/logic.js';
import { DECKS } from '../www/games/blabarsjakten/cards.js';

// Banan: rätt längd, inom rutnätet, sammanhängande, korsar aldrig sig själv, rör inte sig själv.
for (let seed = 1; seed <= 300; seed++) {
  const path = generatePath(mulberry32(seed));
  assert.equal(path.length, PATH_LEN);
  const at = new Map(path.map((p, i) => [`${p.x},${p.y}`, i]));
  assert.equal(at.size, PATH_LEN, 'ingen ruta två gånger');
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
assert.deepEqual(Object.values(DECKS).map(d => d.length), [14, 8, 8, 8]);

// Start
let g = createGame(['A', 'B', 'C', 'D'], board, mulberry32(1));
assert.deepEqual(g.players.map(p => p.baskets), [8, 8, 8, 8]);

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
assert.equal(g.players[0].baskets, 8 + 5);
nextTurn(g);
assert.equal(g.current, 1);
nextTurn(g);
assert.equal(g.current, 1, 'klar spelare hoppas över');

// Korgar: aldrig under 0, och man får bara det andra faktiskt har
g = createGame(['A', 'B', 'C'], board, mulberry32(1));
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

// Prispall: lika = delad plats
g.players[0].baskets = 6;
assert.deepEqual(ranking(g).map(r => [r.player.name, r.rank]), [['A', 1], ['C', 1], ['B', 3]]);

console.log('OK');
