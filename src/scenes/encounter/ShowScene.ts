import * as Phaser from 'phaser';
import { W } from '../../config';
import { sfx } from '../../systems/sfx';
import { tr, txt, fmt } from '../../systems/i18n';
import { CAST } from '../../data/cast';
import { Encounter } from './Encounter';
import type { Key } from './Encounter';

// THE GAME SHOW — "WHO! IS! DUMBER?!" Hussein hosts, Hefny keeps score, Mostafa presses the buttons.
// Aly El Fahl and Karim Ebid take turns making claims. Some are nonsense; some are, by accident, TRUE
// (real facts, several about Rashid). LEFT = TRUE, RIGHT = NONSENSE, before the clock runs out.

interface Claim { who: 'aly' | 'ebid'; text: string; truth: boolean }
const CLAIMS: Claim[] = [
  { who: 'aly', text: 'Aly: "Honey never goes bad. They found honey in pharaohs\' tombs, still good."', truth: true },
  { who: 'ebid', text: 'Karim Ebid: "The Nile flows south, into Sudan. That is why Sudan is so green."', truth: false },
  { who: 'aly', text: 'Aly: "The Rosetta Stone was found right here in Rashid, in 1799."', truth: true },
  { who: 'ebid', text: 'Karim Ebid: "Fish can climb trees. If they believe in themselves."', truth: false },
  { who: 'aly', text: 'Aly: "In 1807 the British attacked Rashid. And lost. Twice."', truth: true },
  { who: 'ebid', text: 'Karim Ebid: "Cairo is the capital of Alexandria."', truth: false },
  { who: 'aly', text: 'Aly: "A group of flamingos is called a flamboyance."', truth: true },
  { who: 'ebid', text: 'Karim Ebid: "If you eat ful every day, you become a doctor. Look at Hefny."', truth: false },
  { who: 'aly', text: 'Aly: "An octopus has three hearts."', truth: true },
  { who: 'ebid', text: 'Karim Ebid: "Rashid is called the city of a million palm trees."', truth: true },
  { who: 'aly', text: 'Aly: "Mr Abdelkareem once gave a lesson for free."', truth: false },
  { who: 'ebid', text: 'Karim Ebid: "The sea is just a very big Nile that got lost."', truth: false },
];
const NEED = 9, TIME = 7000;
const HOST_RIGHT = ['Hussein: "CORRECT! Mostafa, you beautiful machine!"', 'Hussein: "YES! Hefny, a point for the button man!"', 'Hussein: "Right again! Aly is sweating. Karim Ebid is sweating MORE."'];
const HOST_WRONG = ['Hefny: "Mostafa. MOSTAFA. You trusted Karim Ebid?"', 'Hefny: "That is not even close. Write it down. No, I will write it down."', 'Hussein: "Ooooh. The audience is disappointed. The audience is Rahma."'];

export class ShowScene extends Encounter {
  private score = 0;
  private aly!: Phaser.GameObjects.Sprite;
  private ebid!: Phaser.GameObjects.Sprite;
  private scoreText!: Phaser.GameObjects.Text;
  private btnTrue!: Phaser.GameObjects.Rectangle;
  private btnFalse!: Phaser.GameObjects.Rectangle;
  private timerBar!: Phaser.GameObjects.Rectangle;
  private spots: Phaser.GameObjects.Ellipse[] = [];
  qIndex = -1;           // read by tools/playtest.mjs
  answering = false;
  static readonly CLAIMS = CLAIMS;

  constructor() { super('show'); }

  create() {
    this.score = 0; this.spots = []; this.qIndex = -1; this.answering = false;
    this.setup('#0f1430', 'quiz');
    // the studio: spotlights, a big sign, two podiums, the host
    for (let i = 0; i < 6; i++) this.spots.push(this.add.ellipse(40 + i * 80, 8, 70, 30, [0xf2c94c, 0xff6b8a, 0x7fb0ff][i % 3], 0.25));
    this.tweens.add({ targets: this.spots, alpha: { from: 0.15, to: 0.5 }, yoyo: true, repeat: -1, duration: 400, delay: this.tweens.stagger(120) });
    this.add.rectangle(W / 2, 22, 200, 22, 0x1b1420).setStrokeStyle(2, 0xf2c94c);
    this.add.text(W / 2, 22, tr('WHO IS DUMBER?!'), txt(8, { color: '#f2c94c' })).setOrigin(0.5);
    for (const x of [110, W - 110]) { this.add.rectangle(x, 112, 96, 20, 0x2a2f60).setStrokeStyle(2, 0xf4f0e8).setDepth(3); }
    this.aly = this.add.sprite(110, 70, 'aly', 0).setScale(3);
    this.ebid = this.add.sprite(W - 110, 70, 'ebid', 0).setScale(3);
    this.addTeacher('hussein', W / 2, 68, 2.5);
    this.add.text(110, 112, tr('Aly El Fahl'), txt(8, { color: '#e6edf5', rtl: false })).setOrigin(0.5).setDepth(4);
    this.add.text(W - 110, 112, tr('Karim Ebid'), txt(8, { color: '#e8d27a', rtl: false })).setOrigin(0.5).setDepth(4);
    this.scoreText = this.add.text(W / 2, 112, '', txt(8, { color: '#9fe09a' })).setOrigin(0.5);
    // the two buttons Mostafa presses
    this.btnTrue = this.add.rectangle(120, 240, 200, 26, 0x1f4a2a).setStrokeStyle(2, 0x9fe09a);
    this.btnFalse = this.add.rectangle(W - 120, 240, 200, 26, 0x4a1f24).setStrokeStyle(2, 0xff7a7a);
    this.add.text(120, 240, `◀ ${tr('TRUE')}`, txt(8, { color: '#9fe09a', rtl: false })).setOrigin(0.5);
    this.add.text(W - 120, 240, `${tr('NONSENSE!')} ▶`, txt(8, { color: '#ff7a7a', rtl: false })).setOrigin(0.5);
    this.add.rectangle(20, 222, 440, 3, 0x3a2030).setOrigin(0, 0.5);
    this.timerBar = this.add.rectangle(20, 222, 440, 3, 0xf2c94c).setOrigin(0, 0.5);
    this.refresh();
    void this.flow();
  }

  private refresh() { this.scoreText.setText(fmt('CORRECT: {n}/{m}', { n: this.score, m: NEED })); }

  private async flow() {
    await this.say([
      'Hussein: "Ladies and gentlemen! Welcome to... WHO! IS! DUMBER?!"',
      'Hussein: "Our contestants make claims. Some are nonsense. Some, by pure accident, are TRUE."',
      'Hussein: "Mostafa: LEFT for TRUE, RIGHT for NONSENSE. Nine right answers and we have a winner. Hefny, the scoreboard!"',
    ]);
    for (let i = 0; i < CLAIMS.length; i++) {
      if (this.score + (CLAIMS.length - i) < NEED) break;
      this.qIndex = i;
      const right = await this.ask(CLAIMS[i]);
      if (this.dignity <= 0) return this.detention(['The studio audience (Rahma) boos. The show is cancelled.'], 'CANCELLED.');
      if (right) { this.score++; this.refresh(); }
      if (this.score >= NEED) {
        return this.win([
          'Hussein: "NINE! We have a judge who KNOWS things! And the winner of WHO IS DUMBER is..."',
          'Hefny: "...It\'s a tie. Aly five, Karim Ebid five. They are EXACTLY equally dumb. I checked twice."',
        ]);
      }
    }
    await this.detention(['Hefny: "Not enough. Mostafa, you have been believing them. That is the dumbest thing in this room."'], 'CANCELLED.');
  }

  /** one claim: resolves true if Mostafa pressed the right button in time */
  private ask(c: Claim): Promise<boolean> {
    const speaker = c.who === 'aly' ? this.aly : this.ebid;
    this.tweens.add({ targets: speaker, y: 64, yoyo: true, duration: 140, repeat: 1 });
    sfx.react(CAST[c.who].voice, '!');
    this.drawBox({ x: 20, y: 128, w: 440, h: 68 });
    return new Promise(resolve => {
      let left = TIME, done = false;
      const shown = this.add.text(this.ar ? 448 : 32, this.ar ? 134 : 140, tr(c.text), txt(8, { color: '#f4f0e8', lineSpacing: this.ar ? -3 : 7, wordWrap: { width: 410 } })).setOrigin(this.ar ? 1 : 0, 0).setDepth(6);
      this.answering = true;
      const finish = async (pick: boolean | null) => {
        if (done) return; done = true; this.answering = false;
        timer.remove(); this.onKey(null); shown.destroy();
        const ok = pick === c.truth;
        (pick === true ? this.btnTrue : pick === false ? this.btnFalse : null)?.setScale(0.95);
        this.time.delayedCall(150, () => { this.btnTrue.setScale(1); this.btnFalse.setScale(1); });
        if (ok) { sfx.win(); this.cameras.main.flash(120, 255, 240, 160); }
        else this.hurt(3);
        const verdict = c.truth ? 'It was TRUE!' : 'It was NONSENSE!';
        const host = (ok ? HOST_RIGHT : HOST_WRONG)[Math.floor(Math.random() * 3)];
        await this.say(pick === null ? ['Time\'s up! Hussein: "Mostafa froze! Like a laptop!"', verdict] : [verdict, host]);
        resolve(ok);
      };
      this.onKey((k: Key) => { if (k === 'left') void finish(true); else if (k === 'right') void finish(false); });
      const timer = this.time.addEvent({ delay: 50, loop: true, callback: () => {
        left -= 50; this.timerBar.setScale(Math.max(0, left / TIME), 1).setFillStyle(left < 2500 ? 0xff4040 : 0xf2c94c);
        if (left <= 0) void finish(null);
      } });
    });
  }
}
