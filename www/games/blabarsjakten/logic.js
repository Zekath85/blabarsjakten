// Blåbärsjaktens regler. Ingen skärmkod här, så det kan testas med Node.
import { DECKS } from './cards.js';

export const GRID = 10;          // spelplanen är 10 x 10 rutor
export const PATH_LEN = 40;      // antal pusselbitar, start och mål inräknade
export const START_BASKETS = 8;
export const BONUS = [5, 3, 2, 1];
export const COLORS = ['#e53935', '#1e88e5', '#fbc02d', '#43a047'];
const TILES = { fox: 4, owl: 3, squirrel: 3, hedgehog: 3, berry: 6 };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Slump som går att upprepa (för test). I spelet används Math.random.
export function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Slingrande väg i rutnätet. En ny bit får bara röra föregående bit,
// så vägen ser ut som pusselbitar med mellanrum, aldrig en klump.
export function generatePath(rng = Math.random) {
  const key = (x, y) => y * GRID + x;
  for (;;) {
    let budget = 4000; // ponytail: slumpad sökning med omstart, räcker gott för 40 av 100 rutor
    const path = [{ x: Math.floor(rng() * GRID), y: Math.floor(rng() * GRID) }];
    const used = new Set([key(path[0].x, path[0].y)]);
    const free = (x, y, from) =>
      x >= 0 && x < GRID && y >= 0 && y < GRID && !used.has(key(x, y)) &&
      DIRS.every(([dx, dy]) => {
        const k = key(x + dx, y + dy);
        return x + dx < 0 || x + dx >= GRID || k === key(from.x, from.y) || !used.has(k);
      });
    const grow = () => {
      if (path.length === PATH_LEN) return true;
      if (--budget < 0) return false;
      const cur = path.at(-1);
      for (const [dx, dy] of shuffle(DIRS.slice(), rng)) {
        const x = cur.x + dx, y = cur.y + dy;
        if (!free(x, y, cur)) continue;
        path.push({ x, y }); used.add(key(x, y));
        if (grow()) return true;
        path.pop(); used.delete(key(x, y));
      }
      return false;
    };
    if (grow()) return path;
  }
}

export function makeBoard(rng = Math.random) {
  const path = generatePath(rng);
  const middle = Object.entries(TILES).flatMap(([type, n]) => Array(n).fill(type));
  while (middle.length < path.length - 2) middle.push('empty');
  shuffle(middle, rng);
  return path.map((p, i) => {
    const type = i === 0 ? 'start' : i === path.length - 1 ? 'goal' : middle[i - 1];
    return type === 'berry' ? { ...p, type, value: 1 + Math.floor(rng() * 3) } : { ...p, type };
  });
}

export function createGame(names, board, rng = Math.random) {
  return {
    board,
    players: names.map((name, i) => ({ name, color: COLORS[i], baskets: START_BASKETS, pos: 0, place: 0 })),
    current: 0,
    finished: 0,
    over: false,
    decks: Object.fromEntries(Object.entries(DECKS).map(([k, cards]) => [k, shuffle(cards.slice(), rng)])),
  };
}

export const rollDie = (rng = Math.random) => 1 + Math.floor(rng() * 6);
export const currentPlayer = game => game.players[game.current];

// Flyttar aktuell spelare. Returnerar varje ruta den hoppar till (för animationen).
export function move(game, steps) {
  const p = currentPlayer(game);
  const to = Math.max(0, Math.min(game.board.length - 1, p.pos + steps));
  const hops = [];
  for (let i = p.pos; i !== to; ) hops.push((i += Math.sign(to - p.pos)));
  p.pos = to;
  return hops;
}

// Vad händer på rutan? Figur-rutor: skärmen låter barnet dra kortet själv.
export function land(game) {
  const p = currentPlayer(game);
  const tile = game.board[p.pos];
  if (tile.type === 'goal' && !p.place) {
    p.place = ++game.finished;
    const bonus = BONUS[p.place - 1];
    p.baskets += bonus;
    return { type: 'goal', bonus, place: p.place };
  }
  if (tile.type === 'berry') {
    p.baskets += tile.value;
    return { type: 'berry', gained: tile.value };
  }
  return { type: tile.type };
}

export function drawCard(game, deck) {
  const card = game.decks[deck].shift();
  game.decks[deck].push(card);
  return card;
}

// Gör det kortet säger. Flytt och "slå igen" sköts av skärmen.
export function applyCard(game, card) {
  const me = currentPlayer(game);
  const others = game.players.filter(p => p !== me);
  const add = (p, n) => { const before = p.baskets; p.baskets = Math.max(0, p.baskets + n); return p.baskets - before; };
  const fewest = list => list.reduce((a, b) => (b.baskets < a.baskets ? b : a), list[0]);
  const most = list => list.reduce((a, b) => (b.baskets > a.baskets ? b : a), list[0]);
  const { type, n } = card.effect;
  switch (type) {
    case 'gain': add(me, n); break;
    case 'lose': add(me, -n); break;
    case 'all': game.players.forEach(p => add(p, n)); break;
    case 'takeFromEach': others.forEach(p => add(me, -add(p, -n))); break;
    case 'giveToPoorest': if (others.length) add(fewest(others), -add(me, -n)); break;
    case 'richToPoor': { const r = most(game.players), p = fewest(game.players); if (r !== p) add(p, -add(r, -n)); break; }
    case 'move': return { steps: n };
    case 'again': return { again: true };
  }
  return {};
}

export function nextTurn(game) {
  if (game.finished === game.players.length) { game.over = true; return; }
  do game.current = (game.current + 1) % game.players.length;
  while (game.players[game.current].place);
}

// Flest korgar vinner. Lika många = samma plats.
export function ranking(game) {
  const sorted = [...game.players].sort((a, b) => b.baskets - a.baskets);
  return sorted.map(player => ({ player, rank: 1 + sorted.findIndex(p => p.baskets === player.baskets) }));
}
