import * as Phaser from 'phaser';
import { W, FONT } from '../config';
import { sfx } from '../systems/sfx';
import { music } from '../systems/music';
import { tr, txt, isAr } from '../systems/i18n';
import { CAST } from '../data/cast';
import { flag, hasItem, takeItem } from '../systems/save';

// Undertale-style teacher "battle": you can't beat a teacher, you win them over.
// Raise CALM to 100 through ACTs, survive the dodge phases, then MERCY.

type Phase = 'menu' | 'sub' | 'text' | 'dodge' | 'over';
interface Bullet { s: Phaser.GameObjects.Image; vx: number; vy: number; w: number; h: number; dmg: number; kind: 'chalk' | 'stick' | 'cloud' }
interface Act { label: string; who: 'mostafa' | 'hussein' | 'hefny' | 'all'; run: () => string[] }

const BUTTONS = ['FIGHT', 'ACT', 'ITEM', 'MERCY'];
const MENU_BOX = { x: 20, y: 128, w: 440, h: 68 };
const DODGE_BOX = { x: 170, y: 124, w: 140, h: 76 };
const MAX_DIGNITY = 20;

export class BattleScene extends Phaser.Scene {
  private onEnd!: (won: boolean) => void;
  private phase: Phase = 'menu';
  private box = { ...MENU_BOX };
  private gfx!: Phaser.GameObjects.Graphics;
  private text!: Phaser.GameObjects.Text;
  private enemy!: Phaser.GameObjects.Sprite;
  private calmBar!: Phaser.GameObjects.Rectangle;
  private calmLabel!: Phaser.GameObjects.Text;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private faces: Record<string, Phaser.GameObjects.Image> = {};
  private btns: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private cursor!: Phaser.GameObjects.Image;
  private soul!: Phaser.GameObjects.Image;
  private bubble!: Phaser.GameObjects.Text;
  private subTexts: Phaser.GameObjects.Text[] = [];
  private bullets: Bullet[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  private sel = 0; private subSel = 0; private subItems: Act[] = [];
  private queue: string[] = []; private afterText: (() => void) | null = null;
  private typing: Phaser.Time.TimerEvent | null = null; private fullText = '';
  private calm = 0; private dignity = MAX_DIGNITY; private turn = 0; private density = 1;
  private invuln = 0; private hitThisTurn = false; private slowed = false;
  private used: Record<string, number> = {}; private fightN = 0;

  constructor() { super('battle'); }

  init(data: { onEnd: (won: boolean) => void }) {
    this.onEnd = data.onEnd;
    Object.assign(this, { phase: 'menu', sel: 0, calm: 0, dignity: MAX_DIGNITY, turn: 0, density: 1, used: {}, fightN: 0, bullets: [], timers: [], btns: [], subTexts: [] });
    this.box = { ...MENU_BOX };
  }

  create() {
    this.cameras.main.setBackgroundColor('#120d16').fadeIn(250);
    sfx.sting();
    music.play('battle');
    const ar = isAr();
    // classroom backdrop: blackboard + chalk scribbles
    this.add.rectangle(W / 2, 54, 300, 84, 0x2f4a3a).setStrokeStyle(4, 0x5c4433);
    const scribble = this.add.text(ar ? W / 2 - 80 : W / 2 - 138, ar ? 10 : 18, tr('FINAL EXAM\nHussein: SEE ME\n2 + 2 = ?\n(Hefny: 4)'), txt(8, { color: '#cfdccf', lineSpacing: ar ? -1 : 6 })).setAlpha(0.5);
    scribble.setAngle(-2);

    this.enemy = this.add.sprite(W / 2, 58, 'hassan', 0).setScale(4).setDepth(2);
    this.tweens.add({ targets: this.enemy, scaleY: 4.12, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
    this.add.particles(W / 2, 40, 'cloud', { x: { min: -56, max: 56 }, speedY: { min: -14, max: -6 }, scale: { start: 0.5, end: 1.2 }, alpha: { start: 0.3, end: 0 }, lifespan: 2400, frequency: 220 }).setDepth(1);

    // CALM meter (mirrored in Arabic: label on the right, bar fills right-to-left)
    this.calmLabel = this.add.text(ar ? W / 2 + 60 : W / 2 - 60, 115, tr('MR HASSAN · CALM'), txt(8, { color: '#9fe09a' })).setOrigin(ar ? 1 : 0, 0.5);
    const barX = ar ? this.calmLabel.x - this.calmLabel.width - 8 : W / 2 + 76;
    this.add.rectangle(barX, 115, 52, 6, 0x3a2030).setOrigin(ar ? 1 : 0, 0.5);
    // meters are full-size rects scaled on X: tweening `width` doesn't move the origin, which broke the right-anchored (Arabic) bar
    this.calmBar = this.add.rectangle(barX, 115, 52, 6, 0xf2c94c).setOrigin(ar ? 1 : 0, 0.5).setScale(0, 1);

    this.gfx = this.add.graphics();
    this.text = this.add.text(0, 0, '', txt(8, { color: '#f4f0e8', lineSpacing: ar ? -3 : 7, wordWrap: { width: MENU_BOX.w - 24 } })).setOrigin(ar ? 1 : 0, 0);
    for (let i = 0; i < 6; i++) this.subTexts.push(this.add.text(0, 0, '', txt(8, { color: '#f4f0e8' })).setOrigin(ar ? 1 : 0, 0).setVisible(false));

    // party + dignity
    ['mostafa', 'hussein', 'hefny'].forEach((p, i) => { this.faces[p] = this.add.image(26 + i * 20, 212, `${p}_face`).setScale(1.1); });
    this.add.text(88, 212, tr('DIGNITY'), txt(8, { color: '#f4f0e8', rtl: false })).setOrigin(0, 0.5);
    this.add.rectangle(150, 212, 100, 8, 0x5a1a24).setOrigin(0, 0.5);
    this.hpBar = this.add.rectangle(150, 212, 100, 8, 0xf2c94c).setOrigin(0, 0.5);
    this.hpText = this.add.text(256, 212, '', { fontFamily: FONT, fontSize: '8px', color: '#f4f0e8' }).setOrigin(0, 0.5);

    BUTTONS.forEach((b, i) => {
      const bg = this.add.rectangle(24 + i * 110, 230, 100, 22).setOrigin(0).setStrokeStyle(2, 0xe8742a);
      const label = this.add.text(24 + i * 110 + 58, 241, tr(b), txt(8, { color: '#e8742a', rtl: false })).setOrigin(0.5);
      this.btns.push({ bg, label });
    });
    this.cursor = this.add.image(0, 0, 'soul');
    this.soul = this.add.image(W / 2, DODGE_BOX.y + DODGE_BOX.h / 2, 'soul').setVisible(false).setDepth(10);
    this.bubble = this.add.text(W / 2 + 46, 22, '', txt(8, { color: '#1b1420', backgroundColor: '#f4f0e8', padding: { x: 4, y: ar ? 0 : 4 }, wordWrap: { width: 130 }, lineSpacing: ar ? -4 : 4 })).setOrigin(0).setVisible(false);

    this.keys = this.input.keyboard!.addKeys('LEFT,RIGHT,UP,DOWN,W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.refreshBars();
    this.showText([
      'Mr Hassan blocks the way!',
      'You can\'t beat a teacher. But maybe you can win him over... (ACT, then MERCY when he\'s CALM)',
    ], () => this.toMenu());
  }

  // ───────────────────────────────────────── acts
  private acts(): Act[] {
    const once = (k: string) => (this.used[k] = (this.used[k] ?? 0) + 1) === 1;
    const list: Act[] = [
      { label: 'Mostafa · Explain AI', who: 'mostafa', run: () => once('ai')
        ? (this.addCalm(15), ['Mostafa explains Large Language Models.', 'Mr Hassan: "So the computer does the homework... and YOU check the computer?"', 'Mr Hassan: "...That is what I did with Hussein for six years."'])
        : (this.addCalm(5), ['Mostafa explains attention mechanisms.', 'Mr Hassan is no longer paying attention. Ironic.']) },
      { label: 'Hussein · Victim Card', who: 'hussein', run: () => { this.density = 0.55; return once('victim')
        ? (this.addCalm(20), ['Hussein collapses. "My ARM! My old swing injury!"', 'Mr Hassan\'s eye twitches. All his anger locks onto Hussein.', '(Next attack is weaker. Hussein is absorbing the hate.)'])
        : (this.addCalm(10), ['Hussein plays the victim card again. It\'s a very worn card.', 'It still kind of works.']); } },
      { label: 'Hefny · Get Angry', who: 'hefny', run: () => {
        this.faces.hefny.setTint(0xff5050); this.time.delayedCall(1500, () => this.faces.hefny.clearTint());
        if (once('angry')) { this.density = 1.35; this.addCalm(25); return ['Hefny turns red. Visible steam.', 'Mr Hassan: "...FINALLY. Some PASSION in this classroom."', '(He respects it. His next attack is angrier too.)']; }
        return ['Hefny is still angry. Mr Hassan has gotten used to it.'];
      } },
    ];
    if (flag('hint_perfume')) list.push({ label: 'Compliment Perfume', who: 'all', run: () => once('perfume')
      ? (this.addCalm(40), ['"Mr Hassan... is that... OUD?"', 'Mr Hassan freezes. His mustache trembles.', 'Mr Hassan: "Imported. From the shop next to the bakery." He is BLUSHING.'])
      : (this.addCalm(10), ['You compliment the perfume again. He pretends not to care. He cares.']) });
    list.push({ label: 'Check', who: 'all', run: () => ['MR HASSAN · ATK 99 · DEF 99. Has taught here since the pharaohs.',
      flag('hint_perfume') ? 'Weakness: compliments about his perfume.' : 'Weakness: unknown. Someone in the corridor might know...'] });
    return list;
  }

  private addCalm(n: number) { this.calm = Math.min(100, this.calm + n); this.refreshBars(); }

  private refreshBars() {
    this.tweens.add({ targets: this.calmBar, scaleX: this.calm / 100, duration: 400 });
    this.tweens.add({ targets: this.hpBar, scaleX: Math.max(0, this.dignity) / MAX_DIGNITY, duration: 200 });
    this.hpText.setText(`${Math.max(0, this.dignity)}/${MAX_DIGNITY}`);
    const spare = this.calm >= 100;
    this.calmLabel.setColor(spare ? '#f2c94c' : '#9fe09a');
    if (this.btns[3]) this.btns[3].label.setText(tr(spare ? '*MERCY' : 'MERCY'));
  }

  // ───────────────────────────────────────── phases
  private toMenu() {
    this.phase = 'menu';
    this.tweenBox(MENU_BOX);
    const mood = this.calm >= 100 ? 'Mr Hassan seems... satisfied? Try MERCY.'
      : this.calm >= 60 ? 'Mr Hassan is humming quietly. Is that... a smile?'
      : this.calm >= 25 ? 'Mr Hassan adjusts his mustache, slightly less angry.'
      : 'Mr Hassan taps the green stick against his palm.';
    this.setBoxText(tr(mood));
    this.renderButtons();
  }

  private renderButtons() {
    this.btns.forEach((b, i) => {
      const on = this.phase === 'menu' && i === this.sel;
      b.bg.setStrokeStyle(2, on ? 0xf2c94c : 0xe8742a); b.label.setColor(on ? '#f2c94c' : '#e8742a');
      if (i === 3 && this.calm >= 100) b.label.setColor('#f2c94c');
    });
    this.cursor.setVisible(this.phase === 'menu' || this.phase === 'sub');
    if (this.phase === 'menu') this.cursor.setPosition(24 + this.sel * 110 + 14, 241);
  }

  private openSub(items: Act[]) {
    this.phase = 'sub'; this.subItems = items; this.subSel = 0; this.renderSub();
  }
  private renderSub() {
    // two columns so up to 6 options fit the box (in Arabic the first column is on the right)
    this.setBoxText('');
    const ar = isAr(), rowH = ar ? 19 : 15, b = this.box;
    const colX = (col: number) => ar ? b.x + b.w - 16 - col * 216 : b.x + 16 + col * 216;
    this.subItems.forEach((a, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      this.subTexts[i].setText(tr(a.label)).setPosition(colX(col) + (ar ? -12 : 12), b.y + (ar ? 5 : 10) + row * rowH).setVisible(true);
    });
    this.cursor.setPosition(colX(this.subSel % 2), b.y + 14 + Math.floor(this.subSel / 2) * rowH);
    this.renderButtons();
  }

  private choose() {
    sfx.select();
    const b = BUTTONS[this.sel];
    if (b === 'ACT') return this.openSub(this.acts());
    if (b === 'FIGHT') {
      const jokes = [
        ['Mostafa raises his fist... then remembers his mother. He lowers it.'],
        ['Hussein swings at Mr Hassan! He misses. He hits himself. Somehow.', 'Dignity -1.'],
        ['Hefny is too angry to aim. He punches the air. The air wins.'],
      ];
      const j = jokes[this.fightN++ % 3];
      if (j.length > 1) { this.dignity -= 1; sfx.hit(); this.refreshBars(); }
      return this.showText(['(You don\'t hit teachers at RLS.)', ...j], () => this.enemyTurn());
    }
    if (b === 'ITEM') {
      if (!hasItem('sandwich')) return this.showText(['Your pockets contain: lint, and a 2019 bus ticket.'], () => this.enemyTurn());
      takeItem('sandwich'); this.dignity = Math.min(MAX_DIGNITY, this.dignity + 10); sfx.heal(); this.refreshBars();
      return this.showText(['You eat the ful sandwich. Dignity +10!', 'Mr Hassan: "NO. EATING. IN. CLASS."'], () => this.enemyTurn());
    }
    if (this.calm >= 100) return this.win();
    this.showText(['You ask Mr Hassan for mercy.', 'Mr Hassan: "I do not accept apologies. I accept HOMEWORK."'], () => this.enemyTurn());
  }

  private runAct(a: Act) {
    sfx.select();
    if (a.who !== 'all') this.tweens.add({ targets: this.faces[a.who], y: 204, yoyo: true, duration: 120, repeat: 1 });
    const lines = a.run();
    this.showText(lines, () => (this.calm >= 100 ? this.toMenu() : this.enemyTurn()));
  }

  private showText(lines: string[], then: () => void) {
    this.phase = 'text'; this.queue = [...lines]; this.afterText = then;
    this.cursor.setVisible(false);
    this.tweenBox(MENU_BOX);
    this.nextLine();
  }

  private nextLine() {
    const line = this.queue.shift();
    if (line === undefined) { const t = this.afterText; this.afterText = null; t?.(); return; }
    const voice = line.startsWith('Mr Hassan') ? 170 : 300;
    const shown = tr(line);
    this.fullText = shown; let i = 0;
    this.typing?.remove();
    this.typing = this.time.addEvent({ delay: 24, loop: true, callback: () => {
      i++; this.setBoxText(shown.slice(0, i)); if (i % 2 === 0 && shown[i - 1] !== ' ') sfx.blip(voice);
      if (i >= shown.length) { this.typing?.remove(); this.typing = null; }
    } });
  }

  private setBoxText(t: string) {
    this.subTexts.forEach(s => s.setVisible(false));
    // text only ever shows in the menu box; wrapping to the live width would squash it mid-tween
    this.text.setText(t).setWordWrapWidth(MENU_BOX.w - 24); this.placeText();
  }
  private placeText() {
    const b = this.box;
    if (isAr()) this.text.setPosition(b.x + b.w - 12, b.y + 4); else this.text.setPosition(b.x + 12, b.y + 10);
  }

  private tweenBox(to: typeof MENU_BOX) {
    this.tweens.add({ targets: this.box, ...to, duration: 220, ease: 'Quad.inOut', onUpdate: () => this.placeText() });
  }

  // ───────────────────────────────────────── dodge
  private enemyTurn() {
    this.phase = 'dodge'; this.hitThisTurn = false;
    this.setBoxText(''); this.cursor.setVisible(false); this.renderButtons();
    this.tweenBox(DODGE_BOX);
    const taunts = ['Chalk is FREE. My patience is NOT.', 'This stick has been in my family for three generations.', 'Breathe in. That is IMPORTED.', 'Hussein! Sit up STRAIGHT!', 'In my day there was no artificial intelligence. Only natural FEAR.'];
    this.bubble.setText(tr(taunts[this.turn % taunts.length])).setVisible(true);
    this.soul.setPosition(DODGE_BOX.x + DODGE_BOX.w / 2, DODGE_BOX.y + DODGE_BOX.h / 2).setVisible(true);

    const patterns: ('chalk' | 'stick' | 'cloud')[][] = [['chalk'], ['stick'], ['cloud', 'chalk'], ['stick', 'chalk'], ['cloud', 'stick'], ['chalk', 'stick', 'cloud']];
    const pat = patterns[Math.min(this.turn, patterns.length - 1)];
    const d = this.density;
    for (const p of pat) {
      const every = (p === 'chalk' ? 240 : p === 'stick' ? 1150 : 950) / d;
      this.timers.push(this.time.addEvent({ delay: every, loop: true, startAt: every * 0.6, callback: () => this.spawn(p) }));
    }
    this.time.delayedCall(5200, () => this.endDodge());
  }

  private spawn(kind: 'chalk' | 'stick' | 'cloud') {
    const b = DODGE_BOX;
    if (kind === 'chalk') {
      const s = this.add.image(Phaser.Math.Between(b.x + 6, b.x + b.w - 6), b.y + 2, 'chalk').setAngle(Phaser.Math.Between(-20, 20));
      this.bullets.push({ s, vx: Phaser.Math.Between(-10, 10), vy: Phaser.Math.Between(60, 95), w: 4, h: 7, dmg: 2, kind });
    } else if (kind === 'stick') {
      const y = Phaser.Math.Between(b.y + 8, b.y + b.h - 8), fromLeft = Math.random() < 0.5;
      const warn = this.add.rectangle(b.x + b.w / 2, y, b.w - 4, 2, 0xff4040).setAlpha(0.8);
      this.tweens.add({ targets: warn, alpha: 0.1, yoyo: true, repeat: 2, duration: 80, onComplete: () => {
        warn.destroy();
        if (this.phase !== 'dodge') return;
        const s = this.add.image(fromLeft ? b.x - 34 : b.x + b.w + 34, y, 'stickH');
        this.bullets.push({ s, vx: fromLeft ? 230 : -230, vy: 0, w: 60, h: 4, dmg: 4, kind: 'stick' });
      } });
    } else {
      const fromLeft = Math.random() < 0.5;
      const s = this.add.image(fromLeft ? b.x - 6 : b.x + b.w + 6, Phaser.Math.Between(b.y + 10, b.y + b.h - 10), 'cloud').setAlpha(0.55);
      this.bullets.push({ s, vx: fromLeft ? 34 : -34, vy: Phaser.Math.Between(-6, 6), w: 18, h: 12, dmg: 1, kind });
    }
  }

  private endDodge() {
    if (this.phase !== 'dodge') return;
    this.timers.forEach(t => t.remove()); this.timers = [];
    this.bullets.forEach(b => b.s.destroy()); this.bullets = [];
    this.soul.setVisible(false); this.bubble.setVisible(false);
    this.turn++; this.density = 1;
    if (!this.hitThisTurn) { this.addCalm(5); this.showText(['Not a scratch! Mr Hassan nods. Slightly. (+5 CALM)'], () => this.toMenu()); }
    else this.toMenu();
  }

  private hurt(dmg: number) {
    if (this.invuln > 0) return;
    this.dignity -= dmg; this.hitThisTurn = true; this.invuln = dmg > 1 ? 900 : 450;
    sfx.hit(); this.cameras.main.shake(140, 0.01); this.refreshBars();
    // someone in the party yelps
    const who = Phaser.Utils.Array.GetRandom(['mostafa', 'hussein', 'hefny']);
    this.time.delayedCall(90, () => sfx.react(CAST[who].voice, 'ow'));
    this.tweens.add({ targets: this.faces[who], angle: { from: -15, to: 0 }, duration: 250 });
    if (this.dignity <= 0) this.lose();
  }

  private win() {
    this.phase = 'over';
    sfx.win();
    this.tweens.add({ targets: this.enemy, y: 50, yoyo: true, repeat: 3, duration: 140 });
    this.showText(['You spared Mr Hassan.', 'Mr Hassan... spared you?', 'YOU WON! (+1 key, +0 grades)'], () => this.close(true));
  }

  private lose() {
    this.phase = 'over';
    this.endDodgeSilently();
    sfx.sting();
    music.play('battle');
    const ar = isAr();
    const big = this.add.text(W / 2, 160, tr('DETENTION.'), txt(16, { color: '#ff4040' })).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: big, scale: { from: 3, to: 1 }, duration: 400, ease: 'Back.out' });
    this.time.delayedCall(1600, () => { big.destroy(); this.close(false); });
  }

  private endDodgeSilently() {
    this.timers.forEach(t => t.remove()); this.timers = [];
    this.bullets.forEach(b => b.s.destroy()); this.bullets = [];
    this.soul.setVisible(false); this.bubble.setVisible(false); this.setBoxText('');
  }

  private close(won: boolean) {
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.stop(); this.onEnd(won); });
  }

  // ───────────────────────────────────────── loop
  // menus are event-driven (a quick tap can start and end between two frames, so polling misses it)
  private onKey(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    const ok = k === 'z' || k === ' ' || k === 'enter', back = k === 'x' || k === 'escape';
    const left = k === 'arrowleft' || k === 'a', right = k === 'arrowright' || k === 'd';
    const up = k === 'arrowup' || k === 'w', down = k === 'arrowdown' || k === 's';
    if (this.phase === 'menu') {
      if (left) { this.sel = (this.sel + 3) % 4; sfx.move(); this.renderButtons(); }
      if (right) { this.sel = (this.sel + 1) % 4; sfx.move(); this.renderButtons(); }
      if (ok) this.choose();
    } else if (this.phase === 'sub') {
      const n = this.subItems.length, step = (d: number) => { this.subSel = Phaser.Math.Clamp(this.subSel + d, 0, n - 1); sfx.move(); this.renderSub(); };
      if (up) step(-2); if (down) step(2); if (left) step(-1); if (right) step(1);
      if (back) { sfx.back(); this.toMenu(); }
      else if (ok) this.runAct(this.subItems[this.subSel]);
    } else if (this.phase === 'text' && ok) {
      if (this.typing) { this.typing.remove(); this.typing = null; this.setBoxText(this.fullText); }
      else { sfx.move(); this.nextLine(); }
    }
  }

  update(_t: number, dt: number) {
    const k = this.keys;
    // draw the box
    this.gfx.clear().fillStyle(0x000000).fillRect(this.box.x, this.box.y, this.box.w, this.box.h).lineStyle(2, 0xf4f0e8).strokeRect(this.box.x, this.box.y, this.box.w, this.box.h);

    if (this.phase === 'dodge') {
      this.invuln = Math.max(0, this.invuln - dt);
      this.soul.setAlpha(this.invuln > 0 ? (Math.floor(this.invuln / 80) % 2 ? 0.3 : 1) : 1);
      let vx = 0, vy = 0;
      if (k.LEFT.isDown || k.A.isDown) vx -= 1; if (k.RIGHT.isDown || k.D.isDown) vx += 1;
      if (k.UP.isDown || k.W.isDown) vy -= 1; if (k.DOWN.isDown || k.S.isDown) vy += 1;
      const sp = (this.slowed ? 40 : 82) * dt / 1000, n = Math.hypot(vx, vy) || 1;
      const b = this.box;
      this.soul.x = Phaser.Math.Clamp(this.soul.x + (vx / n) * sp, b.x + 6, b.x + b.w - 6);
      this.soul.y = Phaser.Math.Clamp(this.soul.y + (vy / n) * sp, b.y + 6, b.y + b.h - 6);

      this.slowed = false;
      for (const bl of this.bullets) {
        bl.s.x += bl.vx * dt / 1000; bl.s.y += bl.vy * dt / 1000;
        if (bl.kind === 'chalk') bl.s.angle += dt * 0.2;
        const inside = bl.s.x > b.x - 30 && bl.s.x < b.x + b.w + 30 && bl.s.y > b.y && bl.s.y < b.y + b.h;
        bl.s.setVisible(inside && bl.s.x > b.x - 2 + (bl.kind === 'stick' ? -30 : 0));
        if (Math.abs(bl.s.x - this.soul.x) < (bl.w / 2 + 3) && Math.abs(bl.s.y - this.soul.y) < (bl.h / 2 + 3) && bl.s.visible) {
          if (bl.kind === 'cloud') { this.slowed = true; this.hurt(1); } else this.hurt(bl.dmg);
          if (this.phase !== 'dodge') return;
        }
      }
      this.bullets = this.bullets.filter(bl => {
        const gone = bl.s.y > b.y + b.h + 10 || bl.s.x < b.x - 80 || bl.s.x > b.x + b.w + 80;
        if (gone) bl.s.destroy(); return !gone;
      });
    }
  }
}
