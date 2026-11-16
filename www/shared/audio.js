// Uppläsning och små ljudeffekter. Funkar utan internet.
// Korten har inspelade röster (mp3). Övrigt läses med plattans röst (speechSynthesis).

// Inställningar: läs upp kort (på), berättarröst (av), ljudeffekter (på).
const DEFAULTS = { cards: true, narrator: false, sfx: true };
let prefs = { ...DEFAULTS };
try { prefs = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('prefs') || '{}') }; } catch {}

export const settings = {
  get: key => prefs[key],
  set(key, value) {
    prefs[key] = value;
    try { localStorage.setItem('prefs', JSON.stringify(prefs)); } catch {}
    if (!value && key !== 'sfx') stopSpeech();
  },
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
}

// Inspelad röst (Piper-filer). Saknas filen läses texten upp med plattans röst i stället.
const clip = new Audio();
export function playClip(url, text, voice = NARRATOR, kind = 'cards') {
  if (kind !== 'always' && !prefs[kind]) return;
  stopSpeech();
  clip.src = url;
  clip.play().catch(() => speak(text, voice, kind));
}

// kind: 'cards' | 'narrator' | 'always' (t.ex. knappen "Läs upp").
export function speak(text, voice = NARRATOR, kind = 'narrator') {
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
    u.rate = voice.rate;
    u.onend = u.onerror = done;
    speechSynthesis.speak(u);
  });
}
export const stop = stopSpeech;

// --- Ljudeffekter med Web Audio (inga ljudfiler behövs)
let ctx;
function tone(freq, dur, { type = 'sine', vol = 0.18, delay = 0, to } = {}) {
  if (!prefs.sfx) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {}
}
const notes = (list, step, opts) => list.forEach((f, i) => tone(f, step * 1.6, { ...opts, delay: i * step }));

export const sfx = {
  click: () => tone(660, 0.06, { type: 'triangle' }),
  hop: () => tone(420, 0.1, { type: 'triangle', to: 760 }),
  roll: () => { for (let i = 0; i < 10; i++) tone(180 + Math.random() * 260, 0.05, { type: 'square', vol: 0.04, delay: i * 0.09 }); },
  land: () => { tone(110, 0.25, { vol: 0.35, to: 60 }); tone(784, 0.15, { type: 'triangle', delay: 0.05 }); },
  six: () => notes([1047, 1319, 1568, 2093], 0.07, { type: 'triangle', vol: 0.12 }),
  card: () => tone(250, 0.35, { type: 'sawtooth', vol: 0.05, to: 1200 }),
  good: () => notes([523, 659, 784, 1047], 0.09, { type: 'triangle' }),
  bad: () => notes([392, 330, 262], 0.13, { type: 'square', vol: 0.06 }),
  pop: () => tone(900 + Math.random() * 600, 0.18, { type: 'triangle', vol: 0.08, to: 200 }),
  win: () => notes([523, 659, 784, 1047, 784, 1047, 1319], 0.12, { type: 'triangle', vol: 0.16 }),
};
