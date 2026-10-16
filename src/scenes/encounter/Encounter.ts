import * as Phaser from 'phaser';
import { W, FONT } from '../../config';
import { sfx } from '../../systems/sfx';
import { music } from '../../systems/music';
import type { TrackId } from '../../systems/music';
import { tr, txt, isAr, num } from '../../systems/i18n';
import { CAST } from '../../data/cast';

// Shared frame for teacher encounters (Chapter 2+): a text box with typewriter lines and menus,
// the party's DIGNITY bar, a big teacher sprite, and the win / detention endings.
// Subclasses write their flow as plain async code: `await this.say([...])`, `await this.menu([...])`.

export type Key = 'ok' | 'back' | 'left' | 'right' | 'up' | 'down';
export interface Rect { x: number; y: number; w: number; h: number }

/** translate a label; plain numbers just switch digits */
export const label = (s: string) => /^\d+$/.test(s) ? num(+s) : tr(s);

export const BOX: Rect = { x: 20, y: 128, w: 440, h: 68 };
const PARTY = ['mostafa', 'hussein', 'hefny'] as const;

export abstract class Encounter extends Phaser.Scene {
  protected onEnd!: (won: boolean) => void;
  protected dignity = 20;
  protected maxDignity = 20;
  protected ar = false;
  protected faces: Record<string, Phaser.GameObjects.Image> = {};
  protected teacher!: Phaser.GameObjects.Sprite;
  protected box: Rect = { ...BOX };
  private handler: ((k: Key) => void) | null = null;
  private gfx!: Phaser.GameObjects.Graphics;
  private text!: Phaser.GameObjects.Text;
  private cells: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Image;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private over = false;

  init(data: { onEnd: (won: boolean) => void }) {
    this.onEnd = data.onEnd;
    this.dignity = this.maxDignity;
    this.box = { ...BOX }; this.cells = []; this.faces = {}; this.handler = null; this.over = false;
  }

  /** call first in create(): background colour, music, and the shared widgets */
  protected setup(bg: string, track: TrackId, showDignity = true, who: readonly string[] = PARTY) {
    this.ar = isAr();
    this.cameras.main.setBackgroundColor(bg).fadeIn(250);
    sfx.sting(); music.play(track);
    this.gfx = this.add.graphics().setDepth(5);
    this.text = this.add.text(0, 0, '', txt(8, { color: '#f4f0e8', lineSpacing: this.ar ? -3 : 7, wordWrap: { width: BOX.w - 24 } })).setOrigin(this.ar ? 1 : 0, 0).setDepth(6);
    for (let i = 0; i < 8; i++) this.cells.push(this.add.text(0, 0, '', txt(8, { color: '#f4f0e8' })).setOrigin(this.ar ? 1 : 0, 0).setDepth(6).setVisible(false));
    this.cursor = this.add.image(0, 0, 'soul').setDepth(7).setVisible(false);
    if (showDignity) {
      who.forEach((p, i) => { this.faces[p] = this.add.image(26 + i * 20, 212, `${p}_face`).setScale(1.1); });
      this.add.text(88, 212, tr('DIGNITY'), txt(8, { color: '#f4f0e8', rtl: false })).setOrigin(0, 0.5);
      this.add.rectangle(150, 212, 100, 8, 0x5a1a24).setOrigin(0, 0.5);
      this.hpBar = this.add.rectangle(150, 212, 100, 8, 0xf2c94c).setOrigin(0, 0.5);
      this.hpText = this.add.text(256, 212, '', { fontFamily: FONT, fontSize: '8px', color: '#f4f0e8' }).setOrigin(0, 0.5);
      this.refreshDignity();
    }
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const key: Key | null = k === 'z' || k === ' ' || k === 'enter' ? 'ok' : k === 'x' || k === 'escape' ? 'back'
        : k === 'arrowleft' || k === 'a' ? 'left' : k === 'arrowright' || k === 'd' ? 'right'
        : k === 'arrowup' || k === 'w' ? 'up' : k === 'arrowdown' || k === 's' ? 'down' : null;
      if (key && this.handler) this.handler(key);
    });
    this.input.on('pointerdown', () => this.handler?.('ok'));
  }

  /** a big breathing teacher sprite */
  protected addTeacher(key: string, x = W / 2, y = 58, scale = 4) {
    this.teacher = this.add.sprite(x, y, key, 0).setScale(scale).setDepth(2);
    this.tweens.add({ targets: this.teacher, scaleY: scale * 1.03, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
    return this.teacher;
  }

  /** raw key events for real-time phases (subclasses handle their own minigame input) */
  protected onKey(fn: ((k: Key) => void) | null) { this.handler = fn; }

  // ───────────────────────────────────────── text box
  protected drawBox(r: Rect = this.box) {
    this.box = r;
    this.gfx.clear().fillStyle(0x000000).fillRect(r.x, r.y, r.w, r.h).lineStyle(2, 0xf4f0e8).strokeRect(r.x, r.y, r.w, r.h);
  }
  protected hideBox() { this.gfx.clear(); this.text.setText(''); this.hideCells(); }

  private setText(t: string) {
    this.hideCells();
    const b = this.box;
    this.text.setText(t).setWordWrapWidth(b.w - 24);
    if (this.ar) this.text.setPosition(b.x + b.w - 12, b.y + 4); else this.text.setPosition(b.x + 12, b.y + 10);
  }
  private hideCells() { this.cells.forEach(c => c.setVisible(false)); this.cursor.setVisible(false); }

  /** typewriter lines; Z skips the typing, then advances. Lines starting with a teacher's name use their voice. */
  protected say(lines: string[], voice = 300): Promise<void> {
    this.drawBox();
    return new Promise(resolve => {
      const next = () => {
        const line = lines.shift();
        if (line === undefined) { this.onKey(null); this.text.setText(''); resolve(); return; }
        const shown = tr(line); let i = 0, typing = true;
        const v = Object.values(CAST).find(s => s.name && line.startsWith(s.name))?.voice ?? voice;
        const timer = this.time.addEvent({ delay: 24, loop: true, callback: () => {
          i++; this.setText(shown.slice(0, i)); if (i % 2 === 0 && shown[i - 1] !== ' ') sfx.blip(v);
          if (i >= shown.length) { timer.remove(); typing = false; }
        } });
        this.onKey((k) => {
          if (k !== 'ok') return;
          if (typing) { timer.remove(); typing = false; this.setText(shown); }
          else { sfx.move(); next(); }
        });
      };
      next();
    });
  }

  /** a menu of options in `cols` columns inside the box; resolves with the chosen index (or -1 on back if allowed) */
  protected menu(options: string[], cols = 1, prompt = '', allowBack = false, disabled: boolean[] = []): Promise<number> {
    this.drawBox(); this.setText(prompt ? tr(prompt) : '');
    const b = this.box, rowH = this.ar ? 19 : 15, colW = (b.w - 32) / cols;
    const top = prompt ? b.y + (this.ar ? 24 : 26) : b.y + (this.ar ? 5 : 10);
    let sel = disabled.findIndex(d => !d); if (sel < 0) sel = 0;
    const colX = (c: number) => this.ar ? b.x + b.w - 16 - c * colW : b.x + 16 + c * colW;
    const render = () => {
      options.forEach((o, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        this.cells[i].setText(label(o))
          .setPosition(colX(c) + (this.ar ? -12 : 12), top + r * rowH).setVisible(true)
          .setColor(disabled[i] ? '#6d5b64' : i === sel ? '#f2c94c' : '#f4f0e8');
      });
      this.cursor.setPosition(colX(sel % cols), top + 4 + Math.floor(sel / cols) * rowH).setVisible(true);
    };
    render();
    return new Promise(resolve => {
      this.onKey((k) => {
        const n = options.length;
        const step = (d: number) => { let s = sel; do { s = (s + d + n) % n; } while (disabled[s] && s !== sel); sel = s; sfx.move(); render(); };
        if (k === 'left') step(-1); else if (k === 'right') step(1);
        else if (k === 'up') step(-cols); else if (k === 'down') step(cols);
        else if (k === 'back' && allowBack) { sfx.back(); this.onKey(null); this.hideCells(); resolve(-1); }
        else if (k === 'ok' && !disabled[sel]) { sfx.select(); this.onKey(null); this.hideCells(); resolve(sel); }
      });
    });
  }

  // ───────────────────────────────────────── dignity
  protected refreshDignity() {
    if (!this.hpBar) return;
    this.tweens.add({ targets: this.hpBar, scaleX: Math.max(0, this.dignity) / this.maxDignity, duration: 200 });
    this.hpText.setText(`${Math.max(0, this.dignity)}/${this.maxDignity}`);
  }
  /** lose dignity; a random friend yelps. Returns true when it hits zero. */
  protected hurt(n: number, who?: string): boolean {
    this.dignity -= n; sfx.hit(); this.cameras.main.shake(140, 0.01); this.refreshDignity();
    const w = who ?? Phaser.Utils.Array.GetRandom(Object.keys(this.faces).length ? Object.keys(this.faces) : [...PARTY]);
    this.time.delayedCall(90, () => sfx.react(CAST[w].voice, 'ow'));
    if (this.faces[w]) this.tweens.add({ targets: this.faces[w], angle: { from: -15, to: 0 }, duration: 250 });
    return this.dignity <= 0;
  }
  protected heal(n: number) { this.dignity = Math.min(this.maxDignity, this.dignity + n); sfx.heal(); this.refreshDignity(); }
  protected bounceFace(who: string) { if (this.faces[who]) this.tweens.add({ targets: this.faces[who], y: 204, yoyo: true, duration: 120, repeat: 1 }); }
  protected tintFace(who: string, color: number, ms = 1500) { const f = this.faces[who]; if (!f) return; f.setTint(color); this.time.delayedCall(ms, () => f.clearTint()); }

  protected wait(ms: number) { return new Promise<void>(r => this.time.delayedCall(ms, r)); }

  // ───────────────────────────────────────── endings
  protected async win(lines: string[]) {
    if (this.over) return; this.over = true;
    sfx.win();
    if (this.teacher) this.tweens.add({ targets: this.teacher, y: this.teacher.y - 8, yoyo: true, repeat: 3, duration: 140 });
    await this.say(lines);
    this.close(true);
  }
  protected async detention(lines: string[] = [], word = 'DETENTION.') {
    if (this.over) return; this.over = true;
    this.onKey(null);
    if (lines.length) await this.say(lines);
    sfx.sting();
    const big = this.add.text(W / 2, 160, tr(word), txt(16, { color: '#ff4040' })).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: big, scale: { from: 3, to: 1 }, duration: 400, ease: 'Back.out' });
    await this.wait(1600);
    this.close(false);
  }
  private close(won: boolean) {
    this.onKey(null);
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.stop(); this.onEnd(won); });
  }
}
