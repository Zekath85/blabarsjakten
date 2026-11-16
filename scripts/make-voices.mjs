// Gör en ljudfil per kort (och reglerna) med Microsofts naturliga svenska röster.
// Behöver internet när det körs. Filerna funkar sedan utan internet i appen.
// Kör igen när du ändrat eller lagt till kort:
//   npm run voices
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { DECKS } from '../www/games/blabarsjakten/cards.js';

const OUT = 'www/games/blabarsjakten/voice';
const MATTIAS = 'sv-SE-MattiasNeural', SOFIE = 'sv-SE-SofieNeural';
// Röst och tempo per figur. ponytail: byt till ElevenLabs här senare.
const VOICE = {
  fox:      [MATTIAS, { rate: '+0%', pitch: '+4%' }],
  owl:      [SOFIE,   { rate: '-8%' }],
  squirrel: [SOFIE,   { rate: '+8%', pitch: '+6%' }],
  hedgehog: [MATTIAS, { rate: '-10%', pitch: '-6%' }],
  golden:   [SOFIE,   { rate: '-2%', pitch: '+4%' }],
  rules:    [MATTIAS, { rate: '-8%' }],
};

// Färdiga filer hoppas över. Ändrat en korttext? Ta bort dess fil, eller kör "npm run voices -- --all".
if (process.argv.includes('--all')) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

async function say(text, file, [voice, opts], out = OUT) {
  if (existsSync(`${out}/${file}.mp3`)) return;
  for (let attempt = 1; ; attempt++) {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioFilePath } = await tts.toFile(out, text, opts);
      renameSync(audioFilePath, `${out}/${file}.mp3`);
      console.log('✓', file);
      await new Promise(r => setTimeout(r, 700));
      return;
    } catch (e) {
      if (attempt === 5) throw new Error(`${file}: ${e.message}`);
      await new Promise(r => setTimeout(r, 3000 * attempt)); // tjänsten vill inte ha för många på rad
    } finally {
      try { tts.close(); } catch {}
    }
  }
}

for (const [deck, cards] of Object.entries(DECKS))
  for (const [i, c] of cards.entries()) await say(c.text, `${deck}-${i}`, VOICE[deck]);

// Reglerna: plocka texten ur spelets HTML.
const html = readFileSync('www/games/blabarsjakten/index.html', 'utf8');
const rules = html.split('id="rulesText">')[1].split('</div>')[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
await say(rules, 'rules', VOICE.rules);

// Berättarens repliker i spelet (Sofie). Namn kan inte spelas in, så figuren visas på skärmen i stället.
const PLACE = ['första', 'andra', 'tredje', 'fjärde'], BONUS = ['fem blåbärskorgar', 'tre blåbärskorgar', 'två blåbärskorgar', 'en blåbärskorg'];
const LINES = {
  turn: 'Din tur! Slå tärningen.',
  again: 'Slå igen!',
  tap: 'Tryck på kortet.',
  berry1: 'Blåbär! Du får en korg.',
  berry2: 'Blåbär! Du får två korgar.',
  berry3: 'Blåbär! Du får tre korgar.',
  berry4: 'Blåbär! Du får fyra korgar.',
  extra: 'Och en extra korg, för att du ligger efter!',
  golden: 'Oj! Ett gyllene kort!',
  bot: 'Nu är det datorns tur.',
  board: 'Här är spelplanen. Tryck på starta när ni är redo.',
  win: 'Grattis till vinnaren! Bra spelat allihop!',
  tie: 'Det blev lika! Bra spelat allihop!',
  ...Object.fromEntries(PLACE.map((p, i) => [`goal${i + 1}`, `Grattis! Du kom i mål på ${p} plats. Du får ${BONUS[i]} i bonus.`])),
};
for (const [key, text] of Object.entries(LINES)) await say(text, `line-${key}`, [SOFIE, { rate: '-4%' }]);

// Gemensamma repliker för alla spel (shared/dialog.js m.fl.).
mkdirSync('www/shared/voice', { recursive: true });
await say('Vill du avbryta spelet och gå till menyn?', 'quit', VOICE.rules, 'www/shared/voice');
