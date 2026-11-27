// Yatzys egna låtar (originalmusik), lugna och harmoniska: Yatzy är ett tänkarspel.
// Samma format som ../blabarsjakten/songs.js och spelas av shared/music.js.
// Melodin skrivs i åttondelar: 8 toner per takt. '.' = paus, '-' = håll kvar tonen.
export const SONGS = {
  // Stilla och gles, som långsamma pianostycken: få toner, mycket luft.
  kvall: {
    name: 'Stilla kväll',
    bpm: 66,
    chords: ['G', 'D', 'G', 'D', 'Em', 'Bm', 'C', 'D'],
    lead: `F#5 - - - A5 - - -
           A5 - - - F#5 - E5 -
           D5 - - - - - B4 -
           A4 - - - - - - -
           B4 - - - E5 - G5 -
           F#5 - - - D5 - - -
           E5 - - - G5 - C6 -
           B5 - A5 - F#5 - - -`,
    leadWave: 'sine', leadVol: 0.09, arp: 'pluck', bass: 'long', pad: true, echo: 0.5,
  },
  // Mjukt och lite jazzigt, som regn mot fönstret en söndag.
  regn: {
    name: 'Regn på rutan',
    bpm: 76,
    chords: ['Am', 'Dm', 'G', 'C', 'F', 'Dm', 'E', 'Am'],
    lead: `E5 - C5 - D5 E5 . .
           F5 - - - A4 - . .
           D5 - B4 - C5 D5 . .
           E5 - - - G4 - . .
           A4 - C5 - F5 - E5 D5
           D5 - - - F5 - A5 -
           G#5 - - - E5 - D5 B4
           A4 - - - - - . .`,
    leadWave: 'triangle', leadVol: 0.075, arp: 'pluck', bass: 'long', pad: true, echo: 0.45,
    drums: 'k...............',
  },
  // Harpa och pentatonisk melodi, som en lugn trädgård med en damm.
  tradgard: {
    name: 'Trädgården',
    bpm: 70,
    chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'C'],
    lead: `E5 - G5 - A5 - - -
           C6 - A5 - G5 - - -
           A5 - G5 - E5 - D5 -
           D5 - - - - - - -
           E5 - G5 - C6 - D6 -
           E6 - D6 - C6 - A5 -
           G5 - A5 - G5 - E5 D5
           C5 - - - - - - -`,
    leadWave: 'sine', leadVol: 0.08, arp: 'harp', swell: true, bass: 'long', echo: 0.6,
  },
  // En stilla visa vid havet, som en gammal folkmelodi.
  fyren: {
    name: 'Fyren',
    bpm: 84,
    chords: ['D', 'G', 'D', 'A', 'Bm', 'G', 'A', 'D'],
    lead: `A4 - D5 - F#5 - E5 D5
           B4 - D5 - G5 - F#5 E5
           F#5 - - - D5 - A4 -
           E5 - - - - - . .
           F#5 - E5 - D5 - B4 -
           D5 - B4 - G4 - B4 D5
           E5 - F#5 - E5 - C#5 -
           D5 - - - - - . .`,
    leadWave: 'triangle', leadVol: 0.08, arp: 'pluck', bass: 'long', pad: true, echo: 0.4,
  },
};
export const FIRST_SONG = 'kvall';
