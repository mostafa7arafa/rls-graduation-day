// Character sprites: 16x24 frames, 9 per sheet:
//   0-2 down (idle, stepA, stepB) · 3-5 up · 6-8 side (facing LEFT; flip in-game for right)
// Each character = palette + hair style + face/body extras. Outline is added automatically.
import { Grid } from '../pix.mjs';

const OUT = '#1b1420';

export const CAST = {
  mostafa: {
    skin: '#c98d63', skinS: '#a86d4c', hair: '#2a1d1a', hairH: '#4a3530', eye: '#1b1420',
    shirt: '#3b6fd1', shirtS: '#2a4f9c', pants: '#2d2f45', pantsS: '#1f2033', shoe: '#e9e4da', shoeS: '#b9b2a6',
    mouth: '#7a3b33', hairStyle: 'buzz', face: 'mostafa', body: 'normal', extra: 'hoodie',
  },
  hussein: {
    skin: '#e8b896', skinS: '#c99577', hair: '#2b1c14', hairH: '#5a3a26', eye: '#4b5d2c',
    shirt: '#e8742a', shirtS: '#b5551a', pants: '#4a4f5c', pantsS: '#363a45', shoe: '#2d2a33', shoeS: '#1f1c24',
    mouth: '#8a4038', acc: '#f4f0e8', acc2: '#c23b3b', glove: '#c6e03a', gloveS: '#8fa828',
    hairStyle: 'wavy', face: 'hussein', body: 'wide', extra: 'gloves',
  },
  hefny: {
    skin: '#ebbd9c', skinS: '#cc9a7a', hair: '#3d2516', hairH: '#6b4426', eye: '#1b1420',
    shirt: '#3e9a4f', shirtS: '#2c7039', pants: '#2f3e6b', pantsS: '#212c4f', shoe: '#5a3a26', shoeS: '#3d2516',
    mouth: '#7a3033', acc: '#c23b3b', acc2: '#2f6fc2', hairStyle: 'curly', face: 'hefny', body: 'normal', extra: 'books',
  },
  hassan: {
    skin: '#c08562', skinS: '#9c6648', hair: '#8d8a87', hairH: '#b8b5b0', eye: '#1b1420',
    shirt: '#5d6170', shirtS: '#454857', pants: '#454857', pantsS: '#33353f', shoe: '#2a2026', shoeS: '#1b1420',
    mouth: '#5a2a24', acc: '#4fbf4a', acc2: '#2f8a2e', tie: '#2f8a2e', stache: '#4a4440',
    hairStyle: 'bald', face: 'hassan', body: 'normal', extra: 'stick',
  },
  abdelfattah: {
    skin: '#d09a72', skinS: '#ad7a55', hair: '#3a3436', hairH: '#5c5457', eye: '#1b1420',
    shirt: '#8a5a36', shirtS: '#6a4226', pants: '#3f3a36', pantsS: '#2c2826', shoe: '#2a2026', shoeS: '#1b1420',
    mouth: '#7a3b33', tie: '#b8323a', glass: '#d8e8f0', stache: '#3a3436',
    hairStyle: 'side', face: 'abdelfattah', body: 'wide', extra: 'suit',
  },
  habeba: {
    skin: '#e6b48f', skinS: '#c79270', hair: '#2a1a14', hairH: '#54342a', eye: '#1b1420',
    shirt: '#9fd0f0', shirtS: '#73a8cf', pants: '#2c355e', pantsS: '#1f2645', shoe: '#2a2026', shoeS: '#1b1420',
    mouth: '#c4525a', blush: '#e88e8e', hairStyle: 'long', face: 'habeba', body: 'skirt', extra: 'none',
  },
  auntie: {
    skin: '#c9906a', skinS: '#a5704e', hair: '#7a2e4f', hairH: '#9c4468', eye: '#1b1420',
    shirt: '#e3d6c0', shirtS: '#c2b49c', pants: '#6a5a8a', pantsS: '#4f4268', shoe: '#2a2026', shoeS: '#1b1420',
    mouth: '#7a3b33', blush: '#d98a7a', hairStyle: 'scarf', face: 'auntie', body: 'wide', extra: 'apron',
  },
};

const HEAD = { 2: [5, 10], 3: [4, 11], 4: [3, 12], 5: [3, 12], 6: [3, 12], 7: [3, 12], 8: [3, 12], 9: [3, 12], 10: [4, 11], 11: [5, 10] };

function head(g, c, dir) {
  g.spans(HEAD, c.skin);
  if (dir === 'down') {
    g.set(2, 7, c.skin); g.set(13, 7, c.skinS);           // ears
    g.vline(12, 5, 9, c.skinS); g.set(11, 10, c.skinS);    // right-side shading
    g.vline(5, 6, 7, c.eye); g.vline(10, 6, 7, c.eye);    // eyes
    if (c.blush) { g.set(4, 8, c.blush); g.set(11, 8, c.blush); }
    g.hline(7, 8, 9, c.mouth);
  } else if (dir === 'up') {
    g.set(2, 7, c.skinS); g.set(13, 7, c.skinS);
  } else { // side, facing left
    g.set(2, 7, c.skin);                                  // nose
    g.vline(4, 6, 7, c.eye);
    g.set(3, 9, c.mouth);
    g.vline(12, 4, 9, c.skinS);
    g.vline(9, 6, 7, c.skinS); g.set(10, 7, c.skinS);     // ear
  }
}

function hair(g, c, dir) {
  const h = c.hair, H = c.hairH;
  switch (c.hairStyle) {
    case 'buzz':
      if (dir === 'down') {
        g.spans({ 2: [5, 10], 3: [4, 11] }, h); g.hline(3, 4, 4, h); g.hline(11, 12, 4, h);
        g.set(3, 5, h); g.set(12, 5, h); g.hline(6, 8, 2, H);
      } else if (dir === 'up') {
        g.spans({ 2: [5, 10], 3: [4, 11], 4: [3, 12], 5: [3, 12], 6: [3, 12], 7: [3, 12], 8: [3, 12] }, h);
        g.hline(6, 8, 2, H); g.hline(5, 7, 3, H);
      } else {
        g.spans({ 2: [5, 10], 3: [4, 11], 4: [6, 12], 5: [10, 12], 6: [11, 12], 7: [11, 12] }, h);
        g.hline(7, 9, 2, H);
      }
      break;
    case 'wavy': {
      const top = { 1: [3, 12], 2: [3, 12], 3: [3, 12] };
      [4, 5, 7, 8, 10, 11].forEach(x => g.set(x, 0, h));
      if (dir === 'down') {
        g.spans({ ...top, 4: [3, 12] }, h); g.vline(3, 5, 7, h); g.vline(12, 5, 7, h);
        [[5, 1], [9, 1], [4, 2], [8, 2], [11, 2], [6, 3]].forEach(([x, y]) => g.set(x, y, H));
        g.hline(3, 12, 4, c.acc); g.set(10, 4, c.acc2);  // head bandage (injury-prone)
      } else if (dir === 'up') {
        g.spans({ ...top, 4: [3, 12], 5: [3, 12], 6: [3, 12], 7: [3, 12], 8: [3, 12], 9: [3, 12], 10: [4, 11] }, h);
        [[5, 1], [9, 1], [4, 3], [8, 3], [11, 5], [6, 7], [9, 8]].forEach(([x, y]) => g.set(x, y, H));
        g.hline(3, 12, 4, c.acc); g.set(13, 5, c.acc); g.set(14, 6, c.acc);
      } else {
        g.spans({ ...top, 4: [6, 13], 5: [9, 13], 6: [10, 13], 7: [10, 13], 8: [11, 12] }, h);
        g.set(2, 1, null); g.set(3, 1, h);
        [[6, 1], [10, 1], [8, 2], [12, 3], [11, 6]].forEach(([x, y]) => g.set(x, y, H));
        g.hline(3, 12, 4, c.acc); g.set(5, 4, c.acc2);
      }
      break;
    }
    case 'curly': {
      const tex = (x, y) => ((x * 7 + y * 3) % 4 === 0 ? H : h);
      const paint = (m) => Object.entries(m).forEach(([y, [a, b]]) => { for (let x = a; x <= b; x++) g.set(x, +y, tex(x, +y)); });
      if (dir === 'down') {
        paint({ 0: [4, 11], 1: [2, 13], 2: [1, 14], 3: [1, 14], 4: [2, 13], 5: [2, 3], 6: [2, 2] });
        paint({ 5: [12, 13], 6: [13, 13] });
      } else if (dir === 'up') {
        paint({ 0: [4, 11], 1: [2, 13], 2: [1, 14], 3: [1, 14], 4: [1, 14], 5: [2, 13], 6: [2, 13], 7: [2, 13], 8: [3, 12], 9: [3, 12] });
      } else {
        paint({ 0: [4, 11], 1: [3, 13], 2: [2, 14], 3: [3, 14], 4: [5, 14], 5: [8, 14], 6: [10, 13], 7: [10, 13], 8: [11, 12] });
      }
      break;
    }
    case 'bald':
      if (dir === 'down') {
        g.vline(3, 5, 7, h); g.vline(12, 5, 7, h); g.hline(5, 6, 3, '#e0a888'); // shiny head
      } else if (dir === 'up') {
        g.spans({ 6: [3, 12], 7: [3, 12], 8: [4, 11] }, h); g.hline(6, 8, 3, '#e0a888');
      } else {
        g.spans({ 5: [10, 12], 6: [10, 12], 7: [11, 12] }, h); g.hline(6, 7, 2, '#e0a888');
      }
      break;
    case 'side':
      if (dir === 'down') {
        g.spans({ 2: [5, 10], 3: [4, 11] }, h); g.hline(3, 8, 4, h); g.vline(12, 4, 6, h); g.vline(3, 4, 6, h);
        g.hline(9, 11, 3, H);
      } else if (dir === 'up') {
        g.spans({ 2: [5, 10], 3: [4, 11], 4: [3, 12], 5: [3, 12], 6: [3, 12], 7: [3, 12], 8: [4, 11] }, h); g.hline(5, 9, 3, H);
      } else {
        g.spans({ 2: [5, 10], 3: [4, 11], 4: [5, 12], 5: [10, 12], 6: [11, 12] }, h); g.hline(6, 8, 3, H);
      }
      break;
    case 'long':
      if (dir === 'down') {
        g.spans({ 1: [4, 11], 2: [3, 12], 3: [3, 12], 4: [3, 12] }, h);
        g.hline(4, 7, 5, h); // side-swept fringe
        for (let y = 5; y <= 15; y++) { g.set(2, y, h); g.set(3, y, y > 9 ? h : g.get(3, y)); g.set(13, y, h); g.set(12, y, y > 9 ? h : g.get(12, y)); }
        g.set(3, 5, h); g.set(12, 5, h); g.hline(5, 6, 2, H); g.set(4, 3, H);
        g.set(11, 2, '#f2c94c'); // hair clip
      } else if (dir === 'up') {
        g.spans({ 1: [4, 11], 2: [3, 12] }, h);
        for (let y = 3; y <= 15; y++) g.hline(y > 11 ? 3 : 2, y > 11 ? 12 : 13, y, h);
        g.vline(6, 3, 13, H); g.vline(10, 4, 14, H); g.set(11, 2, '#f2c94c');
      } else {
        g.spans({ 1: [4, 11], 2: [3, 12], 3: [3, 13], 4: [5, 13], 5: [8, 13] }, h);
        for (let y = 6; y <= 15; y++) g.hline(9, 13, y, h);
        g.vline(11, 6, 14, H); g.set(7, 1, '#f2c94c');
      }
      break;
    case 'scarf': {
      const wrap = { 1: [4, 11], 2: [3, 12], 3: [2, 13], 4: [2, 13], 5: [2, 3], 6: [2, 3], 7: [2, 3], 8: [2, 3], 9: [2, 4], 10: [3, 4], 11: [3, 5], 12: [4, 11] };
      const wrapR = { 5: [12, 13], 6: [12, 13], 7: [12, 13], 8: [12, 13], 9: [11, 13], 10: [11, 12], 11: [10, 12] };
      if (dir === 'up') { for (let y = 1; y <= 12; y++) g.hline(y < 3 ? 4 - (y - 1) : 2, y < 3 ? 11 + (y - 1) : 13, y, h); g.vline(7, 2, 11, H); }
      else if (dir === 'down') { g.spans(wrap, h); g.spans(wrapR, h); g.hline(4, 11, 3, H); }
      else { g.spans({ 1: [4, 11], 2: [3, 12], 3: [3, 13], 4: [5, 13], 5: [8, 13], 6: [8, 13], 7: [9, 13], 8: [9, 13], 9: [8, 13], 10: [7, 12], 11: [5, 12], 12: [5, 11] }, h); g.hline(5, 11, 3, H); }
      break;
    }
  }
}

function face(g, c, dir) {
  if (dir === 'up') return;
  const d = dir === 'down';
  switch (c.face) {
    case 'mostafa': // dark angled brows, thin mustache + soul patch
      if (d) { g.set(4, 5, c.hair); g.set(5, 5, c.hair); g.set(10, 5, c.hair); g.set(11, 5, c.hair); g.set(5, 4, null); g.set(5, 4, c.skin);
        g.set(4, 4, c.hair); g.set(11, 4, c.hair); g.hline(6, 9, 8, c.hair); g.set(7, 10, c.hair); g.set(8, 10, c.hair); }
      else { g.hline(3, 5, 5, c.hair); g.hline(3, 4, 8, c.hair); g.set(4, 10, c.hair); }
      break;
    case 'hussein': // confused: one brow up
      if (d) { g.hline(4, 5, 5, c.hair); g.set(10, 3, null); g.hline(10, 11, 5, c.hair); g.set(6, 9, c.mouth); g.set(8, 9, c.skin); g.set(9, 8, '#e88e8e'); }
      else { g.hline(3, 5, 5, c.hair); }
      break;
    case 'hefny': // arched brows, big open smile
      if (d) { g.hline(4, 5, 5, c.hair); g.hline(10, 11, 5, c.hair); g.hline(6, 9, 9, c.mouth); g.hline(7, 8, 10, '#f4f0e8'); g.set(6, 9, c.mouth); }
      else { g.hline(3, 5, 5, c.hair); g.hline(3, 5, 9, c.mouth); }
      break;
    case 'hassan': // thick angry brows, big mustache
      if (d) { g.hline(4, 6, 5, c.stache); g.hline(9, 11, 5, c.stache); g.set(4, 4, c.stache); g.set(11, 4, c.stache);
        g.hline(5, 10, 8, c.stache); g.set(5, 9, c.stache); g.set(10, 9, c.stache); g.hline(7, 8, 9, c.mouth); }
      else { g.hline(3, 6, 5, c.stache); g.hline(2, 5, 8, c.stache); g.set(3, 9, c.stache); }
      break;
    case 'abdelfattah': // round glasses, mustache, smiling
      if (d) { g.hline(4, 6, 6, c.glass); g.hline(9, 11, 6, c.glass); g.set(5, 6, c.eye); g.set(10, 6, c.eye); g.set(5, 7, c.skin); g.set(10, 7, c.skin);
        g.hline(7, 8, 6, OUT); g.hline(6, 9, 8, c.stache); g.hline(6, 9, 9, c.mouth); g.set(6, 9, c.skin); g.set(9, 9, c.skin); }
      else { g.hline(3, 5, 6, c.glass); g.set(4, 6, c.eye); g.set(4, 7, c.skin); g.hline(2, 4, 8, c.stache); }
      break;
    case 'habeba':
      if (d) { g.set(4, 6, c.eye); g.set(11, 6, c.eye); g.hline(7, 8, 9, c.mouth); }
      else { g.set(3, 6, c.eye); }
      break;
    case 'auntie':
      if (d) { g.hline(6, 9, 9, c.mouth); g.set(6, 9, c.skin); g.set(9, 9, c.skin); }
      break;
  }
}

// leg poses: [leftLegBottom, rightLegBottom] — a lifted foot ends 1px higher
function body(g, c, dir, frame) {
  const wide = c.body === 'wide', skirt = c.body === 'skirt';
  const t0 = wide ? 4 : 5, t1 = wide ? 11 : 10;
  if (dir !== 'side') {
    g.hline(t0, t1, 12, c.shirt);
    g.rect(t0, 13, t1 - t0 + 1, 6, c.shirt);
    g.vline(t1, 13, 18, c.shirtS); g.hline(t0, t1, 18, c.shirtS);
    // arms swing a pixel on step frames
    const la = frame === 1 ? -1 : 0, ra = frame === 2 ? -1 : 0;
    const aw = wide ? 2 : 1;
    g.rect(t0 - aw, 13 + la, aw, 5, c.shirt); g.rect(t1 + 1, 13 + ra, aw, 5, c.shirtS);
    const hand = c.extra === 'gloves' ? c.glove : c.skin, handR = c.extra === 'gloves' ? c.gloveS : c.skinS;
    g.rect(t0 - aw, 18 + la, aw, 1, hand); g.rect(t1 + 1, 18 + ra, aw, 1, handR);
    if (dir === 'down') {
      g.hline(7, 8, 12, c.skinS); // neck
      if (c.extra === 'hoodie') { g.vline(6, 13, 15, '#e9e4da'); g.vline(9, 13, 15, '#e9e4da'); g.hline(6, 9, 17, c.shirtS); }
      if (c.extra === 'stick' || c.extra === 'suit') { g.set(7, 12, '#f4f0e8'); g.set(8, 12, '#f4f0e8'); g.vline(7, 13, 16, c.tie); g.vline(8, 13, 15, c.tie); }
      if (c.extra === 'apron') { g.rect(6, 14, 4, 5, '#f4f0e8'); g.hline(6, 9, 14, '#d8d0c4'); }
    }
    if (dir === 'up' && c.extra === 'hoodie') { g.hline(5, 10, 12, c.shirtS); g.hline(6, 9, 13, c.shirtS); }
  } else {
    g.rect(5, 12, 6, 7, c.shirt); g.vline(10, 12, 18, c.shirtS); g.hline(5, 10, 18, c.shirtS);
    const sw = frame === 1 ? -1 : frame === 2 ? 1 : 0;
    g.rect(7 + sw, 13, 2, 5, c.shirtS);
    g.rect(7 + sw, 18, 2, 1, c.extra === 'gloves' ? c.glove : c.skin);
    if (c.extra === 'hoodie') g.set(5, 13, '#e9e4da');
    if (c.extra === 'stick' || c.extra === 'suit') { g.vline(5, 12, 15, c.tie); }
    if (c.extra === 'apron') g.rect(5, 14, 2, 5, '#f4f0e8');
  }

  // legs
  if (skirt) {
    if (dir !== 'side') { g.rect(4, 19, 8, 2, c.pants); g.hline(4, 11, 20, c.pantsS); } else { g.rect(5, 19, 6, 2, c.pants); g.hline(5, 10, 20, c.pantsS); }
  }
  const legTop = skirt ? 21 : 19;
  const legC = skirt ? c.skin : c.pants, legS = skirt ? c.skinS : c.pantsS;
  if (dir !== 'side') {
    const lb = frame === 1 ? 21 : 22, rb = frame === 2 ? 21 : 22;
    g.rect(5, legTop, 3, lb - legTop, legC); g.vline(7, legTop, lb - 1, legS);
    g.rect(8, legTop, 3, rb - legTop, legC); g.vline(10, legTop, rb - 1, legS);
    g.hline(5, 7, lb, c.shoe); g.hline(8, 10, rb, c.shoe);
    if (dir === 'down') { g.set(7, lb, c.shoeS); g.set(10, rb, c.shoeS); }
  } else if (frame === 0) {
    g.rect(6, legTop, 4, 22 - legTop, legC); g.vline(9, legTop, 21, legS);
    g.hline(5, 9, 22, c.shoe); g.set(9, 22, c.shoeS);
  } else {
    const fx = frame === 1 ? 4 : 8, bx = frame === 1 ? 8 : 4; // front/back leg x
    g.rect(bx, legTop, 3, 22 - legTop, legS); g.hline(bx - 1, bx + 1, 22, c.shoeS);
    g.rect(fx, legTop, 3, 22 - legTop, legC); g.hline(fx - 1, fx + 2, 22, c.shoe);
  }
}

function accessory(g, c, dir) {
  if (c.extra === 'books') {
    if (dir === 'down') { g.rect(1, 14, 2, 4, c.acc); g.hline(1, 2, 15, '#f4f0e8'); g.rect(0, 14, 1, 4, c.acc2); }
    if (dir === 'side') { g.rect(3, 14, 3, 3, c.acc); g.hline(3, 5, 15, '#f4f0e8'); }
  }
  if (c.extra === 'stick') { // the legendary green stick
    if (dir === 'down') [[13, 17], [13, 16], [14, 15], [14, 14], [15, 13], [15, 12]].forEach(([x, y]) => g.set(x, y, c.acc));
    if (dir === 'side') [[6, 17], [5, 16], [4, 16], [3, 15], [2, 15], [1, 14]].forEach(([x, y]) => g.set(x, y, c.acc));
    if (dir === 'up') [[2, 17], [2, 16], [1, 15], [1, 14]].forEach(([x, y]) => g.set(x, y, c.acc));
  }
}

export function frame(c, dir, f) {
  const g = new Grid(16, 24);
  body(g, c, dir, f);
  head(g, c, dir);
  hair(g, c, dir);
  face(g, c, dir);
  accessory(g, c, dir);
  return g.outline(OUT);
}

export function characterFrames(c) {
  const out = [];
  for (const dir of ['down', 'up', 'side']) for (const f of [0, 1, 2]) out.push(frame(c, dir, f));
  return out;
}

// 16x16 head-and-shoulders crop for dialogue portraits
export function portrait(c) {
  const f = frame(c, 'down', 0), g = new Grid(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g.set(x, y, f.get(x, y));
  return g;
}
