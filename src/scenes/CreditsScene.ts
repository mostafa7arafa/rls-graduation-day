import * as Phaser from 'phaser';
import { W, H, FONT } from '../config';
import { music } from '../systems/music';
import { tr, txt, isAr } from '../systems/i18n';
import { CAST } from '../data/cast';

// The end: everyone's farewell line scrolls past, then the three friends, then THE END.
// Z / tap speeds it up; at the end it returns to the title.

const FAREWELLS: [string, string][] = [
  ['hassan', '"You were my favourite disaster."'],
  ['abdelfattah', '"Forty verses. All about Hussein. I am working on verse forty-one."'],
  ['nasser', '"Spiders have six legs. Remember me when you see one."'],
  ['yasser', '"T-R-A-C-T-O-R. I still think about it."'],
  ['abdo', '"Doctor Hefny! Come back with goggles!"'],
  ['rezk', '"...and bring your own beakers."'],
  ['abdelkareem', '"That will be one sandwich for appearing in the credits."'],
  ['amr', '"*TWEEEEEEEEEEET*"'],
  ['ibrahim', '"Rashid is still the centre of the world."'],
  ['doaa', '"The printer still works. Mostafa is a legend in the lounge."'],
  ['shimaa', '"Two hundred exam papers. One robot. Finally."'],
  ['hager', '"Posted it. Forty likes. The whole staff is crying."'],
  ['auntie', '"Hussein paid. I framed the two pounds."'],
  ['karim', '"You guys are alright."'],
  ['habeba', '"Is your head okay, Hussein?"'],
];

export class CreditsScene extends Phaser.Scene {
  private roll!: Phaser.GameObjects.Container;
  private speed = 22;
  private done = false;

  constructor() { super('credits'); }

  create() {
    this.done = false; this.speed = 22;
    this.cameras.main.setBackgroundColor('#1b1420').fadeIn(1200);
    music.play('ending');
    const items: Phaser.GameObjects.GameObject[] = [];
    let y = H + 20;
    const line = (text: string, size: 8 | 16 = 8, color = '#f4f0e8', gap = 20) => {
      items.push(this.add.text(W / 2, y, tr(text), txt(size, { color, align: 'center', wordWrap: { width: W - 60 } })).setOrigin(0.5, 0));
      y += gap;
    };
    items.push(this.add.text(W / 2, y, 'RLS', { fontFamily: FONT, fontSize: '32px', color: '#f2c94c' }).setOrigin(0.5, 0).setShadow(3, 3, '#c23b3b', 0, false, true)); y += 44;
    line('GRADUATION DAY', 16, '#f4f0e8', 50);
    const ar = isAr(), side = ar ? -1 : 1;   // Arabic mirrors: sprite on the right, text anchored to its right edge
    for (const [who, words] of FAREWELLS) {
      items.push(this.add.sprite(W / 2 - 150 * side, y + 10, who, 0).setScale(2));
      items.push(this.add.text(W / 2 - 120 * side, y - (ar ? 4 : 0), tr(CAST[who].name), txt(8, { color: CAST[who].color })).setOrigin(ar ? 1 : 0, 0));
      items.push(this.add.text(W / 2 - 120 * side, y + 14, tr(words), txt(8, { color: '#cfc6b8', wordWrap: { width: 280 } })).setOrigin(ar ? 1 : 0, 0));
      y += 52;
    }
    y += 20;
    line('STARRING', 8, '#f2c94c', 26);
    ['mostafa', 'hussein', 'hefny'].forEach((p, i) => {
      const s = this.add.sprite(W / 2 - 60 + i * 60, y + 12, p, 0).setScale(3);
      s.play(`${p}-walk-down`);
      items.push(s);
      items.push(this.add.text(W / 2 - 60 + i * 60, y + 46, tr(p === 'hefny' ? 'Mohamed Hefny' : CAST[p].name), txt(8, { color: CAST[p].color })).setOrigin(0.5, 0));
    });
    y += 90;
    line('Mostafa — the Engineer', 8, '#7fb0ff');
    line('Hussein — the Goalkeeper. Owner of a tractor.', 8, '#ffa860');
    line('Mohamed Hefny — the Doctor. Hates math.', 8, '#7fe08a', 50);
    line('A game by Mostafa, for Hussein and Hefny.', 8, '#f4f0e8', 20);
    line('Twelve years at Rosetta Language School, Rashid.', 8, '#cfc6b8', 20);
    line('Thank you for all of them.', 8, '#cfc6b8', 80);
    line('THE END', 16, '#f2c94c', 20);
    this.roll = this.add.container(0, 0, items);
    const endY = y;

    const fast = () => { this.speed = this.done ? this.speed : 110; };
    const slow = () => { this.speed = 22; };
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => { if (this.done) this.back(); else if (['z', ' ', 'enter'].includes(e.key.toLowerCase())) fast(); });
    this.input.keyboard!.on('keyup', slow);
    this.input.on('pointerdown', () => { if (this.done) this.back(); else fast(); });
    this.input.on('pointerup', slow);
    this.events.on('update', (_t: number, dt: number) => {
      if (this.done) return;
      this.roll.y -= this.speed * dt / 1000;
      if (this.roll.y + endY < H / 2) { this.done = true; this.time.delayedCall(6000, () => this.back()); }
    });
  }

  private back() {
    if (!this.scene.isActive()) return;
    this.input.keyboard!.removeAllListeners();
    this.cameras.main.fadeOut(1000);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('title', { credits: true }));
  }
}
