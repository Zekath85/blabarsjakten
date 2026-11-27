# Yatzy i Spelhörnan – design

## Varför
Spelhörnan ska få ett andra eget spel: **Yatzy**. Det spelas på familjens gamla Samsung-platta.
Det ska passa dottern (5–10 år) och de vuxna i familjen.

Spelet ska kännas som Yatzy på papper, så att den som har spelat förut känner igen sig.
Men det ska vara mer spännande och mer "premium" än Blåbärsjakten.
Där finns bara en tärning. Här finns fem, så kastet är huvudnumret.

## Mål
- 1–4 spelare på samma platta, eller 1 spelare mot datorn ("Robo").
- Samma stil som Blåbärsjakten: samma ljudeffekter, musiksystem, svensk röst, ikoner, figurer, avbryt-ruta, regelruta och podium.
- **Ett eget block per spelare.** Blocket täcker skärmen när det är ens tur, och man scrollar i det. Det ska vara lika lätt att läsa som ett papper.
- **Kastet:** man skakar en bägare och häller ut tärningarna i en ask. Tärningarna studsar mot kanterna och mot varandra, landar och lägger sig sedan i en rad vid sidan.
- **Ett reglage för hjälp, per spelare:**
  - *Ingen:* vanligt block.
  - *Lite:* varje ledig rad visar vad den skulle ge just nu.
  - *Mycket:* som *Lite*, och en glittrande stjärna vid de bra raderna. Det ska vara flera alternativ, aldrig ett enda "bästa".
- Reglerna finns i en ruta som kan läsas upp.

## Inte med (icke-mål)
- Spel över nätet.
- Maxi-Yatzy med 6 tärningar, eller andra regelvarianter.
- Skaka genom att skaka plattan (rörelsesensor). Det kräver tillstånd från webbläsaren och är krångligt på gamla plattor. Kan läggas till senare.
- Tvingad ordning på raderna.

## Detta får inte hända (anti-mål)
- Spelet säger vilket val som är **bäst**. Spelaren ska själv tänka ut det.
- Kasten blir sega. En match med 4 spelare har upp till 180 kast. Ett kast ska därför ta cirka 1,5–2 sekunder från släpp till att tärningarna ligger still, och ett tryck ska kunna snabbspola.
- Billiga emojier. Använd SVG-ikonerna i `shared/icons.js` och ritad grafik.
- Det blir för tungt för den gamla plattan. Lugnt läge (`settings.calm`) ska fungera här också.

## Begränsningar
- Bara HTML, CSS och ES-moduler, utan byggsteg, precis som resten av `www/`.
- Inga nya bibliotek.
- Det ska fungera offline. Service workern hittar nya filer av sig själv via `scripts/list-files.mjs`.
- Det ska fungera på plattan liggande, och på mobil stående (max 600 px bred).
- Röster görs med ElevenLabs gratiskonto, max 10 000 tecken i månaden. Kontrollera kvoten innan körning. Om en röstfil saknas används plattans egen röst, via `playClip`.

## Sätt vi övervägde (för tärningarna)
- **A. Samma teknik som i Blåbärsjakten, men med fem tärningar i en ask – VALD.**
  Tärningarna är 3D-kuber i CSS. Banan räknas ut i förväg, 60 steg per sekund, så att varje tärning landar på en slumpad, rättvis siffra.
  Det är lätt för den gamla plattan och ser ut som resten av spelet.
  Användaren valde detta, med skakbägaren.
- **B. Riktig 3D-motor (WebGL med fysikbibliotek).** Mest verklig, men tung på den gamla plattan och kräver nya stora bibliotek. Valdes bort.
- **C. Färdiga animationer.** Samma kast varje gång, så det blir tråkigt. Valdes bort.

## Det användaren har bestämt
- Yatzy med upp till 4 spelare, och samma resurser som Blåbärsjakten.
- Ett eget block per spelare, som täcker skärmen på ens tur och går att scrolla.
- Blocket visar enkelt vad ett kast skulle ge på varje rad, när hjälpen är på.
- Tärningarna landar mitt på skärmen och lägger sig sedan i en rad vid sidan.
- Skakbägare och en ask med kanter (sätt A).
- Hjälpreglaget med en glittrande stjärna vid bra alternativ, men aldrig "bästa valet".
- Reglerna visas i en ruta.
- Svenskt tal för de viktigaste och mest upprepade sakerna.
- Musik och meny som i Blåbärsjakten.

## Regler (svensk Yatzy)
- Fem tärningar. Upp till 3 kast per tur. Mellan kasten kan man spara tärningar.
- Efter kasten måste man fylla i en ledig rad. Ger raden 0 poäng, stryker man den.
- 15 rader. Spelet är slut när alla spelare har fyllt alla rader.

| Rad | Poäng |
|---|---|
| Ettor till Sexor | summan av den siffran |
| **Bonus** | 50 om övre delen ger 63 eller mer |
| Ett par | summan av det högsta paret |
| Två par | summan av två olika par |
| Tretal | summan av tre lika |
| Fyrtal | summan av fyra lika |
| Liten stege | 1-2-3-4-5 ger 15 |
| Stor stege | 2-3-4-5-6 ger 20 |
| Kåk | tretal och par (olika siffror), summan av alla |
| Chans | summan av alla |
| Yatzy | fem lika ger 50 |

- Fem lika räknas också som Tretal och Fyrtal, men **inte** som Kåk eller Två par.
- Den med flest poäng vinner. Vid lika delar man placering, som i `ranking` i Blåbärsjakten.

## Så ser det ut och känns

### Skärmar
1. **Välj spelare.** Samma skärm som i de andra spelen: knapparna 1 (mot Robo), 2, 3 och 4, namn med penna, och figurskaparen.
   Nytt är hjälpreglaget per spelare: tre små lägen bredvid varje namn.
   Därefter kommer en skärm med valen för Robos nivå (bara mot Robo) och "Först till", som i Fyra i rad.
   Namn och figurer delas mellan spelen, så dottern behöver bara skapa sin figur en gång.
2. **Spelet.** Den aktuella spelarens block fyller skärmen.
   Överst finns en tunn rad med alla spelares figurer och poäng. Trycker man på en annan spelare kikar man på dennes block.
3. **Podium** med fyrverkeri, som i Blåbärsjakten.
4. **Regelrutan** och **ljudpanelen** nås via ikonknappar uppe till höger, som i Blåbärsjakten. Bakåtpilen och avbryt-rutan finns uppe till vänster.

### Blocket
- Det ska kännas som ett papper: ljus bakgrund, tunna linjer, en kolumn för spelaren och två grupper, övre och undre.
- Varje rad har en liten tärningsbild eller ikon och ett namn.
- Övre delen visar hur långt det är kvar till bonus, till exempel "18 kvar till bonus", med en liten mätare.
- **Hjälp *Lite*:** lediga rader visar sin möjliga poäng i blek text. Rader som skulle ge 0 visas gråade.
- **Hjälp *Mycket*:** som *Lite*, och 2–3 rader får en glittrande stjärna. Det är rader som ger mycket jämfört med vad de brukar ge. Regeln ska vara enkel och testad, och den visar flera val, inte ett facit.
- Trycker man på en rad fylls den i: siffran räknas upp med ett mjukt ljud. Är raden 0 frågar spelet först "Stryka Kåk?" med Ja och Nej.
- Man kan bara fylla i en rad efter att ha kastat minst en gång.

### Kastet
- **Asken** är en träask eller filtask med kanter, mitt på skärmen ovanpå blocket.
  Den visas när det är dags att kasta och gör blocket mörkare bakom sig.
- **Bägaren:** man håller fingret på bägaren och drar fram och tillbaka.
  Varje gång man byter riktning hörs ett skrammel, och skramlet blir kraftigare ju längre man skakar, upp till en gräns. Bägaren gungar med fingret.
- När man släpper tippar bägaren och tärningarna hälls ut i asken.
  De studsar mot kanterna och mot varandra och landar på sina slumpade sidor. Det är samma teknik som `simulateThrow` och `throwDice` i Blåbärsjakten, men med fem tärningar, kollision mellan dem och en ask som gräns.
- **Knappen "Kasta"** gör en automatisk skakning och ett kast, för de minsta.
- **Efter landning** glider tärningarna till en rad vid sidan av blocket: liggande platta under eller bredvid asken, stående mobil under.
  Trycker man på en tärning sparas den: den lyfts upp i raden, får en kant i spelarens färg och ett litet lås. Trycker man igen släpps den. Sparade tärningar ligger kvar vid nästa kast. Bara de andra hälls i bägaren.
- **Spänning:**
  - Tärningar med samma siffra lyser upp lite när de landar.
  - Ligger fyra lika och den femte rullar fortfarande, saktar den sista ner. Det blir en kort trumvirvel, sedan jubel eller ett "nästan"-ljud.
  - Yatzy ger fyrverkeri, rösten säger "Yatzy!" och skärmen skakar lite.
  - Stor stege, Kåk och bonus får egna små firanden och repliker.
- **Kast kvar:** tre prickar visar kasten. Efter tredje kastet går det bara att välja en rad.
- Ett tryck under kastet snabbspolar till slutläget.

### Tur och Robo
- Nytt i turen: en turbanner med figur och namn, och blocket byter till nästa spelare med en sidvändning som på ett papper.
- **Robo** spelar enligt sin nivå (se "Datorns nivåer och omgångar"). Den visar sina kast i lagom takt, och man kan trycka för att snabbspola.

### Ljud, röst och musik
- Ljudeffekter: återanvänd `sfx` i `shared/audio.js`. Lägg till nya ljud där vid behov, till exempel skrammel, tippning, flera studsar, "nästan" och sparad tärning.
- Musik: `MENU_SONG` i menyn. Under spelet en ny, lugn originallåt för Yatzy, samma sorts låt som i `songs.js`. Blåbärsjaktens låtar finns också att välja i ljudpanelen.
- **Repliker med berättarrösten:**
  - Din tur, skaka bägaren!
  - Två kast kvar / Sista kastet!
  - Välj en rad.
  - Yatzy!
  - Kåk!
  - Stor stege! / Liten stege!
  - Fyrtal!
  - Bonus, femtio poäng!
  - Vill du stryka raden?
  - Nu är det Robos tur.
  - Grattis till vinnaren! / Det blev lika!
  - Reglerna i sin helhet.

  Rösterna görs med `scripts/make-voices-eleven.mjs`, med samma berättarröst som tidigare. Spelaren hör dem bara när "berättaren" är på i inställningarna, som i Blåbärsjakten.

### Spara pågående match
Det här är mitt förslag. En match kan ta 20–30 minuter.
Matchen sparas därför efter varje ifylld rad, i `localStorage`.
När man öppnar spelet igen frågar det "Fortsätta förra matchen?".

### Datorns nivåer och omgångar
Enligt README ska alla spel ha samma nivåer och omgångar som Fyra i rad. Yatzy följer det:
- **Robo har tre nivåer: Lätt, Medel och Svår.** De visas med 1–3 robothuvuden, som i `fyrairad/game.js`.
  - *Lätt* sparar enkelt och väljer ofta en sämre rad.
  - *Medel* spelar rimligt.
  - *Svår* sparar och väljer smart utifrån förväntade poäng.
- **"Först till" 1, 2 eller 3 vunna matcher.** Färre val än i Fyra i rad, eftersom en Yatzy-match är lång. Vunna matcher visas vid spelarens poäng och sparas tillsammans med matchen.
- Valen sparas i Yatzys egen nyckel, `yatzy-prefs`, som `fyra-prefs`.

## Delad kod (mitt beslut)
Fyra i rad, Memory och Fia med knuff har var sin egen kopia av "Välj spelare" och figurskaparen.
Yatzy gör likadant och bryter alltså inget i de andra spelen:
- **"Välj spelare" och figurskaparen** kopieras från ett av de andra spelen. Namn och figurer läses från och sparas i den gemensamma nyckeln `bbj-players`. Spara alltid genom att slå ihop med det som redan finns där (`{ ...gammalt, names, looks, count, bot, botName }`), precis som Fia med knuff gör.
- **Tärningskuben och fysiken** kopieras från Blåbärsjakten (`simulateThrow`, `throwDice`, `FACE`, `PIPS`) och byggs ut till fem tärningar, kollision mellan dem och asken som gräns.
- **Podiet och fyrverkeriet** kopieras.
- Att flytta allt detta till `www/shared/` för alla fem spelen är ett eget, senare jobb.

### Var inställningarna sparas (mitt beslut)
- **Hjälpnivån sparas per plats**, alltså spelare 1–4, i `yatzy-prefs`. Den följer platsen precis som namn och figurer gör idag.
- **En sparad match har en egen kopia** av namn, figurer, hjälpnivå, nivå och "först till". Ändras något i ett annat spel under tiden påverkas inte den pågående matchen.

## Filer
- `www/games/yatzy/`: `index.html`, `game.js`, `game.css`, `logic.js` (regler och poäng, utan något med skärmen att göra), `songs.js` och `voice/`.
- `www/index.html`: en rad i `GAMES` med en egen SVG-bild, till exempel fem tärningar.
- `test/yatzy.test.js`: testar poängen för alla rader, kantfall som fem lika och Kåk, bonusen, stjärnregeln och vinnaren. Läggs till i `npm test`.

## Lämnas till byggaren
- Exakt layout och mått på blocket, asken och raden med sparade tärningar, så länge det fungerar på platta och mobil.
- Exakt utseende på bägaren och asken: material och färg i Blåbärsjaktens stil.
- Hur kollisionen mellan tärningarna räknas, så länge den är lätt och ser trovärdig ut.
- Robos exakta strategi och stjärnregeln i detalj, inom ramarna ovan.
- Melodin i Yatzy-låten.
- Exakta texter i reglerna.
