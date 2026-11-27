// Uppläsning och små ljudeffekter. Funkar utan internet.
// Korten och berättarens repliker är inspelade (mp3). Saknas en fil används plattans röst (speechSynthesis).

// Inställningar: läs upp kort, berättaren, lugnare tal, ljudeffekter, lugnt läge (färre rörelser).
const DEFAULTS = { cards: true, guide: true, dice: true, slow: false, sfx: true, calm: false, music: true, musicVol: 0.5, song: 'theme' };
let prefs = { ...DEFAULTS };
try { prefs = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('prefs') || '{}') }; } catch {}
const listeners = [];

export const settings = {
  get: key => prefs[key],
  set(key, value) {
    prefs[key] = value;
    try { localStorage.setItem('prefs', JSON.stringify(prefs)); } catch {}
    if (!value && key !== 'sfx') stopSpeech();
    listeners.forEach(fn => fn(key, value));
  },
  onChange: fn => listeners.push(fn),
};

// Naturlig röst: bara små ändringar i tonläge, annars låter det robot.
export const NARRATOR = { pitch: 1, rate: 0.95 };

const hasWebSpeech = 'speechSynthesis' in window;
let svVoice = null;
// Bästa svenska rösten först: "Natural"/"Neural"/"Google" låter mest mänskligt.
const score = v => (/natural|neural|online/i.test(v.name) ? 3 : 0) + (/google/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
const pickVoice = () => {
  svVoice = speechSynthesis.getVoices().filter(v => /^sv/i.test(v.lang)).sort((a, b) => score(b) - score(a))[0] || null;
};
if (hasWebSpeech) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

function stopSpeech() {
  clip.pause();
  if (hasWebSpeech) speechSynthesis.cancel();
  talking(false);
}

// Inspelad röst. Returnerar ett löfte som blir klart när uppläsningen är slut.
const clip = new Audio();
const speechListeners = [];
export const onSpeech = fn => speechListeners.push(fn);
const talking = on => speechListeners.forEach(fn => fn(on));

export function playClip(url, text, voice = NARRATOR, kind = 'cards') {
  if (kind !== 'always' && !prefs[kind]) return Promise.resolve();
  stopSpeech();
  clip.src = url;
  clip.playbackRate = prefs.slow ? 0.85 : 1; // lugnare tal, rösten behåller sitt tonläge
  return new Promise(done => {
    clip.onended = clip.onerror = () => { talking(false); done(); };
    talking(true);
    clip.play().catch(() => speak(text, voice, kind).then(() => { talking(false); done(); }));
  });
}

// kind: 'cards' | 'guide' | 'always' (t.ex. knappen "Läs upp").
export function speak(text, voice = NARRATOR, kind = 'guide') {
  if (kind !== 'always' && !prefs[kind]) return Promise.resolve();
  clip.pause();
  // Ingen svensk röst i webbläsaren? Hellre tyst än svenska med engelsk brytning.
  if (!hasWebSpeech || !svVoice) return Promise.resolve();
  speechSynthesis.cancel();
  return new Promise(done => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'sv-SE';
    u.voice = svVoice;
    u.pitch = voice.pitch;
    u.rate = voice.rate * (prefs.slow ? 0.85 : 1);
    u.onend = u.onerror = () => { talking(false); done(); };
    talking(true);
    speechSynthesis.speak(u);
  });
}
export const stop = stopSpeech;

// --- Ljudeffekter med Web Audio (inga ljudfiler behövs).
// Mjuka toner med kort insvängning: låter som marimba och klockor i stället för pip.
let ctx;
export const getCtx = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());
function tone(freq, dur, { type = 'sine', vol = 0.16, delay = 0, to } = {}) {
  if (!prefs.sfx) return;
  try {
    getCtx();
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {}
}
// Marimba-liknande: grundton plus mjuk överton.
const mallet = (f, dur = 0.35, vol = 0.14, delay = 0) => { tone(f, dur, { vol, delay }); tone(f * 4, dur * 0.3, { vol: vol * 0.25, delay }); };
const notes = (list, step, vol) => list.forEach((f, i) => mallet(f, step * 3, vol, i * step));
// Brus (skapas en gång) för ljud som inte är toner: klick, duns och skrammel.
let noiseBuf;
function noise(delay, dur, { freq, q = 1, type = 'bandpass', vol = 0.2 }) {
  if (!prefs.sfx) return;
  try {
    getCtx();
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + delay, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t, Math.random() * 0.4, dur + 0.02);
  } catch {}
}
// Ett klick: tärning mot tärning (hårt, ljust, med lite ton av benmaterial).
const clack = (delay, v = 0.4) => {
  const f = 2600 + Math.random() * 2400;
  noise(delay, 0.03 + Math.random() * 0.02, { freq: f, q: 6 + Math.random() * 6, vol: 0.12 * v + 0.03 });
  tone(f * 0.5, 0.025, { type: 'sine', vol: 0.02 * v, delay });
};
// Ett dovt duns: tärningarna mot läderbägarens botten.
const thud = (vol = 0.1) => noise(0, 0.09, { freq: 260, q: 0.8, type: 'lowpass', vol });

export const sfx = {
  click: () => mallet(880, 0.12, 0.08),
  hop: (i = 0) => mallet(392 * Math.pow(2, Math.min(i, 8) / 12 * 2), 0.22, 0.12), // stiger för varje steg: 1, 2, 3…
  roll: () => { for (let i = 0; i < 9; i++) tone(500 + Math.random() * 300, 0.05, { vol: 0.07, delay: i * 0.1, to: 220 }); }, // träklick
  // Tärningen slår i marken: hårdare stöt = högre klick.
  knock: (v = 0.5) => { tone(180 + v * 140, 0.09, { vol: 0.05 + v * 0.22, to: 90 }); tone(900 + v * 500, 0.04, { type: 'triangle', vol: 0.03 + v * 0.06 }); },
  whoosh: (v = 0.5) => tone(200, 0.25 + v * 0.2, { type: 'triangle', vol: 0.04 + v * 0.06, to: 600 + v * 900 }),
  aim: (step = 0) => mallet(523 * Math.pow(2, step / 6), 0.12, 0.07),
  land: () => { tone(140, 0.3, { vol: 0.28, to: 70 }); mallet(784, 0.3, 0.1, 0.05); },
  six: () => notes([1047, 1319, 1568, 2093], 0.07, 0.09),
  card: () => tone(300, 0.35, { type: 'triangle', vol: 0.06, to: 900 }),
  good: () => notes([523, 659, 784, 1047], 0.09, 0.12),
  bad: () => notes([392, 330, 262], 0.14, 0.1),
  pop: () => tone(900 + Math.random() * 500, 0.16, { type: 'triangle', vol: 0.07, to: 300 }),
  turn: (i = 0) => notes([[523, 659], [587, 740], [659, 831], [698, 880]][i % 4], 0.11, 0.1), // egen liten melodi per spelare
  danger: () => { tone(98, 0.9, { type: 'sawtooth', vol: 0.08, to: 55 }); tone(104, 0.9, { type: 'sawtooth', vol: 0.05, to: 58, delay: 0.05 }); notes([311, 294, 262, 233], 0.16, 0.08); },
  // Ett kort ljud per figur (används i Fyra i rad när man lägger en bricka).
  figure: fig => ({
    fox: () => notes([660, 880, 1175], 0.06, 0.1), // glatt och snabbt
    owl: () => { tone(330, 0.25, { vol: 0.12, to: 300 }); tone(330, 0.3, { vol: 0.12, to: 280, delay: 0.3 }); }, // hoo, hoo
    squirrel: () => notes([1568, 1319, 1568, 1976], 0.05, 0.08), // snabba pip
    hedgehog: () => notes([392, 330], 0.12, 0.12), // mjuka dunk
    hare: () => notes([523, 659, 784, 659], 0.09, 0.1), // hopp
    bear: () => { tone(110, 0.5, { type: 'triangle', vol: 0.2, to: 82 }); mallet(196, 0.5, 0.1, 0.1); }, // mullrande
  })[fig]?.(),
  win: () => notes([523, 659, 784, 1047, 784, 1047, 1319], 0.12, 0.13),
  // Yatzy: tärningar som skramlar i bägaren (kraftigare ju mer man skakar), hälls ut, sparas och en trumvirvel.
  // Tärningar i en läderbägare: dova duns mot bägaren och skarpa klick när tärningarna slår mot varandra (brus genom filter).
  rattle: (v = 0.5) => {
    thud(0.05 + v * 0.07);
    const n = 4 + Math.round(v * 5);
    for (let i = 0; i < n; i++) clack(0.012 + Math.random() * 0.075, 0.18 + v * 0.35);
  },
  pour: () => {
    thud(0.12);
    for (let i = 0; i < 8; i++) clack(0.04 + i * 0.035 + Math.random() * 0.02, 0.5 - i * 0.04);
  },
  hold: (on = true) => (on ? notes([784, 1047], 0.05, 0.08) : notes([1047, 784], 0.05, 0.06)),
  almost: () => { tone(440, 0.22, { type: 'triangle', vol: 0.09, to: 392 }); tone(392, 0.4, { type: 'triangle', vol: 0.09, to: 300, delay: 0.24 }); },
  drumroll: (ms = 1000) => { for (let t = 0; t < ms; t += 45) tone(160 + Math.random() * 30, 0.05, { type: 'triangle', vol: 0.04 + (t / ms) * 0.1, delay: t / 1000 }); },
};
