// Landskapet runt banan: äng, åker, skog, by, sjö och en bäck med broar.
// Bara utseende, påverkar inga regler. Ny bana = nytt landskap.
import { ART } from './art.js';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const OUT = 'stroke="#3b2414" stroke-width="2.5" stroke-linejoin="round"';
const svg = body => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---------- Var saker ligger ----------
export function makeLandscape(board, rng = Math.random) {
  const G = board.grid, key = (x, y) => y * G + x, inside = (x, y) => x >= 0 && y >= 0 && x < G && y < G;
  const path = new Map(board.map((t, i) => [key(t.x, t.y), i]));
  const nearPath = (x, y) => DIRS.some(([dx, dy]) => inside(x + dx, y + dy) && path.has(key(x + dx, y + dy)));
  // Rak bit av banan i en ruta: 'h' (vänster–höger), 'v' (upp–ner) eller null (sväng, start, mål).
  const straight = i => {
    const a = board[i - 1], b = board[i + 1];
    if (!a || !b) return null;
    return a.y === b.y ? 'h' : a.x === b.x ? 'v' : null;
  };

  // Bäcken: prova flera varianter och behåll den som korsar banan på raka bitar, tvärs över, utan att följa banan.
  let river = null, best = Infinity;
  for (let t = 0; t < 40 && best > 0; t++) {
    const vertical = rng() < 0.5, cells = [];
    let a = 1 + Math.floor(rng() * (G - 2));
    for (let b = 0; b < G; b++) {
      cells.push(vertical ? [a, b] : [b, a]);
      if (b < G - 1 && rng() < 0.35) {
        const na = Math.min(G - 2, Math.max(1, a + (rng() < 0.5 ? -1 : 1)));
        const c = vertical ? [na, b] : [b, na];
        if (na !== a && !path.has(key(...c))) { cells.push(c); a = na; }
      }
    }
    const idx = cells.map(c => path.get(key(...c)));
    let score = 0, crossings = 0;
    idx.forEach((i, n) => {
      if (i === undefined) return;
      crossings++;
      if (idx[n + 1] !== undefined || idx[n - 1] !== undefined) score += 100; // följer banan
      const dir = straight(i);
      if (!dir) score += 100; // sväng, start eller mål: ingen bro där
      else if ((dir === 'v') === vertical) score += 100; // banan går längs bäcken
    });
    score += crossings === 0 ? 30 : (crossings - 1) * 8;
    if (score < best) { best = score; river = { cells, vertical }; }
  }
  const riverSet = new Set(river.cells.map(c => key(...c)));
  const bridges = river.cells.map(c => path.get(key(...c))).filter(i => i !== undefined && straight(i));
  // Om bäcken ändå hamnade på en sväng: ta bort den rutan ur bäcken (hellre glapp än konstig bro).
  river.cells = river.cells.filter(c => !path.has(key(...c)) || bridges.includes(path.get(key(...c))));

  // Sjön: några rutor en bit från banan och bäcken.
  const roomy = (x, y) => inside(x, y) && !path.has(key(x, y)) && !nearPath(x, y) && !riverSet.has(key(x, y));
  const lake = new Set();
  const spots = [];
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) if (roomy(x, y)) spots.push([x, y]);
  if (spots.length) {
    const queue = [spots[Math.floor(rng() * spots.length)]], size = 3 + Math.floor(rng() * 4);
    while (queue.length && lake.size < size) {
      const [x, y] = queue.shift();
      if (!roomy(x, y) || lake.has(key(x, y))) continue;
      lake.add(key(x, y));
      shuffle(DIRS.slice(), rng).forEach(([dx, dy]) => queue.push([x + dx, y + dy]));
    }
  }

  // Zoner: närmaste "frö" bestämmer om rutan är åker, skog, by eller äng.
  const types = shuffle(['field', 'forest', 'village', 'meadow', 'forest', 'field'].slice(0, G >= 10 ? 6 : 4), rng);
  const seeds = types.map(type => ({ type, x: rng() * G, y: rng() * G }));
  const zone = new Map();
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    const k = key(x, y);
    if (path.has(k) || riverSet.has(k) || lake.has(k)) continue;
    let bestSeed = seeds[0], d0 = Infinity;
    for (const s of seeds) { const d = (s.x - x) ** 2 + (s.y - y) ** 2 + rng() * 0.8; if (d < d0) { d0 = d; bestSeed = s; } }
    zone.set(k, bestSeed.type);
  }
  return { G, key, inside, path, nearPath, river, riverSet, bridges, lake, zone, straight };
}

// ---------- Bilder för landskapet ----------
const ROOFS = ['#c0392b', '#2e6da4', '#3e8e41', '#8e5a2b'];
export const LAND_ART = {
  house: roof => svg(`<ellipse cx="50" cy="90" rx="36" ry="6" fill="#000" opacity=".18"/>
    <rect x="62" y="24" width="10" height="18" fill="#8d6e63" ${OUT}/>
    <rect x="24" y="48" width="52" height="40" rx="3" fill="#f6e7c8" ${OUT}/>
    <path d="M14 53 L50 20 L86 53Z" fill="${roof}" ${OUT}/>
    <path class="snowcap" d="M14 53 L50 20 L86 53 L79 53 L50 28 L21 53Z" fill="#fff"/>
    <rect x="44" y="64" width="13" height="24" rx="2" fill="#8d5a2b" ${OUT}/>
    <rect x="29" y="58" width="11" height="11" rx="1.5" fill="#ffe082" ${OUT}/><rect x="61" y="58" width="11" height="11" rx="1.5" fill="#ffe082" ${OUT}/>`),
  windmill: svg(`<ellipse cx="50" cy="92" rx="26" ry="6" fill="#000" opacity=".18"/>
    <path d="M36 92 L42 36 H58 L64 92Z" fill="#f3e1c0" ${OUT}/><path d="M38 40 L50 26 L62 40Z" fill="#a0522d" ${OUT}/>
    <path class="snowcap" d="M38 40 L50 26 L62 40 L57 40 L50 32 L43 40Z" fill="#fff"/>
    <rect x="45" y="72" width="10" height="20" rx="2" fill="#8d5a2b" ${OUT}/>`),
  sails: svg(`<g fill="#fff3e0" stroke="#5d3a18" stroke-width="4" stroke-linejoin="round"><path d="M50 50 L46 6 L56 6Z"/><path d="M50 50 L94 46 L94 56Z"/><path d="M50 50 L54 94 L44 94Z"/><path d="M50 50 L6 54 L6 44Z"/></g><path d="M50 50 L48 14 M50 50 L86 48 M50 50 L52 86 M50 50 L14 52" stroke="#c0392b" stroke-width="5"/><circle cx="50" cy="50" r="8" fill="#5d3a18"/>`),
  cottage: svg(`<ellipse cx="50" cy="90" rx="40" ry="6" fill="#000" opacity=".18"/>
    <rect x="22" y="46" width="56" height="42" rx="3" fill="#ffd6a5" ${OUT}/>
    <path d="M12 51 L50 18 L88 51Z" fill="#e53935" ${OUT}/>
    <path class="snowcap" d="M12 51 L50 18 L88 51 L80 51 L50 26 L20 51Z" fill="#fff"/>
    <path d="M44 88 V68 a6 6 0 0 1 12 0 V88Z" fill="#43a047" ${OUT}/>
    <circle cx="33" cy="62" r="6" fill="#ffe082" ${OUT}/><circle cx="67" cy="62" r="6" fill="#ffe082" ${OUT}/>
    <path d="M4 92 V80 M14 92 V80 M86 92 V80 M96 92 V80 M2 84 H18 M82 84 H98" stroke="#8d5a2b" stroke-width="3" stroke-linecap="round"/>`),
  goalTree: svg(`<ellipse cx="50" cy="92" rx="34" ry="6" fill="#000" opacity=".2"/>
    <path d="M44 92 Q46 70 44 58 H56 Q54 70 56 92Z" fill="#7b5230"/>
    <circle cx="50" cy="38" r="30" fill="#4caf50"/><circle cx="30" cy="52" r="18" fill="#43a047"/><circle cx="70" cy="52" r="18" fill="#43a047"/>
    <g fill="#3d4fb8" stroke="#fff" stroke-width="1.5">${[[38, 30], [58, 26], [66, 44], [44, 48], [28, 50], [72, 58], [52, 40], [36, 62], [60, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5"/>`).join('')}</g>
    <path d="M78 10 V40" stroke="#5d4037" stroke-width="3"/><path d="M78 10 L96 16 L78 22Z" fill="#e53935"/>`),
  duck: svg(`<ellipse cx="48" cy="66" rx="30" ry="16" fill="#fff" ${OUT}/><circle cx="70" cy="44" r="13" fill="#fff" ${OUT}/>
    <path d="M81 44 L95 47 L81 51Z" fill="#ff9800" ${OUT}/><circle cx="73" cy="41" r="2.5" fill="#2b1d14"/>
    <path d="M30 60 Q44 54 54 64" fill="none" stroke="#cfd8dc" stroke-width="3"/>`),
  fish: svg(`<path d="M20 50 Q50 25 78 50 Q50 75 20 50Z" fill="#ff8a65" ${OUT}/><path d="M78 50 L96 36 V64Z" fill="#ff7043" ${OUT}/><circle cx="34" cy="46" r="3" fill="#2b1d14"/>`),
  butterfly: color => svg(`<g class="wings"><path d="M50 50 C30 20 8 26 14 46 C18 58 36 58 50 50Z M50 50 C70 20 92 26 86 46 C82 58 64 58 50 50Z" fill="${color}" ${OUT}/>
    <path d="M50 52 C36 64 26 80 38 82 C46 82 50 66 50 52Z M50 52 C64 64 74 80 62 82 C54 82 50 66 50 52Z" fill="${color}" opacity=".85" ${OUT}/>
    <circle cx="30" cy="40" r="5" fill="#fff" opacity=".7"/><circle cx="70" cy="40" r="5" fill="#fff" opacity=".7"/></g>
    <ellipse cx="50" cy="56" rx="4" ry="16" fill="#3b2414"/><path d="M48 40 Q42 28 38 26 M52 40 Q58 28 62 26" stroke="#3b2414" stroke-width="2.5" fill="none"/>`),
  bee: svg(`<g class="wings"><ellipse cx="40" cy="30" rx="14" ry="18" fill="#e3f2fd" opacity=".9" ${OUT}/><ellipse cx="60" cy="30" rx="14" ry="18" fill="#e3f2fd" opacity=".9" ${OUT}/></g>
    <ellipse cx="50" cy="58" rx="26" ry="20" fill="#ffd54f" ${OUT}/><path d="M42 40 V76 M56 40 V76" stroke="#3b2414" stroke-width="7"/>
    <circle cx="74" cy="54" r="3" fill="#3b2414"/><path d="M24 58 L14 60" stroke="#3b2414" stroke-width="4" stroke-linecap="round"/>`),
  rabbit: svg(`<ellipse cx="50" cy="92" rx="26" ry="5" fill="#000" opacity=".18"/>
    <path d="M38 40 C30 6 42 4 46 38Z M62 40 C70 6 58 4 54 38Z" class="fur" ${OUT}/><path d="M40 34 C36 14 42 12 44 32Z M60 34 C64 14 58 12 56 32Z" fill="#ffb3c6"/>
    <ellipse cx="50" cy="74" rx="26" ry="20" class="fur" ${OUT}/><circle cx="50" cy="50" r="18" class="fur" ${OUT}/>
    <circle cx="43" cy="47" r="3" fill="#2b1d14"/><circle cx="57" cy="47" r="3" fill="#2b1d14"/><ellipse cx="50" cy="56" rx="3.5" ry="2.5" fill="#ff8fab"/>
    <circle cx="72" cy="80" r="7" fill="#fff" ${OUT}/>`),
  well: svg(`<ellipse cx="50" cy="88" rx="30" ry="6" fill="#000" opacity=".18"/><rect x="26" y="56" width="48" height="30" rx="6" fill="#b0a08a" ${OUT}/>
    <path d="M28 64 H72 M28 74 H72" stroke="#8a7a66" stroke-width="2.5"/><path d="M32 56 V26 M68 56 V26" stroke="#6d4c41" stroke-width="5"/>
    <path d="M22 30 L50 14 L78 30Z" fill="#8e5a2b" ${OUT}/>`),
};

// ---------- Rita ----------
// Returnerar: land (svg under allt), road (grusväg, stenar och broar) och deco (hus, träd, djur som står upp i 3D).
export function renderLandscape(L, board, C, rng = Math.random) {
  const { G, key, inside, path, nearPath, river, riverSet, lake, zone, bridges } = L;
  const W = G * C, cx = x => x * C + C / 2;
  const zoneAt = (x, y) => (inside(x, y) ? zone.get(key(x, y)) : undefined);
  let land = `<svg class="land" width="${W}" height="${W}" xmlns="http://www.w3.org/2000/svg"><defs>
    <pattern id="crop" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(${rng() < 0.5 ? 0 : 90})">
      <rect class="crop-bg" width="22" height="22"/><rect class="crop-row" y="4" width="22" height="7" rx="3.5"/></pattern>
    <radialGradient id="hill" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".55" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></radialGradient></defs>`;

  // Kullar: mjukt ljus och skugga på marken.
  for (let h = 0; h < Math.max(2, Math.round(G / 4)); h++)
    land += `<ellipse class="hill" cx="${rng() * W}" cy="${rng() * W}" rx="${C * (2 + rng() * 1.5)}" ry="${C * (1.4 + rng())}"/>`;

  // Mark för skog och by.
  zone.forEach((type, k) => {
    if (type !== 'forest' && type !== 'village') return;
    const x = k % G, y = Math.floor(k / G);
    land += `<rect class="${type}-ground" x="${x * C - 6}" y="${y * C - 6}" width="${C + 12}" height="${C + 12}" rx="34"/>`;
  });

  // Sidostig från byn till banan.
  const village = [...zone].filter(([, t]) => t === 'village').map(([k]) => [k % G, Math.floor(k / G)]);
  if (village.length) {
    const [vx, vy] = village[Math.floor(village.length / 2)];
    let bestT = board[0], bd = Infinity;
    board.forEach(t => { const d = Math.abs(t.x - vx) + Math.abs(t.y - vy); if (d < bd) { bd = d; bestT = t; } });
    land += `<polyline class="sidepath" points="${cx(vx)},${cx(vy)} ${cx(bestT.x)},${cx(vy)} ${cx(bestT.x)},${cx(bestT.y)}"/>`;
  }

  // Åkrar med staket där åkern tar slut.
  zone.forEach((type, k) => {
    if (type !== 'field') return;
    const x = k % G, y = Math.floor(k / G), X = x * C, Y = y * C;
    land += `<rect class="field" x="${X + 3}" y="${Y + 3}" width="${C - 6}" height="${C - 6}" rx="8"/>`;
    const edge = (dx, dy) => zoneAt(x + dx, y + dy) !== 'field';
    const lines = [];
    if (edge(0, -1)) lines.push([X, Y + 4, X + C, Y + 4]);
    if (edge(0, 1)) lines.push([X, Y + C - 4, X + C, Y + C - 4]);
    if (edge(-1, 0)) lines.push([X + 4, Y, X + 4, Y + C]);
    if (edge(1, 0)) lines.push([X + C - 4, Y, X + C - 4, Y + C]);
    lines.forEach(([a, b, c, d]) => {
      land += `<line class="fence" x1="${a}" y1="${b}" x2="${c}" y2="${d}"/>`;
      for (let p = 0; p <= 3; p++) land += `<circle class="post" cx="${a + (c - a) * p / 3}" cy="${b + (d - b) * p / 3}" r="3.5"/>`;
    });
  });

  // Sjön: sandstrand och vatten som runda former som flyter ihop.
  const lakeCells = [...lake].map(k => [k % G, Math.floor(k / G)]);
  lakeCells.forEach(([x, y]) => (land += `<circle class="sand" cx="${cx(x)}" cy="${cx(y)}" r="${C * 0.74}"/>`));
  lakeCells.forEach(([x, y]) => (land += `<circle class="water" cx="${cx(x)}" cy="${cx(y)}" r="${C * 0.6}"/>`));

  // Bäcken: strand, vatten och ett ljust stråk.
  const pts = river.cells.map(([x, y]) => `${cx(x)},${cx(y)}`);
  const ends = river.vertical
    ? [`${cx(river.cells[0][0])},${-C}`, `${cx(river.cells.at(-1)[0])},${W + C}`]
    : [`${-C},${cx(river.cells[0][1])}`, `${W + C},${cx(river.cells.at(-1)[1])}`];
  const rp = [ends[0], ...pts, ends[1]].join(' ');
  land += `<polyline class="river-bank" points="${rp}"/><polyline class="river" points="${rp}"/><polyline class="river-shine" points="${rp}"/></svg>`;

  // Grusväg under banan, med en mörkare kant och små stenar längs sidorna.
  const tp = board.map(t => `${cx(t.x)},${cx(t.y)}`).join(' ');
  let road = `<svg class="road" width="${W}" height="${W}" xmlns="http://www.w3.org/2000/svg"><polyline class="road-edge" points="${tp}"/><polyline class="road-gravel" points="${tp}"/>`;
  board.forEach((t, i) => {
    const open = [board[i - 1], board[i + 1]].filter(Boolean).map(n => [n.x - t.x, n.y - t.y]);
    DIRS.forEach(([dx, dy]) => {
      if (open.some(([a, b]) => a === dx && b === dy) || rng() < 0.4) return;
      // två små stenar vid den stängda kanten
      for (let s = 0; s < 2; s++) {
        const along = (rng() - 0.5) * C * 0.7, out = C * 0.56;
        const sx = cx(t.x) + (dx ? dx * out : along), sy = cx(t.y) + (dy ? dy * out : along);
        road += `<ellipse class="pebble" cx="${sx}" cy="${sy}" rx="${4 + rng() * 3}" ry="${3 + rng() * 2}"/>`;
      }
    });
  });
  // Broar där bäcken korsar banan: brädor och räcken längs vägen.
  bridges.forEach(i => {
    const t = board[i], h = board[i - 1].y === board[i + 1].y, X = cx(t.x), Y = cx(t.y);
    const [w, d] = h ? [C * 1.1, C * 0.9] : [C * 0.9, C * 1.1];
    road += `<rect class="bridge" x="${X - w / 2}" y="${Y - d / 2}" width="${w}" height="${d}" rx="6"/>`;
    for (let p = -4; p <= 4; p++) {
      const o = p * C * 0.12;
      road += h ? `<line class="plank" x1="${X + o}" y1="${Y - d / 2}" x2="${X + o}" y2="${Y + d / 2}"/>` : `<line class="plank" x1="${X - w / 2}" y1="${Y + o}" x2="${X + w / 2}" y2="${Y + o}"/>`;
    }
    [-1, 1].forEach(side => {
      const r = side * C * 0.5;
      road += h ? `<rect class="rail" x="${X - w / 2}" y="${Y + r - 4}" width="${w}" height="8" rx="4"/>` : `<rect class="rail" x="${X + r - 4}" y="${Y - d / 2}" width="8" height="${d}" rx="4"/>`;
      [-1, 1].forEach(e => {
        const px = h ? X + e * w / 2 : X + r, py = h ? Y + r : Y + e * d / 2;
        road += `<circle class="rail-post" cx="${px}" cy="${py}" r="7"/>`;
      });
    });
  });
  road += '</svg>';

  // Saker som står upp: träd, buskar, blommor, hus, kvarn, start-stuga och mål-träd.
  const items = new Map(); // ruta -> [sort, extra]
  const put = (x, y, kind, extra = '') => inside(x, y) && !items.has(key(x, y)) && items.set(key(x, y), [kind, extra]);
  const freeNear = t => DIRS.map(([dx, dy]) => [t.x + dx, t.y + dy])
    .find(([x, y]) => inside(x, y) && !path.has(key(x, y)) && !riverSet.has(key(x, y)) && !lake.has(key(x, y)));
  const s = freeNear(board[0]); if (s) put(...s, 'cottage');
  const g = freeNear(board.at(-1)); if (g) put(...g, 'goalTree');
  let houses = 0, mill = false, well = false;
  shuffle([...zone], rng).forEach(([k, type]) => {
    const x = k % G, y = Math.floor(k / G), near = nearPath(x, y), r = rng();
    if (type === 'village' && !near) {
      if (!mill && r < 0.5) { mill = true; return put(x, y, 'windmill'); }
      if (houses < 4 && r < 0.6) { houses++; return put(x, y, 'house', ROOFS[houses % ROOFS.length]); }
      if (!well && r < 0.7) { well = true; return put(x, y, 'well'); }
    }
    if (type === 'field') return;
    if (near) return r < 0.12 && put(x, y, 'flower');
    if (type === 'forest') return r < 0.8 && put(x, y, r < 0.65 ? 'tree' : r < 0.72 ? 'bush' : 'flower');
    // Äng: blandat med träd, buskar och blommor.
    if (r < 0.45) put(x, y, ['tree', 'flower', 'bush', 'flower', 'tree', 'flower'][Math.floor(r / 0.075)]);
  });
  let deco = '';
  items.forEach(([kind, extra], k) => {
    const x = k % G, y = Math.floor(k / G);
    const art = kind === 'house' ? LAND_ART.house(extra) : LAND_ART[kind] || ART[kind];
    const smoke = kind === 'house' || kind === 'cottage' ? '<i class="smoke"><b></b><b></b><b></b></i>' : '';
    const sails = kind === 'windmill' ? `<i class="sails">${LAND_ART.sails}</i>` : '';
    deco += `<div class="deco ${kind === 'cottage' || kind === 'goalTree' ? 'landmark' : ''}" data-kind="${kind}" style="left:${x * C}px;top:${y * C}px">` +
      `<i class="sway ${kind}" style="animation-delay:${-rng() * 9}s;animation-duration:${7 + rng() * 5}s">${art}${sails}${smoke}</i></div>`;
  });
  // Liv på sjön: ankor som simmar, en fisk som hoppar och glitter.
  lakeCells.forEach(([x, y], n) => {
    if (n === 0) deco += `<div class="critter duck" style="left:${x * C + 20}px;top:${y * C + 30}px">${LAND_ART.duck}</div>`;
    if (n === 1) deco += `<div class="critter fish" style="left:${x * C + 26}px;top:${y * C + 26}px">${LAND_ART.fish}</div>`;
    deco += `<i class="glint" style="left:${x * C + 20 + rng() * 40}px;top:${y * C + 20 + rng() * 40}px;animation-delay:${-rng() * 4}s"></i>`;
  });
  // Mer liv: fjärilar fladdrar över ängen, bin surrar vid blommor och kaniner tittar fram vid buskar.
  const COLORS = ['#ff8fb8', '#ffd54f', '#8fd3ff', '#c39bff'];
  const spots = shuffle([...zone].filter(([k, t]) => t !== 'field' && !items.has(k)).map(([k]) => [k % G, Math.floor(k / G)]), rng);
  spots.slice(0, Math.min(4, Math.ceil(G / 3))).forEach(([x, y], n) =>
    (deco += `<div class="critter butterfly" style="left:${x * C + 25}px;top:${y * C + 15}px;animation-delay:${-rng() * 14}s">${LAND_ART.butterfly(COLORS[n % COLORS.length])}</div>`));
  const kinds = kind => [...items].filter(([, v]) => v[0] === kind).map(([k]) => [k % G, Math.floor(k / G)]);
  kinds('flower').slice(0, 2).forEach(([x, y]) =>
    (deco += `<div class="critter bee" style="left:${x * C + 30}px;top:${y * C + 10}px;animation-delay:${-rng() * 6}s">${LAND_ART.bee}</div>`));
  kinds('bush').slice(0, 2).forEach(([x, y]) =>
    (deco += `<div class="critter rabbit" style="left:${x * C + 44}px;top:${y * C + 40}px;animation-delay:${-rng() * 12}s">${LAND_ART.rabbit}</div>`));
  return { land, road, deco };
}
