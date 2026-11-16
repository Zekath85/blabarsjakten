# Spelportalen + Blåbärsjakten – design

Datum: 2026-11-16

## Varför

Ett lugnt, roligt och spännande brädspel på platta för ett barn 5–10 år, och för hela familjen.
Portalen ska kunna få fler spel med tiden.

## Mål

- Körs som Android-app på en äldre Samsung-platta. Funkar utan internet.
- Allt på svenska. Kort och regler läses upp, så barnet inte behöver kunna läsa.
- Mjuk, tecknad stil. Stora knappar. Tydliga, härliga effekter vid tärningskast och kort.
- Lätt att lägga till fler kort och fler spel.

## Inte mål

- Ingen publicering i Play Store. Inga konton. Inget nätverk.
- Ingen sparfunktion för pågående spel (läggs till om det saknas).
- Inga datorstyrda spelare.

## Får inte hända

- Spelet får inte kopiera ett befintligt spel: inga figurer, namn, bilder eller korttexter från andra.
  Vi lånar bara *hur den här sortens spel funkar* (tärning, pusselbana, korthögar, samla poäng).
  Figurer, utseende och alla korttexter är egna.
- Det får inte hacka eller bli segt på plattan.

## Vägar vi tittade på

1. **Webbsida som installeras från Chrome.** Enklast, men kräver att sidan ligger på nätet första gången. Bortvald: användaren vill ha en riktig app.
2. **Vanlig webbkod inpackad till Android-app med Capacitor (vald).** Samma kod testas i webbläsaren på datorn. Blir en appfil (APK) som läggs på plattan med sladd. Funkar utan internet.
3. **Spelmotor (Unity/Godot).** Bortvald: tungt för gammal platta, mycket mer jobb, behövs inte för ett brädspel.

## Teknik (mina val)

- Ren HTML, CSS och JavaScript. Inget ramverk, inget byggsteg.
- Bilder ritas som SVG i koden (små, skarpa, lätta).
- Rörelse med CSS `transform`/`opacity` (billigt för plattan). Ingen canvas-motor.
- Uppläsning: en funktion `speak(text)`.
  - I appen: Capacitor-tillägget `@capacitor-community/text-to-speech` (plattans egen svenska röst, funkar offline när rösten är nedladdad).
  - I webbläsaren på datorn: `speechSynthesis`.
  - Röst: `sv-SE`, lite lägre tonläge och lite långsammare = "gammal farbror". En knapp för ljud av/på.
- Spellogiken (bana, drag, kort, poäng) ligger i en egen fil utan skärmkod, så den kan testas med ett litet Node-skript.

## Mappar

```
www/
  index.html              portalen (lista med spel som stora knappar)
  shared/                 gemensamt: speak(), knappar, färger
  games/blabarsjakten/
    index.html
    game.js               skärm och animationer
    logic.js              regler, bana, poäng (testbar)
    cards.js              alla kort som en enkel lista
    art.js                SVG-figurer
test/logic.test.js        ett körbart test med assert
```

Nytt spel = ny mapp under `games/` + en rad i portalens lista.

## Blåbärsjakten – så funkar det

**Figurer (egna):**

| Hög | Figur | Färg | Vad korten gör |
|---|---|---|---|
| Busiga | Räven Rask | Orange | Du blir av med korgar, eller någon tar en |
| Snälla | Ugglan Ulla | Lila | Du får korgar |
| Snabba | Ekorren Kvick | Blå | Flytta fram/bak, slå igen |
| Kloka | Igelkotten Pigg | Grön | Dela, byt, ge till den som har minst |
| Poäng | Blåbärskorg | Vit | 1 korg = 1 poäng |

Räven 14 kort, övriga 8 var. Alla texter skrivs nya.

**Flöde:**

1. Portal → tryck på Blåbärsjakten.
2. Välj 2–4 spelare. Namn är "Spelare 1–4". Pennikon för att ändra.
3. Banan slumpas: en slingrande väg av cirka 40 pusselbitar inom en kvadrat (rutnät 8×8, vägen korsar aldrig sig själv). Grön startbit, röd målbit. Knapp "Ny bana" ger en annan väg. Knapp "Starta".
4. Bitar på vägen: de flesta är tomma (inget händer). Några har en figur (dra kort ur den högen). Några har en blåbärskorg (få 1 korg direkt).
5. En tur:
   - Kameran zoomar in på spelarens pjäs.
   - Stor knapp "Slå tärningen". Tärningen snurrar, landar med en studs och en effekt. Sexa ger extra glitter.
   - Pjäsen hoppar ruta för ruta. Kameran följer.
   - Figurruta: korthögen lyser. Spelaren trycker. Kortet vänds, visas stort och läses upp. Effekten sker. Knapp "Okej".
   - Nästa spelare.
6. Mål: man behöver inte slå exakt. Når eller passerar man röd bit går man ut. Fyrverkeri.
   Målbonus efter ordning: 1:a 5 korgar, 2:a 3, 3:a 2, 4:a 1 (samma som den sortens spel brukar ha).
   (Klassiskt kräver exakt slag. Vi skippar det: för segt för en 5-åring. En rad att ändra om vi vill.)
7. Spelare som gått ut hoppas över. Spelet är slut när alla gått ut.
8. Prispall: flest korgar vinner. Lika = delad plats. Sedan "Nytt spel" eller "Till menyn".

**Alltid på skärmen:** rad längst upp med varje spelares färg, namn och antal korgar. Stor bakåtpil till menyn (frågar "Vill du sluta spelet?" först). Flik "Regler" med uppläsningsknapp.

**Utseende:** varm trä- och skogskänsla, tjocka mjuka kanter, guldkant på kort, stora runda knappar. Egen stil.

## Extra som gör spelet rikare

Med från start:
- Blåbärsrutor på banan (korg direkt).
- Sexa = extra glitter-effekt.

Senare, om det behövs:
- Välj kort eller lång bana.
- Genvägar på banan.
- Inspelade röster per figur i stället för plattans röst.
- Spara pågående spel.

## Regler hämtade från den klassiska sortens spel (bara mekanik, inga texter)

- Varje spelare börjar med 8 korgar.
- Tom ruta: inget händer.
- Blåbärsruta: ta 1–3 korgar (antal syns på rutan).
- Figurruta: dra översta kortet, gör det som står, kortet läggs underst i högen.
- Räven Rask har störst hög (14 kort), övriga figurer 8 kort var.
- Den som slår högst börjar.

## Bygga appfilen (sist)

Kräver Android Studio på datorn (finns inte än, användaren installerar). Sedan: Capacitor lägger `www/` i ett Android-projekt, bygger en APK, och den förs över till plattan med USB.

## Lämnas åt byggaren

Exakta korttexter, exakta mått och färgkoder, hur figurerna ritas, antal figur- och blåbärsrutor per bana (riktvärde: var fjärde ruta har något).
