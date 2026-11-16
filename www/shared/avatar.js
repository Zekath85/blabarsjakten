// Spelarfigurer: ett tecknat barn. Delas av alla spel i portalen.
// look = { gender: 'girl'|'boy', skin, hairColor, hair, extra } där varje val är 0, 1 eller 2.

export const OPTIONS = {
  skin:      { label: 'Hudfärg',  names: ['Ljus', 'Mellan', 'Mörk'],      colors: ['#fde0c4', '#d9a172', '#8d5a3b'] },
  hairColor: { label: 'Hårfärg',  names: ['Brun', 'Blond', 'Röd'],        colors: ['#5a3418', '#f2c14e', '#c8502a'] },
  hair:      { label: 'Frisyr',   names: { girl: ['Tofsar', 'Långt', 'Knut'], boy: ['Kort', 'Spretigt', 'Lockigt'] } },
  extra:     { label: 'Extra',    names: { girl: ['Inget', 'Rosett', 'Glasögon'], boy: ['Inget', 'Keps', 'Glasögon'] } },
};

export const DEFAULT_LOOKS = [
  { gender: 'girl', skin: 0, hairColor: 1, hair: 0, extra: 1 },
  { gender: 'boy',  skin: 1, hairColor: 0, hair: 1, extra: 0 },
  { gender: 'girl', skin: 2, hairColor: 0, hair: 2, extra: 0 },
  { gender: 'boy',  skin: 0, hairColor: 2, hair: 2, extra: 2 },
];

const OUT = 'stroke="#3b2414" stroke-width="2.5" stroke-linejoin="round"';

// Hår bakom huvudet (bara långt hår) och hår framför.
const HAIR = {
  girl: [
    { front: 'M24 40 Q26 14 50 14 Q74 14 76 40 Q66 28 50 28 Q34 28 24 40Z', extra: '<circle cx="17" cy="48" r="10"/><circle cx="83" cy="48" r="10"/>' },
    { back: 'M22 44 Q18 12 50 12 Q82 12 78 44 L82 90 Q68 96 64 72 L36 72 Q32 96 18 90Z', front: 'M24 40 Q28 14 50 14 Q72 14 76 40 Q64 30 50 30 Q36 30 24 40Z' },
    { front: 'M24 40 Q26 14 50 14 Q74 14 76 40 Q66 28 50 28 Q34 28 24 40Z', extra: '<circle cx="50" cy="10" r="11"/>' },
  ],
  boy: [
    { front: 'M24 40 Q24 12 50 12 Q76 12 76 40 Q70 24 50 24 Q32 24 24 40Z' },
    { front: 'M24 40 L20 22 L32 25 L32 9 L44 19 L50 4 L57 19 L68 9 L68 25 L80 22 L76 40 Q68 26 50 26 Q32 26 24 40Z' },
    { front: 'M24 40 Q24 26 30 22 Q50 30 70 22 Q76 26 76 40Z', extra: '<circle cx="28" cy="28" r="9"/><circle cx="38" cy="19" r="10"/><circle cx="51" cy="15" r="10"/><circle cx="63" cy="18" r="10"/><circle cx="72" cy="28" r="9"/>' },
  ],
};

// headOnly: beskär till bara ansiktet (för små ikoner).
export function avatar(look, shirt = '#e53935', headOnly = false) {
  const skin = OPTIONS.skin.colors[look.skin];
  const hc = OPTIONS.hairColor.colors[look.hairColor];
  const h = HAIR[look.gender][look.hair];
  const hair = s => `<g fill="${hc}" ${OUT}>${s}</g>`;
  let extra = '';
  if (look.extra === 1 && look.gender === 'boy')
    extra = `<path d="M23 32 Q24 8 50 8 Q76 8 77 32Z" fill="${shirt}" ${OUT}/><path d="M60 30 H88 Q92 34 86 36 H58Z" fill="${shirt}" ${OUT}/><circle cx="50" cy="9" r="3" fill="#fff"/>`;
  if (look.extra === 1 && look.gender === 'girl')
    extra = `<g fill="#ff6fa8" ${OUT}><path d="M66 14 L54 6 L56 22Z"/><path d="M66 14 L78 6 L76 22Z"/><circle cx="66" cy="14" r="4"/></g>`;
  if (look.extra === 2)
    extra = `<g fill="rgba(255,255,255,.35)" stroke="#2b1d14" stroke-width="2.5"><circle cx="40" cy="46" r="8"/><circle cx="60" cy="46" r="8"/></g><path d="M48 46 H52" stroke="#2b1d14" stroke-width="2.5"/>`;
  return `<svg viewBox="${headOnly ? '16 8 68 68' : '0 0 100 120'}" xmlns="http://www.w3.org/2000/svg">
    ${h.back ? hair(`<path d="${h.back}"/>`) : ''}
    <path d="M22 118 Q22 80 50 76 Q78 80 78 118Z" fill="${shirt}" ${OUT}/>
    ${h.extra ? hair(h.extra) : ''}
    <circle cx="50" cy="46" r="27" fill="${skin}" ${OUT}/>
    ${hair(`<path d="${h.front}"/>`)}
    <circle cx="41" cy="47" r="3.6" fill="#2b1d14"/><circle cx="59" cy="47" r="3.6" fill="#2b1d14"/>
    <circle cx="42.3" cy="45.6" r="1.3" fill="#fff"/><circle cx="60.3" cy="45.6" r="1.3" fill="#fff"/>
    <circle cx="33" cy="56" r="4.5" fill="#ff8a80" opacity=".45"/><circle cx="67" cy="56" r="4.5" fill="#ff8a80" opacity=".45"/>
    <path d="M42 58 Q50 65 58 58" fill="none" stroke="#3b2414" stroke-width="2.5" stroke-linecap="round"/>
    ${extra}
  </svg>`;
}

// Datorspelaren: en snäll robot. Samma storlek och ansiktsläge som barnfigurerna.
export function robot(shirt = '#1e88e5', headOnly = false) {
  return `<svg viewBox="${headOnly ? '16 8 68 68' : '0 0 100 120'}" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 118 Q24 82 50 80 Q76 82 76 118Z" fill="${shirt}" ${OUT}/>
    <rect x="38" y="92" width="24" height="14" rx="5" fill="#fff" opacity=".55"/><circle cx="44" cy="99" r="2.5" fill="#ff5252"/><circle cx="52" cy="99" r="2.5" fill="#ffd54f"/>
    <path d="M50 20 V9" stroke="#3b2414" stroke-width="3"/><circle cx="50" cy="8" r="5" fill="#ff5252" ${OUT}/>
    <rect x="15" y="38" width="9" height="18" rx="4" fill="#90a4ae" ${OUT}/><rect x="76" y="38" width="9" height="18" rx="4" fill="#90a4ae" ${OUT}/>
    <rect x="21" y="19" width="58" height="54" rx="18" fill="#dfe7eb" ${OUT}/>
    <path d="M28 26 Q50 20 72 26" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>
    <rect x="29" y="32" width="42" height="22" rx="11" fill="#263238"/>
    <circle cx="41" cy="43" r="5.5" fill="#4dd0e1"/><circle cx="59" cy="43" r="5.5" fill="#4dd0e1"/>
    <circle cx="42.5" cy="41.5" r="1.8" fill="#fff"/><circle cx="60.5" cy="41.5" r="1.8" fill="#fff"/>
    <circle cx="31" cy="62" r="4" fill="#ff8a80" opacity=".5"/><circle cx="69" cy="62" r="4" fill="#ff8a80" opacity=".5"/>
    <path d="M41 61 Q50 67 59 61" fill="none" stroke="#3b2414" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
}
