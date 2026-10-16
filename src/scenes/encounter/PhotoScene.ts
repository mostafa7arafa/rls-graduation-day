import * as Phaser from 'phaser';
import { W, H } from '../../config';
import { sfx } from '../../systems/sfx';
import { tr, txt, fmt } from '../../systems/i18n';
import { CAST } from '../../data/cast';
import { Encounter } from './Encounter';
import type { Key } from './Encounter';

// THE CLASS PHOTO — through Mr Mahmoud's viewfinder. Everyone is lined up; everyone keeps ruining it.
// Move the cursor (arrows), call out whoever is misbehaving (A / Z), and press B / X to SNAP when the
// frame is clean. There is no losing: after enough ruined photos, Mr Mahmoud keeps one "with character".

type Habit = 'turn' | 'blink' | 'angry' | 'bounce' | 'side';
interface Person { id: string; habit: Habit; ruin: string; sprite: Phaser.GameObjects.Sprite; bad: boolean; mark: Phaser.GameObjects.Text; baseY: number }

const BACK: [string, Habit, string][] = [
  ['ibrahim', 'blink', 'Mr Ibrahim fell asleep. Standing up. A skill from forty years of teaching.'],
  ['hassan', 'angry', 'Mr Hassan was scolding someone. The photo is just a mustache, mid-shout.'],
  ['abdelfattah', 'bounce', 'Mr Abdelfattah was reciting verse forty-one. With gestures.'],
  ['nasser', 'side', 'Sheikh Nasser was explaining to Mr Yasser that spiders have six legs.'],
  ['yasser', 'side', 'Mr Yasser was correcting the spelling on the banner.'],
  ['abdo', 'bounce', 'Mr Abdo heard something explode and got excited.'],
  ['rezk', 'turn', 'Mr Ahmed Rezk turned around to check that Mr Abdo was not on HIS side.'],
  ['abdelkareem', 'side', 'Mr Abdelkareem was counting money. In the photo. During the photo.'],
  ['amr', 'bounce', 'Mr Amr blew his whistle. Everyone flinched. The photo is a blur of flinching.'],
];
const FRONT: [string, Habit, string][] = [
  ['aly', 'side', 'Aly El Fahl turned to argue with Karim Ebid.'],
  ['ebid', 'side', 'Karim Ebid turned to argue with Aly El Fahl.'],
  ['rahma', 'turn', 'Rahma was glaring at Hussein. You can only see the back of her head and the anger.'],
  ['mostafa', 'side', 'Mostafa was checking his phone. A notification. During his own graduation photo.'],
  ['hussein', 'blink', 'Hussein blinked. Of course Hussein blinked.'],
  ['hefny', 'angry', 'Hefny was glaring at Karim. The photo is mostly red.'],
  ['warshan', 'blink', ''], // Warshan never ruins anything. He is polite.
  ['shazly', 'blink', 'Ibrahim El Shazly fell asleep. Peacefully. He looks happy.'],
  ['amin', 'bounce', 'Amin jumped to look taller than Basha. Basha jumped too.'],
  ['karim', 'bounce', 'Karim was posing. For himself. With sunglasses.'],
];
const MAX_TRIES = 7;

export class PhotoScene extends Encounter {
  private people: Person[][] = [];
  private row = 1; private col = 4;
  private aim!: Phaser.GameObjects.Image;
  private caption!: Phaser.GameObjects.Text;
  private counter!: Phaser.GameObjects.Text;
  private tries = 0;
  private shooting = false;
  private spawner?: Phaser.Time.TimerEvent;

  constructor() { super('photo'); }

  create() {
    this.people = []; this.row = 1; this.col = 4; this.tries = 0; this.shooting = false;
    this.setup('#1b1420', 'title', false);
    // the court through a viewfinder
    this.add.rectangle(W / 2, 100, 440, 168, 0x3f9a4a);
    for (let x = 20; x < 460; x += 40) this.add.rectangle(x, 16, 20, 168, 0x47a552).setOrigin(0);
    this.add.rectangle(W / 2, 30, 300, 14, 0xf4f0e8).setStrokeStyle(1, 0x1b1420);
    this.add.text(W / 2, 30, tr('CLASS OF RLS'), txt(8, { color: '#c23b3b' })).setOrigin(0.5);
    const rowY = [92, 152];
    [BACK, FRONT].forEach((list, r) => {
      const gap = r === 0 ? 46 : 42, x0 = W / 2 - ((list.length - 1) * gap) / 2;
      this.people.push(list.map(([id, habit, ruin], i) => {
        const x = x0 + i * gap, y = rowY[r];
        const sprite = this.add.sprite(x, y, id, 0).setScale(2.2).setDepth(2 + r);
        const mark = this.add.text(x, y - 34, '!', txt(8, { color: '#ff4040', backgroundColor: '#1b1420', padding: { x: 2, y: 1 }, rtl: false })).setOrigin(0.5).setDepth(8).setVisible(false);
        return { id, habit, ruin, sprite, bad: false, mark, baseY: y };
      }));
    });
    // viewfinder frame on top
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(0x0b0b10).fillRect(0, 0, W, 14).fillRect(0, 186, W, H - 186).fillRect(0, 0, 18, 186).fillRect(W - 18, 0, 18, 186);
    g.lineStyle(2, 0xf4f0e8);
    for (const [x, y, dx, dy] of [[24, 20, 1, 1], [W - 24, 20, -1, 1], [24, 180, 1, -1], [W - 24, 180, -1, -1]] as const) g.lineBetween(x, y, x + 16 * dx, y).lineBetween(x, y, x, y + 16 * dy);
    g.fillStyle(0xff4040).fillCircle(32, 26, 3);
    this.counter = this.add.text(42, 26, '', txt(8, { color: '#f4f0e8', rtl: false })).setOrigin(0, 0.5).setDepth(21);
    this.caption = this.add.text(W / 2, 200, '', txt(8, { color: '#f2c94c', align: 'center', wordWrap: { width: 440 } })).setOrigin(0.5, 0).setDepth(21);
    this.add.text(W / 2, H - 14, tr('Arrows: move · A / Z: call them out · B / X: SNAP'), txt(8, { color: '#cfc6b8' })).setOrigin(0.5).setDepth(21);
    this.aim = this.add.image(0, 0, 'soul').setDepth(22);
    this.box = { x: 20, y: 196, w: 440, h: 46 };
    this.place(); this.refresh();
    void this.flow();
  }

  private refresh() { this.counter.setText(fmt('PHOTO {n}', { n: this.tries + 1 })); }
  private place() {
    const p = this.people[this.row][this.col];
    this.aim.setPosition(p.sprite.x, p.baseY + 30);
  }

  private async flow() {
    await this.say(['Mr Mahmoud: "Everybody, look at the camera! Nobody move! Nobody breathe! ...Breathe a little."']);
    this.caption.setText('');
    this.spawner = this.time.addEvent({ delay: 1100, loop: true, callback: () => this.mischief() });
    this.onKey((k) => this.key(k));
  }

  private mischief() {
    if (this.shooting) return;
    const bad = this.people.flat().filter(p => p.bad).length;
    if (bad >= 2 + Math.min(2, this.tries)) return;
    const pool = this.people.flat().filter(p => !p.bad && p.ruin);
    const p = Phaser.Utils.Array.GetRandom(pool);
    if (p) this.misbehave(p, true);
  }

  private misbehave(p: Person, on: boolean) {
    p.bad = on; p.mark.setVisible(on);
    this.tweens.killTweensOf(p.sprite);
    p.sprite.clearTint().setFrame(0).setFlipX(false).setY(p.baseY).setAngle(0);
    if (!on) return;
    if (p.habit === 'turn') p.sprite.setFrame(3);
    if (p.habit === 'side') p.sprite.setFrame(6).setFlipX(Math.random() < 0.5);
    if (p.habit === 'angry') p.sprite.setTint(0xff6060);
    if (p.habit === 'blink') p.mark.setText('z');
    else p.mark.setText('!');
    if (p.habit === 'bounce') this.tweens.add({ targets: p.sprite, y: p.baseY - 6, yoyo: true, repeat: -1, duration: 160 });
  }

  private key(k: Key) {
    if (this.shooting) return;
    const rowLen = this.people[this.row].length;
    if (k === 'left') { this.col = (this.col + rowLen - 1) % rowLen; sfx.move(); }
    else if (k === 'right') { this.col = (this.col + 1) % rowLen; sfx.move(); }
    else if (k === 'up' || k === 'down') {
      const x = this.people[this.row][this.col].sprite.x;
      this.row = k === 'up' ? 0 : 1;
      this.col = this.people[this.row].reduce((best, p, i, arr) => Math.abs(p.sprite.x - x) < Math.abs(arr[best].sprite.x - x) ? i : best, 0);
      sfx.move();
    } else if (k === 'ok') {
      const p = this.people[this.row][this.col];
      if (p.bad) {
        sfx.select(); this.misbehave(p, false);
        this.caption.setText(fmt('{name}! Look at the camera!', { name: tr(CAST[p.id].name) })).setColor('#f4f0e8');
      } else sfx.back();
    } else if (k === 'back') { void this.snap(); return; }
    this.place();
  }

  private async snap() {
    this.shooting = true;
    sfx.kick(); this.cameras.main.flash(250, 255, 255, 255);
    const ruined = this.people.flat().filter(p => p.bad);
    this.tries++;
    if (ruined.length && this.tries < MAX_TRIES) {
      const p = Phaser.Utils.Array.GetRandom(ruined);
      this.caption.setText(fmt('RUINED! {why}', { why: tr(p.ruin) })).setColor('#ff7a7a');
      sfx.react(CAST[p.id]?.voice ?? 300, '...');
      await this.wait(2200);
      this.refresh(); this.caption.setText('');
      this.shooting = false;
      return;
    }
    // a keeper: clean, or the "with character" one
    this.spawner?.remove(); this.onKey(null); this.aim.setVisible(false);
    if (!ruined.length) this.people.flat().forEach(p => this.misbehave(p, false));
    this.caption.setText(tr('CLASS OF RLS · GRADUATION DAY')).setColor('#f2c94c');
    sfx.win();
    await this.wait(2600);
    this.caption.setText('');
    await this.win(ruined.length
      ? ['Mr Mahmoud: "...We will use this one. It has CHARACTER. Like all of you."']
      : ['Mr Mahmoud: "PARFAIT! Everybody looking! Everybody smiling! In twenty years I have never taken a photo this clean."']);
  }
}
