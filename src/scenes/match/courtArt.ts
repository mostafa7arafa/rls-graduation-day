import * as Phaser from 'phaser';
import { W } from '../../config';
import { tr, txt } from '../../systems/i18n';
import { CW, CL, GOAL_X0, GOAL_X1, GOAL_D, BOX_R } from '../../match/court';

// The RLS court as the football season sees it (from the entrance: the garden on the LEFT, the school
// wall on the RIGHT, the building at the top, the canteen at the bottom). Lines and stone are drawn;
// the props (trees, the red playground) are baked sprites. Shared by the match and the team talks.
// The garden really had only two trees, and a lot of red: swings, a slide, pull-up bars.

export const OX = 136, OY = 48;             // where the court sits in the world
export const WORLD_H = OY + CL + 48;

export function drawCourt(s: Phaser.Scene) {
  const g = s.add.graphics();
  g.fillStyle(0x3f7d3a).fillRect(0, 0, 104, WORLD_H);                 // the garden
  g.fillStyle(0x47883f);
  for (let y = 0; y < WORLD_H; y += 6) for (let x = (y / 6) % 2 ? 0 : 5; x < 104; x += 11) g.fillRect(x, y, 2, 1);
  g.fillStyle(0xb8ad9a).fillRect(104, 0, 30, WORLD_H);                // the pathway, where the crowd stands
  g.fillStyle(0x8f8a85).fillRect(134, OY - GOAL_D - 2, CW + 4, CL + 2 * GOAL_D + 4);
  g.fillStyle(0x86817c);                                              // street-stone tiles
  for (let y = 0; y < CL; y += 16) for (let x = (y / 16) % 2 ? 0 : 8; x < CW; x += 16) g.fillRect(OX + x, OY + y, 8, 8);
  g.fillStyle(0xe8dcc0).fillRect(OX + CW, 0, 10, WORLD_H);           // the school wall (right)
  g.fillStyle(0xc9b994).fillRect(OX + CW + 8, 0, 2, WORLD_H);
  g.fillStyle(0x34343e).fillRect(OX + CW + 10, 0, W, WORLD_H);       // outside: the street
  // the school building (top) and the canteen (bottom)
  g.fillStyle(0xd9c9a3).fillRect(0, 0, OX + CW + 10, OY - GOAL_D - 2);
  for (let x = 12; x < OX + CW; x += 34) g.fillStyle(0x6fa8c8).fillRect(x, 10, 14, 12);
  g.fillStyle(0xc28a5a).fillRect(OX, OY + CL + GOAL_D + 2, CW, 48);
  g.fillStyle(0xe8d8b8).fillRect(OX + 10, OY + CL + GOAL_D + 8, CW - 20, 10);
  s.add.text(OX + CW / 2, OY + CL + GOAL_D + 32, tr('CANTEEN'), txt(8, { color: '#3a2418' })).setOrigin(0.5);
  // lines
  g.lineStyle(1, 0xeef2e6, 0.85);
  g.strokeRect(OX, OY, CW, CL);
  g.lineBetween(OX, OY + CL / 2, OX + CW, OY + CL / 2);
  g.strokeCircle(OX + CW / 2, OY + CL / 2, 24);
  g.beginPath(); g.arc(OX + CW / 2, OY, BOX_R, 0, Math.PI); g.strokePath();
  g.beginPath(); g.arc(OX + CW / 2, OY + CL, BOX_R, Math.PI, Math.PI * 2); g.strokePath();
  // goals: net behind the line, posts on it
  for (const [y0, dir] of [[OY, -1], [OY + CL, 1]] as const) {
    const top = dir < 0 ? y0 - GOAL_D : y0;
    g.fillStyle(0xdfe4ea, 0.35).fillRect(OX + GOAL_X0, top, GOAL_X1 - GOAL_X0, GOAL_D);
    g.lineStyle(1, 0xdfe4ea, 0.5);
    for (let x = GOAL_X0; x <= GOAL_X1; x += 4) g.lineBetween(OX + x, top, OX + x, top + GOAL_D);
    g.fillStyle(0xf4f0e8).fillRect(OX + GOAL_X0 - 2, y0 - 1, GOAL_X1 - GOAL_X0 + 4, 2);
    g.fillRect(OX + GOAL_X0 - 2, top, 2, GOAL_D); g.fillRect(OX + GOAL_X1, top, 2, GOAL_D);
  }
  // the garden: two trees, and the red playground
  const props: [number, number, string][] = [
    [30, 92, 'tree1'], [62, 150, 'swingRed'], [26, 196, 'slide'], [70, 246, 'swingRed'],
    [28, 296, 'pullup'], [68, 348, 'swingRed'], [30, 420, 'tree2'],
  ];
  for (const [x, y, k] of props) s.add.image(x, y, k).setOrigin(0.5, 1).setDepth(y);
}

/** the crowd on the pathway, Hefny leading the chants, Mostafa coaching at the halfway line */
export function drawCrowd(s: Phaser.Scene, fans: string[]) {
  const crowd = fans.map((k, i) => {
    const y = OY + 30 + i * 32 + (i % 2) * 6;
    return s.add.sprite(110 + (i % 2) * 8, y, k, 6).setOrigin(0.5, 1).setFlipX(true).setDepth(y);
  });
  const hefny = s.add.sprite(120, OY + CL / 2 - 10, 'hefny', 6).setOrigin(0.5, 1).setFlipX(true).setDepth(OY + CL / 2 - 10);
  const mostafa = s.add.sprite(126, OY + CL / 2 + 14, 'mostafa', 6).setOrigin(0.5, 1).setFlipX(true).setDepth(OY + CL / 2 + 14);
  return { crowd, hefny, mostafa };
}
