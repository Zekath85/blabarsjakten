# Blåbärsjakten – byggplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Spelportal med första spelet Blåbärsjakten, som körs i webbläsare och som Android-app (Capacitor).

**Architecture:** Ren HTML/CSS/JS i `www/`, inga byggsteg. Regler i `logic.js` (ingen DOM, testas med Node). Skärm och effekter i `game.js`. Capacitor packar `www/` till APK.

**Tech Stack:** HTML, CSS, ES-moduler, SVG, Web Audio, Capacitor + `@capacitor-community/text-to-speech`.

**Spec:** `docs/superpowers/specs/2026-11-16-blabarsjakten-design.md`

## Global Constraints

- Allt på svenska. Inga figurer, namn, bilder eller korttexter från andra spel.
- Inget nätverk vid körning (inga CDN, inga webbtypsnitt).
- Billigt för gammal platta: animera bara `transform`/`opacity`, inga `filter`/`backdrop-filter`.
- Start: 8 korgar. Målbonus 5/3/2/1. Räven 14 kort, övriga 8. Inget exakt slag i mål.

## Review Focus

- Spelare med 0 korgar som ska förlora korgar → stannar på 0.
- Lika många korgar på slutet → delad placering på prispallen.
- Spelare går i mål via ett kort (Ugglan/Ekorren flyttar fram) → räknas som mål med bonus.
- Kort som flyttar bakåt från start → stannar på start.
- Banan måste alltid gå att skapa (ingen evig loop) och aldrig korsa sig själv.

---

### Task 1: Regler + test

**Files:** Create `www/games/blabarsjakten/logic.js`, `www/games/blabarsjakten/cards.js`, `test/logic.test.js`, `package.json`

**Produces:** `mulberry32(seed)`, `generatePath(rng)`, `makeBoard(rng)`, `createGame(names, board, rng)`, `rollDie(rng)`, `move(game, steps) -> number[]`, `land(game) -> {type, gained?, bonus?, place?}`, `drawCard(game, deck)`, `applyCard(game, card) -> {steps?, again?}`, `nextTurn(game)`, `ranking(game) -> [{player, rank}]`, `DECKS`, `FIGURES`.

- [ ] Skriv test (bana giltig för 300 frön, bonus 5/3/2/1, 0-golv, delade platser, mål via kort, hoppa över klara spelare).
- [ ] `node test/logic.test.js` → FAIL.
- [ ] Skriv logiken.
- [ ] `node test/logic.test.js` → "OK".

### Task 2: Portal, utseende, spelskärmar

**Files:** Create `www/index.html`, `www/shared/style.css`, `www/shared/speak.js`, `www/shared/sfx.js`, `www/games/blabarsjakten/index.html`, `game.css`, `game.js`, `art.js`

- [ ] Portal med spelkort.
- [ ] Välj spelare + namn med penna → visa bana, "Ny bana" → spela.
- [ ] Tärning (3D-kub), hopp, kamera som följer, korthögar, kortvändning, uppläsning.
- [ ] Mål med fyrverkeri, prispall, nytt spel / meny, regler, bakåtpil.
- [ ] Testa i webbläsaren: spela ett helt parti med 2 spelare.

### Task 3: Android

**Files:** Create `capacitor.config.json`, `android/` (genereras)

- [ ] `npm install` + `npx cap add android` + `npx cap sync`.
- [ ] APK byggs när Android Studio finns.
