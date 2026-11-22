// Bilderna på brickorna: figurerna från Fyra i rad plus några saker från skogen (samma stil).
import { FIG_ART, ART } from '../fyrairad/art.js';

const OUT = 'stroke="#3b2414" stroke-width="2.5" stroke-linejoin="round"';
const svg = body => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

const MORE = {
  mushroom: svg(`<path d="M38 55 H62 L66 86 Q50 92 34 86Z" fill="#f3e4c6" ${OUT}/>
    <path d="M10 56 Q10 14 50 14 Q90 14 90 56 Q50 66 10 56Z" fill="#e53935" ${OUT}/>
    <circle cx="32" cy="36" r="7" fill="#fff"/><circle cx="58" cy="28" r="6" fill="#fff"/><circle cx="72" cy="46" r="5" fill="#fff"/><circle cx="46" cy="50" r="4" fill="#fff"/>`),
  apple: svg(`<path d="M50 30 Q22 16 14 46 Q10 78 38 90 Q50 94 62 90 Q90 78 86 46 Q78 16 50 30Z" fill="#e53935" ${OUT}/>
    <path d="M50 30 Q50 16 56 8" fill="none" stroke="#7b5230" stroke-width="5" stroke-linecap="round"/>
    <path d="M54 20 Q70 8 80 18 Q66 28 54 20Z" fill="#66bb6a" ${OUT}/>
    <ellipse cx="32" cy="48" rx="6" ry="10" fill="#fff" opacity=".35" transform="rotate(20 32 48)"/>`),
  butterfly: svg(`<path d="M50 50 Q20 8 12 34 Q8 54 50 54Z" fill="#ffb74d" ${OUT}/><path d="M50 50 Q80 8 88 34 Q92 54 50 54Z" fill="#ffb74d" ${OUT}/>
    <path d="M50 54 Q22 60 24 82 Q30 94 50 58Z" fill="#ba68c8" ${OUT}/><path d="M50 54 Q78 60 76 82 Q70 94 50 58Z" fill="#ba68c8" ${OUT}/>
    <circle cx="28" cy="34" r="6" fill="#fff" opacity=".8"/><circle cx="72" cy="34" r="6" fill="#fff" opacity=".8"/>
    <rect x="46" y="30" width="8" height="48" rx="4" fill="#5d4037" ${OUT}/>
    <path d="M48 30 Q42 16 36 14 M52 30 Q58 16 64 14" fill="none" stroke="#3b2414" stroke-width="2.5" stroke-linecap="round"/>`),
};

// Alla bilder, med namnet berättaren säger ("en räv"). Nyckeln är samma som i logic.js (FIGS).
export const PICS = { ...FIG_ART, basket: ART.basket, star: ART.golden, tree: ART.tree, flower: ART.flower, bush: ART.bush, leaf: ART.leaf, ...MORE };
export const NAMES = {
  fox: 'en räv', owl: 'en uggla', squirrel: 'en ekorre', hedgehog: 'en igelkott', hare: 'en hare', bear: 'en björn',
  basket: 'en blåbärskorg', star: 'en stjärna', tree: 'ett träd', flower: 'en blomma', bush: 'en buske', leaf: 'ett löv',
  mushroom: 'en svamp', apple: 'ett äpple', butterfly: 'en fjäril',
};
export { ART };
