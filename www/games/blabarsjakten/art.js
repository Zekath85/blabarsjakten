// Egna tecknade figurer som SVG (små och skarpa på alla skärmar).
const svg = (body, vb = '0 0 100 100') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const eyes = (lx, rx, y, r = 5) =>
  `<circle cx="${lx}" cy="${y}" r="${r}" fill="#2b1d14"/><circle cx="${rx}" cy="${y}" r="${r}" fill="#2b1d14"/>` +
  `<circle cx="${lx + 1.6}" cy="${y - 1.8}" r="${r / 3}" fill="#fff"/><circle cx="${rx + 1.6}" cy="${y - 1.8}" r="${r / 3}" fill="#fff"/>`;
const OUT = 'stroke="#3b2414" stroke-width="2.5" stroke-linejoin="round"';

export const ART = {
  fox: svg(`
    <path d="M14 14 L42 38 L20 52Z" fill="#e8742c" ${OUT}/><path d="M86 14 L58 38 L80 52Z" fill="#e8742c" ${OUT}/>
    <path d="M20 22 L34 36 L23 44Z" fill="#ffd7b0"/><path d="M80 22 L66 36 L77 44Z" fill="#ffd7b0"/>
    <path d="M12 46 Q50 18 88 46 Q84 76 50 92 Q16 76 12 46Z" fill="#f08a24" ${OUT}/>
    <path d="M18 58 Q36 60 50 92 Q26 82 18 58Z M82 58 Q64 60 50 92 Q74 82 82 58Z" fill="#fff8ee"/>
    ${eyes(37, 63, 54)}
    <path d="M30 44 l12 4 M70 44 l-12 4" stroke="#3b2414" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="50" cy="84" rx="5" ry="4" fill="#2b1d14"/>
    <path d="M40 74 Q50 80 62 72" fill="none" stroke="#3b2414" stroke-width="2.5" stroke-linecap="round"/>`),

  owl: svg(`
    <path d="M20 34 L26 8 L40 28Z M80 34 L74 8 L60 28Z" fill="#7a58b5" ${OUT}/>
    <ellipse cx="50" cy="58" rx="36" ry="36" fill="#8e6cc9" ${OUT}/>
    <ellipse cx="50" cy="74" rx="20" ry="16" fill="#e4d6f7"/>
    <path d="M38 76 q4 4 8 0 M54 76 q4 4 8 0 M46 84 q4 4 8 0" fill="none" stroke="#a88ad6" stroke-width="2"/>
    <circle cx="36" cy="48" r="14" fill="#fff" stroke="#f3c34b" stroke-width="4"/>
    <circle cx="64" cy="48" r="14" fill="#fff" stroke="#f3c34b" stroke-width="4"/>
    <path d="M50 44 h0" stroke="#f3c34b" stroke-width="4"/>
    ${eyes(37, 63, 49, 6)}
    <path d="M45 58 L55 58 L50 68Z" fill="#f6a93b" ${OUT}/>
    <path d="M24 92 q26 -10 52 0" fill="#e05a7a" opacity=".9"/>`),

  squirrel: svg(`
    <path d="M70 92 C100 80 104 40 86 22 C76 12 64 22 72 32 C84 46 78 68 64 80Z" fill="#c9622b" ${OUT}/>
    <path d="M24 30 L28 8 L42 26Z M76 30 L72 8 L58 26Z" fill="#d9813b" ${OUT}/>
    <circle cx="50" cy="54" r="30" fill="#e08e45" ${OUT}/>
    <ellipse cx="50" cy="68" rx="17" ry="13" fill="#fbe3c8"/>
    ${eyes(39, 61, 50)}
    <ellipse cx="50" cy="62" rx="5" ry="3.5" fill="#2b1d14"/>
    <rect x="45" y="68" width="5" height="7" rx="1.5" fill="#fff" stroke="#3b2414" stroke-width="1.5"/>
    <rect x="50" y="68" width="5" height="7" rx="1.5" fill="#fff" stroke="#3b2414" stroke-width="1.5"/>
    <circle cx="30" cy="62" r="5" fill="#f2a07a" opacity=".7"/><circle cx="70" cy="62" r="5" fill="#f2a07a" opacity=".7"/>`),

  hedgehog: svg(`
    <path d="M10 62 L14 40 L6 34 L20 28 L18 14 L32 20 L38 6 L48 18 L58 4 L64 18 L78 10 L78 26 L94 28 L84 40 L94 52 L86 62Z" fill="#6b4a2b" ${OUT}/>
    <path d="M18 60 Q20 34 50 34 Q80 34 82 60 Q76 84 50 94 Q24 84 18 60Z" fill="#f0cfa3" ${OUT}/>
    ${eyes(39, 61, 58)}
    <circle cx="50" cy="80" r="6" fill="#2b1d14"/>
    <circle cx="31" cy="70" r="5" fill="#f2a07a" opacity=".7"/><circle cx="69" cy="70" r="5" fill="#f2a07a" opacity=".7"/>
    <path d="M28 52 l6 -4 M72 52 l-6 -4" stroke="#3b2414" stroke-width="2" stroke-linecap="round"/>`),

  basket: svg(`
    <circle cx="34" cy="40" r="10" fill="#3d4fb8" ${OUT}/><circle cx="52" cy="34" r="11" fill="#5468d4" ${OUT}/>
    <circle cx="68" cy="42" r="10" fill="#3d4fb8" ${OUT}/><circle cx="44" cy="46" r="9" fill="#5468d4" ${OUT}/>
    <circle cx="60" cy="48" r="9" fill="#3d4fb8" ${OUT}/>
    <path d="M14 50 H86 L76 88 H24Z" fill="#c98a45" ${OUT}/>
    <path d="M20 62 H80 M23 74 H77" stroke="#9a6430" stroke-width="3"/>
    <path d="M38 50 L34 88 M50 50 V88 M62 50 L66 88" stroke="#9a6430" stroke-width="3"/>
    <path d="M24 50 Q50 10 76 50" fill="none" stroke="#9a6430" stroke-width="5" stroke-linecap="round"/>`),

  leaf: svg(`<path d="M20 80 Q20 30 80 20 Q78 70 20 80Z" fill="#9ccc65" stroke="#558b2f" stroke-width="3"/><path d="M22 78 Q46 50 72 28" stroke="#558b2f" stroke-width="3" fill="none"/>`),

  tree: svg(`<rect x="44" y="60" width="12" height="30" rx="4" fill="#7b5230"/>
    <circle cx="50" cy="42" r="28" fill="#4caf50"/><circle cx="36" cy="52" r="18" fill="#43a047"/><circle cx="64" cy="52" r="18" fill="#43a047"/>
    <circle cx="42" cy="34" r="8" fill="#81c784" opacity=".7"/>`),

  bush: svg(`<circle cx="34" cy="62" r="20" fill="#66bb6a"/><circle cx="62" cy="60" r="22" fill="#4caf50"/><circle cx="50" cy="48" r="20" fill="#81c784"/>
    <circle cx="40" cy="58" r="4" fill="#3d4fb8"/><circle cx="58" cy="50" r="4" fill="#3d4fb8"/><circle cx="66" cy="64" r="4" fill="#3d4fb8"/>`),

  // Det gyllene kortet: en glittrande stjärna.
  golden: svg(`<path d="M50 8 L61 36 L92 38 L68 57 L76 88 L50 71 L24 88 L32 57 L8 38 L39 36Z" fill="#ffd54f" stroke="#b07d00" stroke-width="3" stroke-linejoin="round"/>
    <path d="M50 20 L57 38 L76 39 L61 51 L66 70 L50 60" fill="#fff59d" opacity=".8"/>
    <circle cx="84" cy="16" r="4" fill="#fff"/><circle cx="16" cy="22" r="3" fill="#fff"/><circle cx="88" cy="70" r="3" fill="#fff"/>`),

  flower: svg(`<g fill="#fff59d"><circle cx="50" cy="34" r="12"/><circle cx="66" cy="50" r="12"/><circle cx="50" cy="66" r="12"/><circle cx="34" cy="50" r="12"/></g><circle cx="50" cy="50" r="9" fill="#ff8f00"/>`),
};

// Pusselbit: flik ut mot nästa bit, hak in från föregående. dirs: 0=upp 1=höger 2=ner 3=vänster.
const TAB = [[38, 0, 40, -4, 36, -9], [32, -16, 40, -20, 50, -20], [60, -20, 68, -16, 64, -9], [60, -4, 62, 0, 65, 0]];
const SIDE = [
  (t, d) => [t, d],
  (t, d) => [100 - d, t],
  (t, d) => [100 - t, 100 - d],
  (t, d) => [d, 100 - t],
];
const R = 16; // rundade hörn, mjukare bitar
export function puzzlePath(outDir, inDir) {
  let d = `M${R} 0`;
  for (let side = 0; side < 4; side++) {
    const s = side === outDir ? 1 : side === inDir ? -1 : 0;
    const pt = (t, y) => SIDE[side](t, y * s).join(' ');
    if (s) {
      d += ` L${pt(35, 0)}`;
      for (const c of TAB) d += ` C${pt(c[0], c[1])} ${pt(c[2], c[3])} ${pt(c[4], c[5])}`;
    }
    d += ` L${pt(100 - R, 0)} Q${pt(100, 0)} ${SIDE[(side + 1) % 4](R, 0).join(' ')}`;
  }
  return d + 'Z';
}

// ---------- Årstider: träd, buskar, blommor, hörn-dekor och väder ----------
const tree = (big, small, extra = '') => svg(`<ellipse cx="50" cy="90" rx="24" ry="6" fill="#000" opacity=".18"/>
  <path d="M44 88 Q46 70 44 58 H56 Q54 70 56 88Z" fill="#7b5230"/>
  <circle cx="50" cy="40" r="28" fill="${big}"/><circle cx="34" cy="52" r="18" fill="${small}"/><circle cx="66" cy="52" r="18" fill="${small}"/>
  <circle cx="40" cy="30" r="10" fill="#fff" opacity=".22"/>${extra}`);
const dots = (color, pts) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="${color}"/>`).join('');
const pine = svg(`<ellipse cx="50" cy="92" rx="26" ry="6" fill="#000" opacity=".15"/><rect x="45" y="74" width="10" height="18" rx="3" fill="#6b4a2b"/>
  <path d="M50 4 L74 40 H62 L84 76 H16 L38 40 H26Z" fill="#2e7d4f" stroke="#1b5e3a" stroke-width="2" stroke-linejoin="round"/>
  <path d="M50 4 L61 21 Q50 27 39 21Z M30 40 Q50 48 70 40 L64 34 Q50 40 36 34Z M18 76 Q50 84 82 76 L76 68 Q50 74 24 68Z" fill="#fff"/>`);
const bushOf = (a, b, c, extra = '') => svg(`<ellipse cx="50" cy="82" rx="34" ry="6" fill="#000" opacity=".15"/>
  <circle cx="34" cy="62" r="20" fill="${a}"/><circle cx="62" cy="60" r="22" fill="${b}"/><circle cx="50" cy="48" r="20" fill="${c}"/>
  <circle cx="44" cy="40" r="7" fill="#fff" opacity=".25"/>${extra}`);

export const SEASONS = {
  spring: {
    name: 'Våren',
    tree: tree('#8fd16f', '#79c25c', dots('#ffb3cf', [[36, 30], [58, 24], [66, 44], [42, 50], [26, 50], [74, 56], [52, 38]])),
    bush: bushOf('#8fd16f', '#79c25c', '#a6dd86', dots('#fff176', [[40, 56], [60, 48], [66, 64]])),
    flower: svg(`<path d="M50 90 V50" stroke="#4caf50" stroke-width="5"/><path d="M50 74 Q34 62 30 70 Q38 78 50 76Z" fill="#66bb6a"/>
      <path d="M34 30 L40 50 Q50 58 60 50 L66 30 L58 40 L50 26 L42 40Z" fill="#ff6fa8" stroke="#c2185b" stroke-width="2" stroke-linejoin="round"/>`),
    extra: svg(`<g transform="rotate(-15 50 50)"><ellipse cx="38" cy="44" rx="16" ry="20" fill="#ffb74d"/><ellipse cx="62" cy="44" rx="16" ry="20" fill="#ffb74d"/>
      <ellipse cx="40" cy="64" rx="10" ry="12" fill="#ff8a65"/><ellipse cx="60" cy="64" rx="10" ry="12" fill="#ff8a65"/>
      <rect x="47" y="34" width="6" height="40" rx="3" fill="#3b2414"/><circle cx="38" cy="42" r="5" fill="#fff" opacity=".6"/><circle cx="62" cy="42" r="5" fill="#fff" opacity=".6"/></g>`),
  },
  summer: {
    name: 'Sommaren',
    tree: tree('#4caf50', '#43a047', dots('#e53935', [[40, 36], [60, 30], [64, 52], [34, 54]])),
    bush: bushOf('#66bb6a', '#4caf50', '#81c784', dots('#3d4fb8', [[40, 58], [58, 50], [66, 64]])),
    flower: ART.flower,
    extra: svg(`<path d="M50 92 V54" stroke="#558b2f" stroke-width="6"/><path d="M50 76 Q30 64 26 74 Q36 82 50 78Z" fill="#7cb342"/>
      <g fill="#ffca28">${Array.from({ length: 12 }, (_, i) => `<ellipse cx="50" cy="16" rx="7" ry="14" transform="rotate(${i * 30} 50 38)"/>`).join('')}</g>
      <circle cx="50" cy="38" r="12" fill="#6d4c41"/>`),
  },
  autumn: {
    name: 'Hösten',
    tree: tree('#ef8a2b', '#d9592a', dots('#ffd54f', [[38, 32], [62, 40], [30, 56], [70, 58]])),
    bush: bushOf('#c6532a', '#e07b2c', '#f0a43a'),
    flower: svg(`<ellipse cx="50" cy="86" rx="22" ry="5" fill="#000" opacity=".15"/><path d="M42 86 Q44 66 42 56 H58 Q56 66 58 86Z" fill="#fff3e0" stroke="#8d6e63" stroke-width="2"/>
      <path d="M18 58 Q20 26 50 24 Q80 26 82 58Z" fill="#e53935" stroke="#8e1b1b" stroke-width="2"/>
      <circle cx="36" cy="44" r="5" fill="#fff"/><circle cx="56" cy="36" r="6" fill="#fff"/><circle cx="68" cy="50" r="4" fill="#fff"/>`),
    extra: svg(`<ellipse cx="50" cy="88" rx="30" ry="6" fill="#000" opacity=".15"/><path d="M48 30 Q50 18 58 14" stroke="#5d4037" stroke-width="5" fill="none" stroke-linecap="round"/>
      <ellipse cx="34" cy="60" rx="18" ry="26" fill="#ef6c00"/><ellipse cx="66" cy="60" rx="18" ry="26" fill="#ef6c00"/><ellipse cx="50" cy="60" rx="18" ry="28" fill="#fb8c00"/>
      <path d="M50 34 V86" stroke="#e65100" stroke-width="2"/><circle cx="42" cy="46" r="6" fill="#fff" opacity=".3"/>`),
  },
  winter: {
    name: 'Vintern',
    tree: pine,
    bush: svg(`<ellipse cx="50" cy="80" rx="36" ry="7" fill="#90a4ae" opacity=".3"/><path d="M12 80 Q14 50 36 48 Q44 30 62 40 Q86 40 88 80Z" fill="#fff" stroke="#b0c4d4" stroke-width="2"/>
      <circle cx="40" cy="50" r="6" fill="#fff"/><path d="M30 60 Q50 54 70 62" stroke="#dbe9f4" stroke-width="4" fill="none"/>`),
    flower: svg(`<ellipse cx="50" cy="90" rx="22" ry="5" fill="#90a4ae" opacity=".35"/><circle cx="50" cy="68" r="20" fill="#fff" stroke="#b0c4d4" stroke-width="2"/>
      <circle cx="50" cy="36" r="14" fill="#fff" stroke="#b0c4d4" stroke-width="2"/><circle cx="45" cy="33" r="2.2" fill="#2b1d14"/><circle cx="55" cy="33" r="2.2" fill="#2b1d14"/>
      <path d="M50 38 L62 41 L50 42Z" fill="#ff7043"/><path d="M36 48 Q50 54 64 48 L64 54 Q50 58 36 54Z" fill="#e53935"/>`),
    extra: svg(`<g stroke="#fff" stroke-width="4" stroke-linecap="round">${[0, 60, 120].map(a => `<path d="M50 14 V86 M42 22 L50 30 L58 22 M42 78 L50 70 L58 78" transform="rotate(${a} 50 50)"/>`).join('')}</g>`),
  },
};
