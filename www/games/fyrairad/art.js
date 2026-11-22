// Femte figuren: Haren Hoppa. Ritad i samma stil som de andra figurerna (../blabarsjakten/art.js).
import { ART } from '../blabarsjakten/art.js';

const OUT = 'stroke="#3b2414" stroke-width="2.5" stroke-linejoin="round"';
const HARE = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="34" cy="26" rx="10" ry="24" fill="#b9a089" ${OUT}/><ellipse cx="66" cy="26" rx="10" ry="24" fill="#b9a089" ${OUT}/>
  <ellipse cx="34" cy="28" rx="5" ry="17" fill="#f6c9d0"/><ellipse cx="66" cy="28" rx="5" ry="17" fill="#f6c9d0"/>
  <circle cx="50" cy="62" r="32" fill="#cdb69d" ${OUT}/>
  <ellipse cx="50" cy="76" rx="18" ry="14" fill="#fbf1e2"/>
  <circle cx="38" cy="56" r="5" fill="#2b1d14"/><circle cx="62" cy="56" r="5" fill="#2b1d14"/>
  <circle cx="39.6" cy="54.2" r="1.7" fill="#fff"/><circle cx="63.6" cy="54.2" r="1.7" fill="#fff"/>
  <path d="M45 68 L55 68 L50 74Z" fill="#e88aa0" ${OUT}/>
  <path d="M50 74 V79 M43 81 Q50 86 57 81" fill="none" stroke="#3b2414" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="46" y="80" width="4" height="7" rx="1.5" fill="#fff" stroke="#3b2414" stroke-width="1.5"/><rect x="50" y="80" width="4" height="7" rx="1.5" fill="#fff" stroke="#3b2414" stroke-width="1.5"/>
  <circle cx="28" cy="68" r="5" fill="#f2a07a" opacity=".7"/><circle cx="72" cy="68" r="5" fill="#f2a07a" opacity=".7"/>
</svg>`;

// Alla fem figurerna, i samma ordning som kolumnerna på brädet.
export const FIG_ART = { fox: ART.fox, owl: ART.owl, squirrel: ART.squirrel, hedgehog: ART.hedgehog, hare: HARE };
export { ART };
