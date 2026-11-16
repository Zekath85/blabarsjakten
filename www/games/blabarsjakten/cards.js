// Alla kort i Blåbärsjakten. Lägg till ett kort = lägg till en rad, och kör "npm run voices".
// Effekter: gain n, lose n, all n (alla får/förlorar), move n (+fram/-bak), again,
// takeFromEach n, giveToPoorest n, giveToEach n, richToPoor n, none.
// Räven är busig och lite elak: hans kort tar nästan alltid något. Bara ibland klarar man sig.

export const FIGURES = {
  // ponytail: små röstskillnader, stora låter robot. Riktiga röster per figur = inspelade ljudfiler.
  fox:      { name: 'Räven Rask',      kind: 'Busiga kort', color: '#f08a24', voice: { pitch: 1.08, rate: 1.0 } },
  owl:      { name: 'Ugglan Ulla',     kind: 'Snälla kort', color: '#8e6cc9', voice: { pitch: 1.1,  rate: 0.92 } },
  squirrel: { name: 'Ekorren Kvick',   kind: 'Snabba kort', color: '#3a8ee6', voice: { pitch: 1.15, rate: 1.08 } },
  hedgehog: { name: 'Igelkotten Pigg', kind: 'Kloka kort',  color: '#5bb04a', voice: { pitch: 0.95, rate: 0.92 } },
};
// Det gyllene kortet: sällsynt och extra bra. Har ingen egen ruta eller hög.
export const GOLDEN = { name: 'Gyllene kortet', color: '#f4b400', voice: { pitch: 1.1, rate: 0.95 } };

const c = (text, type, n) => ({ text, effect: { type, n } });

export const DECKS = {
  fox: [
    c('Räven Rask smög fram och nallade en korg från dig!', 'lose', 1),
    c('Räven Rask hittade ditt gömställe. Han tar två korgar.', 'lose', 2),
    c('Oj då! Räven Rask lurade dig med ett trolleritrick. Du förlorar tre korgar.', 'lose', 3),
    c('Räven Rask har smaskat blåbär hos alla. Alla spelare förlorar en korg.', 'all', -1),
    c('Räven Rask satte upp en falsk skylt. Gå två steg bakåt.', 'move', -2),
    c('Räven Rask pekar åt fel håll! Gå tre steg bakåt.', 'move', -3),
    c('Räven Rask grävde en grop. Du ramlade i och tappade en korg.', 'lose', 1),
    c('Räven Rask härmade en uggla och lurade dig. Du förlorar två korgar.', 'lose', 2),
    c('Räven Rask gömde din karta. Gå ett steg bakåt.', 'move', -1),
    c('Räven Rask lurade dig att bjuda alla på blåbär. Ge en korg till varje spelare.', 'giveToEach', 1),
    c('Räven Rask klädde ut sig till Ugglan Ulla och lånade två korgar. Han lämnade aldrig tillbaka dem!', 'lose', 2),
    c('Räven Rask knöt ihop dina skosnören. Du snubblar fyra steg bakåt.', 'move', -4),
    c('Räven Rask kittlade dig med svansen så att du tappade en korg.', 'lose', 1),
    c('Räven Rask smög in i allas förråd i natt. Alla spelare förlorar två korgar.', 'all', -2),
    c('Räven Rask har grävt en hemlig tunnel rakt in i ditt förråd. Han tar tre korgar!', 'lose', 3),
    c('Räven Rask skrek BU bakom en sten! Du blev så rädd att du sprang två steg bakåt.', 'move', -2),
    c('Räven Rask försökte lura dig, men du var smartare! Ingenting händer.', 'none'),
    c('Räven Rask hittade inga korgar idag. Han går hem och surar. Puh!', 'none'),
  ],
  owl: [
    c('Ugglan Ulla har plockat blåbär åt dig. Du får två korgar.', 'gain', 2),
    c('Ugglan Ulla bjuder på blåbärspaj. Du får en korg.', 'gain', 1),
    c('Ugglan Ulla har sparat korgar i sitt träd. Du får tre!', 'gain', 3),
    c('Ugglan Ulla har kokat sylt till alla. Alla spelare får en korg.', 'all', 1),
    c('Ugglan Ulla flyger dig en bit på vägen. Gå två steg framåt.', 'move', 2),
    c('Ugglan Ulla har stickat en varm mössa åt dig. Du får två korgar.', 'gain', 2),
    c('Ugglan Ulla visar dig en hemlig blåbärsglänta. Du får två korgar.', 'gain', 2),
    c('Ugglan Ulla läser en saga för alla. Alla spelare får en korg och en kram.', 'all', 1),
    c('Ugglan Ulla har bakat blåbärsmuffins. Du får en korg.', 'gain', 1),
    c('Ugglan Ulla lyser upp stigen med sin lykta. Gå tre steg framåt.', 'move', 3),
    c('Ugglan Ulla hittade dina tappade korgar i gräset. Du får två korgar.', 'gain', 2),
    c('Ugglan Ulla har kalas för hela skogen. Alla spelare får två korgar.', 'all', 2),
    c('Ugglan Ulla blinkar klokt och säger: försök en gång till! Slå tärningen igen.', 'again'),
    c('Ugglan Ulla har sytt en stor ficka åt dig. Den rymmer tre korgar!', 'gain', 3),
    c('Ugglan Ulla sjunger en vaggvisa. Du sover gott och vaknar med en korg.', 'gain', 1),
  ],
  squirrel: [
    c('Ekorren Kvick drar dig med i full fart! Gå tre steg framåt.', 'move', 3),
    c('Ekorren Kvick hoppar mellan träden. Gå två steg framåt.', 'move', 2),
    c('Ekorren Kvick ger dig en extra tur. Slå tärningen igen!', 'again'),
    c('Ekorren Kvick tappade en nöt i huvudet på dig. Aj! Gå ett steg bakåt.', 'move', -1),
    c('Ekorren Kvick hittade en korg i en ihålig stubbe. Du får den!', 'gain', 1),
    c('Ekorren Kvick visar en genväg. Gå fyra steg framåt!', 'move', 4),
    c('Ekorren Kvick vill tävla! Slå tärningen igen.', 'again'),
    c('Ekorren Kvick sprang åt fel håll. Gå två steg bakåt.', 'move', -2),
    c('Ekorren Kvick puttar dig vänligt framåt. Gå ett steg framåt.', 'move', 1),
    c('Ekorren Kvick har byggt en rutschkana! Åk fem steg framåt.', 'move', 5),
    c('Ekorren Kvick blåser i en visselpipa. Slå tärningen igen!', 'again'),
    c('Ekorren Kvick glömde sina nötter. Ni springer tillbaka tre steg.', 'move', -3),
    c('Ekorren Kvick har gömt korgar uppe i ett träd. Du får två korgar.', 'gain', 2),
    c('Ekorren Kvick lär dig hoppa som en ekorre. Hoppa två steg framåt.', 'move', 2),
    c('Ekorren Kvick råkade välta din korg. Du förlorar en korg.', 'lose', 1),
  ],
  hedgehog: [
    c('Igelkotten Pigg tycker att man ska dela. Ge en korg till den som har minst.', 'giveToPoorest', 1),
    c('Igelkotten Pigg har räknat ut var blåbären växer. Du får två korgar.', 'gain', 2),
    c('Igelkotten Pigg byggde en fälla för Räven Rask. Alla andra ger dig en korg som tack.', 'takeFromEach', 1),
    c('Igelkotten Pigg lär dig räkna till tio. Bra jobbat! Du får en korg.', 'gain', 1),
    c('Igelkotten Pigg har uppfunnit en blåbärsplockare! Du får tre korgar.', 'gain', 3),
    c('Igelkotten Pigg säger: den som har mest ger en korg till den som har minst.', 'richToPoor', 1),
    c('Igelkotten Pigg ritar en karta åt dig. Gå två steg framåt.', 'move', 2),
    c('Igelkotten Pigg tar en tupplur. Ingenting händer.', 'none'),
    c('Igelkotten Pigg vill att alla ska ha det bra. Den som har mest ger två korgar till den som har minst.', 'richToPoor', 2),
    c('Igelkotten Pigg har lagat allas cyklar. Alla andra ger dig en korg som tack.', 'takeFromEach', 1),
    c('Igelkotten Pigg har odlat blåbär i sin trädgård. Du får två korgar.', 'gain', 2),
    c('Igelkotten Pigg visar en kortare väg genom skogen. Gå tre steg framåt.', 'move', 3),
    c('Igelkotten Pigg frågar om du kan dela med dig. Ge två korgar till den som har minst.', 'giveToPoorest', 2),
    c('Igelkotten Pigg bjuder alla på te och kakor. Alla spelare får en korg.', 'all', 1),
    c('Igelkotten Pigg har hittat en fyrklöver. Det betyder tur! Du får en korg.', 'gain', 1),
  ],
  golden: [
    c('Du hittade det gyllene kortet! En hel hink full med blåbär. Du får fem korgar!', 'gain', 5),
    c('Det gyllene kortet glittrar och gnistrar! Du får fyra korgar.', 'gain', 4),
    c('Det gyllene kortet! En regnbåge visar vägen. Gå fem steg framåt.', 'move', 5),
    c('Det gyllene kortet! Hela skogen har fest. Alla spelare får två korgar.', 'all', 2),
    c('Det gyllene kortet! En stjärna föll ner i din korg. Du får tre korgar.', 'gain', 3),
    c('Det gyllene kortet! Ett stjärnfall ger dig tur. Slå tärningen igen!', 'again'),
  ],
};

// Varje kort vet vilken hög det hör till (används för röst och utseende).
for (const [deck, list] of Object.entries(DECKS)) list.forEach(card => (card.deck = deck));
