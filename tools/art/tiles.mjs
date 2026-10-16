// 16x16 tiles for the school. The ORDER here is the tile index used by src/data/map.ts —
// append new tiles at the end, never reorder.
import { Grid, rng, hex } from '../pix.mjs';

const OUT = '#1b1420';
const T = () => new Grid(16, 16);

function noise(g, base, specks, seed, density = 0.12) {
  const r = rng(seed);
  g.rect(0, 0, 16, 16, base);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (r() < density) g.set(x, y, specks[Math.floor(r() * specks.length)]);
  return g;
}

const grass = (seed, extra) => {
  const g = noise(T(), '#5fa04a', ['#6fb456', '#53903f'], seed, 0.18);
  const r = rng(seed * 7);
  for (let i = 0; i < 3; i++) { const x = 1 + Math.floor(r() * 13), y = 2 + Math.floor(r() * 12); g.set(x, y, '#3f7a33'); g.set(x + 1, y - 1, '#3f7a33'); g.set(x + 2, y, '#3f7a33'); }
  if (extra === 'flowers') [[3, 4, '#f4f0e8'], [11, 9, '#f2c94c'], [6, 12, '#e88e8e'], [13, 3, '#f4f0e8']].forEach(([x, y, c]) => { g.set(x, y, c); g.set(x, y + 1, '#3f7a33'); });
  return g;
};

function pavers(seed, tint = 0) {
  // interlocking courtyard bricks, the classic Egyptian school yard
  const g = T(), a = tint ? '#bfa07a' : '#c8a77a', b = tint ? '#b08f69' : '#b8946a', line = '#9a7a56';
  g.rect(0, 0, 16, 16, a);
  for (let y = 0; y < 16; y += 4) {
    g.hline(0, 15, y + 3, line);
    const off = (y / 4) % 2 ? 4 : 0;
    for (let x = off; x < 16; x += 8) g.vline(x, y, y + 2, line);
    for (let x = off + 1; x < 16; x += 8) g.hline(x, Math.min(15, x + 2), y, b);
  }
  const r = rng(seed); for (let i = 0; i < 4; i++) g.set(Math.floor(r() * 16), Math.floor(r() * 16), b);
  return g;
}

function terrazzo(base, seed) {
  const g = noise(T(), base, ['#d9d4ca', '#a9a296', '#8f887c', '#b5655a'], seed, 0.1);
  g.hline(0, 15, 15, '#a39c90'); g.vline(15, 0, 15, '#a39c90');
  return g;
}

function wallTop() { const g = T(); g.rect(0, 0, 16, 16, '#5b4a52'); g.hline(0, 15, 0, '#6d5b64'); g.hline(0, 15, 15, '#4a3c43'); return g; }

function wallFace(kind = 'plain', outside = false) {
  const g = T();
  const upper = outside ? '#e8cf94' : '#efe1c0', band = outside ? '#c9a86a' : '#4f8f7a', bandS = outside ? '#a8894f' : '#3f7363';
  g.rect(0, 0, 16, 9, upper); g.hline(0, 15, 0, '#d8c8a4');
  g.rect(0, 9, 16, 7, band); g.hline(0, 15, 9, bandS); g.hline(0, 15, 15, bandS);
  if (kind === 'window') { g.rect(3, 2, 10, 9, '#3a3436'); g.rect(4, 3, 8, 7, '#9fd0f0'); g.vline(7, 3, 9, '#3a3436'); g.vline(8, 3, 9, '#3a3436'); g.set(5, 4, '#e6f4fb'); g.set(9, 4, '#e6f4fb'); g.hline(2, 13, 11, '#d8c8a4'); }
  if (kind === 'boardL' || kind === 'boardR') {
    g.rect(0, 2, 16, 9, '#2f4a3a'); g.hline(0, 15, 2, '#5c4433'); g.hline(0, 15, 11, '#5c4433');
    if (kind === 'boardL') { g.vline(0, 2, 11, '#5c4433'); [[3, 5], [4, 5], [5, 5], [7, 5], [8, 5], [3, 7], [4, 7], [6, 7], [7, 7], [8, 7], [9, 7], [11, 7]].forEach(([x, y]) => g.set(x, y, '#e8efe6')); }
    else { g.vline(15, 2, 11, '#5c4433'); [[2, 5], [3, 5], [5, 5], [6, 5], [7, 5], [2, 7], [3, 7], [4, 7]].forEach(([x, y]) => g.set(x, y, '#e8efe6')); g.rect(10, 9, 3, 1, '#f4f0e8'); }
  }
  if (kind === 'notice') { g.rect(2, 1, 12, 9, '#a87b4f'); g.rect(3, 2, 4, 3, '#f4f0e8'); g.rect(8, 2, 5, 4, '#f2c94c'); g.rect(4, 6, 5, 3, '#e88e8e'); g.set(5, 2, '#c23b3b'); g.set(10, 2, '#c23b3b'); }
  if (kind === 'shelf') { g.rect(1, 0, 14, 16, '#7a5232'); for (const y of [1, 6, 11]) { const r = rng(y); for (let x = 2; x < 14; x++) g.vline(x, y, y + 3, ['#c23b3b', '#2f6fc2', '#3e9a4f', '#f2c94c', '#8a5a36'][Math.floor(r() * 5)]); } }
  if (kind === 'doorShut') { g.rect(2, 1, 12, 15, '#7a5232'); g.rect(3, 2, 10, 14, '#8f6440'); g.rect(4, 3, 8, 4, '#9fd0f0'); g.set(11, 9, '#f2c94c'); }
  if (kind === 'cooler') { g.rect(4, 3, 8, 13, '#d8dde3'); g.rect(4, 3, 8, 2, '#4a7fc0'); g.set(6, 8, '#2f6fc2'); g.set(9, 8, '#c23b3b'); g.hline(5, 10, 14, '#9aa2ab'); }
  return g;
}

function deskStudent() { // the long wooden bench-desk every Egyptian student remembers
  const g = T(); g.rect(0, 2, 16, 7, '#9a6a3e'); g.hline(0, 15, 2, '#b8834f'); g.hline(0, 15, 8, '#7a5232');
  g.rect(1, 9, 2, 5, '#5c3d24'); g.rect(13, 9, 2, 5, '#5c3d24'); g.rect(0, 12, 16, 3, '#7a5232'); g.hline(0, 15, 12, '#8f6440');
  g.set(5, 4, '#3a3436'); g.set(6, 5, '#3a3436'); // carved initials
  return g;
}
function deskTeacher(part) {
  const g = T(); g.rect(0, 1, 16, 12, '#7a5232'); g.hline(0, 15, 1, '#9a6a3e'); g.rect(0, 13, 16, 2, '#5c3d24');
  if (part === 'L') { g.rect(3, 3, 6, 4, '#f4f0e8'); g.hline(4, 7, 4, '#9aa2ab'); g.hline(4, 6, 5, '#9aa2ab'); }
  else { g.rect(6, 3, 3, 3, '#3a3436'); g.set(7, 2, '#4fbf4a'); g.set(10, 4, '#f4f0e8'); g.set(11, 4, '#f4f0e8'); }
  return g;
}

function fence(vertical) {
  const g = T();
  if (!vertical) { g.hline(0, 15, 4, '#2f6a4a'); g.hline(0, 15, 12, '#2f6a4a'); for (let x = 1; x < 16; x += 3) { g.vline(x, 2, 14, '#3f8a5f'); g.set(x, 1, '#2f6a4a'); } }
  else { g.vline(6, 0, 15, '#3f8a5f'); g.vline(9, 0, 15, '#3f8a5f'); for (let y = 1; y < 16; y += 3) g.hline(6, 9, y, '#2f6a4a'); }
  return g;
}
function gate(side) {
  const g = T(); g.rect(0, 0, 16, 16, '#3a3436');
  for (let x = side === 'L' ? 1 : 0; x < 16; x += 3) g.vline(x, 1, 15, '#7a7f8a');
  g.hline(0, 15, 1, '#9aa2ab'); g.hline(0, 15, 8, '#9aa2ab');
  if (side === 'R') { g.vline(0, 0, 15, '#2a2026'); g.rect(0, 7, 3, 4, '#f2c94c'); g.set(1, 9, '#3a3436'); } // padlock
  return g;
}
function road(line) { const g = noise(T(), '#4a4a52', ['#55555e', '#3f3f46'], line ? 9 : 4, 0.15); if (line) g.rect(2, 7, 7, 2, '#e8d27a'); return g; }
function sand() { return noise(T(), '#e3c98e', ['#d4b878', '#efd9a4'], 31, 0.2); }
function turf(stripe) { const g = T(); g.rect(0, 0, 16, 16, stripe ? '#3f9a4a' : '#47a552'); const r = rng(stripe ? 3 : 5); for (let i = 0; i < 10; i++) g.set(Math.floor(r() * 16), Math.floor(r() * 16), '#378a41'); return g; }
function pot() { const g = pavers(77); g.rect(4, 9, 8, 6, '#b5553a'); g.hline(3, 12, 9, '#c96a4a'); g.rect(3, 2, 10, 7, '#3f8a3a'); g.set(5, 1, '#3f8a3a'); g.set(9, 1, '#4fa046'); g.set(6, 4, '#5fb455'); g.set(10, 5, '#5fb455'); return g; }
function counter() { const g = T(); g.rect(0, 0, 16, 16, '#c9c3b8'); g.rect(0, 2, 16, 10, '#3f8a5f'); g.hline(0, 15, 2, '#e3d6c0'); g.hline(0, 15, 3, '#e3d6c0'); g.rect(0, 12, 16, 2, '#2f6a4a'); g.rect(3, 4, 4, 3, '#e8b86a'); g.rect(9, 4, 4, 3, '#e8b86a'); g.hline(3, 6, 5, '#a8743a'); g.hline(9, 12, 5, '#a8743a'); return g; }
function cabinet() { const g = T(); g.rect(1, 0, 14, 16, '#8a8f99'); g.vline(8, 0, 15, '#6b6f7a'); for (const y of [3, 8, 13]) { g.hline(1, 14, y + 2, '#6b6f7a'); g.hline(3, 5, y, '#d8dde3'); g.hline(10, 12, y, '#d8dde3'); } return g; }
function bench() { const g = pavers(12); g.rect(0, 5, 16, 4, '#9a6a3e'); g.hline(0, 15, 5, '#b8834f'); g.rect(1, 9, 2, 4, '#3a3436'); g.rect(13, 9, 2, 4, '#3a3436'); return g; }
function curb() { const g = grass(55); g.rect(0, 13, 16, 3, '#b8a68a'); g.hline(0, 15, 13, '#d0bfa0'); return g; }
function doorway() { const g = terrazzo('#bfb8ab', 61); g.rect(0, 0, 16, 3, '#7a5232'); return g; }
function tabletop() { const g = terrazzo('#c4bfb4', 71); g.rect(1, 3, 14, 9, '#8a5a36'); g.hline(1, 14, 3, '#a87b4f'); g.rect(3, 5, 4, 3, '#f4f0e8'); g.rect(9, 5, 3, 4, '#1b1420'); g.set(10, 6, '#4f8f7a'); return g; }
function rug() { const g = T(); g.rect(0, 0, 16, 16, '#9c3b3b'); g.rect(1, 1, 14, 14, '#b54848'); g.rect(4, 4, 8, 8, '#d8b25a'); g.rect(6, 6, 4, 4, '#9c3b3b'); return g; }

export const TILES = [
  ['void', () => { const g = T(); g.rect(0, 0, 16, 16, '#1b1420'); return g; }],
  ['grass', () => grass(1)], ['grass2', () => grass(2)], ['flowers', () => grass(3, 'flowers')],
  ['pavers', () => pavers(1)], ['pavers2', () => pavers(2, 1)], ['sand', sand],
  ['floor', () => terrazzo('#c9c3b8', 11)], ['floor2', () => terrazzo('#c4bfb4', 13)], ['doorway', doorway],
  ['wallTop', wallTop], ['wall', () => wallFace()], ['wallWin', () => wallFace('window')],
  ['boardL', () => wallFace('boardL')], ['boardR', () => wallFace('boardR')], ['notice', () => wallFace('notice')],
  ['fenceH', () => fence(false)], ['fenceV', () => fence(true)], ['gateL', () => gate('L')], ['gateR', () => gate('R')],
  ['desk', deskStudent], ['tdeskL', () => deskTeacher('L')], ['tdeskR', () => deskTeacher('R')],
  ['road', () => road(false)], ['roadLine', () => road(true)], ['pot', pot],
  ['shelf', () => wallFace('shelf')], ['counter', counter], ['cooler', () => wallFace('cooler')],
  ['doorShut', () => wallFace('doorShut')], ['outWall', () => wallFace('plain', true)], ['outWin', () => wallFace('window', true)],
  ['turf', () => turf(false)], ['turf2', () => turf(true)], ['bench', bench], ['curb', curb], ['cabinet', cabinet],
  ['tabletop', tabletop], ['rug', rug],
];

export function tileset() {
  const cols = 16, rows = Math.ceil(TILES.length / cols);
  const g = new Grid(cols * 16, rows * 16);
  TILES.forEach(([, fn], i) => g.blit(fn(), (i % cols) * 16, Math.floor(i / cols) * 16));
  return g;
}
