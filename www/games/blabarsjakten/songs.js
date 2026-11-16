// Blåbärsjaktens egna låtar (originalmusik). Spelas av shared/music.js.
// Melodin skrivs i åttondelar: 8 toner per takt. '.' = paus, '-' = håll kvar tonen.
export const SONGS = {
  // Temalåten: glad och studsig, med syntmelodi, arpeggio och trummor.
  theme: {
    name: 'Blåbärsjakten',
    bpm: 124,
    chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
    lead: `E5 G5 C6 G5 A5 G5 E5 .
           D5 G5 B5 G5 A5 G5 D5 .
           C5 E5 A5 G5 E5 C5 D5 E5
           F5 - A5 - G5 - E5 -
           E5 G5 C6 G5 A5 G5 E5 G5
           B5 - A5 G5 D5 - G5 -
           A5 G5 F5 E5 D5 C5 D5 E5
           D5 - - - G4 - . .`,
    leadWave: 'square', arp: 'up', bass: 'eighth', echo: 0.25,
    drums: 'k.h.s.h.k.h.s.hh',
  },
  // Lugn promenad genom skogen.
  walk: {
    name: 'Skogspromenad',
    bpm: 100,
    chords: ['G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'D'],
    lead: `B4 - D5 - G5 - F#5 E5
           E5 - - - D5 - B4 -
           C5 - E5 - G5 - E5 -
           D5 - - - A4 - - -
           B4 - D5 - G5 - A5 B5
           G5 - E5 - D5 - B4 -
           E5 - D5 - C5 - A4 -
           B4 - A4 - G4 - - -`,
    leadWave: 'triangle', leadVol: 0.09, arp: 'pluck', bass: 'long', echo: 0.35,
    drums: 'k.......h...k...',
  },
  // Drömsk och vacker: harpliknande arpeggio och mjuk melodi med eko.
  lullaby: {
    name: 'Ugglans vaggvisa',
    bpm: 80,
    chords: ['F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C'],
    lead: `A5 - - - C6 - - -
           E5 - - - A5 - G5 -
           F5 - - - D5 - - -
           E5 - G5 - C6 - - -
           D6 - C6 - A5 - - -
           F5 - G5 - A5 - Bb5 -
           A5 - - - F5 - - -
           G5 - - - - - - -`,
    leadWave: 'sine', leadVol: 0.1, arp: 'harp', pad: true, bass: 'long', echo: 0.55,
  },
  // Snabb retro-synthpop med pumpande bas.
  fox: {
    name: 'Rävens äventyr',
    bpm: 138,
    chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'E'],
    lead: `A5 . C6 . E6 . C6 A5
           A5 . C6 . F6 . E6 C6
           G5 . C6 . E6 . G6 E6
           D6 . B5 . G5 . B5 D6
           E6 - D6 C6 B5 C6 A5 .
           C6 - B5 A5 G5 A5 F5 .
           B5 - A5 G5 D6 - B5 .
           G#5 - B5 - E6 - - .`,
    leadWave: 'square', leadVol: 0.065, arp: 'up', bass: 'pump', echo: 0.2,
    drums: 'k.h.s.hkk.h.s.hh',
  },
};
