// Bakgrundsmusik som spelas med syntljud direkt i plattan (Web Audio). Inga ljudfiler, funkar utan internet.
// Varje spel har egna låtar (t.ex. games/blabarsjakten/songs.js). Motorn är gemensam.
//
// En låt: { name, bpm, chords: ['C','G','Am','F', ...] (ett ackord per takt),
//   lead: 'E5 G5 C6 . - ...' (åttondelar, 8 per takt; '.' = paus, '-' = håll kvar),
//   leadWave, arp: 'up' | 'harp' | 'pluck' | null, bass: 'eighth' | 'pump' | 'long', drums: 16 tecken per takt (k=kick, s=virvel, h=hihat, .=tyst),
//   pad: true/false, echo: 0..1 }
import { settings, getCtx, onSpeech } from './audio.js';

const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const freqOf = midi => 440 * Math.pow(2, (midi - 69) / 12);
// 'C#5', 'Bb4', 'E6' -> MIDI-nummer
function midiOf(note) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!m) return null;
  return 12 * (+m[3] + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
// 'Am', 'F', 'Bb', 'E' -> [grundton, ters, kvint] som MIDI i oktav 4
function chordOf(name) {
  const m = /^([A-G][#b]?)(m?)$/.exec(name);
  const root = midiOf(m[1] + '4');
  return [root, root + (m[2] ? 3 : 4), root + 7];
}

let ctx, master, musicBus, echo, song = null, timer = null, step = 0, nextTime = 0, noise, ducked = false;

function setup() {
  if (master) return;
  ctx = getCtx();
  master = ctx.createGain();
  master.connect(ctx.destination);
  // Mjukt eko gör ljudet större och vackrare.
  echo = ctx.createDelay(1);
  const fb = ctx.createGain(), wet = ctx.createGain(), tone = ctx.createBiquadFilter();
  tone.type = 'lowpass'; tone.frequency.value = 2400;
  fb.gain.value = 0.32; wet.gain.value = 0.35;
  echo.connect(tone); tone.connect(fb); fb.connect(echo); tone.connect(wet); wet.connect(master);
  musicBus = ctx.createGain();
  musicBus.connect(master);
  // Brus till trummorna (en gång).
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  applyVolume();
}

function applyVolume() {
  if (!master) return;
  const v = settings.get('music') ? settings.get('musicVol') : 0;
  master.gain.setTargetAtTime(v * 0.5 * (ducked ? 0.35 : 1), ctx.currentTime, 0.15);
}

// En ton med mjuk början och slut. wave: 'square' | 'triangle' | 'sawtooth' | 'sine'.
function voice(midi, t, dur, { wave = 'square', vol = 0.1, cutoff = 3000, toEcho = 0, vibrato = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = wave;
  o.frequency.setValueAtTime(freqOf(midi), t);
  if (vibrato) {
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5.5; lg.gain.value = freqOf(midi) * 0.006 * vibrato;
    lfo.connect(lg).connect(o.frequency); lfo.start(t + 0.08); lfo.stop(t + dur + 0.1);
  }
  f.type = 'lowpass'; f.frequency.value = cutoff;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.setTargetAtTime(vol * 0.6, t + 0.05, 0.1);
  g.gain.setTargetAtTime(0.0001, t + dur, 0.06);
  o.connect(f).connect(g).connect(musicBus);
  if (toEcho) { const s = ctx.createGain(); s.gain.value = toEcho; g.connect(s).connect(echo); }
  o.start(t); o.stop(t + dur + 0.4);
}

// Långsam, mjuk ackordmatta (för menyn): tonar in och ut, lätt svävande.
function swell(midi, t, dur, k) {
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = 'triangle'; o2.type = 'sine';
  o.frequency.value = freqOf(midi); o2.frequency.value = freqOf(midi) * 1.003; // lite ur stämning = varmt och levande
  f.type = 'lowpass'; f.frequency.value = 1400;
  const v = 0.03 - k * 0.004;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + dur * 0.4);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(f); o2.connect(f); f.connect(g).connect(musicBus);
  const s = ctx.createGain(); s.gain.value = 0.4; g.connect(s).connect(echo);
  o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
}

function drum(kind, t) {
  if (kind === 'k') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.2);
    return;
  }
  const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  src.buffer = noise;
  f.type = kind === 's' ? 'bandpass' : 'highpass';
  f.frequency.value = kind === 's' ? 1800 : 7000;
  const len = kind === 's' ? 0.14 : 0.04;
  g.gain.setValueAtTime(kind === 's' ? 0.16 : 0.05, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  src.connect(f).connect(g).connect(musicBus);
  src.start(t); src.stop(t + len + 0.02);
}

// Spela upp allt som ska låta i ett sextondelssteg.
function playStep(s, t) {
  const sixteenth = 60 / song.bpm / 4, bar = Math.floor(s / 16), pos = s % 16;
  const chord = chordOf(song.chords[bar % song.chords.length]);
  // Melodi (åttondelar): räkna hur länge tonen hålls ('-').
  if (pos % 2 === 0 && song.leadTokens.length) {
    const tokens = song.leadTokens, i = s / 2;
    const tok = tokens[i % tokens.length];
    if (tok !== '.' && tok !== '-') {
      let len = 1;
      while (tokens[(i + len) % tokens.length] === '-' && len < 8) len++;
      voice(midiOf(tok), t, len * sixteenth * 2 * 0.92, { wave: song.leadWave || 'square', vol: song.leadVol || 0.07, cutoff: 2600, toEcho: song.echo || 0.3, vibrato: 1 });
    }
  }
  // Arpeggio av ackordet.
  if (song.arp === 'up') {
    const n = [chord[0], chord[1], chord[2], chord[0] + 12][pos % 4];
    voice(n, t, sixteenth * 0.9, { wave: 'square', vol: 0.025, cutoff: 1800 });
  } else if (song.arp === 'harp') {
    const up = [chord[0], chord[1], chord[2], chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[0] + 24, chord[2] + 12];
    const n = up[pos < 8 ? pos : 15 - pos];
    voice(n, t, sixteenth * 3, { wave: 'triangle', vol: 0.045, cutoff: 4000, toEcho: 0.5 });
  } else if (song.arp === 'pluck' && pos % 2 === 0) {
    const n = [chord[0], chord[2], chord[1] + 12, chord[2]][(pos / 2) % 4];
    voice(n, t, sixteenth * 1.6, { wave: 'triangle', vol: 0.05, cutoff: 2500, toEcho: 0.25 });
  }
  // Bas.
  const root = chord[0] - 24;
  if (song.bass === 'eighth' && pos % 2 === 0) voice(root + (pos % 4 === 2 ? 12 : 0), t, sixteenth * 1.7, { wave: 'triangle', vol: 0.13, cutoff: 900 });
  if (song.bass === 'pump' && pos % 2 === 0) voice(root + (pos % 4 === 2 ? 12 : 0), t, sixteenth * 1.4, { wave: 'sawtooth', vol: 0.06, cutoff: 700 });
  if (song.bass === 'long' && pos === 0) voice(root, t, sixteenth * 15, { wave: 'triangle', vol: 0.12, cutoff: 600 });
  // Mjuk matta av ackordet i början av varje takt.
  if (song.pad && pos === 0) chord.forEach(n => voice(n, t, sixteenth * 15, { wave: 'sawtooth', vol: 0.018, cutoff: 1200, toEcho: 0.3 }));
  if (song.swell && pos === 0) chord.concat(chord[0] + 12).forEach((n, k) => swell(n, t, sixteenth * 16 * 1.05, k));
  // Trummor.
  const dr = song.drums?.[pos];
  if (dr && dr !== '.') drum(dr, t);
}

// Schemaläggaren: lägger in toner en bit i förväg så att takten blir jämn även om plattan är upptagen.
function tick() {
  const sixteenth = 60 / song.bpm / 4, total = song.chords.length * 16;
  while (nextTime < ctx.currentTime + 0.15) {
    playStep(step, nextTime);
    nextTime += sixteenth;
    step = (step + 1) % total; // repeat
  }
}

export const music = {
  // Starta (eller byt till) en låt. Kräver att man har tryckt på skärmen en gång (webbläsarens regel).
  play(s) {
    setup();
    if (ctx.state === 'suspended') ctx.resume();
    song = { ...s, leadTokens: s.lead ? s.lead.trim().split(/\s+/) : [] };
    step = 0;
    nextTime = ctx.currentTime + 0.1;
    clearInterval(timer);
    timer = setInterval(tick, 40);
    applyVolume();
  },
  stop() { clearInterval(timer); timer = null; song = null; },
  get playing() { return !!timer; },
  applyVolume,
};

settings.onChange(key => (key === 'music' || key === 'musicVol') && applyVolume());
// Sänk musiken när någon pratar, så att man hör uppläsningen.
onSpeech(on => { ducked = on; applyVolume(); });
