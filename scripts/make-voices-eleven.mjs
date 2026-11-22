// Röster med ElevenLabs (mer inlevelse, olika röster per figur). Lägger filerna på samma ställen som make-voices.mjs.
//
// Nyckeln (hemlig!) läses från miljövariabeln ELEVENLABS_API_KEY eller från filen .env.local
// (en rad: ELEVENLABS_API_KEY=din-nyckel). .env.local följer aldrig med till GitHub.
//
//   node scripts/make-voices-eleven.mjs --list     visa vilka röster kontot har
//   node scripts/make-voices-eleven.mjs --sample   gör några prov i rostprover/ (sparar gratiskvoten)
//   node scripts/make-voices-eleven.mjs            gör alla röster som saknas
//   node scripts/make-voices-eleven.mjs --all      gör om alla röster
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { DECKS } from '../www/games/blabarsjakten/cards.js';

const key = process.env.ELEVENLABS_API_KEY
  || (existsSync('.env.local') && /ELEVENLABS_API_KEY\s*=\s*(\S+)/.exec(readFileSync('.env.local', 'utf8'))?.[1]);
if (!key) { console.error('Ingen nyckel. Lägg ELEVENLABS_API_KEY=... i filen .env.local'); process.exit(1); }
const api = (path, init = {}) => fetch(`https://api.elevenlabs.io${path}`, { ...init, headers: { 'xi-api-key': key, 'Content-Type': 'application/json', ...init.headers } });

// Vilken röst varje roll får: första namnet som finns i kontot används. Ändra fritt.
// stability lägre = mer känsla och variation. style högre = mer inlevelse.
const ROLES = {
  // Svenska röster från ElevenLabs bibliotek (tillagda i kontot: SV Ola, SV Louise, SV Olivia).
  fox:      { names: ['SV Ola', 'Callum'],    settings: { stability: 0.3, similarity_boost: 0.85, style: 0.6 } },   // busig och listig
  owl:      { names: ['SV Louise', 'Alice'], settings: { stability: 0.55, similarity_boost: 0.85, style: 0.3 } },  // varm och snäll
  squirrel: { names: ['SV Olivia', 'Jessica'], settings: { stability: 0.3, similarity_boost: 0.85, style: 0.6 } },   // pigg och snabb
  hedgehog: { names: ['SV Ola', 'George'],    settings: { stability: 0.6, similarity_boost: 0.85, style: 0.25 } },  // lugn och klok
  golden:   { names: ['SV Olivia', 'Sarah'], settings: { stability: 0.4, similarity_boost: 0.85, style: 0.5 } },   // glittrande glad
  narrator: { names: ['SV Louise', 'Sarah'], settings: { stability: 0.5, similarity_boost: 0.85, style: 0.3 } },
};
// Modell: välj med --model=..., annars den nyaste som kan svenska.
const MODEL = process.argv.find(x => x.startsWith('--model='))?.slice(8) || 'eleven_v4';
const OUT = 'www/games/blabarsjakten/voice';

const { voices } = await api('/v1/voices').then(r => {
  if (!r.ok) throw new Error(`ElevenLabs svarade ${r.status}. Stämmer nyckeln?`);
  return r.json();
});
if (process.argv.includes('--list')) {
  voices.forEach(v => console.log(`${v.name.padEnd(28)} ${v.voice_id}  ${v.labels?.gender ?? ''} ${v.labels?.accent ?? ''} ${v.labels?.age ?? ''}`));
  process.exit(0);
}
// Lägger de svenska rösterna från ElevenLabs bibliotek till kontot (en gång). Då väljs de automatiskt (namnen "SV ...").
//   node scripts/make-voices-eleven.mjs --add-voices
// Sedan: node scripts/make-voices-eleven.mjs --fyra --force   (gör om Fyra i rads röster med svenska röster)
if (process.argv.includes('--add-voices')) {
  const WANT = { 'SV Louise': 'kpTdKfohzvarfFPnwuHW', 'SV Olivia': 'cLAH1kXlkAivJHxCW601', 'SV Ola': 'ouhIFI5XkmBelRRcJe51' };
  const shared = await api('/v1/shared-voices?language=sv&page_size=100&sort=trending').then(r => r.json());
  for (const [name, id] of Object.entries(WANT)) {
    if (voices.some(v => v.name === name)) { console.log('finns redan:', name); continue; }
    const v = shared.voices?.find(x => x.voice_id === id);
    if (!v) { console.log('hittade inte i biblioteket:', name); continue; }
    const res = await api(`/v1/voices/add/${v.public_owner_id}/${id}`, { method: 'POST', body: JSON.stringify({ new_name: name }) });
    console.log(res.ok ? 'tillagd:' : `misslyckades (${res.status}):`, name, res.ok ? '' : await res.text());
  }
  process.exit(0);
}
const SKIP_LIBRARY = process.argv.includes('--no-library');
const pickVoice = role => {
  const v = ROLES[role].names.filter(n => !(SKIP_LIBRARY && n.startsWith('SV '))).map(n => voices.find(x => x.name.toLowerCase().startsWith(n.toLowerCase()))).find(Boolean);
  if (!v) throw new Error(`Rösten för ${role} (${ROLES[role].names}) finns inte i kontot`);
  return v.voice_id;
};
const voiceOf = Object.fromEntries(Object.keys(ROLES).map(r => [r, pickVoice(r)]));
console.log('Röster:', Object.entries(voiceOf).map(([r, id]) => `${r}=${voices.find(v => v.voice_id === id).name}`).join(', '));

let used = 0;
async function say(text, file, role, dir = OUT, opt = {}) { // opt: { model, voice } byter modell och röst för just det klippet
  if (!process.argv.includes('--force') && existsSync(`${dir}/${file}.mp3`)) return; // --force gör om även filer som finns
  const voiceId = opt.voice ? voices.find(v => v.name.toLowerCase().startsWith(opt.voice.toLowerCase())).voice_id : voiceOf[role];
  const res = await api(`/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`, {
    method: 'POST', body: JSON.stringify({ text, model_id: opt.model || MODEL, language_code: 'sv', voice_settings: opt.model ? { stability: 0.6, similarity_boost: 0.85, style: 0.2 } : ROLES[role].settings }),
  });
  if (!res.ok) throw new Error(`${file}: ${res.status} ${await res.text()}`);
  writeFileSync(`${dir}/${file}.mp3`, Buffer.from(await res.arrayBuffer()));
  used += text.length;
  console.log('✓', file, `(${used} tecken hittills)`);
}

if (process.argv.includes('--sample')) {
  const dir = `rostprover/elevenlabs-${MODEL}`;
  mkdirSync(dir, { recursive: true });
  await say(DECKS.fox[2].text, 'rav', 'fox', dir);
  await say(DECKS.owl[0].text, 'uggla', 'owl', dir);
  await say(DECKS.squirrel[0].text, 'ekorre', 'squirrel', dir);
  await say(DECKS.hedgehog[4].text, 'igelkott', 'hedgehog', dir);
  await say('Din tur! Dra tärningen uppåt och släpp.', 'berattare', 'narrator', dir);
  process.exit(0);
}

// Fyra i rad: reglerna i dialogen "Så spelar man" läses upp med berättarrösten (www/games/fyrairad/voice/rules.mp3).
async function fyraRules() {
  const dir = 'www/games/fyrairad/voice';
  mkdirSync(dir, { recursive: true });
  const html = readFileSync('www/games/fyrairad/index.html', 'utf8');
  await say(html.split('id="rulesText">')[1].split('</div>')[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), 'rules', 'narrator', dir);
}
// Fyra i rad: korta repliker när tärningarna har landat, "blå" + "hare" (färgtärningen först, sedan bildtärningen).
// Filerna heter c-<färg>.mp3 och f-<figur>.mp3 i www/games/fyrairad/voice. Lite text, lite av gratiskvoten.
async function fyraDice() {
  const dir = 'www/games/fyrairad/voice';
  mkdirSync(dir, { recursive: true });
  const COLOR = { green: 'Grön rad.', red: 'Röd rad.', blue: 'Blå rad.', yellow: 'Gul rad.', white: 'Välj rad själv.' }; // hela ord i en svensk fras, så att rösten inte uttalar "gul" som engelska
  const FIG = { fox: 'En räv.', owl: 'En uggla.', squirrel: 'En ekorre.', hedgehog: 'En igelkott.', hare: 'En hare.', bear: 'En björn.' };
  // Valda efter provlyssning: vissa ord låter svenskare med en annan röst eller modell (annars berättaren, Sarah).
  const STYLE = { 'c-yellow': ['eleven_turbo_v2_5', 'Sarah'], 'c-green': ['eleven_v4', 'Jessica'], 'f-squirrel': ['eleven_v4', 'Jessica'], 'f-hedgehog': ['eleven_turbo_v2_5', 'Sarah'], 'f-hare': ['eleven_turbo_v2_5', 'Sarah'], 'f-bear': ['eleven_v4', 'Alice'], 'f-owl': ['eleven_v4', 'Jessica'] };
  const opt = file => (STYLE[file] ? { model: STYLE[file][0], voice: STYLE[file][1] } : {});
  for (const [k, t] of Object.entries(COLOR)) await say(t, `c-${k}`, 'narrator', dir, opt(`c-${k}`));
  for (const [k, t] of Object.entries(FIG)) await say(t, `f-${k}`, 'narrator', dir, opt(`f-${k}`));
}
// Bara Fyra i rads röster (sparar gratiskvoten):  node scripts/make-voices-eleven.mjs --fyra
if (process.argv.includes('--fyra')) { if (!process.argv.includes('--no-rules')) await fyraRules(); await fyraDice(); process.exit(0); } // --no-rules: bara de korta tärningsreplikerna

// Fia med knuff: reglerna (rules.mp3) och berättarens korta repliker. Texterna ska vara samma som LINES i www/games/fiamedknuff/game.js.
//   node scripts/make-voices-eleven.mjs --fia --no-library            (--no-rules: bara replikerna, --force: gör om)
async function fiaVoice() {
  const dir = 'www/games/fiamedknuff/voice';
  mkdirSync(dir, { recursive: true });
  if (!process.argv.includes('--no-rules')) {
    const html = readFileSync('www/games/fiamedknuff/index.html', 'utf8');
    await say(html.split('id="rulesText">')[1].split('</div>')[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), 'rules', 'narrator', dir);
  }
  const game = readFileSync('www/games/fiamedknuff/game.js', 'utf8');
  const lines = Object.fromEntries([...game.split('const LINES = {')[1].split('};')[0].matchAll(/(\w+): '([^']+)'/g)].map(m => [m[1], m[2]]));
  for (const [k, t] of Object.entries(lines)) await say(t, k, 'narrator', dir);
}
if (process.argv.includes('--fia')) { await fiaVoice(); process.exit(0); }

if (process.argv.includes('--all')) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const [deck, cards] of Object.entries(DECKS)) for (const [i, c] of cards.entries()) await say(c.text, `${deck}-${i}`, deck);
// Reglerna och berättarens repliker: samma texter som make-voices.mjs.
const html = readFileSync('www/games/blabarsjakten/index.html', 'utf8');
await say(html.split('id="rulesText">')[1].split('</div>')[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), 'rules', 'narrator');
await fyraRules();
await fyraDice();
const src = readFileSync('scripts/make-voices.mjs', 'utf8');
const PLACE = ['första', 'andra', 'tredje', 'fjärde'], BONUS = ['fem blåbärskorgar', 'tre blåbärskorgar', 'två blåbärskorgar', 'en blåbärskorg'];
const lines = Object.fromEntries([...src.matchAll(/^\s+(\w+): '([^']+)',$/gm)].map(m => [m[1], m[2]]));
PLACE.forEach((p, i) => (lines[`goal${i + 1}`] = `Grattis! Du kom i mål på ${p} plats. Du får ${BONUS[i]} i bonus.`));
for (const [k, text] of Object.entries(lines)) await say(text, `line-${k}`, 'narrator');
mkdirSync('www/shared/voice', { recursive: true });
await say('Vill du avbryta spelet och gå till menyn?', 'quit', 'narrator', 'www/shared/voice');
console.log(`Klart. ${used} tecken användes.`);
