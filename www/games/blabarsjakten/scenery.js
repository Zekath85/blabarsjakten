// Miljön RUNT spelplanen: stad, skog eller bondgård. Planen ligger kvar i mitten som en gräsmatta,
// och runt den står hus, staket, rabatter, träd, ladugårdar och djur. Bara utseende.
import { ART } from './art.js';
import { LAND_ART } from './landscape.js';

export const THEMES = ['town', 'forest', 'farm'];
export const SCENE_CELLS = 2; // hur många rutor bred ramen runt planen är

const OUT = 'stroke="#3b2414" stroke-width="2.5" stroke-linejoin="round"';
const svg = body => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

// ---------- Byggnader och saker (egna, tecknade) ----------
const ART2 = {
  shop: (wall, awning) => svg(`<ellipse cx="50" cy="92" rx="40" ry="6" fill="#000" opacity=".18"/>
    <rect x="12" y="30" width="76" height="58" rx="4" fill="${wall}" ${OUT}/><rect x="8" y="22" width="84" height="12" rx="4" fill="#8d6e63" ${OUT}/>
    <path class="snowcap" d="M8 22 H92 V27 H8Z" fill="#fff"/>
    <path d="M10 46 H90 L86 56 H14Z" fill="${awning}" ${OUT}/><path d="M24 46 L22 56 M38 46 L37 56 M50 46 V56 M62 46 L63 56 M76 46 L78 56" stroke="#fff" stroke-width="4"/>
    <rect x="18" y="60" width="26" height="20" rx="2" fill="#bfe6ff" ${OUT}/><rect x="56" y="58" width="18" height="30" rx="2" fill="#8d5a2b" ${OUT}/>`),
  townhouse: (wall, roof) => svg(`<ellipse cx="50" cy="92" rx="30" ry="6" fill="#000" opacity=".18"/>
    <rect x="22" y="22" width="56" height="66" rx="3" fill="${wall}" ${OUT}/><path d="M18 26 L50 4 L82 26Z" fill="${roof}" ${OUT}/>
    <path class="snowcap" d="M18 26 L50 4 L82 26 L75 26 L50 11 L25 26Z" fill="#fff"/>
    ${[30, 50].map(y => `<rect x="30" y="${y}" width="12" height="12" rx="2" fill="#ffe082" ${OUT}/><rect x="58" y="${y}" width="12" height="12" rx="2" fill="#ffe082" ${OUT}/>`).join('')}
    <rect x="43" y="68" width="14" height="20" rx="2" fill="#5d3a18" ${OUT}/>`),
  lamp: svg(`<ellipse cx="50" cy="94" rx="14" ry="4" fill="#000" opacity=".2"/><rect x="46" y="30" width="8" height="64" rx="3" fill="#37474f"/>
    <path d="M36 30 H64 L58 14 H42Z" fill="#455a64" ${OUT}/><rect x="42" y="18" width="16" height="10" fill="#fff59d"/><circle cx="50" cy="23" r="16" fill="#fff59d" opacity=".25"/>`),
  bench: svg(`<ellipse cx="50" cy="86" rx="38" ry="5" fill="#000" opacity=".18"/><rect x="12" y="46" width="76" height="10" rx="3" fill="#a0522d" ${OUT}/>
    <rect x="12" y="60" width="76" height="10" rx="3" fill="#b5652f" ${OUT}/><path d="M20 70 V86 M80 70 V86" stroke="#37474f" stroke-width="6" stroke-linecap="round"/>`),
  flowerbed: svg(`<ellipse cx="50" cy="66" rx="44" ry="22" fill="#7a4a24" ${OUT}/><ellipse cx="50" cy="62" rx="38" ry="16" fill="#8d5a2b"/>
    ${[[24, 58, '#ff6fa8'], [38, 52, '#ffd54f'], [52, 58, '#ff8a65'], [66, 52, '#c39bff'], [76, 60, '#ff6fa8'], [44, 66, '#fff'], [60, 66, '#ffd54f'], [30, 68, '#c39bff']]
      .map(([x, y, c]) => `<circle cx="${x}" cy="${y - 8}" r="6" fill="${c}" ${OUT}/><circle cx="${x}" cy="${y - 8}" r="2" fill="#fff59d"/><path d="M${x} ${y - 2} V${y + 4}" stroke="#2e7d32" stroke-width="3"/>`).join('')}`),
  rock: svg(`<ellipse cx="50" cy="84" rx="38" ry="7" fill="#000" opacity=".18"/><path d="M14 80 Q12 50 34 42 Q50 30 68 42 Q88 50 86 80Z" fill="#9e9e9e" ${OUT}/>
    <path d="M30 50 Q42 44 52 48" stroke="#fff" stroke-width="4" opacity=".5" fill="none" stroke-linecap="round"/><path class="snowcap" d="M24 50 Q50 28 76 50 Q50 40 24 50Z" fill="#fff"/>`),
  log: svg(`<ellipse cx="50" cy="80" rx="42" ry="7" fill="#000" opacity=".18"/><rect x="12" y="52" width="70" height="26" rx="13" fill="#8d5a2b" ${OUT}/>
    <ellipse cx="82" cy="65" rx="10" ry="13" fill="#d7a86e" ${OUT}/><ellipse cx="82" cy="65" rx="5" ry="7" fill="none" stroke="#8d5a2b" stroke-width="2"/>
    <path d="M26 58 H60 M22 70 H54" stroke="#6d4220" stroke-width="2.5"/><circle cx="34" cy="50" r="6" fill="#e53935" ${OUT}/>`),
  mushrooms: svg(`<ellipse cx="50" cy="86" rx="34" ry="6" fill="#000" opacity=".15"/>
    ${[[34, 62, 14], [58, 56, 18], [74, 70, 10]].map(([x, y, r]) => `<rect x="${x - r / 3}" y="${y}" width="${r / 1.5}" height="${86 - y}" rx="3" fill="#fff3e0" ${OUT}/><path d="M${x - r} ${y + 2} Q${x} ${y - r * 1.3} ${x + r} ${y + 2}Z" fill="#e53935" ${OUT}/><circle cx="${x - r / 3}" cy="${y - r / 3}" r="${r / 5}" fill="#fff"/>`).join('')}`),
  barn: svg(`<ellipse cx="50" cy="92" rx="44" ry="6" fill="#000" opacity=".2"/>
    <path d="M8 46 L50 14 L92 46 V88 H8Z" fill="#c0392b" ${OUT}/><path d="M4 48 L50 12 L96 48" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>
    <path class="snowcap" d="M4 48 L50 12 L96 48 L88 48 L50 19 L12 48Z" fill="#fff"/>
    <rect x="34" y="56" width="32" height="32" fill="#8e2a1f" ${OUT}/><path d="M34 56 L66 88 M66 56 L34 88" stroke="#fff" stroke-width="4"/><rect x="43" y="32" width="14" height="12" fill="#ffe082" ${OUT}/>`),
  silo: svg(`<ellipse cx="50" cy="94" rx="22" ry="5" fill="#000" opacity=".2"/><rect x="32" y="22" width="36" height="72" rx="4" fill="#cfd8dc" ${OUT}/>
    <path d="M32 24 Q50 2 68 24Z" fill="#90a4ae" ${OUT}/><path d="M32 40 H68 M32 58 H68 M32 76 H68" stroke="#90a4ae" stroke-width="3"/>`),
  hay: svg(`<ellipse cx="50" cy="86" rx="38" ry="6" fill="#000" opacity=".18"/><rect x="14" y="48" width="72" height="36" rx="8" fill="#f2c14e" ${OUT}/>
    <path d="M20 58 H80 M20 70 H80" stroke="#c99a2e" stroke-width="3"/><path d="M38 48 V84 M62 48 V84" stroke="#a0522d" stroke-width="4"/><path class="snowcap" d="M16 50 Q50 40 84 50 V54 H16Z" fill="#fff"/>`),
  scarecrow: svg(`<ellipse cx="50" cy="94" rx="18" ry="4" fill="#000" opacity=".18"/><path d="M50 30 V94" stroke="#8d5a2b" stroke-width="6"/><path d="M18 44 H82" stroke="#8d5a2b" stroke-width="6" stroke-linecap="round"/>
    <path d="M34 44 H66 L62 74 H38Z" fill="#5c9de0" ${OUT}/><circle cx="50" cy="28" r="13" fill="#f2c14e" ${OUT}/><path d="M32 18 H68 L60 8 H40Z" fill="#8d5a2b" ${OUT}/>
    <circle cx="45" cy="28" r="2" fill="#3b2414"/><circle cx="55" cy="28" r="2" fill="#3b2414"/><path d="M44 34 Q50 38 56 34" stroke="#3b2414" stroke-width="2" fill="none"/>`),
  pumpkins: svg(`<ellipse cx="50" cy="84" rx="40" ry="6" fill="#000" opacity=".15"/>${[[32, 66, 16], [64, 62, 20]].map(([x, y, r]) =>
    `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.8}" fill="#fb8c00" ${OUT}/><path d="M${x} ${y - r * 0.8} V${y + r * 0.8} M${x - r / 2} ${y - r * 0.6} Q${x - r / 1.3} ${y} ${x - r / 2} ${y + r * 0.6}" stroke="#e65100" stroke-width="2" fill="none"/><path d="M${x} ${y - r * 0.8} q2 -8 8 -10" stroke="#5d4037" stroke-width="4" fill="none" stroke-linecap="round"/>`).join('')}`),
  chicken: svg(`<ellipse cx="50" cy="90" rx="20" ry="4" fill="#000" opacity=".18"/><ellipse cx="46" cy="64" rx="24" ry="18" fill="#fff" ${OUT}/>
    <circle cx="66" cy="44" r="12" fill="#fff" ${OUT}/><path d="M62 32 q4 -8 8 0 q4 -6 6 2" fill="#e53935" ${OUT}/><path d="M77 44 L88 47 L77 50Z" fill="#ffb300" ${OUT}/>
    <circle cx="68" cy="42" r="2.2" fill="#2b1d14"/><path d="M40 82 V90 M52 82 V90" stroke="#ffb300" stroke-width="3"/><path d="M22 58 Q14 50 22 46" stroke="#3b2414" stroke-width="2.5" fill="#fff"/>`),
};

const TOWN_WALLS = ['#ffe0b2', '#e1f5fe', '#f8bbd0', '#dcedc8', '#fff9c4'];
const ROOFS = ['#c0392b', '#2e6da4', '#3e8e41', '#8e5a2b', '#7b1fa2'];
const AWNINGS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00'];

// Vad som står i ramen för varje miljö (vikt = hur ofta).
function pick(theme, rng) {
  const r = rng(), any = list => list[Math.floor(rng() * list.length)];
  if (theme === 'town') {
    if (r < 0.3) return ['house', LAND_ART.house(any(ROOFS))];
    if (r < 0.45) return ['shop', ART2.shop(any(TOWN_WALLS), any(AWNINGS))];
    if (r < 0.6) return ['townhouse', ART2.townhouse(any(TOWN_WALLS), any(ROOFS))];
    if (r < 0.72) return ['flowerbed', ART2.flowerbed];
    if (r < 0.82) return ['lamp', ART2.lamp];
    if (r < 0.9) return ['bench', ART2.bench];
    return ['tree', ART.tree];
  }
  if (theme === 'forest') {
    if (r < 0.5) return ['tree', ART.tree];
    if (r < 0.62) return ['bush', ART.bush];
    if (r < 0.74) return ['rock', ART2.rock];
    if (r < 0.84) return ['log', ART2.log];
    if (r < 0.94) return ['mushrooms', ART2.mushrooms];
    return ['flower', ART.flower];
  }
  // bondgård
  if (r < 0.14) return ['barn', ART2.barn];
  if (r < 0.24) return ['silo', ART2.silo];
  if (r < 0.44) return ['hay', ART2.hay];
  if (r < 0.54) return ['scarecrow', ART2.scarecrow];
  if (r < 0.66) return ['pumpkins', ART2.pumpkins];
  if (r < 0.78) return ['windmill', LAND_ART.windmill];
  if (r < 0.9) return ['tree', ART.tree];
  return ['bush', ART.bush];
}

// Ramen: mark (stenläggning, skogsmark eller åkerjord), staket mot planen och saker som står upp.
export function renderScenery(G, C, theme, rng = Math.random) {
  const M = SCENE_CELLS * C, W = G * C, S = W + 2 * M;
  const id = `g${Math.floor(rng() * 1e6)}`;
  // Marken i ramen: allt utom själva planen (hålet i mitten).
  const ring = `M0 0 H${S} V${S} H0Z M${M} ${M + 24} Q${M} ${M} ${M + 24} ${M} H${M + W - 24} Q${M + W} ${M} ${M + W} ${M + 24} V${M + W - 24} Q${M + W} ${M + W} ${M + W - 24} ${M + W} H${M + 24} Q${M} ${M + W} ${M} ${M + W - 24}Z`;
  const patterns = {
    town: `<pattern id="${id}" width="44" height="30" patternUnits="userSpaceOnUse"><rect width="44" height="30" class="pave"/><rect x="2" y="2" width="18" height="12" rx="5" class="stone"/><rect x="24" y="2" width="18" height="12" rx="5" class="stone"/><rect x="-9" y="16" width="18" height="12" rx="5" class="stone"/><rect x="13" y="16" width="18" height="12" rx="5" class="stone"/><rect x="35" y="16" width="18" height="12" rx="5" class="stone"/></pattern>`,
    forest: `<pattern id="${id}" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" class="floor"/><circle cx="12" cy="14" r="5" class="litter"/><circle cx="40" cy="30" r="4" class="litter2"/><circle cx="22" cy="46" r="3.5" class="litter"/><circle cx="50" cy="8" r="3" class="litter2"/></pattern>`,
    farm: `<pattern id="${id}" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" class="soil"/><rect y="6" width="40" height="10" rx="5" class="furrow"/><rect y="26" width="40" height="10" rx="5" class="furrow"/></pattern>`,
  };
  let ground = `<svg class="scenery-ground theme-${theme}" width="${S}" height="${S}" style="left:${-M}px;top:${-M}px" xmlns="http://www.w3.org/2000/svg"><defs>${patterns[theme]}</defs>
    <path d="${ring}" fill="url(#${id})" fill-rule="evenodd"/>`;
  // Staden har en gata längst ut med streckad mittlinje.
  if (theme === 'town') ground += `<rect x="10" y="10" width="${S - 20}" height="${S - 20}" rx="40" class="street"/><rect x="10" y="10" width="${S - 20}" height="${S - 20}" rx="40" class="street-line"/>`;
  // Staket eller häck runt planen.
  const fence = { town: 'picket', forest: 'hedge', farm: 'rail' }[theme];
  ground += `<rect x="${M - 6}" y="${M - 6}" width="${W + 12}" height="${W + 12}" rx="28" class="edge ${fence}"/>`;
  if (fence !== 'hedge') for (let p = 0; p <= W; p += C / 2) {
    [[M + p, M - 6], [M + p, M + W + 6], [M - 6, M + p], [M + W + 6, M + p]].forEach(([x, y]) =>
      (ground += `<rect x="${x - 4}" y="${y - (fence === 'picket' ? 10 : 7)}" width="8" height="${fence === 'picket' ? 20 : 14}" rx="${fence === 'picket' ? 4 : 2}" class="post-${fence}"/>`));
  }
  ground += '</svg>';

  // Saker längs alla fyra sidor, mitt i ramen, med jämna mellanrum och lite slump.
  let deco = '';
  const step = C * 1.05, mid = M / 2;
  const place = (x, y) => {
    const [kind, art] = pick(theme, rng);
    const big = ['barn', 'shop', 'townhouse', 'house', 'silo', 'windmill'].includes(kind);
    const sz = big ? C * 1.5 : C * 1.15;
    const sails = kind === 'windmill' ? `<i class="sails">${LAND_ART.sails}</i>` : '';
    const smoke = kind === 'house' ? '<i class="smoke"><b></b><b></b><b></b></i>' : '';
    deco += `<div class="deco scene" data-kind="${kind}" style="left:${x - sz / 2}px;top:${y - sz * 0.75}px;width:${sz}px;height:${sz}px">` +
      `<i class="sway ${kind}" style="animation-delay:${-rng() * 9}s">${art}${sails}${smoke}</i></div>`;
  };
  for (let p = -mid; p <= W + mid; p += step) {
    const j = () => (rng() - 0.5) * C * 0.3;
    place(p + j(), -mid + j());          // överkant
    place(p + j(), W + mid + j());       // nederkant
    if (p > mid && p < W - mid) {        // sidorna (hörnen är redan tagna)
      place(-mid + j(), p + j());
      place(W + mid + j(), p + j());
    }
  }
  // Höns som pickar på bondgården.
  if (theme === 'farm') for (let h = 0; h < 3; h++)
    deco += `<div class="critter chicken" style="left:${W + mid - 30 + rng() * 40}px;top:${W * (0.2 + rng() * 0.6)}px;animation-delay:${-rng() * 5}s">${ART2.chicken}</div>`;
  return { ground, deco, margin: M };
}
