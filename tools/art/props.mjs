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
