// Skriver www/files.json: alla filer som appen ska spara för att funka utan internet,
// med ett fingeravtryck (hash) per fil. Plattan hämtar bara filer vars fingeravtryck har ändrats.
// Körs automatiskt vid publicering (se .github/workflows/pages.yml).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const files = readdirSync('www', { recursive: true, withFileTypes: true })
  .filter(f => f.isFile())
  .map(f => `${f.parentPath ?? f.path}/${f.name}`.replace(/\\/g, '/').replace(/^www\//, ''))
  .filter(f => f !== 'sw.js' && f !== 'files.json');

const hash = f => createHash('sha1').update(readFileSync(`www/${f}`)).digest('hex').slice(0, 12);
const manifest = Object.fromEntries(files.map(f => [f, hash(f)]));
manifest['./'] = manifest['index.html']; // startsidan nås också som "./"

writeFileSync('www/files.json', JSON.stringify(manifest, null, 1));
console.log(`${files.length} filer`);
