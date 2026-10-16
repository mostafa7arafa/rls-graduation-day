import * as Phaser from 'phaser';
import { W } from '../../config';
import { sfx } from '../../systems/sfx';
import { tr, txt, num } from '../../systems/i18n';
import { CAST } from '../../data/cast';
import { Encounter } from './Encounter';
import type { Key } from './Encounter';

// CHAPTER 4 — the science lab. Hefny alone, four potions, two teachers who never agree.
// Pick flasks (a drop each, up to 3), then MIX. Paint-style colour mixing: the target colour is shown.
// Each round one teacher is right... until the last one, where both are half right.

type Paint = 'R' | 'B' | 'Y' | 'W';
const PAINT: Record<Paint, { color: number; name: string }> = {
  R: { color: 0xd8323a, name: 'RED' }, B: { color: 0x2f6fd8, name: 'BLUE' }, Y: { color: 0xf2c94c, name: 'YELLOW' }, W: { color: 0xf4f4f0, name: 'WHITE' },
};
// what a set of drops looks like (sorted letters); anything else is "lab mud"
const MIX: Record<string, number> = {
  R: 0xd8323a, B: 0x2f6fd8, Y: 0xf2c94c, W: 0xf4f4f0,
  BR: 0x8a4fc0, RY: 0xf0902a, BY: 0x4fb04a, RW: 0xf0a0b8, BW: 0x9fc8f0, WY: 0xf8eaa8, BWY: 0xa8e0b0,
};
const MUD = 0x6b5a3a;
/** the colour family of a set of drops: which paints went in (amounts don't matter) */
const key = (drops: Paint[]) => [...new Set(drops)].sort().join('');

interface Round { name: string; want: string; abdo: string; rezk: string; after: string }
const ROUNDS: Round[] = [
  { name: 'Potion 1: Purple Potion of Patience', want: 'BR',
    abdo: 'Mr Abdo: "Red and blue! Red and BLUE!"', rezk: 'Mr Ahmed Rezk: "Blue and yellow. Obviously. Ignore him."',
    after: 'Mr Abdo: "HA! Red and blue! Thirty years I am telling him!"' },
  { name: 'Potion 2: Orange Elixir of Punctuality (for Hussein)', want: 'RY',
    abdo: 'Mr Abdo: "Red and... more red. Always more red."', rezk: 'Mr Ahmed Rezk: "Red and yellow, Hefny. Calmly."',
    after: 'Mr Ahmed Rezk: "Calmly. You see, Abdo? CALMLY."' },
  { name: 'Potion 3: Pink Serum of Calm (for Hefny)', want: 'RW',
    abdo: 'Mr Abdo: "Red and white! A gentle pink, like a sunset over the Nile!"', rezk: 'Mr Ahmed Rezk: "Red and blue. Pink is just shy purple."',
    after: 'Hefny drinks a sip of the Serum of Calm. Nothing happens. He is still Hefny.' },
  { name: 'Final potion: Graduation Draught (mint green)', want: 'BWY',
    abdo: 'Mr Abdo: "Blue and yellow! That is green! Done!"', rezk: 'Mr Ahmed Rezk: "Yellow and white! Soft! Pale!"',
    after: 'They are BOTH half right. Neither of them will ever admit it.' },
];
const ITEMS = ['R', 'B', 'Y', 'W', 'MIX', 'EMPTY'] as const;

export class LabScene extends Encounter {
  private drops: Paint[] = [];
  private sel = 0;
  private beakerLiquid!: Phaser.GameObjects.Image;
  private target!: Phaser.GameObjects.Rectangle;
  private targetName!: Phaser.GameObjects.Text;
  private dropText!: Phaser.GameObjects.Text;
  private pick!: Phaser.GameObjects.Image;
  private labels: Phaser.GameObjects.Text[] = [];
  private hefny!: Phaser.GameObjects.Sprite;
  private abdo!: Phaser.GameObjects.Sprite;
  private rezk!: Phaser.GameObjects.Sprite;
  private hair = 1;
  ri = 0;   // current round (read by tools/playtest.mjs)
  static readonly ROUNDS = ROUNDS;

  constructor() { super('lab'); }

  create() {
    this.drops = []; this.sel = 0; this.labels = []; this.hair = 1;
    this.setup('#10161a', 'lab', true, ['hefny']);
    // the lab: shelves, two teachers, Hefny at the bench
    this.add.rectangle(W / 2, 40, 440, 70, 0x1f2a30).setStrokeStyle(2, 0x3a4a52);
    for (let i = 0; i < 9; i++) this.add.rectangle(40 + i * 50, 30, 10, 18, [0xd8323a, 0x2f6fd8, 0x7fe08a, 0xf2c94c, 0xb05ad8][i % 5], 0.7);
    this.abdo = this.add.sprite(70, 62, 'abdo', 0).setScale(3);
    this.rezk = this.add.sprite(W - 70, 62, 'rezk', 0).setScale(3);
    this.hefny = this.add.sprite(W / 2, 52, 'hefny', 0).setScale(3);
    this.teacher = this.abdo;
    for (const s of [this.abdo, this.rezk, this.hefny]) this.tweens.add({ targets: s, scaleY: 3.08, yoyo: true, repeat: -1, duration: 650 + Math.random() * 200, ease: 'Sine.inOut' });
    // the bench
    this.add.rectangle(W / 2, 112, 360, 40, 0x2a2a33).setStrokeStyle(2, 0x44444f);
    (['R', 'B', 'Y', 'W'] as Paint[]).forEach((p, i) => {
      const x = W / 2 - 150 + i * 46 + (i > 1 ? 112 : 0);
      this.add.image(x, 108, 'flask').setScale(1.5);
      this.add.image(x, 108, 'flaskLiquid').setScale(1.5).setTint(PAINT[p].color); // liquid over the (opaque) glass
      this.labels.push(this.add.text(x, 128, tr(PAINT[p].name), txt(8, { color: '#cfc6b8', rtl: false })).setOrigin(0.5, 0));
    });
    this.add.image(W / 2, 104, 'beakerLiquid').setScale(1.4).setTint(0x1a1a20).setAlpha(0.3);
    this.beakerLiquid = this.add.image(W / 2, 104, 'beakerLiquid').setScale(1.4).setVisible(false);
    this.add.image(W / 2, 104, 'beaker').setScale(1.4);
    this.dropText = this.add.text(W / 2, 128, '', txt(8, { color: '#f4f0e8', rtl: false })).setOrigin(0.5, 0);
    // target card + MIX / EMPTY
    this.target = this.add.rectangle(W - 60, 212, 24, 12, 0xffffff).setStrokeStyle(2, 0xf4f0e8);
    this.targetName = this.add.text(W - 76, 212, tr('TARGET'), txt(8, { color: '#cfc6b8', rtl: false })).setOrigin(1, 0.5);
    ['MIX', 'EMPTY'].forEach((b, i) => {
      const x = 150 + i * 180;
      this.add.rectangle(x, 240, 150, 22).setStrokeStyle(2, 0xe8742a);
      this.labels.push(this.add.text(x, 240, tr(b), txt(8, { color: '#e8742a', rtl: false })).setOrigin(0.5));
    });
    this.pick = this.add.image(0, 0, 'soul').setDepth(7).setVisible(false);
    this.box = { x: 20, y: 146, w: 440, h: 54 };
    this.render();
    void this.flow();
  }

  private itemX(i: number) { return i < 4 ? W / 2 - 150 + i * 46 + (i > 1 ? 112 : 0) : 150 + (i - 4) * 180 - 62; }

  private render() {
    const k = this.drops.length ? key(this.drops) : '';
    this.beakerLiquid.setVisible(!!k).setTint(MIX[k] ?? MUD);
    this.dropText.setText(this.drops.length ? `${num(this.drops.length)}/${num(3)}` : '');
    this.labels.forEach((l, i) => l.setColor(i === this.sel ? '#f2c94c' : i < 4 ? '#cfc6b8' : '#e8742a'));
    this.pick.setPosition(this.itemX(this.sel), this.sel < 4 ? 142 : 240);
  }

  private async flow() {
    await this.say([
      'Mr Abdo: "Four potions, Doctor Hefny. Four signatures— no. ONE signature. From both of us."',
      'Mr Ahmed Rezk: "Choose flasks with LEFT / RIGHT, Z adds a drop. Then MIX. Match the target colour."',
      'Mr Abdo: "Listen to ME." Mr Ahmed Rezk: "Listen to ME."',
    ]);
    for (const r of ROUNDS) {
      this.ri = ROUNDS.indexOf(r);
      this.target.setFillStyle(MIX[r.want]);
      await this.say([r.name, r.abdo, r.rezk]);
      for (;;) {
        const mixed = await this.brew();
        if (mixed === r.want) {
          sfx.win(); this.tweens.add({ targets: this.hefny, y: 46, yoyo: true, repeat: 1, duration: 120 });
          await this.say([r.after]);
          break;
        }
        // KABOOM
        this.boom();
        const dead = this.hurt(5, 'hefny');
        await this.say([Phaser.Utils.Array.GetRandom([
          'BOOM. Hefny\'s hair gets bigger. Somehow.',
          'POOF. A green cloud. Mr Abdo: "Interesting!" Mr Ahmed Rezk: "Not interesting!"',
          'FZZT. The beaker hisses at Hefny. Hefny hisses back.',
        ])]);
        if (dead) return this.detention(['Hefny\'s hair has reached the ceiling. Lab closed for the day.']);
        await this.say([r.abdo, r.rezk]);
      }
    }
    await this.win([
      'Four perfect potions. The lab is silent.',
      'Mr Abdo: "Doctor Hefny..." Mr Ahmed Rezk: "...we have nothing more to teach you."',
      'Mr Abdo: "We never did. You taught yourself. In OUR lab. Without asking."',
    ]);
  }

  /** let the player add drops and press MIX; resolves with the mix key */
  private brew(): Promise<string> {
    this.drops = []; this.render(); this.pick.setVisible(true);
    return new Promise(resolve => {
      this.onKey((k: Key) => {
        if (k === 'left') { this.sel = (this.sel + ITEMS.length - 1) % ITEMS.length; sfx.move(); this.render(); }
        else if (k === 'right') { this.sel = (this.sel + 1) % ITEMS.length; sfx.move(); this.render(); }
        else if (k === 'up' && this.sel >= 4) { this.sel = 2; sfx.move(); this.render(); }
        else if (k === 'down' && this.sel < 4) { this.sel = 4; sfx.move(); this.render(); }
        else if (k === 'ok') {
          const it = ITEMS[this.sel];
          if (it === 'EMPTY') { this.drops = []; sfx.back(); this.render(); }
          else if (it === 'MIX') {
            if (!this.drops.length) { sfx.back(); return; }
            this.onKey(null); this.pick.setVisible(false);
            sfx.react(CAST.hefny.voice, '!');
            resolve(key(this.drops));
          } else if (this.drops.length < 3) {
            this.drops.push(it); sfx.blip(300 + this.drops.length * 120); this.render();
            this.tweens.add({ targets: this.beakerLiquid, scaleY: { from: 1.2, to: 1.4 }, duration: 160 });
          } else sfx.back();
        }
      });
    });
  }

  private boom() {
    sfx.hit(); this.cameras.main.shake(300, 0.02);
    this.add.particles(W / 2, 100, 'cloud', { speed: { min: 40, max: 120 }, scale: { start: 0.8, end: 2 }, alpha: { start: 0.8, end: 0 }, tint: [0x7fd07a, 0x6b5a3a, 0xb05ad8], lifespan: 900, quantity: 14, emitting: false }).explode(14);
    this.hair = Math.min(1.6, this.hair + 0.15);
    this.hefny.setTint(0x6b5a3a); this.time.delayedCall(900, () => this.hefny.clearTint());
    this.tweens.add({ targets: this.hefny, scaleX: 3 * this.hair, duration: 200, yoyo: true });
  }
}
