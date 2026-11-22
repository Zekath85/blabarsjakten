# Spelhörnan

Spelportal för plattan. Spel: **Blåbärsjakten**, **Fyra i rad**, **Fia med knuff** och **Sand Spelet**.

**Fia med knuff** (`www/games/fiamedknuff/`): 2-4 spelare, eller en mot datorn (lätt, medel, svår). Sexa för att komma ut, knuff, exakt slag i mål. Reglerna ligger i `logic.js`. Röster görs med `node scripts/make-voices-eleven.mjs --fia --no-library`.

Spelet är en webbapp. Den ligger på GitHub Pages, sparas i plattan och funkar utan internet.
När plattan har internet hämtar den nya versioner av sig självt. Nya versionen syns nästa gång appen öppnas.

## Testa på datorn

```bash
npm run serve
```

Öppna sedan http://localhost:5173 i Chrome.

## Kör testet för reglerna

```bash
npm test
```

## Publicera en ny version

Lägg upp ändringarna på `main`. GitHub publicerar automatiskt (se fliken **Actions** på GitHub).

```bash
git add -A
git commit -m "Beskriv ändringen"
git push
```

## Lägga till kort

Öppna `www/games/blabarsjakten/cards.js`. Ett kort är en rad. Kopiera en rad och ändra texten.

Gör sedan röster för nya kort (Mattias och Sofie, kräver internet medan det körs):

```bash
npm run voices
```

Ändrat texten på ett befintligt kort? Ta bort dess fil i `www/games/blabarsjakten/voice/` först, eller gör om alla:

```bash
npm run voices -- --all
```

## Röster med ElevenLabs

Korten, berättaren och reglerna är inlästa med ElevenLabs (gratiskonto, kräver att "elevenlabs.io" anges, det står i reglerna).
Nyckeln ligger i `.env.local` (följer aldrig med till GitHub). Gör röster för nya eller ändrade kort:

```bash
node scripts/make-voices-eleven.mjs --no-library --model=eleven_v4
```

Utan nyckel går det att använda Microsofts röster i stället: `npm run voices`.

## Lägga till ett nytt spel

1. Skapa en mapp under `www/games/`.
2. Lägg till en rad i listan `GAMES` i `www/index.html`.

## Installera på plattan (en gång)

1. Öppna spelets adress i **Chrome** på plattan.
2. Tryck på **⋮** uppe till höger → **Lägg till på startskärmen** → **Installera**.
3. Öppna Spelhörnan från hemskärmen. Nu funkar det även utan internet.
