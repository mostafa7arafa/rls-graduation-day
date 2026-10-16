import * as Phaser from 'phaser';
import { W, FONT } from '../../config';
import { sfx } from '../../systems/sfx';
import { tr, txt, num } from '../../systems/i18n';
import { Encounter } from './Encounter';
import type { Key } from './Encounter';

// CHAPTER 3 — Mr Yasser's spelling rain. He writes a word on the board, then erases it (smugly).
// Spellings rain down; Hussein — goalkeeper — catches the correct one with his gloves and lets the
// misspellings fall. LEFT/RIGHT to move, Z to dive. The words stay English in both languages: it's English class.

// NO_TR: English spelling words are the game itself, never translated
const NO_TR_WORDS: [string, string[]][] = [
  ['SCHOOL', ['SKOOL', 'SCOOL', 'SHCOOL', 'SCHOL']],
  ['FRIEND', ['FREIND', 'FRIND', 'FRENDE', 'FREND']],
  ['BECAUSE', ['BECUASE', 'BICOZ', 'BECAUS', 'BEECAUSE']],
  ['ENGLISH', ['INGLISH', 'ENGLISCH', 'ENGLSH', 'ENGRISH']],
  ['BUSINESS', ['BUISNESS', 'BUSNESS', 'BISNIS', 'BUSINES']],
  ['NECESSARY', ['NECCESARY', 'NECESARY', 'NESSECARY', 'NECESSERY']],
];
const TAUNTS = [
  'Mr Yasser: "My red pen is getting thirsty."',
  'Mr Yasser: "In my class we say BECAUSE. Not BICOZ."',
  'Mr Yasser: "Concentrate! The word is RIGHT THERE. Somewhere."',
  'Mr Yasser: "Spell it like you MEAN it, Hussein."',
];
const AREA = { x: 24, y: 78, w: 432, h: 118 };
const FLOOR = AREA.y + AREA.h - 4;

interface Drop { t: Phaser.GameObjects.Text; ok: boolean; vy: number }

export class SpellingScene extends Encounter {
  private keeper!: Phaser.GameObjects.Sprite;
  private board!: Phaser.GameObjects.Text;
  private bubble!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Text;
  private drops: Drop[] = [];
  private held = { left: false, right: false };
  private dive = 0; private diveDir = 1; private cooldown = 0;
  private playing = false; private caught = false;
  private round = 0;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() { super('spelling'); }

  create() {
    this.drops = []; this.round = 0; this.playing = false; this.held = { left: false, right: false }; this.dive = 0; this.cooldown = 0;
    this.setup('#120d16', 'spelling');
    this.keys = this.input.keyboard!.addKeys('LEFT,RIGHT,A,D') as Record<string, Phaser.Input.Keyboard.Key>;
    // blackboard across the top, Mr Yasser beside it
    this.add.rectangle(W / 2 - 30, 38, 300, 60, 0x2f4a3a).setStrokeStyle(4, 0x5c4433);
    this.board = this.add.text(W / 2 - 30, 38, '', { fontFamily: FONT, fontSize: '16px', color: '#e8efe6' }).setOrigin(0.5);
    this.addTeacher('yasser', W / 2 + 160, 40, 3);
    this.bubble = this.add.text(W / 2 + 60, 4, '', txt(8, { color: '#1b1420', backgroundColor: '#f4f0e8', padding: { x: 4, y: this.ar ? 0 : 3 }, wordWrap: { width: 150 } })).setOrigin(0, 0).setDepth(8).setVisible(false);
    this.progress = this.add.text(W - 24, 212, '', txt(8, { color: '#9fe09a', rtl: false })).setOrigin(1, 0.5);
    // the rain area and our goalkeeper
    this.add.rectangle(AREA.x, AREA.y, AREA.w, AREA.h, 0x000000).setOrigin(0).setStrokeStyle(2, 0xf4f0e8);
    this.keeper = this.add.sprite(W / 2, FLOOR - 12, 'hussein', 3).setScale(1.5).setDepth(4);
    this.box = { x: 20, y: 222, w: 440, h: 44 };
    this.refreshProgress();
    void this.flow();
  }

  private refreshProgress() { this.progress.setText(`${tr('WORDS')} ${num(this.round)}/${num(NO_TR_WORDS.length)}`); }

  private taunt(line: string) {
    this.bubble.setText(tr(line)).setVisible(true);
    this.time.delayedCall(2200, () => this.bubble.setVisible(false));
  }

  private async flow() {
    await this.say([
      'Mr Yasser: "Spelling test. I write the word. I erase the word. You catch the word."',
      'LEFT / RIGHT to move Hussein, Z to dive. Catch the CORRECT spelling with your gloves. Let the wrong ones fall.',
    ]);
    this.hideBox();
    for (this.round = 0; this.round < NO_TR_WORDS.length; this.round++) {
      this.refreshProgress();
      const [word, wrong] = NO_TR_WORDS[this.round];
      // write it on the board... then erase it
      for (let i = 1; i <= word.length; i++) { this.board.setText(word.slice(0, i)); sfx.blip(330); await this.wait(70); }
      await this.wait(this.round < 2 ? 1600 : 1100);
      this.board.setText('? '.repeat(Math.min(word.length, 9)).trim());
      sfx.back();
      if (this.round === 0) this.taunt('Mr Yasser erases the board. Smugly.');
      const ok = await this.rain(word, wrong);
      if (!ok) return this.detention(['Mr Yasser: "Red pen. RED PEN. Hussein, your page looks like a crime scene."']);
      sfx.win(); this.board.setText(word);
      this.tweens.add({ targets: this.keeper, y: this.keeper.y - 8, yoyo: true, duration: 120 });
      await this.wait(700);
    }
    this.refreshProgress();
    await this.win(['Six words. Zero mistakes left in Hussein\'s gloves.', 'Mr Yasser: "...Acceptable. BARELY."']);
  }

  /** one word's rain: resolves true when the correct spelling is caught, false if dignity runs out */
  private rain(word: string, wrong: string[]): Promise<boolean> {
    this.playing = true; this.caught = false;
    const speed = 34 + this.round * 7;
    let sinceCorrect = 0, t = 0;
    this.onKey((k: Key) => {
      if (k === 'ok' && this.cooldown <= 0) {
        this.diveDir = this.held.left ? -1 : this.held.right ? 1 : (this.keeper.flipX ? 1 : -1);
        this.dive = 180; this.cooldown = 600; sfx.select();
        this.keeper.setFrame(6).setFlipX(this.diveDir > 0).setAngle(this.diveDir * 70);
      }
    });
    return new Promise(resolve => {
      const spawn = this.time.addEvent({ delay: Math.max(520, 900 - this.round * 70), loop: true, callback: () => {
        sinceCorrect++;
        const ok = sinceCorrect >= 4 || Math.random() < 0.3;
        if (ok) sinceCorrect = 0;
        const s = ok ? word : Phaser.Utils.Array.GetRandom(wrong);
        const x = Phaser.Math.Between(AREA.x + 30, AREA.x + AREA.w - 30);
        const txtObj = this.add.text(x, AREA.y + 4, s, { fontFamily: FONT, fontSize: '8px', color: '#f4f0e8', backgroundColor: '#2a2026', padding: { x: 2, y: 2 } }).setOrigin(0.5, 0).setDepth(3);
        this.drops.push({ t: txtObj, ok, vy: speed + Math.random() * 14 });
      } });
      const tick = this.time.addEvent({ delay: 16, loop: true, callback: () => {
        t += 16;
        if (t % 4000 < 16) this.taunt(TAUNTS[Math.floor(t / 4000) % TAUNTS.length]);
        for (const d of this.drops) d.t.y += d.vy * 0.016;
        const hx = this.keeper.x, hy = this.keeper.y;
        for (const d of [...this.drops]) {
          const b = d.t.getBounds();
          const hit = b.bottom > hy - 14 && b.top < hy + 4 && b.right > hx - 16 && b.left < hx + 16;
          if (hit) {
            d.t.destroy(); this.drops.splice(this.drops.indexOf(d), 1);
            if (d.ok) { this.caught = true; }
            else {
              const dead = this.hurt(3, 'hussein');
              this.taunt(Phaser.Utils.Array.GetRandom(['Mr Yasser: "WRONG! Red pen!"', 'Mr Yasser: "That is not a word. That is a cry for help."', 'Mr Yasser: "Hussein. HUSSEIN."']));
              if (dead) { done(false); return; }
            }
          } else if (b.top > FLOOR + 6) { d.t.destroy(); this.drops.splice(this.drops.indexOf(d), 1); }
        }
        if (this.caught) done(true);
      } });
      const done = (ok: boolean) => {
        spawn.remove(); tick.remove(); this.playing = false; this.onKey(null);
        this.drops.forEach(d => d.t.destroy()); this.drops = [];
        this.keeper.setAngle(0).setFrame(3);
        resolve(ok);
      };
    });
  }

  update(_t: number, dt: number) {
    if (!this.playing) return;
    const k = this.keys;
    const left = k.LEFT.isDown || k.A.isDown, right = k.RIGHT.isDown || k.D.isDown;
    this.held = { left, right };
    this.cooldown -= dt;
    let vx = (right ? 1 : 0) - (left ? 1 : 0);
    let sp = 150;
    if (this.dive > 0) { this.dive -= dt; vx = this.diveDir; sp = 340; if (this.dive <= 0) this.keeper.setAngle(0); }
    this.keeper.x = Phaser.Math.Clamp(this.keeper.x + vx * sp * dt / 1000, AREA.x + 16, AREA.x + AREA.w - 16);
    if (this.dive <= 0) {
      if (vx) { this.keeper.setFlipX(vx > 0); this.keeper.anims.play('hussein-walk-side', true); }
      else { this.keeper.anims.stop(); this.keeper.setFrame(3); }
    }
  }
}
