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
  // ── chapters 2+
  nasser: { // Sheikh Nasser: white galabeya + kufi cap, beard, prayer beads, infinite confidence
    skin: '#b97f5a', skinS: '#98633f', hair: '#2a2026', hairH: '#4a4044', eye: '#1b1420',
    shirt: '#f0ece2', shirtS: '#cfc8b8', pants: '#f0ece2', pantsS: '#cfc8b8', shoe: '#6b4426', shoeS: '#4f311b',
    mouth: '#5a2a24', cap: '#f4f0e8', capS: '#d8d0c4', beard: '#2a2026', acc: '#3e9a5c',
    hairStyle: 'kufi', face: 'beard', body: 'robe', extra: 'beads',
  },
  yasser: { // Mr Yasser, English: side parting, square glasses, red pen, smug
    skin: '#d6a07a', skinS: '#b5805c', hair: '#1f1a1c', hairH: '#3a3436', eye: '#1b1420',
    shirt: '#e6edf5', shirtS: '#b9c6d4', pants: '#2d3550', pantsS: '#1f2540', shoe: '#2a2026', shoeS: '#1b1420',
    mouth: '#7a3b33', tie: '#2f4fa8', glass: '#1b1420', acc: '#d8323a',
    hairStyle: 'side', face: 'yasser', body: 'normal', extra: 'suit', item: 'pen',
  },
  abdo: { // Mr Abdo, science: wild hair, goggles on his forehead, lab coat
    skin: '#c99068', skinS: '#a7704c', hair: '#3a2a22', hairH: '#5c4434', eye: '#1b1420',
    shirt: '#f4f4f0', shirtS: '#cfd2d6', pants: '#3f3a36', pantsS: '#2c2826', shoe: '#2a2026', shoeS: '#1b1420',
    mouth: '#7a3b33', inner: '#4f8f7a', goggle: '#7fd0f0', stache: '#3a2a22',
    hairStyle: 'messy', face: 'abdo', body: 'normal', extra: 'labcoat',
  },
  rezk: { // Mr Ahmed Rezk, science: balding, thick glasses, mustache, lab coat
    skin: '#d8a882', skinS: '#b58763', hair: '#5a4a44', hairH: '#7a6a64', eye: '#1b1420',
    shirt: '#f4f4f0', shirtS: '#cfd2d6', pants: '#2d2f45', pantsS: '#1f2033', shoe: '#2a2026', shoeS: '#1b1420',
    mouth: '#7a3b33', inner: '#a8743a', glass: '#d8e8f0', stache: '#4a3c36',
    hairStyle: 'bald', face: 'rezk', body: 'wide', extra: 'labcoat',
  },
  abdelkareem: { // Mr Abdelkareem, math: slick hair, thin mustache, gold everything, calculator
    skin: '#c48a64', skinS: '#a26b48', hair: '#141016', hairH: '#3a3440', eye: '#1b1420',
    shirt: '#3a3046', shirtS: '#2a2234', pants: '#2a2234', pantsS: '#1f1a26', shoe: '#2a2026', shoeS: '#1b1420',
    mouth: '#5a2a24', tie: '#f2c94c', stache: '#141016', gold: '#f2c94c',
    hairStyle: 'slick', face: 'greedy', body: 'normal', extra: 'suit', item: 'calc',
  },
  amr: { // Mr Amr, gym: red tracksuit, whistle, never sat down once in 30 years
    skin: '#b47a54', skinS: '#925e3c', hair: '#1f1a1c', hairH: '#3a3436', eye: '#1b1420',
    shirt: '#c8323a', shirtS: '#9c262c', pants: '#c8323a', pantsS: '#9c262c', shoe: '#f4f0e8', shoeS: '#c4c0b8',
    mouth: '#5a2a24', stripe: '#f4f0e8', whistle: '#f2c94c',
    hairStyle: 'buzz', face: 'amr', body: 'wide', extra: 'tracksuit',
  },
  karim: { // Karim: sunglasses, quiff, gold watch + chain, designer white. Beloved. Hated by Hefny.
    skin: '#d8a47c', skinS: '#b5845e', hair: '#2a1a14', hairH: '#6a4430', eye: '#1b1420',
    shirt: '#f8f8f8', shirtS: '#d4d4dc', pants: '#3a5a8a', pantsS: '#2a4268', shoe: '#f4f0e8', shoeS: '#c4c0b8',
    mouth: '#8a4038', gold: '#f2c94c', shade: '#141016',
    hairStyle: 'quiff', face: 'shades', body: 'normal', extra: 'chain',
  },
  ibrahim: { // Mr Ibrahim, social studies: grey hair, glasses, sweater vest, the nicest man alive
    skin: '#d4a07c', skinS: '#b2805c', hair: '#a8a4a0', hairH: '#d0ccc8', eye: '#1b1420',
    shirt: '#7a8a5a', shirtS: '#5c6a42', pants: '#4a4440', pantsS: '#36302c', shoe: '#5a3a26', shoeS: '#3d2516',
    mouth: '#7a3b33', glass: '#d8e8f0', inner: '#e6e0d0',
    hairStyle: 'side', face: 'ibrahim', body: 'normal', extra: 'vest',
  },
  doaa: { // the young teachers: Miss Doaa, Miss Shimaa, Miss Hager
    skin: '#e2ae88', skinS: '#c28e6a', hair: '#3a6fb0', hairH: '#5a8fd0', eye: '#1b1420',
    shirt: '#f0e6d8', shirtS: '#cfc2b0', pants: '#3a3a4a', pantsS: '#2a2a36', shoe: '#2a2026', shoeS: '#1b1420',
    mouth: '#c4525a', blush: '#e88e8e', hairStyle: 'scarf', face: 'lady', body: 'robe', extra: 'none',
  },
  shimaa: {
    skin: '#d49e78', skinS: '#b27e5a', hair: '#b04a6a', hairH: '#d06a8a', eye: '#1b1420',
    shirt: '#2f5a4a', shirtS: '#22443a', pants: '#2f5a4a', pantsS: '#22443a', shoe: '#2a2026', shoeS: '#1b1420',
    mouth: '#c4525a', blush: '#e88e8e', glass: '#1b1420', hairStyle: 'scarf', face: 'ladyGlasses', body: 'robe', extra: 'none',
  },
  hager: {
    skin: '#e8b892', skinS: '#c99772', hair: '#e8d8b0', hairH: '#f8ecd0', eye: '#1b1420',
    shirt: '#8a5ab0', shirtS: '#6a4290', pants: '#8a5ab0', pantsS: '#6a4290', shoe: '#2a2026', shoeS: '#1b1420',
    mouth: '#c4525a', blush: '#e88e8e', hairStyle: 'scarf', face: 'lady', body: 'robe', extra: 'none', item: 'phone',
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
    case 'kufi': // white crochet cap, short dark hair at the sides
      if (dir === 'down') { g.spans({ 1: [4, 11], 2: [3, 12], 3: [3, 12] }, c.cap); [4, 7, 10].forEach(x => g.set(x, 2, c.capS)); g.hline(3, 12, 4, c.capS); g.set(3, 5, h); g.set(12, 5, h); }
      else if (dir === 'up') { g.spans({ 1: [4, 11], 2: [3, 12], 3: [3, 12], 4: [3, 12] }, c.cap); [5, 8, 11].forEach(x => g.set(x, 3, c.capS)); g.spans({ 5: [3, 12], 6: [3, 12], 7: [4, 11] }, h); }
      else { g.spans({ 1: [4, 11], 2: [3, 12], 3: [3, 12] }, c.cap); g.hline(3, 12, 4, c.capS); g.spans({ 5: [10, 12], 6: [11, 12] }, h); }
      break;
    case 'messy': // mad-scientist spikes + goggles pushed up
      [3, 5, 7, 9, 11, 13].forEach((x, i) => g.set(x, i % 2 ? 0 : 1, h));
      if (dir === 'down') { g.spans({ 1: [3, 12], 2: [2, 13], 3: [3, 12] }, h); g.set(2, 4, h); g.set(13, 4, h); g.hline(4, 11, 4, c.goggle); g.set(7, 4, OUT); g.set(8, 4, OUT); }
      else if (dir === 'up') { g.spans({ 1: [3, 12], 2: [2, 13], 3: [2, 13], 4: [3, 12], 5: [3, 12], 6: [3, 12], 7: [4, 11] }, h); g.hline(3, 12, 4, OUT); }
      else { g.spans({ 1: [3, 12], 2: [2, 13], 3: [4, 13], 4: [8, 13], 5: [10, 12] }, h); g.hline(3, 7, 4, c.goggle); }
      break;
    case 'slick': // slicked back with a shine. Smells like money.
      if (dir === 'down') { g.spans({ 2: [4, 11], 3: [3, 12] }, h); g.set(3, 4, h); g.set(12, 4, h); g.hline(5, 8, 2, H); }
      else if (dir === 'up') { g.spans({ 2: [4, 11], 3: [3, 12], 4: [3, 12], 5: [3, 12], 6: [3, 12], 7: [4, 11] }, h); g.vline(7, 2, 6, H); }
      else { g.spans({ 2: [4, 11], 3: [3, 12], 4: [7, 12], 5: [10, 12] }, h); g.hline(5, 9, 2, H); }
      break;
    case 'quiff': // a football star's quiff, taller than everyone's grades
      if (dir === 'down') { g.spans({ 0: [5, 10], 1: [4, 11], 2: [3, 12], 3: [3, 12] }, h); g.set(3, 4, h); g.set(12, 4, h); g.hline(6, 9, 0, H); g.hline(5, 7, 1, H); }
      else if (dir === 'up') { g.spans({ 0: [5, 10], 1: [4, 11], 2: [3, 12], 3: [3, 12], 4: [3, 12], 5: [3, 12], 6: [4, 11] }, h); g.hline(6, 9, 0, H); }
      else { g.spans({ 0: [3, 9], 1: [2, 11], 2: [3, 12], 3: [4, 12], 4: [8, 12], 5: [10, 12] }, h); g.hline(3, 6, 0, H); }
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
    case 'beard': // full beard + mustache, calm confident eyebrows
      if (d) { g.hline(4, 5, 5, c.beard); g.hline(10, 11, 5, c.beard); g.hline(6, 9, 8, c.beard); g.set(3, 9, c.beard); g.set(12, 9, c.beard);
        g.hline(3, 12, 10, c.beard); g.hline(4, 11, 11, c.beard); g.hline(5, 10, 12, c.beard); g.hline(7, 8, 9, c.mouth); g.set(4, 9, c.beard); g.set(11, 9, c.beard); }
      else { g.hline(3, 5, 5, c.beard); g.hline(2, 4, 8, c.beard); g.spans({ 9: [3, 8], 10: [3, 9], 11: [4, 9], 12: [5, 8] }, c.beard); }
      break;
    case 'yasser': // square glasses, one smug raised brow
      if (d) { g.rect(4, 6, 3, 2, c.glass); g.rect(9, 6, 3, 2, c.glass); g.set(5, 6, '#9fd0f0'); g.set(10, 6, '#9fd0f0'); g.hline(7, 8, 6, c.glass);
        g.hline(4, 6, 5, c.hair); g.hline(9, 11, 4, c.hair); g.hline(7, 9, 9, c.mouth); g.set(9, 8, c.mouth); }
      else { g.rect(3, 6, 2, 2, c.glass); g.hline(3, 5, 5, c.hair); g.hline(3, 4, 9, c.mouth); }
      break;
    case 'abdo': // wide excited eyes, bushy mustache
      if (d) { g.rect(4, 6, 2, 2, c.eye); g.rect(10, 6, 2, 2, c.eye); g.set(4, 6, '#f4f0e8'); g.set(10, 6, '#f4f0e8'); g.hline(5, 10, 8, c.stache); g.hline(7, 8, 9, c.mouth); }
      else { g.rect(3, 6, 2, 2, c.eye); g.hline(2, 5, 8, c.stache); }
      break;
    case 'rezk': // thick round glasses, droopy mustache
      if (d) { g.rect(4, 5, 3, 3, c.glass); g.rect(9, 5, 3, 3, c.glass); g.set(5, 6, c.eye); g.set(10, 6, c.eye); g.hline(7, 8, 6, OUT);
        g.hline(5, 10, 9, c.stache); g.set(5, 10, c.stache); g.set(10, 10, c.stache); }
      else { g.rect(3, 5, 2, 3, c.glass); g.set(3, 6, c.eye); g.hline(2, 5, 9, c.stache); }
      break;
    case 'greedy': // pencil mustache, wide grin, one gold tooth
      if (d) { g.hline(4, 6, 5, c.hair); g.hline(9, 11, 5, c.hair); g.hline(5, 10, 8, c.stache); g.hline(5, 10, 9, c.mouth); g.set(8, 9, c.gold); g.set(5, 9, c.skin); g.set(10, 9, c.skin); }
      else { g.hline(3, 5, 5, c.hair); g.hline(2, 4, 8, c.stache); g.hline(2, 4, 9, c.mouth); }
      break;
    case 'amr': // thick brows, whistle in his mouth, permanently mid-shout
      if (d) { g.hline(4, 6, 5, c.hair); g.hline(9, 11, 5, c.hair); g.rect(7, 9, 2, 2, c.whistle); g.set(6, 9, c.mouth); }
      else { g.hline(3, 5, 5, c.hair); g.rect(1, 9, 2, 1, c.whistle); }
      break;
    case 'shades': // black sunglasses with a shine, confident smirk
      if (d) { g.hline(3, 12, 6, c.shade); g.rect(4, 6, 3, 2, c.shade); g.rect(9, 6, 3, 2, c.shade); g.set(5, 6, '#9fd0f0'); g.set(10, 6, '#9fd0f0'); g.hline(7, 9, 9, c.mouth); g.set(9, 8, c.mouth); }
      else { g.rect(2, 6, 4, 2, c.shade); g.hline(5, 11, 6, c.shade); g.set(3, 6, '#9fd0f0'); g.hline(3, 4, 9, c.mouth); }
      break;
    case 'ibrahim': // round glasses, gentle smile
      if (d) { g.hline(4, 6, 6, c.glass); g.hline(9, 11, 6, c.glass); g.set(5, 6, c.eye); g.set(10, 6, c.eye); g.hline(7, 8, 6, OUT); g.hline(6, 9, 9, c.mouth); g.set(6, 9, c.skin); g.set(9, 9, c.skin); }
      else { g.hline(3, 5, 6, c.glass); g.set(4, 6, c.eye); g.set(3, 9, c.mouth); }
      break;
    case 'lady': case 'ladyGlasses':
      if (d) {
        if (c.face === 'ladyGlasses') { g.rect(4, 6, 3, 2, c.glass); g.rect(9, 6, 3, 2, c.glass); g.set(5, 7, c.skin); g.set(10, 7, c.skin); g.hline(7, 8, 6, c.glass); }
        else { g.set(5, 5, c.eye); g.set(10, 5, c.eye); }
        g.hline(7, 8, 9, c.mouth);
      } else { g.set(3, 6, c.eye); }
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
    if (dir === 'down') {
      if (c.extra === 'labcoat') { g.rect(7, 12, 2, 6, c.inner); g.vline(6, 13, 18, c.shirtS); g.vline(9, 13, 18, c.shirtS); g.set(5, 14, '#2f6fc2'); }
      if (c.extra === 'tracksuit') { g.vline(t0, 13, 18, c.stripe); g.vline(t1, 13, 18, c.stripe); g.vline(7, 12, 15, c.stripe); g.set(7, 16, c.whistle); }
      if (c.extra === 'chain') { g.hline(6, 9, 13, c.gold); g.set(7, 14, c.gold); g.set(8, 14, c.gold); g.set(t1 + 1, 17, c.gold); }
      if (c.extra === 'vest') { g.rect(6, 12, 4, 7, c.inner); g.vline(7, 13, 18, c.shirt); g.vline(8, 13, 18, c.shirt); }
      if (c.extra === 'beads') { g.vline(t0 - 1, 17, 20, c.acc); g.set(t0 - 1, 21, c.acc); }
    }
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
  if (c.body === 'robe') { // galabeya / long skirt down to the ankles; only the shoes peek out
    const x0 = dir === 'side' ? 5 : 4, x1 = dir === 'side' ? 10 : 11;
    g.rect(x0, 19, x1 - x0 + 1, 3, c.pants); g.hline(x0, x1, 21, c.pantsS); g.vline(x1, 19, 21, c.pantsS);
    const step = frame === 1 ? -1 : frame === 2 ? 1 : 0;
    if (dir === 'side') g.hline(5 + step, 9 + step, 22, c.shoe);
    else { g.hline(5, 7, 22 - (frame === 1 ? 1 : 0), c.shoe); g.hline(8, 10, 22 - (frame === 2 ? 1 : 0), c.shoe); }
    return;
  }
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

function item(g, c, dir) {
  if (dir === 'up' || !c.item) return;
  const hx = dir === 'down' ? 1 : 3, hy = dir === 'down' ? 17 : 16;
  if (c.item === 'pen') { g.vline(hx, hy - 3, hy, c.acc); g.set(hx, hy - 4, '#f4f0e8'); }
  if (c.item === 'calc') { g.rect(hx - 1, hy - 3, 3, 4, '#3a3a44'); g.set(hx, hy - 2, '#9fe09a'); }
  if (c.item === 'phone') { g.rect(hx - 1, hy - 3, 2, 3, '#1b1420'); g.set(hx - 1, hy - 3, '#9fd0f0'); }
}

export function frame(c, dir, f) {
  const g = new Grid(16, 24);
  body(g, c, dir, f);
  head(g, c, dir);
  hair(g, c, dir);
  face(g, c, dir);
  accessory(g, c, dir);
  item(g, c, dir);
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
