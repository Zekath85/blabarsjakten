// Egna, rena ikoner (SVG) för alla spel. Inga emoji: samma utseende på alla plattor.
// Användning i HTML: <button data-icon="home">Till menyn</button> fylls i av fillIcons().
const s = (body, vb = '0 0 40 40') => `<svg class="icon" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
const line = 'fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"';

export const ICONS = {
  refresh: s(`<path d="M32 18 A12 12 0 1 0 29 28" ${line}/><path d="M33 9 V18 H24" ${line}/>`),
  home: s(`<path d="M6 19 L20 7 L34 19" ${line}/><path d="M10 17 V33 H30 V17" ${line}/><path d="M17 33 V24 H23 V33" ${line}/>`),
  play: s(`<path d="M13 8 L31 20 L13 32Z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>`),
  pencil: s(`<path d="M9 31 L11 24 L26 9 L31 14 L16 29Z" ${line}/><path d="M23 12 L28 17" ${line}/>`),
  speaker: s(`<path d="M6 15 H13 L22 7 V33 L13 25 H6Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M27 14 Q31 20 27 26 M31 10 Q38 20 31 30" ${line} stroke-width="3"/>`),
  check: s(`<path d="M9 21 L17 29 L32 12" ${line} stroke-width="4.5"/>`),
  close: s(`<path d="M11 11 L29 29 M29 11 L11 29" ${line} stroke-width="4.5"/>`),
  hand: s(`<path d="M15 21 V9 a3 3 0 0 1 6 0 V19 M21 17 a3 3 0 0 1 6 0 V21 M27 20 a3 3 0 0 1 6 0 V26 a9 9 0 0 1 -9 9 H21 a8 8 0 0 1 -6 -3 L8 24 a3 3 0 0 1 4 -4 L15 23" ${line} stroke-width="3"/>`),
  clock: s(`<circle cx="20" cy="20" r="14" ${line} stroke-width="3"/><path d="M20 12 V20 L26 24" ${line} stroke-width="3"/>`),
  palette: s(`<path d="M20 5 a15 15 0 1 0 0 30 c3 0 3-3 1-5 s0-5 3-5 h4 a7 7 0 0 0 7-7 C35 11 28 5 20 5Z" fill="#fff" stroke="#3b2414" stroke-width="2"/><circle cx="12" cy="18" r="3" fill="#e53935"/><circle cx="18" cy="11" r="3" fill="#fbc02d"/><circle cx="27" cy="12" r="3" fill="#43a047"/><circle cx="13" cy="26" r="3" fill="#1e88e5"/>`),
  // Fotsteg med pil: framåt eller bakåt.
  stepsFwd: s(`<ellipse cx="13" cy="25" rx="5" ry="7" fill="currentColor"/><ellipse cx="24" cy="15" rx="5" ry="7" fill="currentColor"/><path d="M30 30 H37 M34 27 L37 30 L34 33" ${line} stroke-width="3"/>`),
  stepsBack: s(`<ellipse cx="16" cy="25" rx="5" ry="7" fill="currentColor"/><ellipse cx="27" cy="15" rx="5" ry="7" fill="currentColor"/><path d="M10 30 H3 M6 27 L3 30 L6 33" ${line} stroke-width="3"/>`),
  dice: s(`<rect x="5" y="5" width="30" height="30" rx="8" fill="#fff" stroke="currentColor" stroke-width="3"/><circle cx="13" cy="13" r="3.2" fill="currentColor"/><circle cx="20" cy="20" r="3.2" fill="currentColor"/><circle cx="27" cy="27" r="3.2" fill="currentColor"/>`),
  group: s(`<circle cx="13" cy="14" r="5" fill="currentColor"/><circle cx="27" cy="14" r="5" fill="currentColor"/><path d="M4 32 a9 9 0 0 1 18 0Z M18 32 a9 9 0 0 1 18 0Z" fill="currentColor"/>`),
  arrowUp: s(`<path d="M20 34 V8 M10 18 L20 8 L30 18" ${line} stroke-width="4.5"/>`),
  // Årstider
  spring: s(`<g fill="#ff8fb8">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="20" cy="10" rx="6" ry="9" transform="rotate(${a} 20 20)"/>`).join('')}</g><circle cx="20" cy="20" r="5" fill="#ffd54f"/>`),
  summer: s(`<g stroke="#ffb300" stroke-width="3.5" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path d="M20 3 V8" transform="rotate(${a} 20 20)"/>`).join('')}</g><circle cx="20" cy="20" r="9" fill="#ffd54f" stroke="#ffb300" stroke-width="2"/>`),
  autumn: s(`<path d="M20 4 C30 10 34 22 20 36 C6 22 10 10 20 4Z" fill="#e8742c" stroke="#a84a14" stroke-width="2"/><path d="M20 8 V36 M20 18 L27 13 M20 25 L13 19" stroke="#a84a14" stroke-width="2" fill="none"/>`),
  winter: s(`<g stroke="#8fd3ff" stroke-width="3.5" stroke-linecap="round" fill="none">${[0, 60, 120].map(a => `<path d="M20 4 V36 M14 9 L20 14 L26 9 M14 31 L20 26 L26 31" transform="rotate(${a} 20 20)"/>`).join('')}</g>`),
  calm: s(`<path d="M20 34 C8 26 6 16 12 10 C16 6 20 9 20 12 C20 9 24 6 28 10 C34 16 32 26 20 34Z" fill="currentColor"/>`),
};

// Karta: tre storlekar som rutnät.
export const sizeIcon = n => s(Array.from({ length: n * n }, (_, i) =>
  `<rect x="${4 + (i % n) * (32 / n)}" y="${4 + Math.floor(i / n) * (32 / n)}" width="${32 / n - 2}" height="${32 / n - 2}" rx="1.5" fill="currentColor" opacity="${(i + Math.floor(i / n)) % 2 ? .55 : 1}"/>`).join(''));

// Medalj med siffra: guld, silver, brons, blå.
const MEDAL_COLORS = [['#fff3b0', '#f4b400', '#b07d00'], ['#ffffff', '#c0c8d0', '#7d8993'], ['#ffd9b0', '#cd7f32', '#7d4a1a'], ['#d6ecff', '#5c9de0', '#2a5f99']];
export function medal(place) {
  const [a, b, c] = MEDAL_COLORS[Math.min(place, 4) - 1];
  const id = `m${place}`;
  return s(`<defs><radialGradient id="${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient></defs>
    <path d="M12 2 L18 16 L13 18 L7 4Z" fill="#e53935"/><path d="M28 2 L22 16 L27 18 L33 4Z" fill="#1e88e5"/>
    <circle cx="20" cy="26" r="12" fill="url(#${id})" stroke="${c}" stroke-width="2"/>
    <text x="20" y="31.5" text-anchor="middle" font-size="15" font-weight="900" font-family="Trebuchet MS, sans-serif" fill="#fff" stroke="${c}" stroke-width=".8">${place}</text>`);
}

export function fillIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    if (!el.querySelector(':scope > svg.icon')) el.insertAdjacentHTML('afterbegin', ICONS[el.dataset.icon] || '');
  });
}
