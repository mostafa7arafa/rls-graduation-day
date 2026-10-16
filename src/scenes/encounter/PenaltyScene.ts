import * as Phaser from 'phaser';
import { W } from '../../config';
import { sfx } from '../../systems/sfx';
import { tr, txt, num } from '../../systems/i18n';
import { CAST } from '../../data/cast';
import { Encounter } from './Encounter';
import type { Key } from './Encounter';

// CHAPTER 7 — the penalty shootout against Karim, on the court, Habeba watching.
// Karim shoots: his sunglasses GLINT toward the side he picks; dive LEFT / UP (middle) / RIGHT in time.
// You shoot (Mostafa and Hefny take turns): Z locks the aim, Z locks the power. Too hard = into the canteen.
// Hefny's last kick carries twelve years of rage. Five each, then sudden death.

type Zone = 0 | 1 | 2;                    // left, middle, right
const GOAL = { x: 150, y: 26, w: 180, h: 84 };
const zoneX = (z: Zone) => GOAL.x + 30 + z * 60;
const SHOOTERS = ['mostafa', 'hefny', 'mostafa', 'hefny', 'hefny'];

export class PenaltyScene extends Encounter {
  private keeper!: Phaser.GameObjects.Sprite;
  private kicker!: Phaser.GameObjects.Sprite;
  private ball!: Phaser.GameObjects.Image;
  private glint!: Phaser.GameObjects.Image;
  private reticle!: Phaser.GameObjects.Image;
  private powerBg!: Phaser.GameObjects.Rectangle;
  private power!: Phaser.GameObjects.Rectangle;
  private scoreText!: Phaser.GameObjects.Text;
  private habeba!: Phaser.GameObjects.Sprite;
  private us = 0; private them = 0; private round = 0;

  constructor() { super('penalty'); }

  create() {
    this.us = 0; this.them = 0; this.round = 0;
    this.setup('#14201a', 'finale', false);
    // the court, the goal (front view)
    this.add.rectangle(W / 2, 110, W, 220, 0x3f9a4a);
    for (let x = 0; x < W; x += 40) this.add.rectangle(x, 0, 20, 220, 0x47a552).setOrigin(0);
    this.add.rectangle(W / 2, 200, 300, 2, 0xeef2e6);
    this.add.ellipse(W / 2, 176, 8, 4, 0xeef2e6);
    const net = this.add.graphics().lineStyle(1, 0xd8dde3, 0.5);
    for (let x = GOAL.x; x <= GOAL.x + GOAL.w; x += 9) net.lineBetween(x, GOAL.y, x, GOAL.y + GOAL.h);
    for (let y = GOAL.y; y <= GOAL.y + GOAL.h; y += 9) net.lineBetween(GOAL.x, y, GOAL.x + GOAL.w, y);
    this.add.rectangle(GOAL.x - 3, GOAL.y - 3, GOAL.w + 6, 5, 0xf4f0e8).setOrigin(0);
    this.add.rectangle(GOAL.x - 3, GOAL.y - 3, 5, GOAL.h + 3, 0xf4f0e8).setOrigin(0);
    this.add.rectangle(GOAL.x + GOAL.w - 2, GOAL.y - 3, 5, GOAL.h + 3, 0xf4f0e8).setOrigin(0);
    // Habeba watching from the side, legendary sparkle included
    this.habeba = this.add.sprite(W - 50, 120, 'habeba', 6).setScale(2.5);
    this.add.particles(W - 50, 120, 'sparkle', { x: { min: -14, max: 14 }, y: { min: -20, max: 10 }, scale: { start: 1.5, end: 0 }, lifespan: 900, frequency: 300 });
    this.add.sprite(50, 130, 'abdelfattah', 0).setScale(2); // even Mr Abdelfattah came to watch
    this.keeper = this.add.sprite(W / 2, 92, 'hussein', 0).setScale(3).setDepth(3);
    this.kicker = this.add.sprite(W / 2, 196, 'karim', 3).setScale(3).setDepth(4);
    this.ball = this.add.image(W / 2, 172, 'ball').setScale(1.5).setDepth(5);
    this.glint = this.add.image(0, 0, 'sparkle').setScale(3).setDepth(9).setVisible(false);
    this.reticle = this.add.image(0, 0, 'soul').setScale(1.5).setDepth(9).setVisible(false);
    this.powerBg = this.add.rectangle(W / 2 + 60, 186, 8, 50, 0x3a2030).setOrigin(0.5, 1).setDepth(9).setVisible(false);
    this.power = this.add.rectangle(W / 2 + 60, 186, 8, 50, 0xf2c94c).setOrigin(0.5, 1).setDepth(9).setVisible(false);
    // scoreboard
    this.scoreText = this.add.text(W / 2, 13, '', txt(8, { color: '#f4f0e8' })).setOrigin(0.5).setDepth(9);
    this.add.rectangle(W / 2, 13, 210, 14, 0x1b1420, 0.8).setDepth(8);
    this.box = { x: 20, y: 222, w: 440, h: 44 };
    this.refresh();
    void this.flow();
  }

  private refresh() {
    this.scoreText.setText(`${tr('US')} ${num(this.us)}  —  ${num(this.them)} ${tr('KARIM')}`);
  }

  private async flow() {
    await this.say([
      'Karim: "Five each. I shoot first. Hussein, try to look at the ball and not at Habeba."',
      'When Karim shoots, watch his sunglasses: they GLINT on the side he picks. Dive LEFT, UP (middle) or RIGHT.',
    ]);
    for (this.round = 0; ; this.round++) {
      const sudden = this.round >= 5;
      if (!(await this.karimShoots())) { this.them++; }
      this.refresh();
      if (!sudden && this.decided(this.round + 1, this.round)) break;
      if (await this.weShoot()) this.us++;
      this.refresh();
      if (sudden ? this.us !== this.them : this.decided(this.round + 1, this.round + 1)) break;
      if (this.round === 4 && this.us === this.them) await this.say(['Level after five! SUDDEN DEATH. Habeba is holding her breath. So is Hussein.']);
    }
    if (this.us > this.them) {
      sfx.cheer();
      await this.win(['The court goes wild. Well: Habeba, Mr Abdelfattah, and a cat. But WILD.', 'Karim takes off his sunglasses. For the first time in twelve years, he has nothing to say.']);
    } else {
      await this.detention(['Karim: "Hahaha! Again? I have all day. I have ALL the days."'], 'KARIM WINS.');
    }
  }

  /** someone can no longer catch up within five kicks each */
  private decided(themTaken: number, usTaken: number) {
    return this.them + (5 - themTaken) < this.us || this.us + (5 - usTaken) < this.them;
  }

  // ───────────────────────────────────────── Karim shoots, Hussein dives
  private async karimShoots(): Promise<boolean> {
    this.keeper.setTexture('hussein', 0).setPosition(W / 2, 92).setAngle(0);
    this.kicker.setTexture('karim', 3).setPosition(W / 2, 196);
    this.ball.setPosition(W / 2, 172).setScale(1.5);
    const r = this.round;
    const lines = [['Karim places the ball. He kisses his gold watch.'], ['Karim takes a long run-up. Unnecessarily long.'],
      ['Habeba waves at Hussein. Hussein waves back. KARIM SHOOTS—'], ['Karim adjusts his sunglasses. Smirks.'], ['Karim: "This one is for the Instagram."']];
    await this.say(lines[Math.min(r, 4)]);
    if (r === 2) { this.habeba.setFrame(0); sfx.react(CAST.hussein.voice, '<3'); }
    const target = Phaser.Math.Between(0, 2) as Zone;
    const tell = Math.max(260, 650 - r * 90) * (r === 2 ? 0.6 : 1);
    let dive: Zone = 1, dived = false;
    this.onKey((k: Key) => {
      if (dived) return;
      if (k === 'left' || k === 'up' || k === 'right') { dived = true; dive = k === 'left' ? 0 : k === 'up' ? 1 : 2; this.diveTo(dive); }
    });
    await this.wait(500);
    // the glint: on the side he will shoot (from the keeper's view)
    this.glint.setPosition(W / 2 + (target - 1) * 14, 180).setVisible(true); sfx.blip(1400);
    await this.wait(tell);
    this.glint.setVisible(false);
    // run-up and shot
    this.tweens.add({ targets: this.kicker, y: 184, duration: 220 });
    await this.wait(240); sfx.kick();
    await new Promise<void>(res => this.tweens.add({ targets: this.ball, x: zoneX(target), y: GOAL.y + 40, scale: 1, duration: 420, onComplete: () => res() }));
    this.onKey(null);
    const saved = dive === target;
    if (saved) {
      sfx.hit(); this.tweens.add({ targets: this.ball, x: this.ball.x + (target - 1) * 60, y: 150, duration: 300 });
      await this.say([Phaser.Utils.Array.GetRandom(['SAVED! Hussein, with his face! On purpose!', 'SAVED! The gloves! THE GLOVES!', 'SAVED! Hussein looks at Habeba. Habeba is clapping. Hussein forgets his own name.'])]);
    } else {
      sfx.back();
      await this.say([Phaser.Utils.Array.GetRandom(['Goal. Karim does a little dance. Hefny\'s eye twitches.', 'Goal. Karim points at the sky. Then at Habeba. Then at himself.', 'Goal. Hussein dived the wrong way with total confidence.'])]);
    }
    return saved;
  }

  private diveTo(z: Zone) {
    sfx.select();
    this.keeper.setFrame(z === 1 ? 0 : 6).setFlipX(z === 2);
    this.tweens.add({ targets: this.keeper, x: zoneX(z), y: z === 1 ? 70 : 96, angle: z === 0 ? -60 : z === 2 ? 60 : 0, duration: 200 });
  }

  // ───────────────────────────────────────── we shoot, Karim dives
  private async weShoot(): Promise<boolean> {
    const who = this.round < 5 ? SHOOTERS[this.round] : this.round % 2 ? 'hefny' : 'mostafa';
    const rage = who === 'hefny' && this.round === 4;
    this.keeper.setTexture('karim', 0).setPosition(W / 2, 92).setAngle(0).setFlipX(false);
    this.kicker.setTexture(who, 3).setPosition(W / 2, 196);
    this.ball.setPosition(W / 2, 172).setScale(1.5);
    await this.say([rage ? 'Hefny steps up. Twelve years of Karim. Twelve years of headers. Twelve years of "Karim says hi".'
      : who === 'mostafa' ? 'Mostafa steps up and calculates the optimal angle. Z to lock the AIM.' : 'Hefny steps up. He breathes. In. Out. "KARIM." Z to lock the AIM.']);
    // aim: the reticle sweeps across the goal
    const x = await this.sweep((t) => { this.reticle.setPosition(GOAL.x + 10 + (Math.sin(t * 0.0042) * 0.5 + 0.5) * (GOAL.w - 20), GOAL.y + 40).setVisible(true); return this.reticle.x; });
    // power: the bar pumps up and down
    let p = 0;
    if (rage) {
      this.powerBg.setVisible(true); this.power.setVisible(true).setFillStyle(0xff4040);
      this.tweens.add({ targets: this.power, scaleY: { from: 0, to: 1.3 }, duration: 600 });
      sfx.react(CAST.hefny.voice, '#'); this.cameras.main.shake(500, 0.01); await this.wait(800);
      p = 100;
    } else {
      this.powerBg.setVisible(true); this.power.setVisible(true).setFillStyle(0xf2c94c);
      p = await this.sweep((t) => { const v = Math.abs(Math.sin(t * 0.0035)) * 100; this.power.setScale(1, v / 100).setFillStyle(v > 90 ? 0xff4040 : v > 40 ? 0x9fe09a : 0xf2c94c); return v; });
    }
    this.reticle.setVisible(false); this.powerBg.setVisible(false); this.power.setVisible(false).setScale(1, 1);
    const zone = Math.min(2, Math.max(0, Math.floor((x - GOAL.x) / (GOAL.w / 3)))) as Zone;
    const karim = Phaser.Math.Between(0, 2) as Zone;
    this.tweens.add({ targets: this.kicker, y: 184, duration: 200 });
    await this.wait(220); sfx.kick();
    this.diveKarim(karim);
    const over = p > 90 && !rage, weak = p < 22;
    await new Promise<void>(res => this.tweens.add({ targets: this.ball, x, y: over ? GOAL.y - 30 : GOAL.y + 40, scale: 1, duration: rage ? 200 : 420, onComplete: () => res() }));
    let goal = !over && !weak && (zone !== karim || p >= 75);
    if (rage) goal = true;
    if (goal) {
      sfx.cheer(); this.cameras.main.flash(200, 255, 255, 255);
      await this.say([rage ? 'The ball goes THROUGH Karim\'s gloves, through the net, and lands in the canteen. The auntie keeps it.'
        : Phaser.Utils.Array.GetRandom(['GOAL! Mostafa celebrates like he just fixed a bug in production.', 'GOAL! Even Karim nods. Slightly.', 'GOAL! Mr Abdelfattah starts reciting a poem about it.'])]);
    } else {
      sfx.back();
      await this.say([over ? 'Over the bar! Over the fence! Into the canteen! The auntie sends it back with a bill.'
        : weak ? 'A gentle roll. Karim picks it up, yawns, and checks his phone.' : 'Saved. Karim catches it with one hand and pretends it was easy. It was.']);
    }
    return goal;
  }

  private diveKarim(z: Zone) {
    this.keeper.setFrame(z === 1 ? 0 : 6).setFlipX(z === 2);
    this.tweens.add({ targets: this.keeper, x: zoneX(z), y: z === 1 ? 70 : 96, angle: z === 0 ? -60 : z === 2 ? 60 : 0, duration: 220 });
  }

  /** runs `f(time)` every frame until Z is pressed; resolves with f's last value */
  private sweep(f: (t: number) => number): Promise<number> {
    let v = 0; const start = this.time.now;
    return new Promise(resolve => {
      const ev = this.time.addEvent({ delay: 16, loop: true, callback: () => { v = f(this.time.now - start); } });
      this.onKey((k) => { if (k === 'ok') { ev.remove(); this.onKey(null); sfx.select(); resolve(v); } });
    });
  }
}
