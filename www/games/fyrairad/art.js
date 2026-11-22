// Nya figurer: Haren Hoppa och Björnen. Ritade i samma stil som de andra (../blabarsjakten/art.js).
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

const BEAR = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="22" cy="28" r="13" fill="#9a6a3c" ${OUT}/><circle cx="78" cy="28" r="13" fill="#9a6a3c" ${OUT}/>
  <circle cx="22" cy="28" r="6" fill="#e9b98a"/><circle cx="78" cy="28" r="6" fill="#e9b98a"/>
  <circle cx="50" cy="56" r="36" fill="#b07a45" ${OUT}/>
  <ellipse cx="50" cy="68" rx="19" ry="15" fill="#f0d2ac"/>
  <circle cx="37" cy="50" r="5" fill="#2b1d14"/><circle cx="63" cy="50" r="5" fill="#2b1d14"/>
  <circle cx="38.6" cy="48.2" r="1.7" fill="#fff"/><circle cx="64.6" cy="48.2" r="1.7" fill="#fff"/>
  <ellipse cx="50" cy="63" rx="7" ry="5" fill="#2b1d14"/>
  <path d="M50 68 V73 M42 75 Q50 81 58 75" fill="none" stroke="#3b2414" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="29" cy="64" r="5" fill="#f2a07a" opacity=".6"/><circle cx="71" cy="64" r="5" fill="#f2a07a" opacity=".6"/>
</svg>`;

// Alla sex figurerna: en motsvarighet till varje figur i Bamse-spelet.
export const FIG_ART = { fox: ART.fox, owl: ART.owl, squirrel: ART.squirrel, hedgehog: ART.hedgehog, hare: HARE, bear: BEAR };
export { ART };
