// Larger props drawn as single images (y-sorted with characters in-game).
import { Grid, rng } from '../pix.mjs';

const OUT = '#1b1420';

export function court() { // 5-a-side court, 24x15 tiles. The emotional centre of RLS.
  const W = 384, H = 240, g = new Grid(W, H);
  for (let x = 0; x < W; x += 32) g.rect(x, 0, 16, H, '#47a552'), g.rect(x + 16, 0, 16, H, '#3f9a4a');
  const r = rng(9); for (let i = 0; i < 900; i++) g.set(Math.floor(r() * W), Math.floor(r() * H), '#378a41');
  const L = '#eef2e6';
  g.hline(8, W - 9, 8, L); g.hline(8, W - 9, H - 9, L); g.vline(8, 8, H - 9, L); g.vline(W - 9, 8, H - 9, L);
  g.vline(W / 2, 8, H - 9, L);
  for (let a = 0; a < 360; a += 1) { const t = a * Math.PI / 180; g.set(Math.round(W / 2 + Math.cos(t) * 30), Math.round(H / 2 + Math.sin(t) * 30), L); }
  g.rect(W / 2 - 1, H / 2 - 1, 3, 3, L);
  for (const side of [0, 1]) { // penalty areas
    const x0 = side ? W - 9 - 48 : 8, x1 = side ? W - 9 : 8 + 48;
    g.hline(x0, x1, H / 2 - 50, L); g.hline(x0, x1, H / 2 + 50, L); g.vline(side ? x0 : x1, H / 2 - 50, H / 2 + 50, L);
    g.rect(side ? W - 9 - 34 : 8 + 33, H / 2 - 1, 2, 2, L);
  }
  // worn goalmouth patches (Hussein's diving spots)
  for (const cx of [14, W - 15]) for (let i = 0; i < 160; i++) { const x = cx + Math.floor((r() - 0.5) * 18), y = H / 2 + Math.floor((r() - 0.5) * 40); g.set(x, y, '#a88f5c'); }
  return g;
}

export function goal(flip) { // seen from above-front: posts + net
  const g = new Grid(20, 56);
  g.rect(0, 0, 14, 56, null);
  for (let y = 4; y < 52; y += 3) g.hline(flip ? 6 : 2, flip ? 17 : 13, y, '#d8dde3');
  for (let x = 2; x < 18; x += 3) g.vline(x, 4, 51, '#d8dde3');
  const px = flip ? 2 : 15;
  g.rect(px, 0, 3, 56, '#f4f0e8'); g.vline(px + 2, 0, 55, '#c4c8cc');
  g.hline(flip ? 2 : 2, flip ? 17 : 17, 2, '#f4f0e8'); g.hline(2, 17, 53, '#f4f0e8');
  return g.outline(OUT);
}

export function tree(seed) { // Egyptian ficus/ shade tree
  const g = new Grid(36, 48), r = rng(seed);
  g.rect(15, 30, 6, 16, '#6b4426'); g.vline(20, 30, 45, '#4f311b'); g.hline(13, 22, 45, '#4f311b');
  const blobs = [[18, 16, 14], [9, 21, 9], [27, 21, 9], [18, 26, 11], [12, 11, 8], [24, 11, 8]];
  for (const [cx, cy, rad] of blobs) for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++)
    if (x * x + y * y <= rad * rad) g.set(cx + x, cy + y, '#3f8a3a');
  for (let y = 0; y < 48; y++) for (let x = 0; x < 36; x++) {
    const c = g.get(x, y); if (!c || c[1] !== 0x8a) continue;
    const n = r();
    if (y < 14 && n < 0.35) g.set(x, y, '#5fb455'); else if (y > 26 && n < 0.5) g.set(x, y, '#2f6a2e'); else if (n < 0.12) g.set(x, y, '#4fa046');
  }
  return g.outline(OUT);
}

export function swings() {
  const g = new Grid(56, 40);
  g.rect(2, 2, 52, 3, '#c23b3b'); g.hline(2, 53, 2, '#e05050');
  for (const x of [2, 51]) { g.rect(x, 2, 3, 36, '#c23b3b'); g.vline(x + 2, 5, 37, '#9c2e2e'); }
  for (const x of [14, 34]) { g.vline(x, 5, 26, '#7a7f8a'); g.vline(x + 8, 5, 26, '#7a7f8a'); g.rect(x - 1, 27, 11, 3, '#2f6fc2'); g.hline(x - 1, x + 9, 27, '#4a8fe0'); }
  return g.outline(OUT);
}

export function car() { // Karim's car. It is parked INSIDE the school. Nobody knows how.
  const g = new Grid(64, 36);
  g.rect(2, 12, 60, 16, '#e8e8ee'); g.rect(6, 8, 52, 6, '#e8e8ee');
  g.rect(14, 2, 32, 12, '#d8d8e0'); g.rect(17, 4, 12, 8, '#2a3550'); g.rect(31, 4, 12, 8, '#2a3550'); g.set(19, 5, '#8fa8d8'); g.set(33, 5, '#8fa8d8');
  g.hline(2, 61, 20, '#b8b8c4'); g.rect(2, 26, 60, 2, '#9a9aa8');
  g.rect(56, 14, 5, 4, '#f2c94c'); g.rect(3, 14, 4, 4, '#c23b3b');
  for (const x of [10, 44]) { g.rect(x, 24, 10, 10, '#1b1420'); g.rect(x + 3, 27, 4, 4, '#9aa2ab'); }
  g.rect(28, 21, 8, 3, '#f2c94c'); // gold plate. obviously.
  return g.outline(OUT);
}

export function soul() { // the player's "heart" in battle: a tiny RLS student ID card
  const g = new Grid(8, 8);
  g.rect(0, 1, 8, 6, '#f2c94c'); g.rect(1, 2, 3, 3, '#c23b3b'); g.hline(5, 6, 2, '#1b1420'); g.hline(5, 6, 4, '#1b1420');
  return g;
}

export function chalk() { const g = new Grid(4, 8); g.rect(0, 0, 4, 8, '#f4f0e8'); g.vline(3, 0, 7, '#c9c3b8'); return g.outline(OUT); }
export function stickH() { const g = new Grid(64, 4); g.rect(0, 0, 64, 4, '#4fbf4a'); g.hline(0, 63, 0, '#7fe07a'); g.hline(0, 63, 3, '#2f8a2e'); return g.outline(OUT); }
export function cloud() {
  const g = new Grid(24, 16);
  for (const [cx, cy, r] of [[8, 9, 6], [15, 8, 7], [12, 5, 5]]) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) g.set(cx + x, cy + y, '#7fd07a');
  return g;
}
export function sparkle() { const g = new Grid(5, 5); g.vline(2, 0, 4, '#fff6c8'); g.hline(0, 4, 2, '#fff6c8'); g.set(2, 2, '#ffffff'); return g; }
export function sandwich() { const g = new Grid(12, 8); g.rect(0, 2, 12, 5, '#e8b86a'); g.hline(1, 10, 1, '#f0cf8a'); g.hline(1, 10, 4, '#7a5232'); return g.outline(OUT); }
export function key() { const g = new Grid(12, 6); g.rect(0, 0, 5, 5, '#f2c94c'); g.rect(1, 1, 3, 3, null); g.hline(5, 11, 2, '#f2c94c'); g.vline(9, 3, 4, '#f2c94c'); g.vline(11, 3, 4, '#f2c94c'); return g.outline(OUT); }
export function flag() { // morning assembly (taboor) flagpole
  const g = new Grid(28, 64);
  g.rect(2, 2, 2, 60, '#c4c8cc'); g.vline(3, 2, 61, '#8f949a'); g.rect(0, 59, 6, 4, '#7a7f8a'); g.set(2, 1, '#f2c94c'); g.set(3, 1, '#f2c94c');
  g.rect(4, 4, 22, 5, '#c8102e'); g.rect(4, 9, 22, 5, '#f4f0e8'); g.rect(4, 14, 22, 5, '#1b1420');
  g.rect(14, 10, 3, 3, '#c09a3a'); g.set(15, 9, '#c09a3a');
  return g.outline(OUT);
}

export function chain() { // the stairwell, chained shut "since Hussein's 2016 incident"
  const g = new Grid(32, 40);
  for (const x of [1, 29]) { g.rect(x, 0, 2, 40, '#7a7f8a'); g.vline(x + 1, 0, 39, '#5a5f6a'); }
  for (const y0 of [12, 26]) for (let x = 3; x < 29; x += 3) { g.rect(x, y0 + ((x / 3) % 2), 3, 2, '#9aa2ab'); g.set(x + 1, y0 + ((x / 3) % 2), '#d8dde3'); }
  g.rect(12, 14, 8, 10, '#f4f0e8'); g.rect(13, 15, 6, 8, '#c23b3b'); g.hline(14, 17, 18, '#f4f0e8'); // NO ENTRY sign
  return g.outline(OUT);
}

// lab glassware: the glass and the liquid are separate images so the game can tint the liquid
export function flask() {
  const g = new Grid(14, 20);
  g.rect(5, 0, 4, 2, '#c8a070'); // cork
  g.rect(5, 2, 4, 6, '#d8eef8'); g.spans({ 8: [4, 9], 9: [3, 10], 10: [2, 11], 11: [1, 12], 12: [1, 12], 13: [1, 12], 14: [1, 12], 15: [1, 12], 16: [1, 12], 17: [2, 11] }, '#d8eef8');
  g.vline(6, 3, 6, '#ffffff'); g.set(3, 11, '#ffffff'); g.set(3, 12, '#ffffff');
  return g.outline(OUT);
}
export function flaskLiquid() {
  const g = new Grid(14, 20);
  g.spans({ 11: [2, 11], 12: [2, 11], 13: [2, 11], 14: [2, 11], 15: [2, 11], 16: [2, 11], 17: [3, 10] }, '#ffffff');
  g.hline(3, 10, 11, '#e0e0e0');
  return g;
}
export function beaker() {
  const g = new Grid(28, 32);
  g.rect(2, 2, 24, 28, '#d8eef8'); g.hline(0, 27, 2, '#d8eef8'); g.set(0, 1, '#d8eef8');
  g.rect(4, 4, 20, 24, null);
  for (const y of [10, 16, 22]) g.hline(20, 23, y, '#9ab0bc');
  g.vline(5, 4, 26, '#ffffff');
  return g.outline(OUT);
}
export function beakerLiquid() { const g = new Grid(28, 32); g.rect(4, 12, 20, 16, '#ffffff'); g.hline(4, 23, 12, '#e8e8e8'); return g; }

// Hussein's family tractor (faces left). The payoff of the whole game.
export function tractor() {
  const g = new Grid(60, 44);
  drawTractor(g, 0);
  return g.outline(OUT);
}
function drawTractor(g, oy) {
  const G = '#3e9a4f', GS = '#2c7039', GH = '#5fc06a', R = '#c8323a';
  g.rect(8, 16 + oy, 30, 12, G); g.hline(8, 37, 16 + oy, GH); g.hline(8, 37, 27 + oy, GS);   // hood
  g.rect(36, 8 + oy, 16, 20, G); g.hline(36, 51, 8 + oy, GH);                                 // cab body
  g.rect(38, 0 + oy, 2, 10, '#3a3436'); g.rect(50, 0 + oy, 2, 10, '#3a3436'); g.rect(36, 0 + oy, 18, 2, R); // roof frame
  g.rect(14, 8 + oy, 3, 9, '#3a3436'); g.rect(13, 6 + oy, 5, 2, '#5a5f6a');                   // exhaust
  g.rect(5, 18 + oy, 4, 6, '#d8dde3'); g.set(6, 19 + oy, '#f2c94c');                           // grille + light
  // big rear wheel, small front wheel
  for (const [cx, cy, r] of [[44, 32 + oy, 11], [14, 36 + oy, 7]]) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) g.set(cx + x, cy + y, '#2a2026');
    for (let y = -r + 3; y <= r - 3; y++) for (let x = -r + 3; x <= r - 3; x++) if (x * x + y * y <= (r - 3) * (r - 3)) g.set(cx + x, cy + y, '#f2c94c');
    g.rect(cx - 1, cy - 1, 3, 3, '#7a7f8a');
    for (let a = 0; a < 360; a += 30) { const t = a * Math.PI / 180; g.set(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), '#4a4044'); }
  }
  g.rect(33, 18 + oy, 22, 3, R); // mudguard
}
// the same tractor with the three friends riding it (heads + shoulders from their real sprites)
export function tractorRide(sheets) {
  const g = new Grid(60, 56);
  const crop = (name, x0, y0) => { const s = sheets[name]; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = s.get(x, y); if (c) g.set(x0 + x, y0 + y, c); } };
  drawTractor(g, 12);
  crop('hefny', 17, 10); crop('mostafa', 27, 9); crop('hussein', 38, 8); // Hussein drives, obviously
  return g.outline(OUT);
}

export function ball() {
  const g = new Grid(10, 10);
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) if ((x - 4.5) ** 2 + (y - 4.5) ** 2 <= 20) g.set(x, y, '#f4f0e8');
  g.rect(4, 4, 2, 2, '#1b1420'); g.set(1, 4, '#1b1420'); g.set(8, 5, '#1b1420'); g.set(4, 1, '#1b1420'); g.set(5, 8, '#1b1420');
  return g.outline(OUT);
}
export function arrow() { // rhythm-game arrow, pointing right
  const g = new Grid(14, 14);
  g.rect(1, 5, 7, 4, '#f4f0e8'); g.spans({ 1: [7, 8], 2: [7, 9], 3: [7, 10], 4: [7, 11], 5: [7, 12], 6: [7, 12], 7: [7, 12], 8: [7, 12], 9: [7, 11], 10: [7, 10], 11: [7, 9], 12: [7, 8] }, '#f4f0e8');
  return g.outline(OUT);
}
