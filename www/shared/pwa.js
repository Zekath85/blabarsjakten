// Startar offline-läget. Inte på datorn under utveckling, annars syns inte ändringar direkt.
// Sökvägen räknas från den här filen, så den funkar från alla sidor.
if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  navigator.serviceWorker.register(new URL('../sw.js', import.meta.url));
}
