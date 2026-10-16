import * as Phaser from 'phaser';
import { FONT, FONT_AR } from '../config';

import { PEOPLE, PROPS } from '../data/assets.gen';

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() {
    this.load.image('tiles', 'assets/tiles.png');
    for (const p of PEOPLE) {
      this.load.spritesheet(p, `assets/${p}.png`, { frameWidth: 16, frameHeight: 24 });
      this.load.image(`${p}_face`, `assets/${p}_face.png`);
    }
    for (const p of PROPS) this.load.image(p, `assets/${p}.png`);
  }

  async create() {
    // walk cycles: frames 0-2 down, 3-5 up, 6-8 side
    for (const p of PEOPLE) {
      [['down', 0], ['up', 3], ['side', 6]].forEach(([dir, b]) => {
        const base = b as number;
        this.anims.create({ key: `${p}-walk-${dir}`, frames: this.anims.generateFrameNumbers(p, { frames: [base + 1, base, base + 2, base] }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${p}-idle-${dir}`, frames: [{ key: p, frame: base }] });
      });
    }
    try { await Promise.all([document.fonts.load(`8px ${FONT}`), document.fonts.load(`12px ${FONT_AR}`, 'ع')]); } catch { /* fall back to system font */ }
    const q = new URLSearchParams(location.search);   // ?match = straight to a quick match, ?cup = the cup menu
    this.scene.start(q.has('match') ? 'match' : q.has('cup') ? 'cup' : 'title');
  }
}
