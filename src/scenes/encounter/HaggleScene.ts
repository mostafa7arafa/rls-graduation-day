import * as Phaser from 'phaser';
import { W } from '../../config';
import { sfx } from '../../systems/sfx';
import { tr, txt, fmt } from '../../systems/i18n';
import { CAST } from '../../data/cast';
import { count, setFlag } from '../../systems/save';
import { Encounter } from './Encounter';

// CHAPTER 5 — haggling with Mr Abdelkareem. His signature is free; the pen is fourteen ful sandwiches.
// Bring the price down with each friend's tactic, then make an offer he accepts before his PATIENCE runs out.
// Hefny's RAGE cuts the price fastest — until it boils over and he flips a desk (desk fee: +3).

const START_PRICE = 14, FLOOR = 3;
const OPTIONS = ['Mostafa · Do the math', 'Hussein · Sob story', 'Hefny · Get angry', 'Make an offer', 'Walk away'];

export class HaggleScene extends Encounter {
  private price = START_PRICE;
  private patience = 100;
  private rage = 0;
  private stock = 0;
  private uses = { math: 0, sob: 0, bluff: 0 };
  private priceText!: Phaser.GameObjects.Text;
  private stockText!: Phaser.GameObjects.Text;
  private patienceBar!: Phaser.GameObjects.Rectangle;
  private rageBar!: Phaser.GameObjects.Rectangle;
  private icons: Phaser.GameObjects.Image[] = [];

  constructor() { super('haggle'); }

  create() {
    this.price = START_PRICE; this.patience = 100; this.rage = 0; this.uses = { math: 0, sob: 0, bluff: 0 }; this.icons = [];
    this.stock = count('sandwiches');
    this.setup('#1a1410', 'haggle');
    // his classroom: a board full of prices
    this.add.rectangle(W / 2, 50, 300, 84, 0x2f4a3a).setStrokeStyle(4, 0x5c4433);
    this.add.text(this.ar ? W / 2 - 16 : W / 2 - 140, this.ar ? 10 : 14, tr('PRIVATE LESSON\n200 LE / hour\nGROUP: 600 LE / hour\n(no discount)'), txt(8, { color: '#cfdccf', lineSpacing: this.ar ? -2 : 6 })).setAlpha(0.45).setAngle(-2);
    this.addTeacher('abdelkareem', W / 2 + 40, 58);
    // his patience, Hefny's rage
    this.add.text(W / 2 + 90, 18, tr('PATIENCE'), txt(8, { color: '#9fe09a', rtl: false })).setOrigin(0, 0.5);
    this.add.rectangle(W / 2 + 90, 30, 60, 6, 0x3a2030).setOrigin(0, 0.5);
    this.patienceBar = this.add.rectangle(W / 2 + 90, 30, 60, 6, 0x9fe09a).setOrigin(0, 0.5);
    this.add.text(W - 24, 212, tr('HEFNY\'S RAGE'), txt(8, { color: '#ff7a7a', rtl: false })).setOrigin(1, 0.5);
    this.add.rectangle(W - 24, 222, 80, 5, 0x3a2030).setOrigin(1, 0.5);
    this.rageBar = this.add.rectangle(W - 104, 222, 80, 5, 0xff4040).setOrigin(0, 0.5).setScale(0, 1);
    // the deal: price vs. your sandwiches
    this.priceText = this.add.text(30, 242, '', txt(8, { color: '#f2c94c', rtl: false })).setOrigin(0, 0.5);
    this.stockText = this.add.text(W - 30, 242, '', txt(8, { color: '#f4f0e8', rtl: false })).setOrigin(1, 0.5);
    this.refresh();
    void this.flow();
  }

  private refresh() {
    this.priceText.setText(fmt('PRICE: {n} SANDWICHES', { n: this.price }));
    this.stockText.setText(fmt('YOU HAVE: {n}', { n: this.stock }));
    this.icons.forEach(i => i.destroy());
    this.icons = Array.from({ length: Math.min(this.price, 12) }, (_, i) => this.add.image(196 + i * 13, 242, 'sandwich'));
    this.tweens.add({ targets: this.patienceBar, scaleX: Math.max(0, this.patience) / 100, duration: 250 });
    this.tweens.add({ targets: this.rageBar, scaleX: Math.min(100, this.rage) / 100, duration: 250 });
  }
  private drop(n: number) { this.price = Math.max(FLOOR, this.price - n); sfx.item(); this.refresh(); }

  private async flow() {
    await this.say([
      'Mr Abdelkareem: "Welcome to your private lesson. Today\'s topic: my signature. Price: fourteen sandwiches."',
      'Bring the price down with your friends, then make an offer he accepts. Watch his PATIENCE. And watch Hefny.',
    ]);
    for (;;) {
      if (this.patience <= 0) {
        return this.detention(['Mr Abdelkareem closes his notebook. "Lesson over. That will be one sandwich for my time." He does not even take it.'], 'LESSON OVER.');
      }
      const pick = await this.menu(OPTIONS, 2);
      const done = await this.act(pick);
      if (done) return;
      if (this.dignity <= 0) return this.detention(['Hussein has run out of sad stories. And dignity.'], 'LESSON OVER.');
      this.patience -= 8; this.rage = Math.max(0, this.rage - 10); this.refresh();
    }
  }

  /** returns true when the scene is over */
  private async act(pick: number): Promise<boolean> {
    if (pick === 0) { // Mostafa does the math
      this.bounceFace('mostafa');
      const n = this.uses.math++;
      if (n === 0) { this.drop(2); await this.say(['Mostafa: "Sir, fourteen sandwiches is about 28 pounds. Your pen costs 500. You are LOSING money."', 'Mr Abdelkareem blinks. Calculates. Sweats. "...Fine. Lower."']); }
      else if (n === 1) { this.drop(2); await this.say(['Mostafa: "And your board says group discount, sir." "It says NO discount." "It says no-discount, which implies a discount exists."', 'Mr Abdelkareem: "...I hate engineers. Lower."']); }
      else { this.patience -= 10; await this.say(['Mostafa tries more math.', 'Mr Abdelkareem: "I KNOW math, Mostafa. I TEACH math. Sit down."']); }
      return false;
    }
    if (pick === 1) { // Hussein's sob story
      this.bounceFace('hussein'); sfx.react(CAST.hussein.voice, '...');
      const stories = [
        'Hussein: "Sir, I broke my arm. Twice. On the same swing."',
        'Hussein: "Sir, I have been locked in this school since this morning. I have not seen the sun." (He has. It was very sunny.)',
        'Hussein: "Sir... I used to dream about math. Then I woke up. Every time. Screaming."',
        'Hussein cries. Real tears. Mr Abdelkareem: "Stop. STOP. You are ruining my carpet."',
      ];
      const n = this.uses.sob++;
      this.drop(1); this.hurt(2, 'hussein');
      if (n >= 3) this.patience -= 5;
      await this.say([stories[Math.min(n, 3)], n < 3 ? 'Mr Abdelkareem sniffs. "...Lower. A little. Do not tell anyone."' : 'Mr Abdelkareem: "Fine! Lower! Just STOP."']);
      return false;
    }
    if (pick === 2) { // Hefny gets angry
      this.bounceFace('hefny'); this.tintFace('hefny', 0xff4040);
      this.rage += 40; sfx.react(CAST.hefny.voice, '#');
      if (this.rage >= 100) {
        this.rage = 20; this.patience -= 30; this.price += 3; this.refresh();
        this.cameras.main.shake(400, 0.02); sfx.hit();
        await this.say(['HEFNY FLIPS A DESK. It lands upside down. Perfectly.', 'Mr Abdelkareem: "...That will be a DESK FEE. Plus three."']);
      } else {
        this.drop(2);
        await this.say(['Hefny turns red. Visible steam. He says the word "MATH" through his teeth.', 'Mr Abdelkareem swallows. "...Let us all calm down. Lower. LOWER."']);
      }
      return false;
    }
    if (pick === 3) { // make an offer
      if (this.stock <= 0) { await this.say(['You have no sandwiches to offer. Mr Abdelkareem looks at you with pity, which costs extra.']); return false; }
      const amounts = Array.from({ length: Math.min(this.stock, 12) }, (_, i) => String(i + 1));
      const i = await this.menu(amounts, 6, 'How many sandwiches do you offer? (X to cancel)', true);
      if (i < 0) return false;
      const offer = i + 1;
      if (offer >= this.price) {
        setFlag('sandwiches', this.stock - offer);
        await this.win([
          offer > this.price ? 'Mr Abdelkareem: "I accept. I also accept the extra. Thank you for your generosity."' : 'Mr Abdelkareem: "...Deal."',
          fmt('{n} ful sandwiches change hands. The five-hundred-pound pen signs the form.', { n: offer }),
        ]);
        return true;
      }
      if (offer >= this.price - 1 && this.patience > 40) {
        this.drop(1);
        await this.say(['Mr Abdelkareem: "You drive a hard bargain. Fine. I will go lower. ONE lower."']);
      } else {
        this.patience -= 20;
        await this.say(['Mr Abdelkareem: "That is not an offer. That is an INSULT. With a sandwich in it."']);
      }
      return false;
    }
    // walk away (bluff)
    const n = this.uses.bluff++;
    if (n === 0 && this.price > FLOOR + 1) {
      this.drop(2);
      await this.say(['You all stand up and walk to the door...', 'Mr Abdelkareem: "WAIT. Wait, wait. Habibi. Sit. Let us be reasonable."']);
    } else {
      this.patience -= 35;
      await this.say(['You walk to the door again.', 'Mr Abdelkareem: "Go, then. I have other students." You do not have other teachers. You come back. He knows.']);
    }
    return false;
  }
}
