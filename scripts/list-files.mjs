// Skriver www/files.json: alla filer som appen ska spara för att funka utan internet.
// Körs automatiskt vid publicering (se .github/workflows/pages.yml).
import { readdirSync, writeFileSync } from 'node:fs';

const files = readdirSync('www', { recursive: true, withFileTypes: true })
  .filter(f => f.isFile())
  .map(f => `${f.parentPath ?? f.path}/${f.name}`.replace(/\\/g, '/').replace(/^www\//, ''))
  .filter(f => f !== 'sw.js' && f !== 'files.json');

writeFileSync('www/files.json', JSON.stringify(['./', ...files], null, 1));
console.log(`${files.length} filer`);
