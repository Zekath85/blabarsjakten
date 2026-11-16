// Alla kort i Blåbärsjakten. Lägg till ett kort = lägg till en rad.
// Effekter: gain n, lose n, all n (alla får/förlorar), move n (+fram/-bak), again,
// takeFromEach n, giveToPoorest n, richToPoor n, none.

export const FIGURES = {
  // ponytail: små röstskillnader, stora låter robot. Riktiga röster per figur = inspelade ljudfiler.
  fox:      { name: 'Räven Rask',      kind: 'Busiga kort', color: '#f08a24', voice: { pitch: 1.08, rate: 1.0 } },
  owl:      { name: 'Ugglan Ulla',     kind: 'Snälla kort', color: '#8e6cc9', voice: { pitch: 1.1,  rate: 0.92 } },
  squirrel: { name: 'Ekorren Kvick',   kind: 'Snabba kort', color: '#3a8ee6', voice: { pitch: 1.15, rate: 1.08 } },
  hedgehog: { name: 'Igelkotten Pigg', kind: 'Kloka kort',  color: '#5bb04a', voice: { pitch: 0.95, rate: 0.92 } },
};

const c = (text, type, n) => ({ text, effect: { type, n } });

export const DECKS = {
  fox: [
    c('Räven Rask smög fram och nallade en korg från dig!', 'lose', 1),
    c('Räven Rask hittade ditt gömställe. Han tar två korgar.', 'lose', 2),
    c('Oj då! Räven Rask lurade dig med ett trolleritrick. Du förlorar tre korgar.', 'lose', 3),
    c('Räven Rask har smaskat blåbär hos alla. Alla spelare förlorar en korg.', 'all', -1),
    c('Räven Rask satte upp en falsk skylt. Gå två steg bakåt.', 'move', -2),
    c('Räven Rask pekar åt fel håll! Gå tre steg bakåt.', 'move', -3),
    c('Räven Rask snubblade på sin egen svans och tappade en korg. Den får du!', 'gain', 1),
    c('Räven Rask tog en korg från dig, men tappade den i bäcken. Plask!', 'lose', 1),
    c('Räven Rask vill byta. Han tar två korgar och ger dig en kotte.', 'lose', 2),
    c('Räven Rask somnade i solen. Ingenting händer. Puh!', 'none'),
    c('Räven Rask gömde din karta. Gå ett steg bakåt.', 'move', -1),
    c('Räven Rask grävde en grop. Du ramlade i och tappade en korg.', 'lose', 1),
    c('Räven Rask härmade en uggla och lurade dig. Du förlorar två korgar.', 'lose', 2),
    c('Räven Rask hittade inga korgar idag. Han går hem och surar. Du får behålla allt!', 'none'),
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
  ],
};
