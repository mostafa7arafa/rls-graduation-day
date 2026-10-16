import * as Phaser from 'phaser';
import { CAST } from '../data/cast';
import { sfx } from '../systems/sfx';
import { W, H, FONT } from '../config';
import { tr, txt, isAr, num } from '../systems/i18n';
import { padStyle } from '../systems/gamepad';

// Always-on-top overlay: dialogue box, choices, toasts, objective + leader HUD.
// Scripts talk to it through say()/choose() which return Promises.
// In Arabic the whole layout mirrors: portrait and name tag on the right, text anchored to its right edge.
export class UIScene extends Phaser.Scene {
  private box!: Phaser.GameObjects.Container;
  private nameTag!: Phaser.GameObjects.Text;
  private nameBg!: Phaser.GameObjects.Rectangle;
  private body!: Phaser.GameObjects.Text;
  private face!: Phaser.GameObjects.Image;
  private faceFrame!: Phaser.GameObjects.Rectangle;
  private arrow!: Phaser.GameObjects.Text;
  private objective!: Phaser.GameObjects.Text;
  private hudFace!: Phaser.GameObjects.Image;
  private hudName!: Phaser.GameObjects.Text;
  private objX = 32;
  private boxY = 0;   // container offset: 0 = bottom of the screen, negative = moved to the top
  private form!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private card?: Phaser.GameObjects.Container;
  private confirmCb: (() => void) | null = null;
  private navCb: ((d: number) => void) | null = null;
  busy = false;

  constructor() { super('ui'); }

  create() {
    const bx = 8, by = H - 78, bw = W - 16, bh = 70, ar = isAr();
    const bg = this.add.rectangle(bx, by, bw, bh, 0x1b1420, 0.94).setOrigin(0).setStrokeStyle(2, 0xf4f0e8);
    const inner = this.add.rectangle(bx + 3, by + 3, bw - 6, bh - 6).setOrigin(0).setStrokeStyle(1, 0x4a3c43);
    this.faceFrame = this.add.rectangle(bx + 10, by + 11, 50, 50, 0x2c2230).setOrigin(0).setStrokeStyle(1, 0x6d5b64);
    this.face = this.add.image(bx + 11, by + 12, 'mostafa_face').setOrigin(0).setScale(3);
    this.body = this.add.text(bx + 70, by + (ar ? 6 : 12), '', txt(8, { color: '#f4f0e8', lineSpacing: ar ? -3 : 7, wordWrap: { width: bw - 84 } })).setOrigin(ar ? 1 : 0, 0);
    this.arrow = this.add.text(ar ? bx + 8 : bx + bw - 16, by + bh - 14, '▼', { fontFamily: FONT, fontSize: '8px', color: '#f2c94c' });
    this.nameBg = this.add.rectangle(bx + 8, by - (ar ? 12 : 9), 10, ar ? 18 : 14, 0x1b1420).setOrigin(0).setStrokeStyle(2, 0xf4f0e8);
    this.nameTag = this.add.text(bx + 14, by - (ar ? 15 : 5), '', txt(8, { color: '#f4f0e8' })).setOrigin(ar ? 1 : 0, 0);
    this.box = this.add.container(0, 0, [bg, inner, this.faceFrame, this.face, this.body, this.arrow, this.nameBg, this.nameTag]).setVisible(false);
    this.tweens.add({ targets: this.arrow, y: '+=2', yoyo: true, repeat: -1, duration: 300 });

    // HUD: current leader + objective
    this.add.rectangle(0, 0, W, 31, 0x1b1420, 0.72).setOrigin(0);
    this.add.rectangle(0, 31, W, 1, 0xf2c94c, 0.35).setOrigin(0);
    // HUD mirrors in Arabic: face top-right, hint top-left
    const hx = ar ? W - 28 : 4;
    this.add.rectangle(hx, 4, 24, 24, 0x1b1420, 0.8).setOrigin(0).setStrokeStyle(1, 0xf4f0e8);
    this.hudFace = this.add.image(hx + 2, 6, 'mostafa_face').setOrigin(0).setScale(1.25);
    this.objX = ar ? W - 32 : 32;
    this.hudName = this.add.text(this.objX, ar ? -1 : 6, '', txt(8, { color: '#f4f0e8' })).setOrigin(ar ? 1 : 0, 0).setShadow(1, 1, '#1b1420', 0, false, true);
    this.objective = this.add.text(this.objX, ar ? 12 : 18, '', txt(8, { color: '#f2c94c', wordWrap: { width: W - 40 } })).setOrigin(ar ? 1 : 0, 0).setShadow(1, 1, '#1b1420', 0, false, true);
    this.hint = this.add.text(ar ? 4 : W - 4, ar ? 0 : 4, '', txt(8, { color: '#cfc6b8' })).setOrigin(ar ? 0 : 1, 0).setAlpha(0.7).setShadow(1, 1, '#1b1420', 0, false, true);

    // clearance form progress (appears once Sheikh Nasser hands it over)
    this.form = this.add.text(ar ? 4 : W - 4, ar ? 0 : 4, '', txt(8, { color: '#9fe09a' })).setOrigin(ar ? 0 : 1, 0).setShadow(1, 1, '#1b1420', 0, false, true).setVisible(false);

    this.refreshHint();

    const kb = this.input.keyboard!;
    const confirm = () => { const cb = this.confirmCb; if (cb) cb(); };
    kb.on('keydown-Z', confirm); kb.on('keydown-SPACE', confirm); kb.on('keydown-ENTER', confirm);
    kb.on('keydown-UP', () => this.navCb?.(-1)); kb.on('keydown-W', () => this.navCb?.(-1));
    kb.on('keydown-DOWN', () => this.navCb?.(1)); kb.on('keydown-S', () => this.navCb?.(1));
    this.input.on('pointerdown', confirm); // tap to advance on phones
    this.busy = false; this.confirmCb = null; this.navCb = null;
    this.scene.launch('world');
  }

  setLeader(who: string) {
    this.hudFace.setTexture(`${who}_face`);
    this.hudName.setText(tr(CAST[who].name)).setColor(CAST[who].color);
    this.tweens.add({ targets: this.hudFace, scale: { from: 1.8, to: 1.25 }, duration: 220, ease: 'Back.out' });
  }

  setObjective(text: string) {
    text = tr(text);
    if (this.objective.text === text) return;
    this.objective.setText(text).setAlpha(0);
    const d = isAr() ? -8 : 8;
    this.tweens.add({ targets: this.objective, alpha: 1, x: { from: this.objX + d, to: this.objX }, duration: 400 });
  }

  private open(who: string) {
    const s = CAST[who] ?? CAST.narrator;
    const hasFace = !!s.face;
    this.face.setVisible(hasFace); this.faceFrame.setVisible(hasFace);
    if (hasFace) this.face.setTexture(s.face!);
    const ar = isAr(), name = tr(s.name);
    this.faceFrame.setX(ar ? W - 68 : 18); this.face.setX(ar ? W - 67 : 19);
    this.body.setX(ar ? (hasFace ? W - 78 : W - 22) : (hasFace ? 78 : 22)).setWordWrapWidth(hasFace ? W - 100 : W - 44);
    this.nameTag.setText(name).setColor(s.color);
    const tagW = this.nameTag.width + 12;
    this.nameBg.setVisible(!!name).setSize(tagW, ar ? 18 : 14).setX(ar ? W - 16 - tagW : 16);
    this.nameTag.setX(ar ? W - 22 : 22);
    this.nameTag.setVisible(!!name);
    if (!this.box.visible) {
      this.box.setVisible(true).setAlpha(0).setY(this.boxY + 8);
      this.tweens.add({ targets: this.box, alpha: 1, y: this.boxY, duration: 120, ease: 'Quad.out' });
    }
  }

  close() {
    this.box.setVisible(false);
    this.confirmCb = null; this.navCb = null; this.busy = false;
  }

  say(who: string, text: string): Promise<void> {
    this.busy = true;
    this.open(who);
    const voice = (CAST[who] ?? CAST.narrator).voice;
    this.arrow.setVisible(false);
    this.body.setText('');
    text = tr(text);
    return new Promise(resolve => {
      let i = 0, done = false;
      const timer = this.time.addEvent({
        delay: 28, loop: true, callback: () => {
          i++;
          this.body.setText(text.slice(0, i));
          const ch = text[i - 1];
          if (ch && ch !== ' ' && i % 2 === 0) sfx.blip(voice);
          if (i >= text.length) finish();
        },
      });
      const finish = () => { timer.remove(); this.body.setText(text); done = true; this.arrow.setVisible(true); };
      this.confirmCb = () => {
        if (!done) { finish(); return; }
        this.confirmCb = null; sfx.move(); resolve();
      };
    });
  }

  choose(options: string[], who = 'narrator', prompt = ''): Promise<number> {
    this.busy = true;
    this.open(who);
    this.arrow.setVisible(false);
    return new Promise(resolve => {
      let sel = 0;
      const mark = isAr() ? '◀' : '▶';
      options = options.map(tr); prompt = tr(prompt);
      const render = () => this.body.setText((prompt ? prompt + '\n' : '') + options.map((o, i) => `${i === sel ? mark : '  '} ${o}`).join('\n'));
      render();
      this.navCb = (d) => { sel = (sel + d + options.length) % options.length; sfx.move(); render(); };
      this.confirmCb = () => { this.navCb = null; this.confirmCb = null; sfx.select(); resolve(sel); };
    });
  }

  /** a full-screen colour wash under the dialogue box (e.g. sunset); alpha 0 removes it */
  private wash?: Phaser.GameObjects.Rectangle;
  setWash(color: number, alpha: number) {
    this.wash ??= this.add.rectangle(0, 0, W, H, color, 0).setOrigin(0).setDepth(-1);
    this.wash.setFillStyle(color, 1);
    this.tweens.add({ targets: this.wash, alpha, duration: 1200 });
  }

  /** put the dialogue box at the top of the screen (for cutscenes happening at the bottom of the map) */
  setBoxTop(top: boolean) { this.boxY = top ? -(H - 78 - 44) : 0; this.box.setY(this.boxY); }

  /** controls hint for keyboard, Xbox or PlayStation (called again when a controller connects) */
  refreshHint(announce = false) {
    const style = padStyle();
    this.hint.setText(tr(style === 'playstation' ? 'R1 swap · CROSS talk · SQUARE run' : style === 'xbox' ? 'RB swap · A talk · X run' : 'TAB swap · Z talk · M mute'));
    if (announce) this.toast(style ? 'Controller connected!' : 'Controller disconnected');
  }

  /** clearance form + yearbook counters (−1 = not held yet). They replace the controls hint once you have them. */
  setForm(form: number, book = -1, bookMax = 7) {
    const parts: string[] = [];
    if (form >= 0) parts.push(`${tr('FORM')} ${num(form)}/${num(6)}`);
    if (book >= 0) parts.push(`${tr('YEARBOOK')} ${num(book)}/${num(bookMax)}`);
    this.form.setVisible(parts.length > 0).setText(parts.join('  ·  '));
    this.hint.setVisible(parts.length === 0);
  }

  /** black full-screen chapter title; resolves once it is fully shown (hide with chapterCardHide) */
  chapterCard(n: number, title: string): Promise<void> {
    this.close();
    const bg = this.add.rectangle(0, 0, W, H, 0x1b1420).setOrigin(0);
    const k = this.add.text(W / 2, H / 2 - 16, `${tr('CHAPTER')} ${num(n)}`, txt(8, { color: '#f2c94c' })).setOrigin(0.5);
    const t = this.add.text(W / 2, H / 2 + 6, tr(title), txt(16, { color: '#f4f0e8' })).setOrigin(0.5);
    this.card = this.add.container(0, 0, [bg, k, t]).setDepth(100).setAlpha(0);
    sfx.item();
    return new Promise(r => this.tweens.add({ targets: this.card, alpha: 1, duration: 500, onComplete: () => this.time.delayedCall(2000, () => r()) }));
  }
  chapterCardHide(): Promise<void> {
    const card = this.card; this.card = undefined;
    if (!card) return Promise.resolve();
    return new Promise(r => this.tweens.add({ targets: card, alpha: 0, duration: 600, onComplete: () => { card.destroy(); r(); } }));
  }

  toast(text: string, color = '#f2c94c') {
    const t = this.add.text(W / 2, 46, tr(text), txt(8, { color, backgroundColor: '#1b1420', padding: { x: 6, y: isAr() ? 1 : 5 } }))
      .setOrigin(0.5).setAlpha(0);
    this.tweens.chain({ targets: t, tweens: [
      { alpha: 1, y: 40, duration: 200, ease: 'Back.out' },
      { alpha: 0, duration: 400, delay: 1800, onComplete: () => t.destroy() },
    ] });
  }
}
