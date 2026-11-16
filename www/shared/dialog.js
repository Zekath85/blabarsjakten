// Gemensam ja/nej-ruta i spelets stil, för alla spel i portalen.
// Användning: if (await confirmQuit('Blåbärsjakten')) gå till menyn.
import { playClip } from './audio.js';

const VOICE = new URL('voice/quit.mp3', import.meta.url).href;
const SAY = 'Vill du avbryta spelet och gå till menyn?';

export function confirmQuit(gameName) {
  const box = document.createElement('div');
  box.className = 'dialog';
  box.innerHTML = `<div class="dialog-card" role="alertdialog" aria-modal="true">
      <div class="dialog-icon"><svg viewBox="0 0 40 40"><rect x="11" y="9" width="6" height="22" rx="3" fill="#fff"/><rect x="23" y="9" width="6" height="22" rx="3" fill="#fff"/></svg></div>
      <h2></h2>
      <p>Då går du tillbaka till menyn.</p>
      <div class="dialog-buttons">
        <button class="btn gray" data-v="no">Nej</button>
        <button class="btn red" data-v="yes">Ja</button>
      </div>
    </div>`;
  box.querySelector('h2').textContent = `Vill du avbryta ${gameName}?`;
  document.body.append(box);
  playClip(VOICE, SAY, undefined, 'cards');
  return new Promise(done => {
    box.onclick = e => {
      const v = e.target.closest('[data-v]')?.dataset.v;
      if (!v) return;
      box.remove();
      done(v === 'yes');
    };
  });
}
