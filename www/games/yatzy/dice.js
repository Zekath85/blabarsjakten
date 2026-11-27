// Kastet i asken: fem tärningar räknas ut i förväg, 60 steg per sekund (samma idé som simulateThrow i Blåbärsjakten).
// Tärningarna studsar mot askens kanter och mot varandra. Siffran är redan slumpad: startRotation vrider
// tärningen från början så att den stannar med rätt sida uppåt.
export const DT = 1 / 60;
export const FACE = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 5: [-90, 0], 2: [90, 0] };
const CAP = 150; // efter 2,5 s bromsas allt hårt

// starts: [{ x, y, vx, vy }] i askens koordinater. tray: { l, t, r, b }. size: tärningens bredd.
export function simulateTray(starts, tray, size, rnd) {
  const h = size / 2, box = { l: tray.l + h, r: tray.r - h, t: tray.t + h, b: tray.b - h };
  const ds = starts.map(s => ({ ...s, z: 40 + rnd() * 40, vz: 150 + rnd() * 200, rx: 0, ry: 0, spin: 0.9 + rnd() * 0.4 }));
  const frames = ds.map(() => []);
  const still = d => d.z === 0 && d.vz === 0 && Math.hypot(d.vx, d.vy) < 30;
  for (let i = 0; i < CAP + 30; i++) {
    const knock = ds.map(() => 0);
    ds.forEach((d, k) => {
      d.vz -= 2300 * DT; d.z += d.vz * DT;
      if (d.z <= 0) {
        d.z = 0;
        if (d.vz < -140 && i < CAP) { knock[k] = Math.min(1, -d.vz / 1000); d.vz = -d.vz * 0.42; d.vx *= 0.78; d.vy *= 0.78; }
        else d.vz = 0;
      }
      const fr = i >= CAP ? 0.75 : d.z === 0 && d.vz === 0 ? Math.pow(0.12, DT) : 1; // rullar och bromsar in
      d.vx *= fr; d.vy *= fr;
      d.x += d.vx * DT; d.y += d.vy * DT;
      if (d.x < box.l) { d.x = box.l; d.vx = Math.abs(d.vx) * 0.6; knock[k] ||= 0.3; }
      if (d.x > box.r) { d.x = box.r; d.vx = -Math.abs(d.vx) * 0.6; knock[k] ||= 0.3; }
      if (d.y < box.t) { d.y = box.t; d.vy = Math.abs(d.vy) * 0.6; knock[k] ||= 0.3; }
      if (d.y > box.b) { d.y = box.b; d.vy = -Math.abs(d.vy) * 0.6; knock[k] ||= 0.3; }
    });
    // Tärningar som krockar: skjut isär och byt fart längs linjen mellan dem.
    for (let a = 0; a < ds.length; a++) for (let b = a + 1; b < ds.length; b++) {
      const A = ds[a], B = ds[b], dx = B.x - A.x, dy = B.y - A.y, dist = Math.hypot(dx, dy) || 0.01;
      if (dist >= size) continue;
      const nx = dx / dist, ny = dy / dist, push = (size - dist) / 2;
      A.x -= nx * push; A.y -= ny * push; B.x += nx * push; B.y += ny * push;
      const va = A.vx * nx + A.vy * ny, vb = B.vx * nx + B.vy * ny;
      if (va - vb > 0) {
        A.vx += (vb - va) * nx * 0.8; A.vy += (vb - va) * ny * 0.8;
        B.vx += (va - vb) * nx * 0.8; B.vy += (va - vb) * ny * 0.8;
        knock[a] ||= Math.min(1, (va - vb) / 800); knock[b] ||= knock[a];
      }
    }
    ds.forEach((d, k) => {
      d.x = Math.min(box.r, Math.max(box.l, d.x)); d.y = Math.min(box.b, Math.max(box.t, d.y));
      d.rx -= d.vy * 0.94 * d.spin * DT + (d.z > 0 ? d.vz * 0.15 * DT : 0);
      d.ry += d.vx * 0.94 * d.spin * DT;
      frames[k].push({ x: d.x, y: d.y, z: d.z, rx: d.rx, ry: d.ry, knock: knock[k] });
    });
    if (ds.every(still)) break;
  }
  // Sista finputsen: ligger två tärningar för nära varandra glider de isär under några rutor.
  const end = ds.map(d => ({ x: d.x, y: d.y }));
  for (let it = 0; it < 60; it++) {
    let moved = false;
    for (let a = 0; a < end.length; a++) for (let b = a + 1; b < end.length; b++) {
      const A = end[a], B = end[b], dx = B.x - A.x, dy = B.y - A.y, dist = Math.hypot(dx, dy) || 0.01;
      if (dist >= size) continue;
      const nx = dx / dist, ny = dy / dist, push = (size - dist) / 2 + 0.5;
      A.x -= nx * push; A.y -= ny * push; B.x += nx * push; B.y += ny * push;
      for (const P of [A, B]) { P.x = Math.min(box.r, Math.max(box.l, P.x)); P.y = Math.min(box.b, Math.max(box.t, P.y)); }
      moved = true;
    }
    if (!moved) break;
  }
  const extra = end.some((e, k) => e.x !== ds[k].x || e.y !== ds[k].y) ? 6 : 0;
  for (let s = 1; s <= extra; s++) ds.forEach((d, k) => {
    const last = frames[k].at(-1), t = s / extra;
    frames[k].push({ ...last, x: d.x + (end[k].x - d.x) * t, y: d.y + (end[k].y - d.y) * t, knock: 0 });
  });
  return { frames, length: frames[0].length };
}

// Startvridning så att tärningen efter hela rullningen (last) visar face uppåt. Ett par extra varv för rörelsens skull.
export function startRotation(face, last, rnd) {
  return { rx: FACE[face][0] - last.rx + 360 * Math.round(rnd() * 2), ry: FACE[face][1] - last.ry + 360 * Math.round(rnd() * 2) };
}
