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
const SKIP_LIBRARY = process.argv.includes('--no-library');
const pickVoice = role => {
  const v = ROLES[role].names.filter(n => !(SKIP_LIBRARY && n.startsWith('SV '))).map(n => voices.find(x => x.name.toLowerCase().startsWith(n.toLowerCase()))).find(Boolean);
  if (!v) throw new Error(`Rösten för ${role} (${ROLES[role].names}) finns inte i kontot`);
  return v.voice_id;
};
const voiceOf = Object.fromEntries(Object.keys(ROLES).map(r => [r, pickVoice(r)]));
console.log('Röster:', Object.entries(voiceOf).map(([r, id]) => `${r}=${voices.find(v => v.voice_id === id).name}`).join(', '));

let used = 0;
async function say(text, file, role, dir = OUT) {
  if (existsSync(`${dir}/${file}.mp3`)) return;
  const res = await api(`/v1/text-to-speech/${voiceOf[role]}?output_format=mp3_44100_64`, {
    method: 'POST', body: JSON.stringify({ text, model_id: MODEL, language_code: 'sv', voice_settings: ROLES[role].settings }),
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
// Bara reglerna för Fyra i rad (sparar gratiskvoten):  node scripts/make-voices-eleven.mjs --fyra
if (process.argv.includes('--fyra')) { await fyraRules(); process.exit(0); }

if (process.argv.includes('--all')) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const [deck, cards] of Object.entries(DECKS)) for (const [i, c] of cards.entries()) await say(c.text, `${deck}-${i}`, deck);
// Reglerna och berättarens repliker: samma texter som make-voices.mjs.
const html = readFileSync('www/games/blabarsjakten/index.html', 'utf8');
await say(html.split('id="rulesText">')[1].split('</div>')[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), 'rules', 'narrator');
await fyraRules();
const src = readFileSync('scripts/make-voices.mjs', 'utf8');
const PLACE = ['första', 'andra', 'tredje', 'fjärde'], BONUS = ['fem blåbärskorgar', 'tre blåbärskorgar', 'två blåbärskorgar', 'en blåbärskorg'];
const lines = Object.fromEntries([...src.matchAll(/^\s+(\w+): '([^']+)',$/gm)].map(m => [m[1], m[2]]));
PLACE.forEach((p, i) => (lines[`goal${i + 1}`] = `Grattis! Du kom i mål på ${p} plats. Du får ${BONUS[i]} i bonus.`));
for (const [k, text] of Object.entries(lines)) await say(text, `line-${k}`, 'narrator');
mkdirSync('www/shared/voice', { recursive: true });
await say('Vill du avbryta spelet och gå till menyn?', 'quit', 'narrator', 'www/shared/voice');
console.log(`Klart. ${used} tecken användes.`);
