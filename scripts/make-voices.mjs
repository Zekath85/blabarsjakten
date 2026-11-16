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

// Gemensamma repliker för alla spel (shared/dialog.js m.fl.).
mkdirSync('www/shared/voice', { recursive: true });
await say('Vill du avbryta spelet och gå till menyn?', 'quit', VOICE.rules, 'www/shared/voice');
