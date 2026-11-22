// Reglerna i Fyra i rad. Ren logik, inga bilder. Testas i test/logic.test.js.
// Brädet: 4 kolumner (grön, röd, blå, gul) och 5 rader. cells[rad][kolumn] = spelarens nummer eller null.
export const COLS = ['green', 'red', 'blue', 'yellow'];
export const COLOR_HEX = { green: '#43a047', red: '#e53935', blue: '#1e88e5', yellow: '#fbc02d', white: '#fffdf5' };
export const ROWS = 5;
// Tärningens sex sidor. Vit finns två gånger (fri plats).
export const DIE = ['green', 'red', 'blue', 'yellow', 'white', 'white'];
export const rollDie = (rnd = Math.random) => 1 + Math.floor(rnd() * 6);

export const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS.length).fill(null));

// Lediga rutor för en färg. Vit, eller en full kolumn: välj vilken ledig ruta som helst.
export function legalCells(cells, color) {
  const free = [];
  cells.forEach((row, r) => row.forEach((v, c) => v === null && free.push([r, c])));
  const inCol = free.filter(([, c]) => COLS[c] === color);
  return color === 'white' || !inCol.length ? free : inCol;
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
