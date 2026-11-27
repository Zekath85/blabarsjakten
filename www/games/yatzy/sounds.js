// Yatzys egna ljudeffekter: lugna, varma och låga. Inga skarpa pip, mjuk insvängning och ett svagt rumseko.
// Samma namn som sfx i shared/audio.js, så att game.js kan använda dem på samma sätt. Följer inställningen "Ljudeffekter".
import { getCtx, settings, sfx as shared } from '../../shared/audio.js';

let ctx, bus, noiseBuf;
// Gemensam väg för alla ljud: mjukt filter (tar bort det vassa) och ett kort, varmt eko.
function setup() {
  if (bus) return;
  ctx = getCtx();
  bus = ctx.createGain();
  const soft = ctx.createBiquadFilter(), delay = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain(), damp = ctx.createBiquadFilter();
  soft.type = 'lowpass'; soft.frequency.value = 3200;
  delay.delayTime.value = 0.19; fb.gain.value = 0.28; wet.gain.value = 0.22;
  damp.type = 'lowpass'; damp.frequency.value = 1600;
  bus.connect(soft).connect(ctx.destination);
  soft.connect(delay); delay.connect(damp).connect(fb).connect(delay); damp.connect(wet).connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
const on = () => settings.get('sfx');

// Mjuk ton: långsam insvängning och lång avklingning (som en klocka eller ett mjukt piano).
function tone(freq, dur, { type = 'sine', vol = 0.1, delay = 0, attack = 0.02, to } = {}) {
  if (!on()) return;
  try {
    setup();
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  } catch {}
}
// Klocka: grundton plus en svag oktav, mjukt.
const bell = (f, dur = 1.2, vol = 0.07, delay = 0) => { tone(f, dur, { vol, delay }); tone(f * 2, dur * 0.5, { vol: vol * 0.18, delay }); };
// Filtrerat brus: duns, filt, skrammel.
function noise(delay, dur, { freq, q = 1, type = 'bandpass', vol = 0.1, attack = 0.003, sweep, raw } = {}) {
  if (!on()) return;
  try {
    setup();
    const t = ctx.currentTime + delay, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(raw ? ctx.destination : bus); // raw: förbi det mjuka filtret (tärningarnas klick ska vara krispiga)
    src.start(t, Math.random() * 0.4, dur + 0.05);
  } catch {}
}
// Tärningar i en pappbägare (som på spelställen): plasttärningar som klickar mot varandra,
// och ett ihåligt 'tock' när de slår i bägarens vägg och botten.
const tick = (delay = 0, v = 0.5) => noise(delay, 0.012 + Math.random() * 0.012, { freq: 2800 + Math.random() * 2400, q: 7 + Math.random() * 5, vol: 0.05 + v * 0.1, raw: true });
const cupWall = (delay = 0, v = 0.5) => {
  noise(delay, 0.07, { freq: 650 + Math.random() * 250, q: 3, vol: 0.06 + v * 0.14, raw: true }); // pappens ihåliga klang
  noise(delay, 0.05, { freq: 200, q: 0.7, type: 'lowpass', vol: 0.05 + v * 0.1, raw: true }); // dunsen
};
// Tärningar mot filt eller läder: mjukt duns.
const thud = (delay = 0, vol = 0.12) => noise(delay, 0.12, { freq: 220, q: 0.7, type: 'lowpass', vol });

// Toner i D-dur, samma tonart som låtarna: D3 … D5.
const N = { D3: 146.8, A3: 220, B3: 246.9, D4: 293.7, E4: 329.6, Fs4: 370, G4: 392, A4: 440, B4: 493.9, D5: 587.3 };

export const sfx = {
  click: () => { thud(0, 0.06); tone(N.A3, 0.18, { vol: 0.05 }); },
  pop: () => tone(N.D4, 0.35, { vol: 0.06, attack: 0.015 }),
  hold: (down = true) => { thud(0, 0.07); down ? tone(N.E4, 0.4, { vol: 0.06 }) : tone(N.B3, 0.3, { vol: 0.05 }); },
  // Bägaren byter riktning: tärningarna slår i väggen, och några klickar mot varandra direkt efter.
  rattle: (v = 0.5) => { cupWall(0, v); const n = 3 + Math.round(v * 4); for (let i = 0; i < n; i++) tick(0.008 + Math.random() * 0.07, v); },
  // Medan bägaren rör sig: tärningarna skramlar lätt mot varandra.
  tick: (v = 0.4) => { tick(0, v); if (Math.random() < 0.5) tick(0.02 + Math.random() * 0.03, v * 0.7); },
  // Tärningarna hälls ut: de rullar ur bägaren, sedan samma kast som i Blåbärsjakten.
  pour: () => { cupWall(0, 0.5); for (let i = 0; i < 6; i++) tick(0.03 + i * 0.035 + Math.random() * 0.02, 0.5 - i * 0.05); shared.whoosh(0.5); },
  knock: v => shared.knock(v), // tärningen slår i asken: samma ljud som i Blåbärsjakten
  land: () => shared.land(),
  good: () => { bell(N.D4, 1.2, 0.06); bell(N.Fs4, 1.2, 0.05, 0.09); bell(N.A4, 1.4, 0.05, 0.18); },
  bad: () => { tone(N.A3, 0.6, { type: 'triangle', vol: 0.05, attack: 0.04, to: 196 }); },
  six: () => [N.D4, N.Fs4, N.A4, N.D5].forEach((f, i) => bell(f, 1.6, 0.06, i * 0.14)),
  win: () => [N.D4, N.Fs4, N.A4, N.B4, N.A4, N.D5].forEach((f, i) => bell(f, 2, 0.06, i * 0.22)),
  turn: (i = 0) => [[N.D4, N.A4], [N.E4, N.B4], [N.Fs4, N.D5], [N.G4, N.D5]][Math.floor(i) % 4].forEach((f, k) => bell(f, 1, 0.05, k * 0.16)),
  almost: () => { tone(N.A4, 0.5, { vol: 0.05, attack: 0.03 }); tone(N.Fs4, 0.9, { vol: 0.05, attack: 0.03, delay: 0.32 }); },
  // Trumvirvel: en mjuk, växande susning (som vispar mot en trumma), inte snabba slag.
  drumroll: (ms = 1000) => noise(0, ms / 1000, { freq: 500, q: 0.6, type: 'lowpass', vol: 0.08, attack: ms / 1000 * 0.9 }),
};
