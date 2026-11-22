// Reglerna i Fyra i rad (som i Bamse 4 i rad). Ren logik, inga bilder. Testas i test/logic.test.js.
// Brädet: 4 rader, var och en med en färg, och 4 kolumner med figurer. cells[rad][kolumn] = spelarens nummer eller null.
// Färgtärningen pekar ut en rad. Bildtärningen visar figuren man ska hitta i den raden.
// Sex figurer men bara fyra platser per rad: ibland saknas figuren i raden, ibland finns den två gånger.
export const FIGS = ['fox', 'owl', 'squirrel', 'hedgehog', 'hare', 'bear'];
export const COLOR_HEX = { green: '#43a047', red: '#e53935', blue: '#1e88e5', yellow: '#fbc02d', white: '#fffdf5' };
export const ROWS = 4, COLS = 4;
export const DIE_COLOR = ['green', 'red', 'blue', 'yellow', 'white', 'white']; // vitt = välj rad själv
export const DIE_FIG = FIGS;                                                  // sex sidor, en per figur
export const rollDie = (rnd = Math.random) => 1 + Math.floor(rnd() * 6);

// Fyra spelplaner. Varje rad: färg + fyra figurer (F räv, O uggla, S ekorre, H igelkott, R hare, B björn).
const NAME = { F: 'fox', O: 'owl', S: 'squirrel', H: 'hedgehog', R: 'hare', B: 'bear' };
const make = rows => rows.map(([color, figs]) => ({ color, figs: [...figs].map(ch => NAME[ch]) }));
export const LAYOUTS = {
  blue:   make([['green', 'FOSH'], ['red', 'RBFO'], ['blue', 'HSBR'], ['yellow', 'OFRB']]),
  green:  make([['red', 'BROF'], ['yellow', 'SHRS'], ['green', 'FBHO'], ['blue', 'ROBH']]),
  yellow: make([['blue', 'OHBS'], ['green', 'RFOR'], ['yellow', 'BSHF'], ['red', 'FOSH']]),
  red:    make([['yellow', 'HBFR'], ['blue', 'OSHO'], ['red', 'RFSB'], ['green', 'BHRF']]),
};

export const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

// Lediga rutor som passar tärningarna. Vitt = vilken rad som helst. Finns figuren två gånger i raden väljer man.
// Finns ingen ledig ruta som passar går turen vidare (tom lista).
export function legalCells(cells, layout, color, fig) {
  const hit = [];
  layout.forEach((row, r) => row.figs.forEach((f, c) => {
    if (cells[r][c] === null && (color === 'white' || row.color === color) && f === fig) hit.push([r, c]);
  }));
  return hit;
}
// Vitt, men ingen färg att gå på: alla lediga rutor med figuren (samma sak som legalCells med 'white').

// Fyra i rad som går genom (r, c): ger de fyra rutorna, annars null.
export function winLine(cells, r, c) {
  const p = cells[r][c];
  if (p === null) return null;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const line = [[r, c]];
    for (const s of [1, -1]) {
      for (let k = 1; ; k++) {
        const rr = r + dr * k * s, cc = c + dc * k * s;
        if (cells[rr]?.[cc] !== p) break;
        line.push([rr, cc]);
      }
    }
    if (line.length >= 4) return line.slice(0, 4);
  }
  return null;
}

export const isFull = cells => cells.every(row => row.every(v => v !== null));

// Datorns val bland de rutor den får välja mellan. Tre nivåer:
//  easy:   slumpar.
//  normal: tar fyra i rad om den kan, annars slumpar.
//  hard:   tar fyra i rad, stoppar annars motståndaren, annars väljer den ruta som ger flest egna brickor i en linje
//          (och helst stör motståndaren).
export const LEVELS = ['easy', 'normal', 'hard'];
export function pickCell(cells, allowed, me, level = 'normal', rnd = Math.random) {
  const pick = list => list[Math.floor(rnd() * list.length)];
  if (level === 'easy') return pick(allowed);
  const wins = who => allowed.filter(([r, c]) => { cells[r][c] = who; const w = winLine(cells, r, c); cells[r][c] = null; return w; });
  const mine = wins(me);
  if (mine.length) return pick(mine);
  if (level === 'normal') return pick(allowed);
  const block = wins(1 - me);
  if (block.length) return pick(block);
  // Poäng för en ruta: antal egna brickor i de fyra-linjer som går genom den och inte är blockerade av motståndaren.
  const score = ([r, c]) => {
    let s = 0;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      for (let k = -3; k <= 0; k++) {
        const line = [0, 1, 2, 3].map(i => [r + dr * (k + i), c + dc * (k + i)]);
        if (line.some(([y, x]) => cells[y]?.[x] === undefined)) continue; // utanför brädet
        const vals = line.map(([y, x]) => cells[y][x]);
        const own = vals.filter(v => v === me).length, opp = vals.filter(v => v === 1 - me).length;
        if (!opp) s += own * own + 1; // egna brickor i en öppen linje
        else if (!own) s += opp; // stör motståndarens linje
      }
    }
    return s + rnd() * 0.5;
  };
  return [...allowed].sort((a, b) => score(b) - score(a))[0];
}
