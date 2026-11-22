// Reglerna i Fyra i rad (som i Bamse 4 i rad). Ren logik, inga bilder. Testas i test/logic.test.js.
// Brädet: 4 rader, var och en med en färg, och 5 kolumner med figurer. cells[rad][kolumn] = spelarens nummer eller null.
// Färgtärningen pekar ut en rad. Bildtärningen visar figuren man ska hitta i den raden.
export const FIGS = ['fox', 'owl', 'squirrel', 'hedgehog', 'hare'];
export const COLOR_HEX = { green: '#43a047', red: '#e53935', blue: '#1e88e5', yellow: '#fbc02d', white: '#fffdf5' };
export const ROWS = 4, COLS = FIGS.length;
export const DIE_COLOR = ['green', 'red', 'blue', 'yellow', 'white', 'white']; // vitt = välj rad själv
export const DIE_FIG = [...FIGS, 'any'];                                      // stjärna = välj figur själv
export const rollDie = (rnd = Math.random) => 1 + Math.floor(rnd() * 6);

// Fyra spelplaner. Varje rad har en färg och alla fem figurerna i egen ordning.
const rot = (a, n) => a.map((_, i) => a[(i + n) % a.length]);
const board = (colors, order, shifts) => colors.map((color, r) => ({ color, figs: rot(order, shifts[r]) }));
export const LAYOUTS = {
  blue:   board(['green', 'red', 'blue', 'yellow'], ['fox', 'owl', 'squirrel', 'hedgehog', 'hare'], [0, 2, 4, 1]),
  green:  board(['red', 'yellow', 'green', 'blue'], ['hare', 'hedgehog', 'fox', 'squirrel', 'owl'], [3, 0, 2, 4]),
  yellow: board(['blue', 'green', 'yellow', 'red'], ['owl', 'hare', 'hedgehog', 'fox', 'squirrel'], [1, 4, 0, 3]),
  red:    board(['yellow', 'blue', 'red', 'green'], ['squirrel', 'fox', 'hare', 'owl', 'hedgehog'], [2, 3, 1, 0]),
};

export const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

// Lediga rutor som passar tärningarna. Vitt = vilken rad som helst, stjärna = vilken figur som helst.
// Finns ingen ledig ruta som passar går turen vidare (tom lista).
export function legalCells(cells, layout, color, fig) {
  const hit = [];
  layout.forEach((row, r) => row.figs.forEach((f, c) => {
    if (cells[r][c] === null && (color === 'white' || row.color === color) && (fig === 'any' || f === fig)) hit.push([r, c]);
  }));
  return hit;
}

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
