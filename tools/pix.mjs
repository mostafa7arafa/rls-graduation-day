// Tiny pixel-art toolkit: an RGBA grid you paint with palette keys, plus a PNG encoder.
// Everything the game shows is baked by tools/bake-art.mjs into public/assets/*.png.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function hex(h) {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

export class Grid {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.px = new Array(w * h).fill(null); // each cell: [r,g,b,a] or null
  }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.px[y * this.w + x]; }
  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = typeof c === 'string' ? hex(c) : c;
  }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  hline(x0, x1, y, c) { for (let x = x0; x <= x1; x++) this.set(x, y, c); }
  vline(x, y0, y1, c) { for (let y = y0; y <= y1; y++) this.set(x, y, c); }
  // spans: {row: [x0, x1]} — fills each row between x0..x1 inclusive
  spans(map, c, dy = 0, dx = 0) { for (const [y, [a, b]] of Object.entries(map)) this.hline(a + dx, b + dx, +y + dy, c); }
  // paint only where something already exists (used for shading inside a silhouette)
  setIf(x, y, c) { if (this.get(x, y)) this.set(x, y, c); }
  // draw an ASCII stamp using a key->color map; '.' and ' ' are skipped
  stamp(x, y, rows, pal) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (pal[ch]) this.set(x + i, y + j, pal[ch]); }));
  }
  // 1px outline around the silhouette (4-neighbourhood), classic sprite look
  outline(c) {
    const col = hex(c), add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y]);
    }
    add.forEach(([x, y]) => this.set(x, y, col));
    return this;
  }
  flipX() {
    const g = new Grid(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) g.px[y * this.w + (this.w - 1 - x)] = this.get(x, y);
    return g;
  }
  blit(src, ox, oy) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const c = src.get(x, y); if (c) this.set(ox + x, oy + y, c); }
  }
}

// Deterministic RNG so baked art is identical on every run
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Pack frames left-to-right into one sheet (optionally wrapping into rows)
export function sheet(frames, cols = frames.length) {
  const fw = frames[0].w, fh = frames[0].h, rows = Math.ceil(frames.length / cols);
  const g = new Grid(fw * cols, fh * rows);
  frames.forEach((f, i) => g.blit(f, (i % cols) * fw, Math.floor(i / cols) * fh));
  return g;
}

export function scale(g, k) {
  const out = new Grid(g.w * k, g.h * k);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.px[y * out.w + x] = g.get(Math.floor(x / k), Math.floor(y / k));
  return out;
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

export function writePNG(path, g, bg = null) {
  const raw = Buffer.alloc((g.w * 4 + 1) * g.h);
  for (let y = 0; y < g.h; y++) {
    raw[y * (g.w * 4 + 1)] = 0;
    for (let x = 0; x < g.w; x++) {
      const c = g.get(x, y) || bg || [0, 0, 0, 0];
      raw.set(c, y * (g.w * 4 + 1) + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(g.w, 0); ihdr.writeUInt32BE(g.h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]));
}
