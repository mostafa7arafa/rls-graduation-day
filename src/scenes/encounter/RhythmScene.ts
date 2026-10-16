import * as Phaser from 'phaser';
import { W } from '../../config';
import { sfx } from '../../systems/sfx';
import { music } from '../../systems/music';
import { tr, txt, fmt } from '../../systems/i18n';
import { CAST } from '../../data/cast';
import { Encounter } from './Encounter';
import type { Key } from './Encounter';

// CHAPTER 6 — Mr Amr's workout on the court: three sets on the Saidi beat.
// Arrows scroll left toward the line; press that arrow as it crosses. Misses cost dignity (and muscles).
// Pass with 60% of the moves hit.

const BPM = 120, BEAT = 60000 / BPM;      // must match the 'rhythm' track in music.ts
const TRAVEL = 2 * BEAT;                  // an arrow is on screen for two beats
const HIT_X = 110, SPAWN_X = 446;
const LANES: Key[] = ['left', 'down', 'up', 'right'];
const LANE_Y = [100, 118, 136, 154];
const ANGLE: Record<string, number> = { left: 180, down: 90, up: -90, right: 0 };
const PASS = 0.6;

// beat offsets per set (fractions = off-beats)
const SETS: { name: string; intro: string; moves: [number, Key][] }[] = [
  { name: 'SET 1: PUSH-UPS', intro: 'Mr Amr: "SET ONE! PUSH-UPS! DOWN on the beat, UP on the next! Like the national team!"',
    moves: Array.from({ length: 16 }, (_, i) => [i, i % 2 ? 'up' : 'down'] as [number, Key]) },
  { name: 'SET 2: JUMPING JACKS', intro: 'Mr Amr: "SET TWO! JUMPING JACKS! LEFT, RIGHT! Hussein, the OTHER left!"',
    moves: Array.from({ length: 16 }, (_, i) => i).filter(i => i % 4 !== 3).map(i => [i, i % 2 ? 'right' : 'left'] as [number, Key]) },
  { name: 'SET 3: BURPEES', intro: 'Mr Amr: "SET THREE! BURPEES! Everything! All at once! This is what the army does!"',
    moves: ([[0, 'down'], [1, 'up'], [2, 'left'], [2.5, 'right'], [3, 'up'], [4, 'down'], [5, 'down'], [5.5, 'up'], [6, 'left'], [7, 'right'],
      [8, 'up'], [8.5, 'down'], [9, 'up'], [10, 'left'], [10.5, 'left'], [11, 'right'], [12, 'down'], [13, 'up'], [13.5, 'down'], [14, 'up'], [15, 'right']] as [number, Key][]) },
];
const OUCH = [
  'Hussein pulls a muscle he did not know he had.',
  'Hussein pulls ANOTHER muscle. Mr Amr writes it down.',
  'Mostafa\'s back makes a noise like a dial-up modem.',
  'Hefny\'s hair is doing more push-ups than Hefny.',
];

interface Note { img: Phaser.GameObjects.Image; lane: number; at: number; done: boolean }

export class RhythmScene extends Encounter {
  private notes: Note[] = [];
  private hits = 0; private total = 0; private ouches = 0;
  private boys: Phaser.GameObjects.Sprite[] = [];
  private judge!: Phaser.GameObjects.Text;
  private meter!: Phaser.GameObjects.Text;
  private setLabel!: Phaser.GameObjects.Text;

  constructor() { super('rhythm'); }

  create() {
    this.notes = []; this.hits = 0; this.total = 0; this.ouches = 0; this.boys = [];
    this.setup('#14201a', 'rhythm');
    // the court, the boys, Mr Amr
    this.add.rectangle(W / 2, 46, 460, 80, 0x3f9a4a).setStrokeStyle(2, 0xeef2e6);
    this.add.line(0, 0, W / 2, 8, W / 2, 84, 0xeef2e6).setOrigin(0);
    ['mostafa', 'hussein', 'hefny'].forEach((p, i) => this.boys.push(this.add.sprite(70 + i * 40, 52, p, 6).setScale(2.5).setFlipX(true)));
    this.addTeacher('amr', W - 70, 48, 3);
    this.setLabel = this.add.text(W / 2, 16, '', txt(8, { color: '#f2c94c' })).setOrigin(0.5);
    // the lanes
    this.add.rectangle(20, 90, 440, 74, 0x000000).setOrigin(0).setStrokeStyle(2, 0xf4f0e8);
    LANE_Y.forEach(y => this.add.rectangle(24, y, 432, 1, 0x3a3436).setOrigin(0, 0.5));
    this.add.rectangle(HIT_X, 127, 3, 70, 0xf2c94c).setAlpha(0.8);
    LANES.forEach((l, i) => this.add.image(HIT_X, LANE_Y[i], 'arrow').setAngle(ANGLE[l]).setAlpha(0.3));
    this.judge = this.add.text(HIT_X, 176, '', txt(8, { color: '#f2c94c' })).setOrigin(0.5).setDepth(8);
    this.meter = this.add.text(W - 24, 212, '', txt(8, { color: '#9fe09a' })).setOrigin(1, 0.5);
    this.box = { x: 20, y: 222, w: 440, h: 44 };
    this.refresh();
    void this.flow();
  }

  private refresh() {
    const pct = this.total ? Math.round(100 * this.hits / this.total) : 100;
    this.meter.setText(fmt('FITNESS {n}%', { n: pct }));
  }

  private async flow() {
    music.stop(0.05);
    await this.say([
      'Mr Amr: "*TWEEEET* Arrows come from the right. When an arrow touches the yellow line, PRESS IT."',
      'Mr Amr: "Three sets. Miss too many and you do it AGAIN. Ready? Of course you are not ready. GO!"',
    ]);
    for (const set of SETS) {
      await this.say([set.intro]);
      this.hideBox();
      const ok = await this.play(set.name, set.moves);
      if (!ok) return this.detention(['Mr Amr: "Pathetic! Glorious! Pathetic! Again tomorrow! ...There is no tomorrow. Again NOW."']);
    }
    this.setLabel.setText('');
    if (this.hits / this.total < PASS) {
      return this.detention(['Mr Amr looks at his clipboard for a long time.', 'Mr Amr: "...Again. From the top."']);
    }
    await this.win(['Mr Amr blows the whistle for eleven seconds. It is a happy whistle.', 'Mr Amr: "THAT is how the national team does it! Well. Close enough."']);
  }

  /** run one set; resolves false if dignity runs out */
  private play(name: string, moves: [number, Key][]): Promise<boolean> {
    this.setLabel.setText(tr(name));
    music.play('rhythm');
    // the music's first downbeat lands ~100ms after play(); give two beats of lead-in
    const t0 = this.time.now + 100 + 2 * BEAT;
    const pending = moves.map(([b, k]) => ({ at: t0 + b * BEAT, lane: LANES.indexOf(k) }));
    const last = t0 + Math.max(...moves.map(m => m[0])) * BEAT;
    sfx.whistle();
    this.onKey((k) => {
      const lane = LANES.indexOf(k); if (lane < 0) return;
      const now = this.time.now;
      const n = this.notes.filter(x => !x.done && x.lane === lane).sort((a, b) => Math.abs(a.at - now) - Math.abs(b.at - now))[0];
      if (!n || Math.abs(n.at - now) > 170) return;
      n.done = true; n.img.destroy();
      this.hits++; this.total++; this.refresh();
      this.flash(Math.abs(n.at - now) < 80 ? 'PERFECT!' : 'GOOD', '#f2c94c');
      this.pose(LANES[lane]);
    });
    return new Promise(resolve => {
      const timer = this.time.addEvent({ delay: 16, loop: true, callback: () => {
        const now = this.time.now;
        while (pending.length && pending[0].at - TRAVEL <= now) {
          const p = pending.shift()!;
          this.notes.push({ img: this.add.image(SPAWN_X, LANE_Y[p.lane], 'arrow').setAngle(ANGLE[LANES[p.lane]]).setDepth(5), lane: p.lane, at: p.at, done: false });
        }
        for (const n of this.notes) {
          if (n.done) continue;
          n.img.x = HIT_X + (n.at - now) / TRAVEL * (SPAWN_X - HIT_X);
          if (now - n.at > 200) { // missed
            n.done = true; n.img.destroy(); this.total++; this.refresh();
            this.flash('MISS', '#ff4040');
            const dead = this.hurt(1);
            if (this.total % 5 === 0) this.ouch();
            if (dead) { finish(false); return; }
          }
        }
        this.notes = this.notes.filter(n => !n.done);
        if (now > last + 400 && !pending.length && !this.notes.length) finish(true);
      } });
      // Mr Amr pumps on every beat
      const beat = this.time.addEvent({ delay: BEAT, startAt: 0, loop: true, callback: () => {
        this.tweens.add({ targets: this.teacher, scaleX: 3.3, yoyo: true, duration: 90 });
      } });
      const finish = (ok: boolean) => {
        timer.remove(); beat.remove(); this.onKey(null);
        this.notes.forEach(n => n.img.destroy()); this.notes = [];
        music.stop(0.2);
        resolve(ok);
      };
    });
  }

  private flash(word: string, color: string) {
    this.judge.setText(tr(word)).setColor(color).setScale(1.4).setAlpha(1);
    this.tweens.add({ targets: this.judge, scale: 1, alpha: 0, delay: 200, duration: 300 });
  }

  /** the boys do the move */
  private pose(k: Key) {
    this.boys.forEach((b) => {
      if (k === 'down') this.tweens.add({ targets: b, scaleY: 1.6, y: 58, duration: 80, yoyo: true });
      else if (k === 'up') this.tweens.add({ targets: b, y: 44, duration: 80, yoyo: true });
      else { b.setFrame(k === 'left' ? 0 : 3); this.time.delayedCall(140, () => b.setFrame(6)); this.tweens.add({ targets: b, x: b.x + (k === 'left' ? -4 : 4), duration: 70, yoyo: true }); }
    });
  }

  private ouch() {
    const line = OUCH[this.ouches++ % OUCH.length];
    sfx.react(CAST.hussein.voice, 'ow');
    this.judge.setText(tr(line)).setColor('#ff7a7a').setScale(1).setAlpha(1).setX(W / 2);
    this.tweens.add({ targets: this.judge, alpha: 0, delay: 1500, duration: 400, onComplete: () => this.judge.setX(HIT_X) });
  }
}
