import * as Phaser from 'phaser';
import { W } from '../../config';
import { sfx } from '../../systems/sfx';
import { tr, txt } from '../../systems/i18n';
import { CAST } from '../../data/cast';
import { Encounter, label } from './Encounter';
import type { Key } from './Encounter';

// CHAPTER 2 — Sheikh Nasser's quiz. The right answer is whatever HE believes.
// 5 agreeable answers out of 7 to pass. A wrong one costs dignity; so does the clock running out.
// Lifelines, one use each: Mostafa googles (crosses out the TRUE answer — he'll never accept it),
// Hussein looks pitiful (a hint), Hefny corrects him (reveals his answer, at a price).

interface Q { q: string; options: string[]; his: number; real: number; right: string; hint: string }

const QUESTIONS: Q[] = [
  { q: 'How many legs does a spider have?', options: ['6', '8', '10', 'Depends on its mood'], his: 0, real: 1,
    right: 'Sheikh Nasser: "Six! Like an ant. A spider is a big ant. Everybody knows this."',
    hint: 'Sheikh Nasser: "Think of an ant, my son. A BIG ant."' },
  { q: 'What is the capital of Australia?', options: ['Sydney', 'Canberra', 'Austria', 'Vienna'], his: 2, real: 1,
    right: 'Sheikh Nasser: "Austria. It is in the NAME, habibi. Australia, Austria. Same family."',
    hint: 'Sheikh Nasser: "AUS-tralia. AUS-tria. The answer is hiding in the name, habibi."' },
  { q: 'What do bees make?', options: ['Honey', 'Milk', 'Wax', 'Problems'], his: 0, real: 0,
    right: 'Sheikh Nasser: "Honey! Of course. Did you think I would get THAT one wrong?"',
    hint: 'Sheikh Nasser: "This one is easy, my son. Even Hussein knows this one."' },
  { q: 'Which planet is closest to the sun?', options: ['Mercury', 'Venus', 'The moon', 'Mars'], his: 2, real: 0,
    right: 'Sheikh Nasser: "The moon. I have seen it myself. Very close. And in the afternoon, VERY hot."',
    hint: 'Sheikh Nasser: "Look up at night, habibi. What is the closest thing you see?"' },
  { q: 'How many minutes are in an hour?', options: ['60', '100', '40', 'Depends on the class'], his: 3, real: 0,
    right: 'Sheikh Nasser: "Depends! My class: forty minutes. Math class: three hours. This is SCIENCE."',
    hint: 'Sheikh Nasser: "Think of Mr Abdelkareem\'s class, my son. Did it feel like sixty minutes?"' },
  { q: 'What gas do plants breathe in?', options: ['Oxygen', 'Carbon dioxide', 'Smoke', 'None, they\'re plants'], his: 3, real: 1,
    right: 'Sheikh Nasser: "None! They are PLANTS. Have you ever seen a tree breathing? Exactly."',
    hint: 'Sheikh Nasser: "Habibi. Have you EVER seen a tree breathing?"' },
  { q: 'Who invented the light bulb?', options: ['Edison', 'Tesla', 'An Egyptian', 'Mr Abdelfattah'], his: 2, real: 0,
    right: 'Sheikh Nasser: "An Egyptian! Everything was invented by an Egyptian first. Then they took it."',
    hint: 'Sheikh Nasser: "Habibi... who invented EVERYTHING?"' },
];
const LECTURES = [
  'Sheikh Nasser: "Wrong! Where did you learn that? The INTERNET?"',
  'Sheikh Nasser: "No, no, no. This is why your generation needs me."',
  'Sheikh Nasser: "That is what the books say. Books do not know everything, habibi."',
  'Sheikh Nasser: "Hefny, did you tell them that? I can see it in your face."',
];
const LIFELINES = [
  { who: 'mostafa', label: 'Mostafa · Google it' },
  { who: 'hussein', label: 'Hussein · Look pitiful' },
  { who: 'hefny', label: 'Hefny · Correct him' },
];
const NEED = 5, TIME = 15000, BOX = { x: 20, y: 124, w: 440, h: 76 };

export class QuizScene extends Encounter {
  static readonly QUESTIONS = QUESTIONS;   // read by tools/playtest.mjs
  qIndex = -1;
  private score = 0;
  private used: boolean[] = [];
  private optTexts: Phaser.GameObjects.Text[] = [];
  private lifeBtns: { bg: Phaser.GameObjects.Rectangle; t: Phaser.GameObjects.Text }[] = [];
  private qText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timerBar!: Phaser.GameObjects.Rectangle;
  private pick!: Phaser.GameObjects.Image;

  constructor() { super('quiz'); }

  create() {
    this.score = 0; this.used = [false, false, false]; this.optTexts = []; this.lifeBtns = [];
    this.setup('#14201a', 'quiz');
    // the mosque corner: green mats under a wooden arch
    this.add.rectangle(W / 2, 58, 300, 92, 0x2f7a4a).setStrokeStyle(4, 0x8a5a36);
    for (let i = 0; i < 5; i++) this.add.rectangle(W / 2 - 120 + i * 60, 62, 44, 70, 0x3e9a5c).setStrokeStyle(2, 0xd8b25a);
    this.addTeacher('nasser');
    this.scoreText = this.add.text(W / 2, 113, '', txt(8, { color: '#9fe09a' })).setOrigin(0.5).setDepth(6);
    this.add.rectangle(BOX.x, BOX.y + BOX.h + 3, BOX.w, 3, 0x3a2030).setOrigin(0, 0.5);
    this.timerBar = this.add.rectangle(BOX.x, BOX.y + BOX.h + 3, BOX.w, 3, 0xf2c94c).setOrigin(0, 0.5).setDepth(6);
    this.qText = this.add.text(0, 0, '', txt(8, { color: '#f2c94c', wordWrap: { width: BOX.w - 24 } })).setOrigin(this.ar ? 1 : 0, 0).setDepth(6);
    for (let i = 0; i < 4; i++) this.optTexts.push(this.add.text(0, 0, '', txt(8, { color: '#f4f0e8' })).setOrigin(this.ar ? 1 : 0, 0).setDepth(6));
    LIFELINES.forEach((l, i) => {
      const x = 24 + i * 148;
      const bg = this.add.rectangle(x, 228, 138, 24).setOrigin(0).setStrokeStyle(2, 0xe8742a);
      this.add.image(x + 12, 240, `${l.who}_face`).setScale(1);
      const t = this.add.text(x + 24, 240, tr(l.label), txt(8, { color: '#e8742a', rtl: false, wordWrap: { width: 110 } })).setOrigin(0, 0.5);
      this.lifeBtns.push({ bg, t });
    });
    this.pick = this.add.image(0, 0, 'soul').setDepth(7).setVisible(false);
    this.refreshScore();
    void this.flow();
  }

  private refreshScore() { this.scoreText.setText(`${tr('SHEIKH NASSER AGREES')}: ${label(String(this.score))}/${label(String(NEED))}`); }

  private async flow() {
    this.box = { ...BOX };
    await this.say([
      'Sheikh Nasser\'s QUIZ!',
      'Answer what HE believes, not what the books say. Five agreeable answers to pass.',
      'Lifelines below, one use each. The clock is ticking.',
    ]);
    for (let i = 0; i < QUESTIONS.length; i++) {
      const left = QUESTIONS.length - i;
      if (this.score + left < NEED) break;
      const ok = await this.ask(QUESTIONS[i]);
      if (this.dignity <= 0) return this.detention(['Sheikh Nasser shakes his head sadly. "You read too many books, my sons."']);
      if (ok) { this.score++; this.refreshScore(); }
      if (this.score >= NEED) return this.win(['Five agreeable answers! Sheikh Nasser is BEAMING.', 'Sheikh Nasser: "Finally. Students who LISTEN."']);
    }
    await this.detention(['Not enough agreeable answers.', 'Sheikh Nasser: "Hefny has poisoned your minds with SCIENCE."']);
  }

  /** one question: returns true when the player picked Sheikh Nasser's answer */
  private ask(q: Q): Promise<boolean> {
    this.qIndex = QUESTIONS.indexOf(q);
    const struck = [false, false, false, false];
    let sel = 0, busy = false, done = false, remaining = TIME;
    const ar = this.ar, b = BOX;
    const render = () => {
      this.drawBox(b);
      this.qText.setText(tr(q.q)).setPosition(ar ? b.x + b.w - 12 : b.x + 12, b.y + (ar ? 3 : 8)).setVisible(true);
      q.options.forEach((o, i) => {
        const c = i % 2, r = Math.floor(i / 2);
        const x = ar ? b.x + b.w - 32 - c * 214 : b.x + 32 + c * 214, y = b.y + (ar ? 26 : 30) + r * (ar ? 21 : 18);
        this.optTexts[i].setText((struck[i] ? '× ' : '') + label(o)).setPosition(x, y).setVisible(true)
          .setColor(struck[i] ? '#6d5b64' : sel === i ? '#f2c94c' : '#f4f0e8');
      });
      this.lifeBtns.forEach((l, i) => {
        const on = sel === 4 + i;
        l.bg.setStrokeStyle(2, this.used[i] ? 0x4a3c43 : on ? 0xf2c94c : 0xe8742a);
        l.t.setColor(this.used[i] ? '#6d5b64' : on ? '#f2c94c' : '#e8742a');
      });
      if (sel < 4) {
        const c = sel % 2, r = Math.floor(sel / 2);
        this.pick.setPosition(ar ? b.x + b.w - 20 - c * 214 : b.x + 20 + c * 214, b.y + (ar ? 34 : 34) + r * (ar ? 21 : 18));
      } else this.pick.setPosition(24 + (sel - 4) * 148 - 6, 240);
      this.pick.setVisible(!busy);
    };
    const clear = () => { this.qText.setVisible(false); this.optTexts.forEach(t => t.setVisible(false)); this.pick.setVisible(false); };

    return new Promise(resolve => {
      const finish = async (answer: number) => {
        done = true; busy = true; timer.remove(); clear();
        if (answer === -1) {
          this.hurt(3);
          await this.say(['Time\'s up! Sheikh Nasser: "Silence is not an answer, habibi. Except in my class."']);
          return resolve(false);
        }
        if (answer === q.his) {
          sfx.win(); this.tweens.add({ targets: this.teacher, y: this.teacher.y - 6, yoyo: true, repeat: 1, duration: 120 });
          await this.say([q.right]);
          return resolve(true);
        }
        this.tweens.add({ targets: this.teacher, angle: { from: -6, to: 6 }, yoyo: true, repeat: 2, duration: 90, onComplete: () => this.teacher.setAngle(0) });
        this.hurt(5);
        await this.say([LECTURES[Math.floor(Math.random() * LECTURES.length)]]);
        resolve(false);
      };

      const lifeline = async (i: number) => {
        if (this.used[i]) { sfx.back(); return; }
        this.used[i] = true; busy = true; clear();
        this.bounceFace(LIFELINES[i].who);
        if (i === 0) {
          // Google gives the TRUE answer... which Sheikh Nasser will never accept (unless, once in a lifetime, he agrees)
          if (q.his !== q.real) { struck[q.real] = true; await this.say(['Mostafa googles it under the desk.', 'Google is very sure about one answer. So Sheikh Nasser will NEVER accept it. Crossed out.']); }
          else { const others = [0, 1, 2, 3].filter(x => x !== q.his); struck[Phaser.Utils.Array.GetRandom(others)] = true; await this.say(['Mostafa googles it under the desk.', 'Google AGREES with Sheikh Nasser?! Mostafa crosses out a random answer, shaken.']); }
        } else if (i === 1) {
          sfx.react(CAST.hussein.voice, '<3');
          await this.say(['Hussein makes his saddest face. Sheikh Nasser melts a little.', q.hint]);
        } else {
          this.tintFace('hefny', 0xff5050);
          sfx.react(CAST.hefny.voice, '#');
          await this.say(['Hefny: "Sheikh, with respect, the answer is OBVIOUSLY—"']);
          if (q.his !== q.real) {
            for (let k = 0; k < 4; k++) if (k !== q.his) struck[k] = true;
            this.hurt(3, 'hefny');
            await this.say(['Sheikh Nasser: "NO, Hefny." He points at HIS answer. Firmly. For a long time.']);
          } else {
            for (let k = 0; k < 4; k++) if (k !== q.his) struck[k] = true;
            await this.say(['Sheikh Nasser: "...Yes. Correct. Do not look so surprised."']);
          }
          if (this.dignity <= 0) { done = true; timer.remove(); return resolve(false); }
        }
        busy = false; if (struck[sel]) sel = struck.findIndex(s => !s);
        render(); this.listen();
      };

      this.listen = () => this.onKey((k: Key) => {
        if (busy || done) return;
        const move = (to: number) => { sel = to; sfx.move(); render(); };
        if (sel < 4) {
          if (k === 'left' || k === 'right') move(sel ^ 1);
          else if (k === 'up' && sel >= 2) move(sel - 2);
          else if (k === 'down') move(sel < 2 ? sel + 2 : 4 + (sel % 2 ? 1 : 0));
          else if (k === 'ok' && !struck[sel]) { sfx.select(); void finish(sel); }
        } else {
          if (k === 'left') move(sel === 4 ? 6 : sel - 1);
          else if (k === 'right') move(sel === 6 ? 4 : sel + 1);
          else if (k === 'up') move(2);
          else if (k === 'ok') void lifeline(sel - 4);
        }
      });

      const timer = this.time.addEvent({ delay: 50, loop: true, callback: () => {
        if (busy || done) return;
        remaining -= 50;
        this.timerBar.setScale(Math.max(0, remaining / TIME), 1).setFillStyle(remaining < 4000 ? 0xff4040 : 0xf2c94c);
        if (remaining <= 0) void finish(-1);
      } });
      render(); this.listen();
    });
  }

  private listen: () => void = () => {};
}
